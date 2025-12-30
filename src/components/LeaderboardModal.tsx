// src/components/LeaderboardModal.tsx
import { useEffect, useState } from "react";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config";
import { ethers } from "ethers";

export default function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<"ice" | "score">("ice");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const [addrs, best, ice] = await contract.getLeaderboardDetailed();

      const arr = addrs.map((addr: string, i: number) => ({
        addr,
        best: Number(best[i]),
        ice: Number(ice[i]),
      }));

      setRows(arr);
    } catch (e) {
      console.error("Leaderboard load error:", e);
    } finally {
      setLoading(false);
    }
  }

  function short(a: string) {
    return a.slice(0, 6) + "..." + a.slice(-4);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-start justify-center pt-24 z-[9999]">
      <div className="bg-black text-white rounded-xl p-6 w-[600px] max-w-full mx-4 border border-gray-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold neon-flicker">Leaderboard</h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-300">Close</button>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => setTab("ice")} className={`px-4 py-2 rounded ${tab === "ice" ? "bg-purple-600" : "bg-gray-700"}`}>
            Total ICE
          </button>
          <button onClick={() => setTab("score")} className={`px-4 py-2 rounded ${tab === "score" ? "bg-purple-600" : "bg-gray-700"}`}>
            Best Runs
          </button>
        </div>

        {loading ? (
          <p className="text-center opacity-60">Loading leaderboard...</p>
        ) : rows.length === 0 ? (
          <p className="text-center opacity-60">No entries yet</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {rows
              .sort((a, b) => (tab === "ice" ? b.ice - a.ice : b.best - a.best))
              .slice(0, 20)
              .map((row, idx) => (
                <div key={row.addr} className="flex justify-between bg-gray-800 p-3 rounded neon-border">
                  <div>#{idx + 1} {short(row.addr)}</div>
                  <div className="font-bold">
                    {tab === "ice" ? `${row.ice.toLocaleString()} ICE` : `$${row.best.toLocaleString()}`}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}