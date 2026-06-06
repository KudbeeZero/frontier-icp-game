import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Package,
  Radio,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import ActionConfirmModal from "../components/ActionConfirmModal";
import AdminPanel from "../components/AdminPanel";
import BottomNav from "../components/BottomNav";
import { NAV_ITEMS } from "../components/BottomNav";
import type { BottomNavTab } from "../components/BottomNav";
import BottomSheet from "../components/BottomSheet";
import CommandCenter from "../components/CommandCenter";
import FaucetOverlay from "../components/FaucetOverlay";
import GlobeCanvas from "../components/GlobeCanvas";
import IntelTab from "../components/IntelTab";
import MapBottomSheet from "../components/MapBottomSheet";
import MissionsTab from "../components/MissionsTab";
import PlayNowOverlay from "../components/PlayNowOverlay";
import PlotHoverCard from "../components/PlotHoverCard";
import PostActionToast from "../components/PostActionToast";
import RoadmapTab from "../components/RoadmapTab";
import UniversePanel from "../components/UniversePanel";
import { TIER_DAILY_RATES } from "../constants/tiers";
import { useIcpBalance } from "../hooks/useIcpBalance";
import { usePlayerSync } from "../hooks/usePlayerSync";
import { usePurchasePlot } from "../hooks/usePurchasePlot";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

