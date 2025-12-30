// src/hooks/useGame.ts
import { useState, useEffect } from "react";
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

  async function refreshGameState(address: string) {
    if (!readContract || !address) return;

    try {
      const p = await readContract.getPlayer(address);
      if (Number(p.netWorthGoal) === 0) {
        setPlayerData(null);
        setInventory([]);
        setPrices([]);
        setIce(0);
        setLastDailyClaim(0);
        return;
      }

      setPlayerData({
        cash: Number(p.cash),
        location: Number(p.location),
        netWorthGoal: Number(p.netWorthGoal),
        daysPlayed: Number(p.daysPlayed),
        lastEventDescription: p.lastEventDescription || "",
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
    } catch (err) {
      // silent — prices/ice may revert, but player data is loaded
    }
  }

  async function connectWallet(particleProvider: any) {
    if (!particleProvider) return;

    // Prevent double call in StrictMode
    if (wallet || loading) return;

    try {
      setLoading(true);

      const sa = await createSmartAccount(particleProvider);
      const address = await sa.getAddress();

      const aaProvider = new ethers.BrowserProvider(
        new AAWrapProvider(sa, SendTransactionMode.Gasless)
      );
      const signer = await aaProvider.getSigner();

      const rpcProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
      const read = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
      setReadContract(read);

      setSmartAccount(sa);
      setWallet(address);
      setAaSigner(signer);

      await refreshGameState(address);
    } catch (err: any) {
      console.error("connectWallet error:", err);
      showError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  // Fallback refresh on mount if wallet exists
  useEffect(() => {
    if (wallet && readContract) {
      refreshGameState(wallet);
    }
  }, [wallet, readContract]);

  async function sendTx(label: string, fnName: string, args: any[] = []) {
    if (!aaSigner || !wallet) return showError("Wallet not ready");

    setCurrentAction(label);
    setLoading(true);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
      const tx = await contract[fnName](...args);
      await tx.wait();

      await refreshGameState(wallet);
    } catch (err: any) {
      showError(err.reason || err.message || "Transaction failed");
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  }

  function disconnectWallet() {
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