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

  // NEW: Batching state
  const [actionQueue, setActionQueue] = useState<Array<{fn: () => Promise<any>, desc: string}>>([]);
  const [optimisticState, setOptimisticState] = useState<any>(null);
  const [lastQueuedAction, setLastQueuedAction] = useState<string>("");

  const drugNames = ["Weed", "Acid", "Cocaine", "Heroin"];
  const MAX_QUEUE_SIZE = 20;

  function showError(text: string) {
    console.error("🚨 Game error:", text);
    setErrorMessage(text);
    setTimeout(() => setErrorMessage(null), 8000);
  }

  function showToast(text: string) {
    setLastQueuedAction(text);
    setTimeout(() => setLastQueuedAction(""), 2000);
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
        setOptimisticState(null);
        return;
      }

      const playerState = {
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
      };

      setPlayerData(playerState);

      const inv = await readContract.getInventory(address);
      const invArr: any[] = [];
      const priceArr: number[] = [];

      for (let i = 0; i < 4; i++) {
        try {
          const px = await readContract.s_currentPrices(i);
          priceArr.push(Number(px));
          invArr.push({ name: drugNames[i], amount: Number(inv[i]), price: Number(px) });
        } catch {
          priceArr.push(0);
          invArr.push({ name: drugNames[i], amount: Number(inv[i]), price: 0 });
        }
      }

      setInventory(invArr);
      setPrices(priceArr);

      try {
        setIce(Number(await readContract.s_totalIce(address)));
      } catch {}

      try {
        setLastDailyClaim(Number(await readContract.s_lastDailyIceClaim(address)));
      } catch {}

      // Reset optimistic state after refresh
      if (!optimisticState) {
        setOptimisticState({
          cash: playerState.cash,
          inventory: invArr.map(d => d.amount),
          location: playerState.location
        });
      }

    } catch (err) {
      console.warn("Partial refresh failure – will retry via fallback", err);
    }
  }

  async function connectWallet(particleProvider: any) {
    if (!particleProvider) return;
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

  useEffect(() => {
    if (wallet && readContract) {
      refreshGameState(wallet);
    }
  }, [wallet, readContract]);

  // NEW: Queue action with optimistic update
  function queueAction(actionFn: () => Promise<any>, description: string, optimisticUpdate?: (state: any) => any) {
    if (actionQueue.length >= MAX_QUEUE_SIZE) {
      showError(`Queue full (max ${MAX_QUEUE_SIZE}). Execute current batch first.`);
      return;
    }

    // Apply optimistic update if provided
    if (optimisticUpdate && optimisticState) {
      setOptimisticState(optimisticUpdate(optimisticState));
    }

    setActionQueue(prev => [...prev, { fn: actionFn, desc: description }]);
    showToast(`✓ Queued: ${description}`);
  }

  // NEW: Execute entire queue + optional final action
  async function executeBatch(finalAction?: () => Promise<any>, finalDesc?: string) {
    if (!aaSigner || !wallet) {
      showError("Wallet not connected");
      return;
    }

    const totalActions = actionQueue.length + (finalAction ? 1 : 0);
    if (totalActions === 0) {
      if (finalAction) {
        // Just execute the final action alone
        return await sendTxDirect(finalDesc || "Executing", finalAction);
      }
      return;
    }

    setCurrentAction(`Executing ${totalActions} action${totalActions > 1 ? 's' : ''}...`);
    setLoading(true);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);

      // Execute all queued actions
      for (const action of actionQueue) {
        const tx = await action.fn();
        await tx.wait();
      }

      // Execute final action if provided (e.g., endDay)
      if (finalAction) {
        const tx = await finalAction();
        await tx.wait();
      }

      // Clear queue and refresh
      setActionQueue([]);
      await refreshGameState(wallet);

    } catch (err: any) {
      let message = "Batch execution failed";
      if (err.reason) message = err.reason;
      else if (err.message) message = err.message;

      showError(message);
      console.error("Batch error:", err);

      // Clear queue and refresh to get true state
      setActionQueue([]);
      await refreshGameState(wallet);

    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  }

  // Helper for single immediate transactions
  async function sendTxDirect(label: string, actionFn: () => Promise<any>) {
    if (!aaSigner || !wallet) {
      showError("Wallet not connected");
      return;
    }

    setCurrentAction(label);
    setLoading(true);

    try {
      const tx = await actionFn();
      await tx.wait();
      await refreshGameState(wallet);
    } catch (err: any) {
      let message = "Transaction failed";
      if (err.reason) message = err.reason;
      else if (err.message) message = err.message;

      showError(message);
      console.error("Tx error:", err);
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
    setActionQueue([]);
    setOptimisticState(null);
  }

  // Game actions - now queue instead of execute immediately
  const buy = (idx: number, amount: number) => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    
    queueAction(
      () => contract.buyDrug(idx, amount),
      `Buy ${amount}x ${drugNames[idx]}`,
      (state) => ({
        ...state,
        cash: state.cash - (prices[idx] * amount),
        inventory: state.inventory.map((amt: number, i: number) => 
          i === idx ? amt + amount : amt
        )
      })
    );
  };

  const sell = (idx: number, amount: number) => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    
    queueAction(
      () => contract.sellDrug(idx, amount),
      `Sell ${amount}x ${drugNames[idx]}`,
      (state) => ({
        ...state,
        cash: state.cash + (prices[idx] * amount),
        inventory: state.inventory.map((amt: number, i: number) => 
          i === idx ? amt - amount : amt
        )
      })
    );
  };

  const travelTo = (loc: number) => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    
    const cityNames = ["Staten Island", "Bronx", "Queens", "Brooklyn", "Central Park", "Coney Island", "Manhattan"];
    
    queueAction(
      () => contract.travelTo(loc),
      `Travel to ${cityNames[loc]}`,
      (state) => ({
        ...state,
        cash: state.cash - 100,
        location: loc
      })
    );
  };

  // End day executes queue + ends day
  const endDay = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    
    executeBatch(
      () => contract.endDay(),
      "End Day"
    );
  };

  // These execute immediately (no batching needed)
  const hustle = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    sendTxDirect("Hustling...", () => contract.hustle());
  };

  const stash = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    sendTxDirect("Stashing...", () => contract.stash());
  };

  const restartGame = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    setActionQueue([]); // Clear queue on restart
    sendTxDirect("Restarting...", () => contract.restartGame());
  };

  const claimDailyIce = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    sendTxDirect("Claiming ICE...", () => contract.claimDailyIce());
  };

  const joinGame = () => {
    if (!aaSigner) return;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, aaSigner);
    sendTxDirect("Joining game...", () => contract.joinGame());
  };

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
    
    // NEW: Expose batching state
    actionQueue,
    optimisticState,
    lastQueuedAction,

    connectWallet,
    disconnectWallet,

    endDay,
    buy,
    sell,
    hustle,
    stash,
    restartGame,
    claimDailyIce,
    travelTo,
    joinGame,
  };
}