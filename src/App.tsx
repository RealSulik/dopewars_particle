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

export default function App() {
  const { connect, connected } = useConnect();
  const { provider } = useEthereum();

  const {
    wallet,
    playerData,
    inventory,
    prices,
    ice,
    loading,
    errorMessage,
    currentAction,

    connectWallet,
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
  const [quantities, setQuantities] = useState<number[]>(() => [1, 1, 1, 1]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // Auto-init smart wallet after Particle login
  useEffect(() => {
    if (connected && provider && !wallet) {
      connectWallet(provider);
    }
  }, [connected, provider, wallet, connectWallet]);

  // Event popup logic (unchanged)
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

  const safeInventory = inventory ?? [];

  return (
    <>
      {loading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-700 rounded-full text-sm shadow-lg z-50"
          style={{ opacity: 0.85 }}
        >
          {currentAction || "Confirming…"}
        </div>
      )}

      <div
        className="min-h-screen text-white flex justify-center py-0.5 px-3 crt cyber-scanlines"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.9)), url("${backgroundUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className={`w-full ${isMobile ? "max-w-md" : inGame ? "max-w-5xl" : "max-w-3xl"} relative`}>

          {/* Pre-login screen */}
          {!inGame && (
            <div className="flex flex-col items-center justify-center pt-6 pb-4 animate-fadeIn">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 neon-flicker">
                DopeWars on Base
              </h2>
              <p className="text-lg opacity-90 mb-10">
                Trade. Hustle. Survive. Collect ICE.
              </p>

              <div className="relative">
                <img
                  src="/home.png"
                  alt="DopeWars gameplay"
                  className="rounded-xl shadow-2xl border border-purple-600 neon-glow-lg max-w-[900px] w-full"
                />
              </div>

              {!wallet ? (
                <button
                  onClick={() => connect()}
                  className="mt-6 px-8 py-3 rounded-lg font-semibold neon-button cyber-sweep text-lg"
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={joinGame}
                  disabled={loading}
                  className="mt-6 px-8 py-3 rounded-lg font-semibold neon-button neon-button--buy cyber-sweep text-xl"
                >
                  {currentAction || "JOIN GAME"}
                </button>
              )}

              {errorMessage && (
                <div className="p-2 mt-4 bg-red-600 text-center font-semibold rounded animate-fadeIn cyber-card">
                  ⚠ {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* In-game header */}
          {inGame && (
            <h1 className="mt-10 sm:mt-4 text-center mb-6 text-2xl sm:text-3xl md:text-4xl font-bold neon-flicker neon-text-glow">
              DopeWars on Base
            </h1>
          )}

          {/* HUD (mobile & desktop) */}
          {inGame && (
            <>
              {isMobile ? (
                <div className="px-2 mb-3">
                  <div className="backpanel cyber-card cyber-scanlines cyber-trace px-3 py-3 flex flex-col items-center gap-2 text-center">
                    <p className="text-sm font-semibold opacity-90">
                      {locationName} · Day {days} · Cash ${formatMoney(cash)}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="font-semibold">ICE: {ice}</span>
                      <button
                        onClick={claimDailyIce}
                        disabled={loading}
                        className="px-3 py-1 rounded-full text-xs font-semibold neon-button cyber-sweep"
                      >
                        Claim Daily ICE
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-3 px-2">
                  <div className="flex-1 p-3">
                    <div className="backpanel cyber-card cyber-scanlines cyber-trace text-center px-2 py-2 h-[64px] flex items-center justify-center">
                      <p className="text-sm font-semibold opacity-90">
                        {locationName} · Day {days} · Cash ${formatMoney(cash)}
                      </p>
                    </div>
                  </div>
                  <div className="w-80 p-3">
                    <div className="backpanel cyber-card cyber-scanlines cyber-trace text-center px-2 py-2 h-[64px] flex items-center justify-center">
                      <div className="flex flex-col leading-tight">
                        <p className="text-sm font-semibold opacity-90 mb-0.5">
                          ICE: {ice}
                        </p>
                        <button
                          onClick={claimDailyIce}
                          disabled={loading}
                          className="px-3 py-0.5 rounded text-xs font-semibold neon-button cyber-sweep"
                        >
                          Claim Daily ICE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* LEFT COLUMN: Inventory & Trading */}
                <div className="flex flex-col w-full md:flex-1 backpanel cyber-card cyber-scanlines cyber-trace pt-3 pb-3">
                  {/* Mobile price marquee */}
                  {isMobile && prices.length > 0 && (
                    <div className="px-2 mb-3">
                      <h2 className="text-lg font-bold mb-2 text-center neon-flicker">
                        Current Drug Prices
                      </h2>
                      <div className="overflow-hidden relative py-0.5">
                        <div className="flex gap-6 animate-price-marquee whitespace-nowrap">
                          {[...Array(2)].flatMap(() =>
                            ["Weed", "Acid", "Cocaine", "Heroin"].map((name, i) => (
                              <div
                                key={`${name}-${i}`}
                                className="px-2 py-1 rounded-md text-center price-chip text-sm"
                              >
                                {name}: ${formatMoney(prices[i])}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <h2 className="text-lg font-bold mb-3 text-center neon-flicker">
                    Inventory &amp; Trading
                  </h2>

                  {safeInventory.length > 0 ? (
                    <div className={`overflow-x-auto flex gap-3 px-1 ${isMobile ? "snap-x snap-mandatory inventory-grid" : "grid grid-cols-2 sm:grid-cols-2"}`}>
                      {safeInventory.map((d, i) => {
                        const qty = quantities[i] ?? 1;

                        return (
                          <div key={i} className={`p-1 ${isMobile ? "snap-center shrink-0 w-[65vw]" : "w-full"}`}>
                            <div className={`backpanel cyber-card cyber-scanlines cyber-trace inventory-card flex flex-col w-full ${isMobile ? "h-auto" : "h-[198px]"}`}>
                              <div className="font-semibold text-lg mb-1">{d.name}</div>

                              <div className="grid grid-cols-2 text-sm gap-y-1 mb-2">
                                <span className="opacity-80">Amount: {d.amount} units</span>
                                <span className="opacity-80 text-right">Total</span>
                                <span className="opacity-90">Price: ${formatMoney(d.price)}</span>
                                <span className="opacity-90 text-right">${formatMoney(d.price * qty)}</span>
                              </div>

                              <input
                                type="number"
                                min={1}
                                value={qty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0) {
                                    const newQ = [...quantities];
                                    newQ[i] = val;
                                    setQuantities(newQ);
                                  }
                                }}
                                className="trade-qty"
                                placeholder="Qty"
                              />

                              <div className="mt-auto flex gap-2">
                                <button
                                  onClick={() => buy(i, qty)}
                                  disabled={loading}
                                  className="flex-1 px-3 py-1 rounded-full text-sm font-semibold neon-button cyber-sweep neon-button--buy"
                                >
                                  Buy
                                </button>
                                <button
                                  onClick={() => sell(i, qty)}
                                  disabled={loading || d.amount < qty}
                                  className={`flex-1 px-3 py-1 rounded-full text-sm font-semibold neon-button cyber-sweep ${d.amount >= qty ? "neon-button--sell" : "neon-button--disabled cursor-not-allowed"}`}
                                >
                                  Sell
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center opacity-60 text-sm">No inventory yet.</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 justify-center mt-3 mb-2">
                    <button onClick={endDay} disabled={loading} className="px-5 py-2 rounded font-semibold neon-button cyber-sweep bg-blue-600">
                      End Day
                    </button>
                    <button onClick={hustle} disabled={loading || cash !== 0} className={`px-5 py-2 rounded font-semibold neon-button cyber-sweep ${cash === 0 ? "bg-purple-700" : "bg-gray-700 opacity-60 cursor-not-allowed"}`}>
                      Hustle
                    </button>
                    <button onClick={stash} disabled={loading || cash !== 0} className={`px-5 py-2 rounded font-semibold neon-button cyber-sweep ${cash === 0 ? "bg-pink-600" : "bg-gray-700 opacity-60 cursor-not-allowed"}`}>
                      Stash
                    </button>
                    <button onClick={restartGame} disabled={loading || days < 5} className={`px-5 py-2 rounded font-semibold neon-button cyber-sweep ${days >= 5 ? "bg-gray-800 border border-white" : "bg-gray-700 opacity-60 cursor-not-allowed"}`}>
                      Restart
                    </button>
                  </div>
                  {days < 5 && <p className="text-center opacity-60 text-xs mb-2 neon-flicker">Restart becomes available at Day 5+</p>}
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-2 w-full md:w-80">
                  <div className={`p-4 backpanel cyber-card cyber-scanlines cyber-trace event-panel ${eventPanelClass}`}>
                    <h2 className="text-lg font-bold mb-1 text-center neon-flicker">Last Event</h2>
                    <div className={`text-center opacity-90 ${eventColor}`}>
                      {lastEvent || "No events yet"}
                    </div>
                  </div>

                  {/* Desktop prices */}
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

                  {/* Travel */}
                  <div className="p-4 backpanel cyber-card cyber-scanlines cyber-trace">
                    <h2 className="text-lg font-bold mb-2 text-center neon-flicker">Travel</h2>
                    <div className="text-xs opacity-80 mb-2 text-center">Traveling consumes 1 day.</div>
                    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-2">
                      {CITY_NAMES.map((city, i) => (
                        <button
                          key={i}
                          disabled={loading}
                          onClick={() => {
                            travelTo(i);
                            endDay(); // restored original behavior
                          }}
                          className={`rounded-full neon-button cyber-sweep py-2 text-sm text-center ${isMobile ? "w-full" : "px-4"}`}
                          style={isMobile ? { minWidth: "120px" } : {}}
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

      <EventPopup visible={showPopup} image={popupImage} text={popupText} onClose={() => setShowPopup(false)} />
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
    </>
  );
}