function fmt2(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ─── Top Bar ─── */
function TopBar({
  onPlayNowClick,
  onNavClick,
}: {
  onPlayNowClick: () => void;
  onNavClick: (tab: BottomNavTab) => void;
}) {
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const plots = useGameStore((s) => s.plots);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const { icpBalanceFormatted } = useIcpBalance();
  const { isAuthenticated, clear } = useInternetIdentity();

  const displayFrntr = useGameStore(
    (s) => s.confirmedFrntBalance + s.accruedFrntSinceSync,
  );
  const frntrStr =
    displayFrntr >= 1_000_000
      ? displayFrntr.toFixed(2)
      : displayFrntr >= 1_000
        ? displayFrntr.toFixed(4)
        : displayFrntr.toFixed(8);

  const _totalDailyFrntr = useMemo(() => {
    const ownedPlots = plots.filter((p) =>
      player.plotsOwned.includes(String(p.id)),
    );
    return ownedPlots.reduce((sum, plot) => {
      const tier = (generatorTiers[String(plot.id)] as number) ?? 0;
      return sum + (TIER_DAILY_RATES[tier] ?? 7);
    }, 0);
  }, [plots, player.plotsOwned, generatorTiers]);

  const shortPrincipal = player.principal
    ? `${player.principal.slice(0, 6)}…${player.principal.slice(-4)}`
    : null;

  return (
    <div
      data-ocid="topbar.panel"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: 56,
        paddingLeft: 16,
        paddingRight: 12,
        background: "rgba(2,8,18,0.92)",
        borderBottom: "1px solid rgba(0,255,204,0.18)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* LEFT: Logo */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ minWidth: 140 }}
      >
        {/* Icon mark */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            border: "1px solid rgba(0,255,204,0.4)",
            borderRadius: 4,
            background: "rgba(0,255,204,0.07)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "1px solid rgba(0,255,204,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 1,
              height: 14,
              background: "rgba(0,255,204,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 14,
              height: 1,
              background: "rgba(0,255,204,0.5)",
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: CYAN,
              boxShadow: `0 0 8px ${CYAN}`,
              position: "absolute",
            }}
          />
        </div>
        <span
          className="font-bold tracking-widest select-none"
          style={{
            fontSize: 15,
            color: CYAN,
            letterSpacing: 4,
            textShadow: `0 0 18px ${CYAN}, 0 0 32px rgba(0,255,204,0.35)`,
            textTransform: "uppercase",
          }}
        >
          FRONTIER
        </span>
      </div>

      {/* CENTER: Nav links */}
      <nav
        className="hidden sm:flex items-center gap-1"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {(
          [
            { label: "MAP", tab: "map" as BottomNavTab },
            { label: "LEADERBOARD", tab: "leaderboard" as BottomNavTab },
            { label: "INVENTORY", tab: "inventory" as BottomNavTab },
            { label: "UNIVERSE", tab: "universe" as BottomNavTab },
          ] as { label: string; tab: BottomNavTab }[]
        ).map(({ label, tab }) => (
          <button
            key={tab}
            type="button"
            data-ocid={`topbar.nav.${tab}`}
            onClick={() => onNavClick(tab)}
            className="px-3 py-1 rounded cursor-pointer transition-all duration-200"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(224,244,255,0.65)",
              background: "transparent",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = CYAN;
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(0,255,204,0.3)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(0,255,204,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(224,244,255,0.65)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "transparent";
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* CENTER-RIGHT: ICP/USD price ticker */}
      <div
        data-ocid="topbar.icp_usd_price"
        className="price-ticker-compact hidden sm:flex items-center gap-1 px-2 py-1 rounded"
        style={{
          background: "rgba(0,255,204,0.06)",
          border: "1px solid rgba(0,255,204,0.15)",
          marginRight: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "rgba(224,244,255,0.45)",
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          ICP
        </span>
        <span style={{ fontSize: 10, color: "rgba(224,244,255,0.3)" }}>·</span>
        <span
          className="monospace-number"
          style={{
            fontSize: 11,
            color: icpUsdPrice !== null ? CYAN : "rgba(224,244,255,0.35)",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {icpUsdPrice !== null ? `${icpUsdPrice.toFixed(2)}` : "--"}
        </span>
      </div>

      {/* RIGHT: Wallet badges + principal */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* FRNTR balance badge — hidden on mobile */}
        <div
          data-ocid="topbar.frntr_balance"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.35)",
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 12, color: "#F59E0B", lineHeight: 1 }}>
            ⬡
          </span>
          <span
            className="font-mono font-bold whitespace-nowrap"
            style={{ fontSize: 11, color: "#F59E0B", letterSpacing: 0.5 }}
          >
            {frntrStr} FRNTR
          </span>
        </div>

        {/* ICP balance — full badge on sm+, compact icon-chip on mobile */}
        {/* Mobile compact chip */}
        <div
          data-ocid="topbar.icp_balance_mobile"
          className="flex sm:hidden items-center gap-1 px-1.5 py-1 rounded-md"
          style={{
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${BORDER}`,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 13, color: CYAN, lineHeight: 1 }}>◎</span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: 10, color: CYAN, letterSpacing: 0.3 }}
          >
            {icpBalanceFormatted.toFixed(2)}
          </span>
        </div>
        {/* Desktop full badge */}
        <div
          data-ocid="topbar.icp_balance"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md"
          style={{
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${BORDER}`,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 12, color: CYAN, lineHeight: 1 }}>◎</span>
          <span
            className="font-mono font-bold whitespace-nowrap"
            style={{ fontSize: 11, color: CYAN, letterSpacing: 0.5 }}
          >
            {icpBalanceFormatted.toFixed(2)} ICP
          </span>
        </div>

        {/* Divider — desktop only */}
        <div
          className="hidden sm:block"
          style={{
            width: 1,
            height: 22,
            background: "rgba(0,255,204,0.18)",
            margin: "0 4px",
          }}
        />

        {/* Principal badge + logout */}
        {isAuthenticated && shortPrincipal ? (
          <div className="flex items-center gap-1">
            {/* Mobile: icon-only ID dot */}
            <div
              data-ocid="topbar.principal_badge"
              className="flex items-center gap-1 px-1.5 py-1 rounded-md"
              style={{
                background: "rgba(0,255,204,0.07)",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "rgba(0,255,204,0.18)",
                  border: `1px solid ${CYAN}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 8, color: CYAN, fontWeight: 700 }}>
                  ID
                </span>
              </div>
              {/* Principal text hidden on mobile, visible md+ */}
              <span
                className="font-mono hidden md:inline"
                style={{ fontSize: 9, color: TEXT, letterSpacing: 0.5 }}
                title={player.principal ?? ""}
              >
                {shortPrincipal}
              </span>
            </div>
            <button
              type="button"
              data-ocid="topbar.logout_button"
              onClick={() => clear()}
              aria-label="Disconnect wallet"
              className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200"
              style={{
                width: 28,
                height: 28,
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.3)",
                color: "rgba(255,100,100,0.8)",
                fontSize: 12,
              }}
              title="Disconnect"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-ocid="topbar.connect_button"
            onClick={onPlayNowClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer font-bold uppercase tracking-widest text-[10px] whitespace-nowrap transition-all duration-200"
            style={{
              background: "rgba(0,255,204,0.15)",
              border: `1px solid ${CYAN}`,
              color: CYAN,
              boxShadow: "0 0 12px rgba(0,255,204,0.2)",
            }}
          >
            CONNECT
          </button>
        )}
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
// CommanderPanel removed — Commander NFTs deactivated for v1.0

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
            const plot = plots.find((p) => String(p.id) === String(plotId));
            const tier = generatorTiers[String(plotId)] ?? 0;
            const dailyRate = TIER_DAILY_RATES[tier] ?? 7;

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
                    {plot?.biome ?? "Unknown"} · {dailyRate} FRNTR/DAY ·
                    Resource survey: COMING SOON
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

/* ─── Plot Action Panel ─── */
function PlotActionPanel({
  plotId,
  onClose,
  onOpenTab,
}: {
  plotId: number;
  onClose: () => void;
  onOpenTab: (tab: BottomNavTab) => void;
}) {
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const { actor } = useActor(createActor);
  const { purchasePlot, isPurchasing } = usePurchasePlot();
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [postActionType, setPostActionType] = useState<
    "purchase" | "upgrade" | "claim" | "survey" | "mission" | null
  >(null);

  const plot = plots.find((p) => p.id === plotId);
  if (!plot) return null;

  const isOwned = plot.owner !== null;
  const isMine = plot.isOwnedByMe || player.plotsOwned.includes(String(plotId));
  const eff = plot.efficiency;
  const icpPrice = eff >= 90 ? 30 : eff >= 80 ? 9 : 2.5;

  const shortOwner = plot.owner ? `${plot.owner.slice(0, 6)}...` : "Unowned";

  const infoRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "TYPE", value: plot.biome },
    { label: "EFFICIENCY", value: `${eff}%` },
    { label: "OWNER", value: shortOwner },
    {
      label: "STATUS",
      value: isOwned ? "Owned" : "Available",
      highlight: true,
    },
  ];

  async function handleConfirmPurchase() {
    setShowPurchaseConfirm(false);
    const result = await purchasePlot(String(plotId));
    if (result.success) {
      toast.success(result.message, { duration: 4000 });
      setPostActionType("purchase");
    } else {
      toast.error(result.message, { duration: 5000 });
    }
  }

  function handlePurchase() {
    setShowPurchaseConfirm(true);
  }

  function handleCancelPurchase() {
    try {
      void actor?.logCancelledAction(
        "purchasePlot",
        String(plotId),
        null,
        "User cancelled plot purchase from plot panel",
      );
    } catch (_) {}
    setShowPurchaseConfirm(false);
  }

  return (
    <div
      data-ocid="plot_action_panel.panel"
      style={{
        position: "fixed",
        right: 0,
        top: 56,
        width: 280,
        zIndex: 45,
        bottom: 64,
        background: "rgba(10,14,26,0.90)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderLeft: "1px solid rgba(0,212,255,0.2)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      {/* Close button */}
      <button
        type="button"
        data-ocid="plot_action_panel.close_button"
        onClick={onClose}
        aria-label="Close plot panel"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 24,
          height: 24,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 6,
          color: "rgba(224,244,255,0.7)",
          fontSize: 11,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✕
      </button>

      {/* 2D Sub-parcel tactical view */}
      <div
        style={{
          height: 180,
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid rgba(0,212,255,0.2)",
          background: "rgba(0,10,20,0.6)",
        }}
      >
        {/* sub-parcel view deactivated */}
      </div>

      {/* Plot title */}
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: "#00d4ff",
            letterSpacing: 2,
            textShadow: "0 0 14px rgba(0,212,255,0.6)",
            lineHeight: 1.1,
          }}
        >
          PLOT #{plotId}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(224,244,255,0.45)",
            letterSpacing: 1,
            marginTop: 2,
            textTransform: "uppercase",
          }}
        >
          {plot.biome}
        </div>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 8px",
          padding: "10px 12px",
          background: "rgba(0,212,255,0.03)",
          borderRadius: 8,
          border: "1px solid rgba(0,212,255,0.12)",
        }}
      >
        {infoRows.map(({ label, value, highlight }) => (
          <div key={label}>
            <div
              style={{
                fontSize: 8,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 1,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: highlight
                  ? isOwned
                    ? "#00d4ff"
                    : "#22c55e"
                  : "rgba(224,244,255,0.9)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {isMine ? (
          <>
            <button
              type="button"
              data-ocid="plot_action_panel.upgrade_button"
              onClick={() => onOpenTab("map" as BottomNavTab)}
              className="w-full py-2 rounded tracking-wider uppercase text-xs border transition-colors duration-200"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.35)",
                color: "#fbbf24",
              }}
            >
              UPGRADE
            </button>
            <button
              type="button"
              data-ocid="plot_action_panel.survey_button"
              onClick={() =>
                toast("Survey system coming soon!", { duration: 3000 })
              }
              className="w-full py-2 rounded tracking-wider uppercase text-xs border transition-colors duration-200"
              style={{
                background: "rgba(168,85,247,0.15)",
                border: "1px solid rgba(168,85,247,0.35)",
                color: "#c084fc",
              }}
            >
              SURVEY (COMING SOON)
            </button>
            <button
              type="button"
              data-ocid="plot_action_panel.details_button"
              onClick={() => onOpenTab("map" as BottomNavTab)}
              className="w-full py-2 rounded tracking-wider uppercase text-xs border transition-colors duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              DETAILS
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              data-ocid="plot_action_panel.purchase_button"
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="w-full py-2 rounded tracking-wider uppercase text-xs border transition-colors duration-200"
              style={{
                background: isPurchasing
                  ? "rgba(0,212,255,0.08)"
                  : "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.35)",
                color: isPurchasing ? "rgba(0,212,255,0.5)" : "#67e8f9",
                cursor: isPurchasing ? "not-allowed" : "pointer",
              }}
            >
              {isPurchasing ? "PURCHASING..." : `PURCHASE ${icpPrice} ICP`}
            </button>
            <button
              type="button"
              data-ocid="plot_action_panel.details_button"
              onClick={() => onOpenTab("map" as BottomNavTab)}
              className="w-full py-2 rounded tracking-wider uppercase text-xs border transition-colors duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              DETAILS
            </button>
          </>
        )}
      </div>

      <ActionConfirmModal
        isOpen={showPurchaseConfirm}
        onConfirm={handleConfirmPurchase}
        onCancel={handleCancelPurchase}
        title="Confirm Land Purchase"
        actionType="purchase"
        details={[
          { label: "PLOT ID", value: String(plotId) },
          { label: "BIOME", value: plot.biome },
          { label: "PRICE", value: `${icpPrice} ICP` },
        ]}
        costLabel={`${icpPrice} ICP`}
        warningText="This action is permanent and cannot be undone. The ICP will be deducted immediately."
        isLoading={isPurchasing}
      />
      <PostActionToast
        actionType={postActionType}
        onNavigate={(tab) => onOpenTab(tab as BottomNavTab)}
        onDismiss={() => setPostActionType(null)}
      />
    </div>
  );
}

/* ─── Quick-Nav Popup (shown once after first purchase) ─── */
const QUICK_NAV_LINKS: {
  label: string;
  icon: string;
  tab: BottomNavTab;
  desc: string;
}[] = [
  { label: "INVENTORY", icon: "📦", tab: "inventory", desc: "View your plots" },
  { label: "CMD CENTER", icon: "⬡", tab: "command", desc: "Token dashboard" },
  { label: "UNIVERSE", icon: "◎", tab: "universe", desc: "Global stats" },
  { label: "LEADERBOARD", icon: "🏆", tab: "leaderboard", desc: "Rankings" },
];

function QuickNavPopup({
  onNavigate,
  onDismiss,
}: {
  onNavigate: (tab: BottomNavTab) => void;
  onDismiss: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  return (
    <div
      data-ocid="quick_nav.panel"
      style={{
        position: "fixed",
        bottom: 84,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "min(96vw, 420px)",
        background: "rgba(4,12,28,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${CYAN}44`,
        borderTop: `2px solid ${CYAN}`,
        borderRadius: 12,
        boxShadow: `0 0 40px ${CYAN}22, 0 8px 32px rgba(0,0,0,0.6)`,
        padding: "14px 16px 16px",
        animation: "slideUpFadeIn 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: CYAN,
              letterSpacing: 2.5,
              fontWeight: 700,
              textTransform: "uppercase",
              textShadow: `0 0 8px ${CYAN}`,
            }}
          >
            ▶ PLOT ACQUIRED — QUICK ACCESS
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(224,244,255,0.4)",
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            Where would you like to go next?
          </div>
        </div>
        <button
          type="button"
          data-ocid="quick_nav.close_button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(224,244,255,0.5)",
            fontSize: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Nav buttons grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {QUICK_NAV_LINKS.map(({ label, icon, tab, desc }) => (
          <button
            key={tab}
            type="button"
            data-ocid={`quick_nav.${tab}.button`}
            onClick={() => onNavigate(tab)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 6px",
              borderRadius: 8,
              border: `1px solid ${CYAN}28`,
              background: "rgba(0,255,204,0.05)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(0,255,204,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                `${CYAN}66`;
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 0 12px ${CYAN}22`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(0,255,204,0.05)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                `${CYAN}28`;
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: CYAN,
                textTransform: "uppercase",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 7,
                color: "rgba(224,244,255,0.35)",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {desc}
            </span>
          </button>
        ))}
      </div>

      {/* Auto-dismiss hint */}
      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 7.5,
          color: "rgba(224,244,255,0.22)",
          letterSpacing: 0.5,
        }}
      >
        Auto-dismisses in 8s · This appears only once
      </div>
    </div>
  );
}

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

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);

  const [purchaseToast, setPurchaseToast] = useState<{
    plotId: string;
    rate: number;
  } | null>(null);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const quickNavShownRef = useRef(false);
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
      // PlotActionPanel slides in from the right — no need to open bottom sheet
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
      // Show one-time quick-nav popup after first ever purchase
      if (
        !quickNavShownRef.current &&
        !sessionStorage.getItem("frontier_quicknav_shown")
      ) {
        quickNavShownRef.current = true;
        sessionStorage.setItem("frontier_quicknav_shown", "1");
        setTimeout(() => setShowQuickNav(true), 3200);
      }
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
          zIndex: 35,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <FaucetOverlay />
      </div>

      {/* Top bar — always on top */}
      <TopBar
        onPlayNowClick={() => setShowPlayNow(true)}
        onNavClick={(tab) => handleTabClick(tab)}
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
        {activeTab === "command" && <CommandCenter />}
        {activeTab === "inventory" && <InventoryPanel />}
        {activeTab === "leaderboard" && <LeaderboardPanel />}
        {activeTab === "universe" && <UniversePanel inline={true} />}
        {activeTab === "intel" && <IntelTab />}
        {activeTab === "missions" && <MissionsTab />}
        {activeTab === "admin" && <AdminPanel />}
        {activeTab === "roadmap" && <RoadmapTab />}
      </BottomSheet>

      {/* Plot Action Panel — slides in from right when a plot is selected */}
      {selectedPlotId !== null && (
        <PlotActionPanel
          plotId={selectedPlotId}
          onClose={() => selectPlot(null)}
          onOpenTab={(tab) => {
            setActiveTab(tab);
          }}
        />
      )}

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
            zIndex: 9999,
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
                10,242 hex plots divided across Earth. Each plot is yours to
                own, mine, and upgrade. FRNTR: 10 billion tokens, 5B mineable
                only by landowners over 3–5 years. No central server. No
                middleman.
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

      {/* Purchase success quick-nav popup — shown once per session after first purchase */}
      {showQuickNav && (
        <QuickNavPopup
          onNavigate={(tab) => {
            setActiveTab(tab);
            setShowQuickNav(false);
          }}
          onDismiss={() => setShowQuickNav(false)}
        />
      )}

      {/* Purchase toast */}
      {purchaseToast && (
        <div
          data-ocid="map.success_state"
          className="fixed left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-5 py-2.5 rounded-lg whitespace-nowrap"
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
