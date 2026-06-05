import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Radio,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import BottomNav from "../components/BottomNav";
import { NAV_ITEMS } from "../components/BottomNav";
import type { BottomNavTab } from "../components/BottomNav";
import BottomSheet from "../components/BottomSheet";
import FaucetOverlay from "../components/FaucetOverlay";
import GlobeCanvas from "../components/GlobeCanvas";
import IntelTab from "../components/IntelTab";
import MapBottomSheet from "../components/MapBottomSheet";
import PlayNowOverlay from "../components/PlayNowOverlay";
import PlotHoverCard from "../components/PlotHoverCard";
import PrincipalBadge from "../components/PrincipalBadge";
import StressTestPanel from "../components/StressTestPanel";
import UniversePanel from "../components/UniversePanel";
import { BIOME_MINERAL_RATES } from "../constants/minerals";
import { usePlayerSync } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

/* ─── helpers ─── */
function fmt8(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });
}
function fmt2(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ─── Top Bar ─── */
function TopBar({
  onUniverseClick,
  onPlayNowClick,
}: {
  onUniverseClick: () => void;
  onPlayNowClick: () => void;
}) {
  return (
    <div
      data-ocid="topbar.panel"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3"
      style={{
        height: 56,
        background: "rgba(2,10,20,0.88)",
        borderBottom: `1px solid ${BORDER}`,
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Left: logo + principal badge */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 36,
            height: 36,
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${CYAN_DIM}`,
              position: "absolute",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 1,
              height: 18,
              background: CYAN_DIM,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 18,
              height: 1,
              background: CYAN_DIM,
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: CYAN,
              boxShadow: `0 0 6px ${CYAN}`,
              position: "absolute",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 9,
            color: CYAN_DIM,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          TACMAP
        </span>
        {/* Principal badge in top-left */}
        <PrincipalBadge />
      </div>

      {/* Center title */}
      <div
        style={{
          color: CYAN,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 12px ${CYAN}`,
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        FRONTIER: MISSILE HORIZON
      </div>

      {/* Right: Faucet + controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-ocid="playnow.primary_button"
          onClick={onPlayNowClick}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer font-bold uppercase tracking-widest text-[8px] whitespace-nowrap"
          style={{
            background: "rgba(0,255,204,0.18)",
            border: "1px solid rgba(0,255,204,0.6)",
            color: "#00ffcc",
            height: 32,
            boxShadow: "0 0 10px rgba(0,255,204,0.25)",
          }}
        >
          PLAY NOW
        </button>
        <button
          type="button"
          data-ocid="universe.open_modal_button"
          onClick={onUniverseClick}
          aria-label="Open Universe panel"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer font-bold uppercase tracking-widest text-[8px] whitespace-nowrap"
          style={{
            background: "rgba(0,255,204,0.07)",
            border: `1px solid ${BORDER}`,
            color: CYAN,
            height: 32,
          }}
        >
          UNIVERSE
        </button>
      </div>
    </div>
  );
}

/* ─── Left Sidebar (desktop) ─── */
function LeftSidebar({
  activeTab,
  onTabClick,
}: {
  activeTab: BottomNavTab | null;
  onTabClick: (id: BottomNavTab) => void;
}) {
  return (
    <div
      className="hidden md:flex flex-col items-center py-3 gap-2 z-20"
      style={{
        position: "fixed",
        left: 0,
        top: 56,
        bottom: 64,
        width: 72,
        background: "rgba(2,10,20,0.85)",
        borderRight: `1px solid ${BORDER}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflowY: "auto",
      }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            type="button"
            key={id}
            data-ocid={`sidebar.${id}.tab`}
            onClick={() => onTabClick(id)}
            className="flex flex-col items-center justify-center gap-1 rounded-lg cursor-pointer transition-all duration-200 flex-shrink-0"
            style={{
              width: 56,
              height: 56,
              background: isActive ? "rgba(0,255,204,0.12)" : "transparent",
              border: isActive ? `1px solid ${CYAN}` : "1px solid transparent",
            }}
          >
            <Icon
              size={20}
              color={isActive ? CYAN : CYAN_DIM}
              style={{
                filter: isActive ? `drop-shadow(0 0 4px ${CYAN})` : "none",
              }}
            />
            <span
              style={{
                fontSize: 7,
                letterSpacing: 0.5,
                color: isActive ? CYAN : CYAN_DIM,
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Bottom Nav (mobile) ─── */
/* BottomNav imported from components/BottomNav */

/* ─── Commander Panel ─── */
function CommanderPanel() {
  const player = useGameStore((s) => s.player);
  const totalBurned = useGameStore((s) => s.totalFRNTRBurned);
  const generatorTiers = useGameStore((s) => s.generatorTiers);

  const ownedPlots = player.plotsOwned;
  const plotCount = ownedPlots.length;

  let dailyFrntr = 0;
  for (const pid of ownedPlots) {
    dailyFrntr += 7;
    const tier = generatorTiers[pid] ?? 0;
    const TIER_BONUS: Record<number, number> = {
      1: 8,
      2: 24,
      3: 48,
      4: 96,
      5: 192,
      6: 384,
    };
    if (tier > 0) dailyFrntr += TIER_BONUS[tier] ?? 0;
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: CYAN,
          letterSpacing: 2,
          textShadow: `0 0 8px ${CYAN}`,
        }}
      >
        COMMANDER PANEL
      </div>

      <div
        className="rounded-lg p-2.5"
        style={{
          background: "rgba(0,255,204,0.05)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
          PRINCIPAL
        </div>
        <div
          className="font-mono truncate"
          style={{ fontSize: 9, color: TEXT, marginTop: 2 }}
        >
          {player.principal ?? "Not Connected"}
        </div>
      </div>

      <div
        className="rounded-lg p-2.5"
        style={{
          background: "rgba(0,255,204,0.05)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
          FRNTR BALANCE
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: CYAN,
            marginTop: 2,
            textShadow: `0 0 8px ${CYAN}`,
          }}
        >
          {fmt8(player.frntBalance)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2"
          style={{
            background: "rgba(0,255,204,0.05)",
            border: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
            PLOTS OWNED
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 16, fontWeight: 900, color: CYAN, marginTop: 2 }}
          >
            {plotCount}
          </div>
        </div>
        <div
          className="rounded-lg p-2"
          style={{
            background: "rgba(0,255,204,0.05)",
            border: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
            DAILY FRNTR
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 16, fontWeight: 900, color: CYAN, marginTop: 2 }}
          >
            {dailyFrntr}
          </div>
        </div>
      </div>

      <div
        className="rounded-lg p-2.5"
        style={{
          background: "rgba(0,255,204,0.05)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            fontSize: 7,
            color: CYAN_DIM,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          RESOURCES
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "IRON", value: player.iron },
            { label: "FUEL", value: player.fuel },
            { label: "CRYSTAL", value: player.crystal },
            { label: "RARE EARTH", value: player.rareEarth },
          ].map((r) => (
            <div key={r.label} className="flex flex-col">
              <span style={{ fontSize: 7, color: CYAN_DIM }}>{r.label}</span>
              <span
                className="font-mono"
                style={{ fontSize: 10, color: TEXT, fontWeight: 700 }}
              >
                {fmt8(r.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-lg p-2"
        style={{
          background: "rgba(255,68,68,0.05)",
          border: "1px solid rgba(255,68,68,0.2)",
        }}
      >
        <div style={{ fontSize: 7, color: "#ff6666", letterSpacing: 1 }}>
          TOTAL FRNTR BURNED
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#ff6666",
            marginTop: 2,
          }}
        >
          {fmt8(totalBurned)}
        </div>
      </div>

      <div
        className="rounded-lg p-2"
        style={{
          background: "rgba(0,255,204,0.05)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
          STORAGE CAP
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 12, fontWeight: 900, color: CYAN, marginTop: 2 }}
        >
          {player.resourceStorageCap}
        </div>
      </div>
    </div>
  );
}

/* ─── Inventory Panel ─── */
function InventoryPanel() {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const generatorTiers = useGameStore((s) => s.generatorTiers);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: CYAN,
          letterSpacing: 2,
          textShadow: `0 0 8px ${CYAN}`,
        }}
      >
        OWNED PLOTS
      </div>
      {player.plotsOwned.length === 0 ? (
        <div
          data-ocid="inventory.empty_state"
          className="text-center py-6"
          style={{ color: CYAN_DIM, fontSize: 10 }}
        >
          NO PLOTS OWNED
          <br />
          <span style={{ fontSize: 8 }}>
            TAP A HEX ON THE GLOBE TO PURCHASE
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {player.plotsOwned.map((plotId, idx) => {
            const plot = plots.find((p) => p.id === plotId);
            const tier = generatorTiers[plotId] ?? 0;
            const dailyRate = 7 + tier * 2;
            const rates = plot?.biome ? BIOME_MINERAL_RATES[plot.biome] : null;
            const topMineral = rates
              ? Object.entries(rates)
                  .sort((a, b) => b[1] - a[1])[0]?.[0]
                  ?.toUpperCase()
              : null;
            return (
              <div
                key={plotId}
                data-ocid={`inventory.item.${idx + 1}`}
                className="flex items-center gap-2.5 rounded-lg p-2"
                style={{
                  background: "rgba(0,255,204,0.03)",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(0,255,204,0.08)",
                    border: `1px solid ${CYAN}`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: CYAN,
                  }}
                >
                  #{plotId}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      letterSpacing: 0.5,
                    }}
                  >
                    PLOT #{plotId}
                  </div>
                  <div
                    style={{ fontSize: 8, color: CYAN_DIM, letterSpacing: 0.5 }}
                  >
                    {plot?.biome ?? "Unknown"} · {dailyRate} FRNTR/DAY ·{" "}
                    {topMineral ?? "IRON"}
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`inventory.transfer_button.${idx + 1}`}
                  className="px-2 py-1 rounded cursor-pointer font-bold text-[8px] tracking-wide whitespace-nowrap"
                  style={{
                    color: CYAN,
                    background: "rgba(0,255,204,0.08)",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  TRANSFER
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Leaderboard Panel ─── */
function LeaderboardPanel() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const player = useGameStore((s) => s.player);
  const entries = leaderboard.slice(0, 10);
  const myRank = leaderboard.findIndex(
    (e) => e.principal && e.principal === player.principal,
  );
  const rankDisplay = myRank >= 0 ? String(myRank + 1) : "UNRANKED";

  return (
    <div className="flex flex-col gap-3 p-3">
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: CYAN,
          letterSpacing: 2,
          textShadow: `0 0 8px ${CYAN}`,
        }}
      >
        GLOBAL LEADERBOARD
      </div>
      {entries.length === 0 ? (
        <div
          data-ocid="leaderboard.empty_state"
          className="text-center py-6"
          style={{ color: CYAN_DIM, fontSize: 10 }}
        >
          NO PLAYERS YET
          <br />
          <span style={{ fontSize: 8 }}>BE THE FIRST TO REGISTER!</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((e) => (
            <div
              key={e.rank}
              data-ocid={`leaderboard.item.${e.rank}`}
              className="flex items-center gap-2.5 rounded-lg p-2"
              style={{
                background:
                  e.rank === 1
                    ? "rgba(0,255,204,0.08)"
                    : "rgba(0,255,204,0.03)",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  background:
                    e.rank === 1
                      ? "rgba(255,215,0,0.2)"
                      : e.rank === 2
                        ? "rgba(192,192,192,0.2)"
                        : e.rank === 3
                          ? "rgba(205,127,50,0.2)"
                          : "transparent",
                  border: `1px solid ${e.rank <= 3 ? CYAN : BORDER}`,
                  fontSize: 10,
                  fontWeight: 700,
                  color: e.rank <= 3 ? CYAN : CYAN_DIM,
                }}
              >
                {e.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: TEXT,
                    letterSpacing: 0.5,
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{ fontSize: 8, color: CYAN_DIM, letterSpacing: 0.5 }}
                >
                  {e.plotsOwned} PLOTS
                </div>
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: CYAN,
                  letterSpacing: 0.5,
                }}
              >
                {fmt2(e.frntEarned)} FRNTR
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        className="rounded-lg p-2.5 text-center"
        style={{
          background: "rgba(0,255,204,0.03)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: 8, color: CYAN_DIM, letterSpacing: 1 }}>
          YOUR RANK
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: CYAN,
            textShadow: `0 0 12px ${CYAN}`,
            marginTop: 4,
          }}
        >
          #{rankDisplay}
        </div>
        <div style={{ fontSize: 9, color: CYAN_DIM, marginTop: 2 }}>
          {player.plotsOwned.length} PLOTS OWNED
        </div>
      </div>
    </div>
  );
}

/* ─── INTEL Panel ─── */

/* ─── Right Panel (desktop) ─── */
/* RightPanel replaced by BottomSheet */

/* ─── Mobile Drawer ─── */
/* MobileDrawer replaced by BottomSheet */

/* ─── Main Play Component ─── */
export default function Play() {
  const { loginStatus, isAuthenticated, login, identity } =
    useInternetIdentity();
  const controlsRef = useRef<any>(null);
  usePlayerSync();
  const [activeTab, setActiveTab] = useState<BottomNavTab | null>(null);
  const [showUniverse, setShowUniverse] = useState(false);
  const [showPlayNow, setShowPlayNow] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(true);

  const [purchaseToast, setPurchaseToast] = useState<{
    plotId: number;
    rate: number;
  } | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0,
  );

  const player = useGameStore((s) => s.player);
  const setAuth = useGameStore((s) => s.setAuth);
  const addFrntr = useGameStore((s) => s.addFrntr);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const plotHoverCard = useGameStore((s) => s.plotHoverCard);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);

  // Sync principal from II identity when authenticated
  useEffect(() => {
    if (isAuthenticated && identity) {
      const principal = identity.getPrincipal().toText();
      setAuth(principal);
      useGameStore.setState((s) => ({ player: { ...s.player, principal } }));
      setShowAuthOverlay(false);
    }
  }, [isAuthenticated, identity, setAuth]);
  const purchaseToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevPlotsOwnedLen = useRef(player.plotsOwned.length);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Daily login bonus
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastLogin = localStorage.getItem("frontier_last_login");
    if (lastLogin !== today) {
      addFrntr(50);
      toast.success("Daily login bonus: +50 FRNTR", { duration: 5000 });
      localStorage.setItem("frontier_last_login", today);
    }
  }, [addFrntr]);

  const handleTabClick = useCallback((id: BottomNavTab) => {
    setActiveTab((prev) => (prev === id ? null : id));
  }, []);

  const handlePlotSelect = useCallback(
    (plotId: number) => {
      selectPlot(plotId);
      setActiveTab("map" as BottomNavTab);
    },
    [selectPlot],
  );

  useEffect(() => {
    const currentLen = player.plotsOwned.length;
    if (currentLen > prevPlotsOwnedLen.current) {
      const newPlotId = player.plotsOwned[currentLen - 1];
      setPurchaseToast({ plotId: newPlotId, rate: 7 });
      if (purchaseToastTimerRef.current)
        clearTimeout(purchaseToastTimerRef.current);
      purchaseToastTimerRef.current = setTimeout(
        () => setPurchaseToast(null),
        3000,
      );
    }
    prevPlotsOwnedLen.current = currentLen;
  }, [player.plotsOwned]);

  const tabLabel = NAV_ITEMS.find((t) => t.id === activeTab)?.label ?? "";

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "#020509" }}
    >
      {/* Globe canvas — full screen, padded for bars */}
      <div
        className="absolute inset-0"
        style={{
          paddingLeft: windowWidth >= 768 ? 72 : 0,
          paddingTop: 56,
          paddingBottom: 64,
        }}
      >
        <GlobeCanvas
          controlsRef={controlsRef}
          onPlotSelect={handlePlotSelect}
        />
      </div>

      {/* Upper-right fixed overlay: Faucet + Stress Test, above globe but below panels */}
      <div
        style={{
          position: "fixed",
          top: 64,
          right: 12,
          zIndex: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <FaucetOverlay />
        <StressTestPanel />
      </div>

      {/* Top bar — always on top */}
      <TopBar
        onUniverseClick={() => setShowUniverse(true)}
        onPlayNowClick={() => setShowPlayNow(true)}
      />

      {/* Left sidebar — desktop only, fixed */}
      <LeftSidebar activeTab={activeTab} onTabClick={handleTabClick} />

      {/* Bottom nav — all screen sizes */}
      <BottomNav activeTab={activeTab} onTabClick={handleTabClick} />

      {/* Bottom sheet — slides up for all tabs on all screen sizes */}
      <BottomSheet
        isOpen={activeTab !== null}
        title={tabLabel}
        onClose={() => setActiveTab(null)}
        height="70vh"
      >
        {activeTab === "map" && (
          <MapBottomSheet
            onClose={() => setActiveTab(null)}
            controlsRef={controlsRef}
          />
        )}
        {activeTab === "command" && <CommanderPanel />}
        {activeTab === "inventory" && <InventoryPanel />}
        {activeTab === "leaderboard" && <LeaderboardPanel />}
        {activeTab === "universe" && <UniversePanel inline={true} />}
        {activeTab === "intel" && <IntelTab />}
      </BottomSheet>

      {/* Overlays */}
      {plotHoverCard && (
        <PlotHoverCard
          plotId={plotHoverCard.plotId}
          owner={plotHoverCard.owner}
          action={plotHoverCard.action}
          nextStep={plotHoverCard.nextStep}
          onDismiss={() => setPlotHoverCard(null)}
        />
      )}

      {showUniverse && <UniversePanel onClose={() => setShowUniverse(false)} />}

      {showPlayNow && (
        <PlayNowOverlay
          onLogin={() => setShowPlayNow(false)}
          onClose={() => setShowPlayNow(false)}
        />
      )}

      {/* Auth overlay — shown on first visit when not authenticated */}
      {showAuthOverlay && !isAuthenticated && !player.principal && (
        <div
          data-ocid="auth.overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 960,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(1,5,12,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: 400,
              padding: "0 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                padding: "4px 14px",
                borderRadius: 20,
                border: `1px solid ${CYAN}44`,
                fontSize: 8,
                letterSpacing: 3,
                color: CYAN,
                background: "rgba(0,255,204,0.07)",
                textTransform: "uppercase" as const,
                textShadow: `0 0 8px ${CYAN}`,
              }}
            >
              v1.0 LIVE ON ICP
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: CYAN,
                letterSpacing: 4,
                textTransform: "uppercase",
                textShadow: `0 0 30px ${CYAN}, 0 0 60px ${CYAN}44`,
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              FRONTIER:
              <br />
              <span style={{ color: TEXT }}>MISSILE HORIZON</span>
            </h1>
            <p
              style={{
                fontSize: 11,
                color: "rgba(224,244,255,0.6)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Own land on Earth as an NFT plot. Accumulate FRNTR tokens. Fully
              on-chain on the Internet Computer Protocol.
            </p>
            <div
              style={{
                background: "rgba(0,20,40,0.55)",
                border: `1px solid ${BORDER}`,
                borderLeft: `3px solid ${CYAN}`,
                borderRadius: 8,
                padding: "12px 14px",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: CYAN,
                  letterSpacing: 3,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                MISSION BRIEFING
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(224,244,255,0.55)",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                5,882 hex plots divided across Earth. Each plot is yours to own,
                mine, and upgrade. FRNTR: 10 billion tokens, 5B mineable only by
                landowners over 3–5 years. No central server. No middleman.
              </p>
            </div>
            <button
              type="button"
              data-ocid="auth.connect_button"
              onClick={() => {
                if (loginStatus === "logging-in") return;
                login();
              }}
              disabled={loginStatus === "logging-in"}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, rgba(0,255,204,0.25), rgba(0,255,204,0.12))",
                border: `2px solid ${CYAN}`,
                color: CYAN,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 3,
                cursor:
                  loginStatus === "logging-in" ? "not-allowed" : "pointer",
                textTransform: "uppercase" as const,
                boxShadow: `0 0 24px ${CYAN}44`,
                textShadow: `0 0 10px ${CYAN}`,
                opacity: loginStatus === "logging-in" ? 0.7 : 1,
              }}
            >
              {loginStatus === "logging-in"
                ? "CONNECTING..."
                : "CONNECT WALLET"}
            </button>
            <button
              type="button"
              data-ocid="auth.skip_button"
              onClick={() => setShowAuthOverlay(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                color: "rgba(224,244,255,0.4)",
                fontSize: 10,
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              Explore Globe First
            </button>
          </div>
        </div>
      )}

      {/* Purchase toast */}
      {purchaseToast && (
        <div
          data-ocid="map.success_state"
          className="fixed left-1/2 -translate-x-1/2 z-70 flex items-center gap-2.5 px-5 py-2.5 rounded-lg whitespace-nowrap"
          style={{
            bottom: 80,
            background: "rgba(4,12,24,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0,255,204,0.45)",
            borderTop: "2px solid #00ffcc",
            boxShadow: "0 4px 24px rgba(0,255,204,0.18)",
            animation: "slideUpFadeIn 0.3s ease",
          }}
        >
          <span style={{ color: "#00ffcc", fontSize: 13, fontWeight: 700 }}>
            ✓
          </span>
          <span
            className="font-mono"
            style={{
              color: "#00ffcc",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            PLOT #{purchaseToast.plotId} ACQUIRED
          </span>
          <span style={{ color: "rgba(0,255,204,0.45)", fontSize: 9 }}>·</span>
          <span
            className="font-mono"
            style={{
              color: "#ffd700",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}
          >
            +{purchaseToast.rate} FRNTR/DAY
          </span>
        </div>
      )}

      {/* Branding footer */}
      <div
        className="fixed left-1/2 -translate-x-1/2 pointer-events-none z-20 whitespace-nowrap"
        style={{
          bottom: 68,
          fontSize: 7,
          color: "rgba(0,255,204,0.2)",
          letterSpacing: 1,
        }}
      >
        © {new Date().getFullYear()} · BUILT WITH{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          className="pointer-events-auto"
          style={{ color: "rgba(0,255,204,0.35)" }}
          target="_blank"
          rel="noreferrer"
        >
          CAFFEINE.AI
        </a>
      </div>
    </div>
  );
}
