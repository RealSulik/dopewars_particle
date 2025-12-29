// src/hooks/useGame.ts
import { useState } from "react";
import { ethers } from "ethers";
import { SmartAccount, AAWrapProvider, SendTransactionMode } from "@particle-network/aa";
import { createSmartAccount } from "../smartAccount";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config";

export function useGame() {
  const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [aaSigner, setAaSigner] = useState<any>(null);
  const [readContract, setReadContract] = useState<any>(null);

  const [playerData, setPlayerData] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [ice, setIce] = useState<number>(0);
  const [lastDailyClaim, setLastDailyClaim] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const drugNames = ["Weed", "Acid", "Cocaine", "Heroin"];

  function showError(text: string) {
    console.error("🚨 Game error:", text);
    setErrorMessage(text);
    setTimeout(() => setErrorMessage(null), 6000);
  }

  function fixEventText(str: string) {
    if (!str) return "";
    return str.replace(/ETH/g, "USD").replace(/Eth/g, "USD");
  }

  async function refreshGameState(address: string) {
    console.log("🔄 RefreshGameState called with address:", address);

    if (!readContract || !address) {
      console.log("⚠️ Skip refresh: missing readContract or address");
      return;
    }

    try {
      console.log("Querying on-chain player data...");
      const p = await readContract.getPlayer(address);
      console.log("Raw player data:", p);

      if (Number(p.netWorthGoal) === 0) {
        console.log("No player found — show JOIN GAME screen");
        setPlayerData(null);
        setInventory([]);
        setPrices([]);
        setIce(0);
        setLastDailyClaim(0);
        return;
      }

      console.log("Player found — loading in-game state");
      setPlayerData({
        cash: Number(p.cash),
        location: Number(p.location),
        netWorthGoal: Number(p.netWorthGoal),
        daysPlayed: Number(p.daysPlayed),
        lastEventDescription: fixEventText(p.lastEventDescription),
        hasFinished: p.hasFinished,
        didWin: p.didWin,
        finalNetWorth: Number(p.finalNetWorth),
        hustlesUsed: Number(p.hustlesUsed),
        stashesUsed: Number(p.stashesUsed),
      });

      const inv = await readContract.getInventory(address);
      const invArr: any[] = [];
      const priceArr: number[] = [];

      for (let i = 0; i < 4; i++) {
        const px = await readContract.s_currentPrices(i);
        priceArr.push(Number(px));
        invArr.push({ name: drugNames[i], amount: Number(inv[i]), price: Number(px) });
      }

      setInventory(invArr);
      setPrices(priceArr);
      setIce(Number(await readContract.s_totalIce(address)));
      setLastDailyClaim(Number(await readContract.s_lastDailyIceClaim(address)));

      console.log("✅ In-game state loaded successfully");
    } catch (err: any) {
      console.error("On-chain refresh error:", err);
      showError("Failed to load game state");
    }
  }

  async function connectWallet(particleProvider: any) {
    console.log("🔑 connectWallet called — provider exists:", !!particleProvider);

    if (!particleProvider) {
      showError("No provider from Particle");
      return;
    }

    if (wallet) {
      console.log("Wallet already connected — skipping");
      return;
    }

    try {
      setLoading(true);
      console.log("Creating SmartAccount...");

      const sa = await createSmartAccount(particleProvider);
      console.log("SmartAccount created");

      const address = await sa.getAddress();
      console.log("Smart wallet address:", address);

      const aaProvider = new ethers.BrowserProvider(
        new AAWrapProvider(sa, SendTransactionMode.Gasless)
      );
      const signer = await aaProvider.getSigner();
      console.log("AA Signer ready");

      // SET READ CONTRACT FIRST — CRITICAL FIX
      const rpcProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
      const read = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
      setReadContract(read);
      console.log("Read contract initialized");

      setSmartAccount(sa);
      setWallet(address);
      setAaSigner(signer);

      console.log("Smart wallet fully initialized");

      // Now refresh — readContract is ready
      await refreshGameState(address);
    } catch (err: any) {
      console.error("connectWallet failed:", err);
      showError(err.message || "Smart wallet init failed");
      setWallet(null); // allow retry on failure
    } finally {
      setLoading(false);
    }
  }

  async function sendTx(label: string, fnName: string, args: any[] = []) {
    if (!aaSigner || !wallet) {
      showError("Wallet not ready");
      return;
    }

    console.log(`🚀 Sending ${label} - ${fnName}`);
    setCurrentAction(label);
    setLoading(true);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
      const tx = await contract[fnName](...args);
      console.log("Tx submitted:", tx.hash);

      const receipt = await tx.wait();
      console.log("Tx confirmed:", receipt.transactionHash);

      await refreshGameState(wallet);
    } catch (err: any) {
      console.error("Tx failed:", err);
      showError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  }

  function disconnectWallet() {
    console.log("Disconnecting wallet");
    setWallet(null);
    setSmartAccount(null);
    setAaSigner(null);
    setReadContract(null);
    setPlayerData(null);
    setInventory([]);
    setPrices([]);
    setIce(0);
    setLastDailyClaim(0);
  }

  return {
    wallet,
    playerData,
    inventory,
    prices,
    ice,
    lastDailyClaim,
    loading,
    currentAction,
    errorMessage,

    connectWallet,
    disconnectWallet,

    endDay: () => sendTx("Ending day…", "endDay"),
    buy: (idx: number, amount: number) => sendTx("Buying…", "buyDrug", [idx, amount]),
    sell: (idx: number, amount: number) => sendTx("Selling…", "sellDrug", [idx, amount]),
    hustle: () => sendTx("Hustling…", "hustle"),
    stash: () => sendTx("Stashing…", "stash"),
    restartGame: () => sendTx("Restarting…", "restartGame"),
    claimDailyIce: () => sendTx("Claiming ICE…", "claimDailyIce"),
    travelTo: (loc: number) => sendTx("Traveling…", "travelTo", [loc]),
    joinGame: () => sendTx("Joining game…", "joinGame"),
  };
}