// src/App.tsx
import "./App.css";
import { useGame } from "./hooks/useGame";
import { useEffect, useState } from "react";
import EventPopup from "./EventPopup";
import LeaderboardModal from "./components/LeaderboardModal";
import { useConnect, useEthereum } from "@particle-network/authkit";

function formatMoney(v: number) {
  return Math.round(v).toLocaleString();
}

const CITY_NAMES = [
  "Staten Island",
  "Bronx",
  "Queens",
  "Brooklyn",
  "Central Park",
  "Coney Island",
  "Manhattan",
];

const CITY_FILES = [
  "Staten-Island.png",
  "Bronx.png",
  "Queens.png",
  "Brooklyn.png",
  "Central-Park.png",
  "Coney-Island.png",
  "Manhattan.png",
];

const drugNames = ["Weed", "Acid", "Cocaine", "Heroin"];

export default function App() {
  const { connect, connected, disconnect } = useConnect();
  const { provider } = useEthereum();

  const {
    wallet,
    playerData,
    inventory,
    prices,
    ice,
    lastDailyClaim,
    loading,
    errorMessage,
    currentAction,

    connectWallet,
    disconnectWallet,
    endDay,
    hustle,
    stash,
    restartGame,
    claimDailyIce,
    travelTo,
    buy,
    sell,
    joinGame,
  } = useGame();

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupImage, setPopupImage] = useState("");
  const [popupText, setPopupText] = useState("");

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [quantities, setQuantities] = useState<number[]>(() => [1, 1, 1, 1]);

  // Auto-init Smart Wallet after Particle login
  useEffect(() => {
    if (connected && provider && !wallet) {
      connectWallet(provider);
    }
  }, [connected, provider, wallet, connectWallet]);

  // DEBUG: Log Particle auth state changes
  useEffect(() => {
    console.log("Particle Auth State Change:", {
      connected,
      provider: !!provider,
      wallet: !!wallet,
    });
  }, [connected, provider, wallet]);

  // Event popups
  useEffect(() => {
    const event = playerData?.lastEventDescription;
    if (!event) return;

    const seenKey = "lastEventSeen";
    const lastSeen = localStorage.getItem(seenKey);
    if (lastSeen === event) return;
    localStorage.setItem(seenKey, event);

    const ev = event.toLowerCase();
    let img = "";
    if (ev.includes("mugged") || ev.includes("robbed")) img = "/events/mugged.png";
    else if (ev.includes("police") || ev.includes("busted")) img = "/events/police.png";
    else if (ev.includes("stash") || ev.includes("found")) img = "/events/stash.png";
    else if (ev.includes("ice")) img = "/events/ice.png";

    if (!img) return;

    setPopupImage(img);
    setPopupText(event);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 5000);
  }, [playerData?.lastEventDescription]);

  const inGame = wallet && playerData && playerData.netWorthGoal > 0;
  const days = playerData?.daysPlayed ?? 0;
  const cash = playerData?.cash ?? 0;
  const locIndex = playerData?.location ?? -1;
  const locationName = locIndex >= 0 && locIndex < CITY_NAMES.length ? CITY_NAMES[locIndex] : "";

  let backgroundUrl = "/cyberpunk-bg.jpg";
  if (inGame && locIndex >= 0 && locIndex < CITY_FILES.length) {
    backgroundUrl = `/cities/${CITY_FILES[locIndex]}`;
  }

  const lastEvent = playerData?.lastEventDescription ?? "";
  const lowerEvent = lastEvent.toLowerCase();
  const eventColor = lowerEvent.includes("lost") || lowerEvent.includes("failed")
    ? "text-red-400"
    : lowerEvent.includes("won") || lowerEvent.includes("gained") || lowerEvent.includes("found") || lowerEvent.includes("stash") || lowerEvent.includes("jackpot")
    ? "text-green-400"
    : "text-gray-200";

  const eventPanelClass = lowerEvent.includes("lost") || lowerEvent.includes("failed")
    ? "event-panel--loss"
    : lowerEvent.includes("won") || lowerEvent.includes("gained") || lowerEvent.includes("found") || lowerEvent.includes("stash") || lowerEvent.includes("jackpot")
    ? "event-panel--win"
    : "event-panel--neutral";

  return (
    <>
      <div
        className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center p-4"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      >
        <div className="w-full max-w-6xl">

          {/* Pre-login / Not in game */}
          {!inGame && (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 neon-flicker">
                DOPEWARS
              </h1>

              {!wallet ? (
                <button
                  onClick={() => connect()}
                  className="neon-button neon-button--buy px-12 py-6 text-2xl font-bold cyber-sweep"
                >
                  CONNECT WALLET
                </button>
              ) : loading ? (
                <div className="text-center mt-12">
                  <p className="text-2xl neon-flicker">Entering the streets...</p>
                </div>
              ) : (
                <div className="text-center mt-12">
                  <button
                    onClick={joinGame}
                    disabled={loading}
                    className="neon-button neon-button--buy px-12 py-6 text-3xl font-bold cyber-sweep shadow-lg"
                  >
                    {loading && currentAction ? currentAction : "JOIN GAME"}
                  </button>
                </div>
              )}

              {errorMessage && (
                <p className="text-red-400 mt-6 text-xl">{errorMessage}</p>
              )}
            </div>
          )}

          {/* In-game UI */}
          {inGame && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left column - Inventory + Actions */}
                <div className="flex flex-col gap-4">
                  {/* HUD */}
                  <div className="backpanel p-4 cyber-card">
                    <div className="flex flex-col md:flex-row justify-between gap-4 text-lg">
                      <div>
                        <span className="opacity-70">Cash:</span> ${formatMoney(cash)}
                      </div>
                      <div>
                        <span className="opacity-70">Day:</span> {days}
                      </div>
                      <div>
                        <span className="opacity-70">Location:</span> {locationName}
                      </div>
                      <div>
                        <span className="opacity-70">ICE:</span> {ice.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-3 justify-center">
                      <button
                        onClick={() => setShowLeaderboard(true)}
                        className="neon-button px-4 py-2 text-sm"
                      >
                        Leaderboard
                      </button>
                      <button
                        onClick={claimDailyIce}
                        disabled={loading}
                        className="neon-button px-4 py-2 text-sm"
                      >
                        Claim Daily ICE
                      </button>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="backpanel p-4 cyber-card inventory-card">
                    <h2 className="text-xl font-bold mb-4 text-center neon-flicker">Inventory</h2>
                    {inventory.length > 0 ? (
                      <div className="inventory-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {inventory.map((drug: any, i: number) => (
                          <div key={i} className="backpanel p-4 cyber-card">
                            <div className="font-semibold">{drug.name}</div>
                            <div className="text-2xl my-2">{drug.amount.toLocaleString()}</div>
                            <div className="text-sm opacity-70">
                              ${formatMoney(drug.price)} each
                            </div>
                            <div className="flex gap-2 mt-3">
                              <input
                                type="number"
                                min="1"
                                max={drug.amount}
                                value={quantities[i]}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0 && val <= drug.amount) {
                                    const newQ = [...quantities];
                                    newQ[i] = val;
                                    setQuantities(newQ);
                                  }
                                }}
                                className="trade-qty w-20 px-2 py-1 bg-black/50 border border-gray-500 rounded"
                              />
                              <button
                                onClick={() => buy(i, quantities[i])}
                                disabled={loading || cash < drug.price * quantities[i]}
                                className="neon-button neon-button--buy flex-1"
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => sell(i, quantities[i])}
                                disabled={loading || drug.amount < quantities[i]}
                                className="neon-button neon-button--sell flex-1"
                              >
                                Sell
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center opacity-60 text-sm">No inventory yet.</p>
                    )}

                    <div className="flex flex-wrap gap-3 justify-center mt-6">
                      <button
                        onClick={endDay}
                        disabled={loading}
                        className="px-6 py-3 rounded font-bold neon-button cyber-sweep bg-blue-600"
                      >
                        End Day
                      </button>
                      <button
                        onClick={hustle}
                        disabled={loading || cash !== 0}
                        className={`px-6 py-3 rounded font-bold neon-button cyber-sweep ${
                          cash === 0 ? "bg-purple-700" : "bg-gray-700 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        Hustle
                      </button>
                      <button
                        onClick={stash}
                        disabled={loading || cash !== 0}
                        className={`px-6 py-3 rounded font-bold neon-button cyber-sweep ${
                          cash === 0 ? "bg-pink-600" : "bg-gray-700 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        Stash
                      </button>
                      <button
                        onClick={restartGame}
                        disabled={loading || days < 5}
                        className={`px-6 py-3 rounded font-bold neon-button cyber-sweep ${
                          days >= 5 ? "bg-gray-800 border border-white" : "bg-gray-700 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        Restart
                      </button>
                    </div>

                    {days < 5 && (
                      <p className="text-center opacity-60 text-xs mt-3 neon-flicker">
                        Restart available at Day 5+
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-4 w-full md:w-80">
                  <div className={`p-4 backpanel cyber-card cyber-scanlines cyber-trace event-panel ${eventPanelClass}`}>
                    <h2 className="text-lg font-bold mb-1 text-center neon-flicker">Last Event</h2>
                    <div className={`text-center opacity-90 ${eventColor}`}>
                      {lastEvent || "No events yet"}
                    </div>
                  </div>

                  {!isMobile && prices.length > 0 && (
                    <div className="p-4 backpanel cyber-card cyber-scanlines cyber-trace">
                      <h2 className="text-lg font-bold mb-2 text-center neon-flicker">Current Drug Prices</h2>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Weed: ${formatMoney(prices[0])}</li>
                        <li>Acid: ${formatMoney(prices[1])}</li>
                        <li>Cocaine: ${formatMoney(prices[2])}</li>
                        <li>Heroin: ${formatMoney(prices[3])}</li>
                      </ul>
                    </div>
                  )}

                  <div className="p-4 backpanel cyber-card cyber-scanlines cyber-trace">
                    <h2 className="text-lg font-bold mb-2 text-center neon-flicker">Travel</h2>
                    <div className="text-xs opacity-80 mb-3 text-center">
                      Travel to a new location (consumes 1 day)
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {CITY_NAMES.map((city, i) => (
                        <button
                          key={i}
                          disabled={loading}
                          onClick={() => travelTo(i)}
                          className={`rounded-full neon-button cyber-sweep py-3 text-center ${
                            isMobile ? "w-full text-sm" : "px-4"
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <EventPopup
        visible={showPopup}
        image={popupImage}
        text={popupText}
        onClose={() => setShowPopup(false)}
      />
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
    </>
  );
}