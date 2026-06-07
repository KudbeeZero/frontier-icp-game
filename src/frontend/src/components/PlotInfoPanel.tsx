import { useActor } from "@caffeineai/core-infrastructure";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createActor } from "../backend";
import { SurveyStatus } from "../backend";
import {
  TIER_DAILY_RATES,
  TIER_NAMES,
  UPGRADE_COSTS as UPGRADE_COSTS_MAP,
} from "../constants/tiers";
import { useGameStore } from "../store/gameStore";
import type { PlotData } from "../store/gameStore";
import { ActionConfirmModal } from "./ActionConfirmModal";
import { PostActionToast } from "./PostActionToast";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const TEAL = "#00bcd4";
const BG = "rgba(0,10,20,0.85)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.55)";

// ── Biome config ──────────────────────────────────────────────────────────────
const BIOME_COLORS: Record<string, string> = {
  Temperate: "#4a7c59",
  Desert: "#c8a96e",
  Arctic: "#a8d8ea",
  Tropical: "#2d6a4f",
  Ocean: "#1a4a6e",
  DeepOcean: "#0d2d45",
  Volcanic: "#c0392b",
  AsteroidImpact: "#7b5ea7",
  Forest: "#4a7c59",
  Grassland: "#4a7c59",
  Mountain: "#a8d8ea",
};

const BIOME_ICONS: Record<string, string> = {
  Temperate: "🌿",
  Desert: "🏜️",
  Arctic: "❄️",
  Tropical: "🌴",
  Ocean: "🌊",
  DeepOcean: "🌑",
  Volcanic: "🌋",
  AsteroidImpact: "☄️",
  Forest: "🌳",
  Grassland: "🌾",
  Mountain: "⛰️",
};

export { TIER_DAILY_RATES };

type Tab = "stats" | "economy" | "survey" | "upgrade";

export function formatIcpPrice(
  priceE8s: bigint | number,
  icpUsdPrice: number | null,
): string {
  const icp = Number(priceE8s) / 1e8;
  const icpStr = icp.toFixed(4);
  if (icpUsdPrice === null) return `${icpStr} ICP`;
  const usd = (icp * icpUsdPrice).toFixed(2);
  return `${icpStr} ICP (~${usd})`;
}

export function getPlotPriceE8s(efficiency: number): number {
  if (efficiency >= 90) return 30_0000_0000;
  if (efficiency >= 80) return 9_0000_0000;
  return 2_5000_0000;
}

function getRarity(efficiency: number): { label: string; color: string } {
  if (efficiency >= 90) return { label: "EPIC", color: "#fbbf24" };
  if (efficiency >= 80) return { label: "RARE", color: "#a855f7" };
  return { label: "COMMON", color: "#22c55e" };
}

function formatFrntr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(n < 10 ? 6 : 4);
}

// ── CSS keyframes injected once ───────────────────────────────────────────────
const STYLE_ID = "plot-panel-keyframes";
function ensureKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = [
    "@keyframes particleFloat {",
    "  0%   { transform:translateY(0px);  opacity:0.7; }",
    "  50%  { opacity:1; }",
    "  100% { transform:translateY(-35px); opacity:0; }",
    "}",
    "@keyframes upgradeFlash {",
    "  0%,100% { box-shadow:0 0 8px #22c55e; border-color:#22c55e; }",
    "  50%     { box-shadow:0 0 24px #22c55e,0 0 48px #22c55e66; }",
    "}",
    ".plot-info-panel-backdrop {",
    "  position:fixed; inset:0; background:rgba(0,0,0,0.45); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px); z-index:49; pointer-events:auto;",
    "}",
    ".plot-info-panel {",
    "  width:380px !important;",
    "}",
    "@media (max-width:639px) {",
    "  .plot-info-panel { width:100vw !important; border-radius:16px 0 0 16px !important; }",
    "}",
  ].join("\n");
  document.head.appendChild(el);
}

// ── Particle positions ────────────────────────────────────────────────────────
const PARTICLES = [
  { top: "15%", left: "8%", delay: "0s", dur: "3.2s", size: 2 },
  { top: "35%", left: "92%", delay: "0.7s", dur: "4.1s", size: 3 },
  { top: "55%", left: "15%", delay: "1.3s", dur: "3.7s", size: 2 },
  { top: "70%", left: "80%", delay: "0.4s", dur: "4.5s", size: 2 },
  { top: "25%", left: "50%", delay: "2.1s", dur: "3.4s", size: 3 },
  { top: "80%", left: "40%", delay: "1.8s", dur: "4.0s", size: 2 },
  { top: "10%", left: "72%", delay: "0.9s", dur: "3.9s", size: 2 },
  { top: "60%", left: "60%", delay: "2.5s", dur: "3.6s", size: 3 },
];

interface PlotInfoPanelProps {
  /** optional callback fired when panel is closed — clears selectedPlot in parent if needed */
  onClose?: () => void;
}

export default function PlotInfoPanel({ onClose }: PlotInfoPanelProps = {}) {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const confirmedFrntBal = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntr = useGameStore((s) => s.accruedFrntSinceSync);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const spendFrntr = useGameStore((s) => s.spendFrntr);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const { actor } = useActor(createActor);

  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [fetchedPriceE8s, setFetchedPriceE8s] = useState<bigint | null>(null);

  // Survey state
  const [surveyCost, setSurveyCost] = useState<number>(0);
  const [surveyView, setSurveyView] = useState<{
    status: SurveyStatus;
    secondsRemaining: number;
    resourcePercentage?: number;
    bonusInfo?: string;
    remainingSeconds?: number;
    estimatedReward?: number;
    isCollectable?: boolean;
    biome?: string;
    resourcePct?: number;
  } | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyError, setSurveyError] = useState("");
  const [surveyTimer, setSurveyTimer] = useState<number>(0);
  const [surveyCollectConfirmOpen, setSurveyCollectConfirmOpen] =
    useState(false);
  const [surveyReportData, setSurveyReportData] = useState<{
    biome: string;
    resourcePct: number;
    rewardE8s: number;
  } | null>(null);

  // Upgrade state
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [upgradeError, setUpgradeError] = useState("");

  // Claim state
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimConfirmOpen, setClaimConfirmOpen] = useState(false);
  const [surveyConfirmOpen, setSurveyConfirmOpen] = useState(false);
  const [upgradeConfirmOpen, setUpgradeConfirmOpen] = useState(false);
  const [postActionType, setPostActionType] = useState<string | null>(null);

  // Per-second unclaimed ticker
  const [unclaimedSecs, setUnclaimedSecs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const plot: PlotData | null =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;

  const plotIdStr = plot ? String(plot.id) : "";
  const isOwnedByMe = plot ? plotsOwned.includes(plotIdStr) : false;
  const currentTier = plot
    ? ((generatorTiers[plotIdStr] ?? plot.generatorTier ?? 0) as number)
    : 0;
  const dailyRate = TIER_DAILY_RATES[currentTier] ?? 7;
  const displayBal = confirmedFrntBal + accruedFrntr;

  // Reset all state on plot change
  // biome-ignore lint/correctness/useExhaustiveDependencies: plot/efficiency used only as fallback; re-running on those changes would cause infinite fetch loops
  useEffect(() => {
    setActiveTab("stats");
    setFetchedPriceE8s(null);
    setSurveyView(null);
    setSurveyError("");
    setSurveyCost(0);
    setUpgradeStatus("idle");
    setUpgradeError("");
    setClaimError("");
    setClaimSuccess(false);
    setUnclaimedSecs(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!actor || selectedPlotId === null) return;
    let cancelled = false;

    (async () => {
      try {
        const price = await actor.getPlotPriceById(String(selectedPlotId));
        if (!cancelled) setFetchedPriceE8s(price);
      } catch (_e) {
        if (!cancelled && plot)
          setFetchedPriceE8s(BigInt(getPlotPriceE8s(plot.efficiency)));
      }
    })();

    (async () => {
      try {
        const cost = await actor.getSurveyCost(String(selectedPlotId));
        if (!cancelled) setSurveyCost(Number(cost) / 1e8);
      } catch (_e) {
        if (!cancelled) setSurveyCost(100);
      }
    })();

    (async () => {
      try {
        const res = await actor.getSurveyStatus(String(selectedPlotId));
        if (!cancelled && "ok" in res) {
          const remaining = Number(
            res.ok.remainingSeconds ?? res.ok.secondsRemaining ?? 0,
          );
          setSurveyView({
            status: res.ok.status,
            secondsRemaining: remaining,
            resourcePercentage: res.ok.result
              ? Number(res.ok.result.resourcePercentage)
              : undefined,
            bonusInfo: res.ok.result?.bonusInfo,
            remainingSeconds: remaining,
            estimatedReward: res.ok.estimatedReward
              ? Number(res.ok.estimatedReward)
              : undefined,
            isCollectable: res.ok.isCollectable ?? false,
            biome: res.ok.biome ?? "",
            resourcePct: res.ok.resourcePct
              ? Number(res.ok.resourcePct)
              : undefined,
          });
          if (res.ok.status === SurveyStatus.InProgress) {
            setSurveyTimer(remaining);
          }
        }
      } catch (_e) {
        // No survey yet — leave null
      }
    })();

    intervalRef.current = setInterval(() => {
      if (!cancelled) setUnclaimedSecs((s) => s + 1);
    }, 1000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actor, selectedPlotId]);

  const isVisible = selectedPlotId !== null && plot !== null;
  const biomeColor = plot ? (BIOME_COLORS[plot.biome] ?? "#4a7c59") : "#4a7c59";
  const biomeIcon = plot ? (BIOME_ICONS[plot.biome] ?? "🌍") : "🌍";
  const rarity = plot
    ? getRarity(plot.efficiency)
    : { label: "COMMON", color: "#22c55e" };
  const efficiency = plot ? Math.max(0, Math.min(100, plot.efficiency)) : 0;
  const effColor =
    efficiency >= 85 ? "#22c55e" : efficiency >= 70 ? "#f59e0b" : "#ef4444";
  const priceE8s =
    fetchedPriceE8s ?? (plot ? BigInt(getPlotPriceE8s(plot.efficiency)) : null);

  const perSecond = dailyRate / 86400;
  const unclaimedEst = isOwnedByMe ? unclaimedSecs * perSecond : 0;

  const nextTier = Math.min(6, currentTier + 1);
  const upgradeCost = UPGRADE_COSTS_MAP[nextTier] ?? 0;
  const canAfford = displayBal >= upgradeCost;
  const isMaxTier = currentTier >= 6;

  // ── Survey actions ────────────────────────────────────────────────────────
  const openSurveyConfirm = () => setSurveyConfirmOpen(true);
  const handleCancelSurvey = () => {
    (async () => {
      try {
        await actor?.logCancelledAction(
          "purchaseSurveyReport",
          plot?.id ? String(plot.id) : null,
          null,
          "User cancelled survey purchase",
        );
      } catch {}
    })();
    setSurveyConfirmOpen(false);
  };
  async function executeSurvey() {
    if (!actor || !plot) return;
    setSurveyLoading(true);
    setSurveyError("");
    try {
      spendFrntr(surveyCost);
      const res = await actor.startSurvey(plotIdStr);
      if ("ok" in res) {
        const statusRes = await actor.getSurveyStatus(plotIdStr);
        if ("ok" in statusRes) {
          setPostActionType("survey");
          setSurveyView({
            status: statusRes.ok.status,
            secondsRemaining: Number(statusRes.ok.secondsRemaining),
            resourcePercentage: statusRes.ok.result
              ? Number(statusRes.ok.result.resourcePercentage)
              : undefined,
            bonusInfo: statusRes.ok.result?.bonusInfo,
          });
        }
      } else {
        setSurveyError(res.err ?? "Survey failed");
      }
    } catch (_e) {
      setSurveyError("Survey failed — please retry");
    } finally {
      setSurveyLoading(false);
    }
  }

  // ── Upgrade actions ───────────────────────────────────────────────────────
  const openUpgradeConfirm = () => setUpgradeConfirmOpen(true);
  const handleCancelUpgrade = () => {
    (async () => {
      try {
        await actor?.logCancelledAction(
          "upgradeGenerator",
          plot?.id ? String(plot.id) : null,
          null,
          "User cancelled upgrade",
        );
      } catch {}
    })();
    setUpgradeConfirmOpen(false);
  };
  async function executeUpgrade() {
    if (!actor || !plot || !canAfford || isMaxTier) return;
    setUpgradeLoading(true);
    setUpgradeStatus("idle");
    setUpgradeError("");
    try {
      const res = await actor.upgradeGenerator(plotIdStr);
      if ("ok" in res) {
        spendFrntr(upgradeCost);
        setUpgradeStatus("success");
        setPostActionType("upgrade");
        setTimeout(() => setUpgradeStatus("idle"), 3000);
        try {
          const state = await actor.getPlayerState();
          setFrntrBalance(state.frntBalance);
        } catch (_e) {
          /* ignore */
        }
      } else {
        const errStr =
          typeof res.err === "string" ? res.err : JSON.stringify(res.err);
        setUpgradeError(errStr);
        setUpgradeStatus("error");
      }
    } catch (_e) {
      setUpgradeError("Upgrade failed — please retry");
      setUpgradeStatus("error");
    } finally {
      setUpgradeLoading(false);
    }
  }

  // ── Claim actions ─────────────────────────────────────────────────────────
  const openClaimConfirm = () => setClaimConfirmOpen(true);
  const handleCancelClaim = () => {
    (async () => {
      try {
        await actor?.logCancelledAction(
          "claimAccumulatedTokens",
          plot?.id ? String(plot.id) : null,
          null,
          "User cancelled token claim",
        );
      } catch {}
    })();
    setClaimConfirmOpen(false);
  };
  async function executeClaim() {
    if (!actor || !plot || !isOwnedByMe) return;
    setClaimLoading(true);
    setClaimError("");
    setClaimSuccess(false);
    try {
      const res = await actor.claimAccumulatedTokens(plotIdStr);
      if ("ok" in res) {
        setClaimSuccess(true);
        setPostActionType("claim");
        setUnclaimedSecs(0);
        setTimeout(() => setClaimSuccess(false), 3000);
        try {
          const state = await actor.getPlayerState();
          setFrntrBalance(state.frntBalance);
        } catch (_e) {
          /* ignore */
        }
      } else {
        setClaimError(res.err ?? "Claim failed");
      }
    } catch (_e) {
      setClaimError("Claim failed — please retry");
    } finally {
      setClaimLoading(false);
    }
  }

  // ── Shared style helpers ──────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1.5,
    color: CYAN_DIM,
    fontFamily: "monospace",
    textTransform: "uppercase" as const,
  };

  // Bottom nav height: 64px on mobile (md:hidden)
  const BOTTOM_NAV_H = 64;

  const panelStyle: React.CSSProperties = {
    background: BG,
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    border: `1px solid ${BORDER}`,
    borderRight: "none",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 14,
    position: "fixed",
    top: 56,
    right: 0,
    bottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
    width: 380,
    maxHeight: `calc(100vh - 56px - ${BOTTOM_NAV_H}px - env(safe-area-inset-bottom, 0px))`,
    overflowY: "auto",
    overflowX: "hidden",
    zIndex: 50,
    padding: 0,
    boxSizing: "border-box",
    // Static glow border — no animation pulse per design spec
    boxShadow:
      "0 0 0 1px rgba(0,255,204,0.35), 0 0 28px rgba(0,255,204,0.22), 0 0 64px rgba(0,188,212,0.10), inset 0 0 18px rgba(0,255,204,0.04)",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop dim — sits between globe and panel */}
          <motion.div
            key="plot-info-backdrop"
            className="plot-info-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            onClick={() => {
              selectPlot(null);
              onClose?.();
            }}
            aria-hidden="true"
          />
          <motion.div
            key="plot-info-panel"
            data-ocid="plot_info.panel"
            className="plot-info-panel"
            style={panelStyle}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "tween",
              duration: 0.42,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Scan-line overlay */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,255,0.025) 3px,rgba(0,255,255,0.025) 4px)",
                pointerEvents: "none",
                borderRadius: 14,
                zIndex: 0,
              }}
            />

            {/* Floating particles */}
            {isVisible &&
              PARTICLES.map((p) => (
                <div
                  key={`${p.top}-${p.left}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: p.top,
                    left: p.left,
                    width: p.size,
                    height: p.size,
                    borderRadius: "50%",
                    background: CYAN,
                    boxShadow: `0 0 ${p.size * 3}px ${CYAN}`,
                    animation: `particleFloat ${p.dur} ${p.delay} ease-in-out infinite`,
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              ))}

            {/* Content layer */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "14px 14px 18px",
                scrollSnapAlign: "start",
                minHeight: "calc(100vh - 90px)",
              }}
            >
              {/* Close button */}
              <button
                type="button"
                data-ocid="plot_info.close_button"
                onClick={() => {
                  selectPlot(null);
                  onClose?.();
                }}
                aria-label="Close panel"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: "rgba(0,255,204,0.08)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  color: CYAN,
                  fontSize: 14,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "3px 7px",
                  transition: "all 0.15s",
                }}
              >
                ×
              </button>

              {plot && (
                <>
                  {/* Header: Plot ID + rarity badge */}
                  <div style={{ marginBottom: 10, paddingRight: 28 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: CYAN,
                          fontFamily: "monospace",
                          letterSpacing: 1,
                        }}
                      >
                        PLOT #{plot.id}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: rarity.color,
                          background: `${rarity.color}18`,
                          border: `1px solid ${rarity.color}55`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          letterSpacing: 1,
                          fontFamily: "monospace",
                        }}
                      >
                        {rarity.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(0,255,204,0.4)",
                        fontFamily: "monospace",
                      }}
                    >
                      {plot.lat.toFixed(2)}°N · {plot.lng.toFixed(2)}°E
                    </div>
                  </div>

                  {/* Biome badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: `${biomeColor}18`,
                      border: `1px solid ${biomeColor}66`,
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{biomeIcon}</span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: biomeColor,
                        letterSpacing: 1.5,
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                      }}
                    >
                      {plot.biome}
                    </span>
                  </div>

                  {/* Tabs */}
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      marginBottom: 14,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {(["stats", "economy", "survey", "upgrade"] as Tab[]).map(
                      (tab) => (
                        <button
                          key={tab}
                          type="button"
                          data-ocid={`plot_info.${tab}.tab`}
                          onClick={() => setActiveTab(tab)}
                          style={{
                            flex: 1,
                            background:
                              activeTab === tab ? `${CYAN}14` : "transparent",
                            border: "none",
                            borderBottom:
                              activeTab === tab
                                ? `2px solid ${CYAN}`
                                : "2px solid transparent",
                            color: activeTab === tab ? CYAN : TEXT_DIM,
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: 1,
                            fontFamily: "monospace",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            padding: "6px 2px",
                            transition: "all 0.15s",
                          }}
                        >
                          {tab}
                        </button>
                      ),
                    )}
                  </div>

                  {/* ─── TAB: STATS ─────────────────────────────────────────────── */}
                  {activeTab === "stats" && (
                    <div data-ocid="plot_info.stats.panel">
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span style={labelStyle}>RESOURCE YIELD</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: effColor,
                              fontFamily: "monospace",
                            }}
                          >
                            {efficiency >= 80
                              ? "High Yield"
                              : efficiency >= 65
                                ? "Med Yield"
                                : "Low Yield"}{" "}
                            · {efficiency}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: "rgba(255,255,255,0.07)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${efficiency}%`,
                              background: `linear-gradient(90deg,${effColor},${effColor}88)`,
                              borderRadius: 3,
                              transition: "width 0.5s ease",
                              boxShadow: `0 0 6px ${effColor}66`,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <span style={labelStyle}>EFFICIENCY</span>
                        <span
                          style={{
                            fontSize: 9,
                            color: effColor,
                            fontFamily: "monospace",
                            fontWeight: 700,
                          }}
                        >
                          {efficiency}%
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <span style={labelStyle}>OWNER</span>
                        <span
                          style={{
                            fontSize: 9,
                            color: TEXT,
                            fontFamily: "monospace",
                          }}
                        >
                          {!plot.owner
                            ? "UNOWNED"
                            : plot.isOwnedByMe
                              ? "YOU"
                              : `${plot.owner.slice(0, 8)}…${plot.owner.slice(-4)}`}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 14,
                        }}
                      >
                        <span style={labelStyle}>REGION</span>
                        <span
                          style={{
                            fontSize: 9,
                            color: TEXT_DIM,
                            fontFamily: "monospace",
                          }}
                        >
                          {plot.lat >= 0 ? "N" : "S"}
                          {Math.abs(plot.lat).toFixed(1)}° ·{" "}
                          {plot.lng >= 0 ? "E" : "W"}
                          {Math.abs(plot.lng).toFixed(1)}°
                        </span>
                      </div>

                      {/* Sub-parcels locked row */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ ...labelStyle, marginBottom: 6 }}>
                          SUB-PARCELS
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["n", "ne", "se", "s", "sw", "nw", "c"].map(
                            (slot) => (
                              <div
                                key={`subparcel-${slot}`}
                                title="Coming Soon"
                                style={{
                                  flex: 1,
                                  aspectRatio: "1",
                                  background: "rgba(100,100,120,0.12)",
                                  border: "1px solid rgba(100,100,140,0.3)",
                                  borderRadius: 4,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 1,
                                }}
                              >
                                <span style={{ fontSize: 8 }}>🔒</span>
                                <span
                                  style={{
                                    fontSize: 5,
                                    color: "rgba(160,160,180,0.5)",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  SOON
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {!plot.owner && priceE8s !== null && (
                        <div
                          data-ocid="plot_info.price_display"
                          style={{
                            padding: "8px 10px",
                            background: "rgba(0,255,204,0.06)",
                            border: `1px solid ${BORDER}`,
                            borderRadius: 8,
                            fontSize: 10,
                            color: CYAN,
                            fontFamily: "monospace",
                            textAlign: "center",
                            letterSpacing: 0.5,
                          }}
                        >
                          {formatIcpPrice(priceE8s, icpUsdPrice)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB: ECONOMY ───────────────────────────────────────────── */}
                  {activeTab === "economy" && (
                    <div data-ocid="plot_info.economy.panel">
                      {!isOwnedByMe ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "24px 0",
                            color: TEXT_DIM,
                            fontSize: 10,
                            fontFamily: "monospace",
                            letterSpacing: 1,
                          }}
                        >
                          Purchase this plot to
                          <br />
                          activate token generation
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              padding: "10px 12px",
                              background: `${CYAN}0a`,
                              border: `1px solid ${CYAN}22`,
                              borderRadius: 8,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ ...labelStyle, marginBottom: 4 }}>
                              GENERATOR TIER
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: CYAN,
                                fontFamily: "monospace",
                              }}
                            >
                              Tier {currentTier} — {TIER_NAMES[currentTier]}
                            </div>
                          </div>

                          <div style={{ marginBottom: 14 }}>
                            <div style={{ ...labelStyle, marginBottom: 6 }}>
                              TOKEN GENERATION
                            </div>
                            {(
                              [
                                {
                                  label: "/SECOND",
                                  val: (dailyRate / 86400).toFixed(8),
                                },
                                {
                                  label: "/MINUTE",
                                  val: (dailyRate / 1440).toFixed(6),
                                },
                                {
                                  label: "/HOUR",
                                  val: (dailyRate / 24).toFixed(4),
                                },
                                { label: "/DAY", val: dailyRate.toFixed(2) },
                              ] as { label: string; val: string }[]
                            ).map(({ label, val }) => (
                              <div
                                key={label}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  padding: "4px 0",
                                  borderBottom:
                                    "1px solid rgba(0,255,204,0.07)",
                                }}
                              >
                                <span style={labelStyle}>{label}</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: TEAL,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {val} FRNTR
                                </span>
                              </div>
                            ))}
                          </div>

                          <div
                            style={{
                              padding: "10px 12px",
                              background: "rgba(0,188,212,0.08)",
                              border: "1px solid rgba(0,188,212,0.25)",
                              borderRadius: 8,
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                              }}
                            >
                              <span style={labelStyle}>UNCLAIMED (EST.)</span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: TEAL,
                                  fontFamily: "monospace",
                                }}
                              >
                                {formatFrntr(unclaimedEst)} FRNTR
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 8,
                                color: CYAN_DIM,
                                fontFamily: "monospace",
                              }}
                            >
                              {(dailyRate / 86400).toFixed(8)}/sec
                            </div>
                          </div>

                          {claimSuccess ? (
                            <div
                              data-ocid="plot_info.claim.success_state"
                              style={{
                                padding: "10px",
                                background: "rgba(34,197,94,0.1)",
                                border: "1px solid rgba(34,197,94,0.4)",
                                borderRadius: 8,
                                textAlign: "center",
                                fontSize: 10,
                                color: "#22c55e",
                                fontFamily: "monospace",
                                fontWeight: 700,
                                letterSpacing: 1,
                              }}
                            >
                              ✓ TOKENS CLAIMED
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-ocid="plot_info.claim.button"
                              onClick={openClaimConfirm}
                              disabled={claimLoading}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: claimLoading
                                  ? "rgba(0,255,204,0.06)"
                                  : `linear-gradient(135deg,${CYAN}22,${TEAL}18)`,
                                border: `1px solid ${CYAN}55`,
                                borderRadius: 8,
                                color: claimLoading ? CYAN_DIM : CYAN,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 2,
                                cursor: claimLoading ? "wait" : "pointer",
                                fontFamily: "monospace",
                                transition: "all 0.15s",
                                boxShadow: claimLoading
                                  ? "none"
                                  : `0 0 12px ${CYAN}22`,
                              }}
                            >
                              {claimLoading ? "CLAIMING..." : "CLAIM TOKENS"}
                            </button>
                          )}
                          {claimError && (
                            <div
                              data-ocid="plot_info.claim.error_state"
                              style={{
                                fontSize: 9,
                                color: "#ef4444",
                                marginTop: 6,
                                fontFamily: "monospace",
                                textAlign: "center",
                              }}
                            >
                              {claimError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ─── TAB: SURVEY ────────────────────────────────────────────── */}
                  {activeTab === "survey" && (
                    <div data-ocid="plot_info.survey.panel">
                      {!isOwnedByMe ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "24px 0",
                            color: TEXT_DIM,
                            fontSize: 10,
                            fontFamily: "monospace",
                            letterSpacing: 1,
                          }}
                        >
                          Purchase this plot to
                          <br />
                          unlock survey features
                        </div>
                      ) : surveyView === null ? (
                        <div>
                          <div
                            style={{
                              padding: "12px",
                              background: "rgba(0,188,212,0.06)",
                              border: "1px solid rgba(0,188,212,0.2)",
                              borderRadius: 8,
                              marginBottom: 14,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: TEXT,
                                fontFamily: "monospace",
                                marginBottom: 4,
                              }}
                            >
                              SURVEY REPORT
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: TEXT_DIM,
                                fontFamily: "monospace",
                                lineHeight: 1.5,
                              }}
                            >
                              Unlock detailed resource data and yield
                              predictions for this plot.
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 14,
                            }}
                          >
                            <span style={labelStyle}>SURVEY COST</span>
                            <span
                              style={{
                                fontSize: 10,
                                color: CYAN,
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              {surveyCost.toFixed(2)} FRNTR
                            </span>
                          </div>
                          {surveyError && (
                            <div
                              data-ocid="plot_info.survey.error_state"
                              style={{
                                fontSize: 9,
                                color: "#ef4444",
                                marginBottom: 8,
                                fontFamily: "monospace",
                              }}
                            >
                              {surveyError}
                            </div>
                          )}
                          <button
                            type="button"
                            data-ocid="plot_info.survey.button"
                            onClick={openSurveyConfirm}
                            disabled={surveyLoading || displayBal < surveyCost}
                            style={{
                              width: "100%",
                              padding: "10px",
                              background:
                                displayBal >= surveyCost
                                  ? `linear-gradient(135deg,${TEAL}22,${CYAN}18)`
                                  : "rgba(100,100,120,0.1)",
                              border: `1px solid ${displayBal >= surveyCost ? TEAL : "rgba(100,100,140,0.3)"}`,
                              borderRadius: 8,
                              color:
                                displayBal >= surveyCost
                                  ? TEAL
                                  : "rgba(160,160,180,0.5)",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 2,
                              cursor:
                                surveyLoading || displayBal < surveyCost
                                  ? "not-allowed"
                                  : "pointer",
                              fontFamily: "monospace",
                              transition: "all 0.15s",
                            }}
                          >
                            {surveyLoading
                              ? "INITIATING..."
                              : displayBal < surveyCost
                                ? "INSUFFICIENT FRNTR"
                                : "PURCHASE SURVEY"}
                          </button>
                        </div>
                      ) : surveyView.status === SurveyStatus.InProgress ||
                        surveyView.secondsRemaining > 0 ? (
                        <div>
                          <div
                            style={{
                              padding: "12px",
                              background: "rgba(245,158,11,0.08)",
                              border: "1px solid rgba(245,158,11,0.25)",
                              borderRadius: 8,
                              marginBottom: 14,
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#f59e0b",
                                fontFamily: "monospace",
                                marginBottom: 6,
                              }}
                            >
                              SURVEYING...
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: TEXT,
                                fontFamily: "monospace",
                                marginBottom: 4,
                              }}
                            >
                              ⏱{" "}
                              {String(Math.floor(surveyTimer / 60)).padStart(
                                2,
                                "0",
                              )}
                              :{String(surveyTimer % 60).padStart(2, "0")}{" "}
                              remaining
                            </div>
                            <div
                              style={{
                                fontSize: 8,
                                color: CYAN_DIM,
                                fontFamily: "monospace",
                              }}
                            >
                              {surveyView?.estimatedReward
                                ? `Est. reward: ~${(surveyView.estimatedReward / 1e8).toFixed(2)} FRNTR`
                                : "Analyzing plot data..."}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={labelStyle}>BIOME</span>
                            <span
                              style={{
                                fontSize: 9,
                                color: biomeColor,
                                fontFamily: "monospace",
                              }}
                            >
                              {plot.biome}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={labelStyle}>RESOURCE %</span>
                            <span
                              style={{
                                fontSize: 9,
                                color: effColor,
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              {efficiency}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              padding: "12px",
                              background: "rgba(34,197,94,0.08)",
                              border: "1px solid rgba(34,197,94,0.3)",
                              borderRadius: 8,
                              marginBottom: 14,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#22c55e",
                                fontFamily: "monospace",
                                marginBottom: 2,
                              }}
                            >
                              ✓ SURVEY COMPLETE
                            </div>
                            <div
                              style={{
                                fontSize: 8,
                                color: TEXT_DIM,
                                fontFamily: "monospace",
                              }}
                            >
                              Detailed resource data unlocked
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={labelStyle}>BIOME</span>
                            <span
                              style={{
                                fontSize: 9,
                                color: biomeColor,
                                fontFamily: "monospace",
                              }}
                            >
                              {plot.biome}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <span style={labelStyle}>RESOURCE DENSITY</span>
                            <span
                              style={{
                                fontSize: 9,
                                color: effColor,
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              {surveyView.resourcePercentage !== undefined
                                ? `${surveyView.resourcePercentage}%`
                                : `${efficiency}%`}
                            </span>
                          </div>
                          {surveyView.bonusInfo && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                              }}
                            >
                              <span style={labelStyle}>SPECIAL</span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: TEAL,
                                  fontFamily: "monospace",
                                }}
                              >
                                {surveyView.bonusInfo}
                              </span>
                            </div>
                          )}
                          <div
                            style={{
                              padding: "10px 12px",
                              background: "rgba(0,188,212,0.06)",
                              border: "1px solid rgba(0,188,212,0.2)",
                              borderRadius: 8,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ ...labelStyle, marginBottom: 6 }}>
                              PREDICTION MODEL
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: TEXT_DIM,
                                fontFamily: "monospace",
                                lineHeight: 1.5,
                              }}
                            >
                              Projected yield: {Math.floor(efficiency * 12)}–
                              {Math.floor(efficiency * 18)} FRNTR
                            </div>
                            <div
                              style={{
                                fontSize: 8,
                                color: CYAN_DIM,
                                fontFamily: "monospace",
                                marginTop: 2,
                              }}
                            >
                              Based on biome · efficiency · tier {currentTier}
                            </div>
                          </div>
                          {surveyView?.isCollectable ? (
                            <button
                              type="button"
                              data-ocid="plot_info.survey.collect_button"
                              onClick={() => setSurveyCollectConfirmOpen(true)}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: "rgba(34,197,94,0.15)",
                                border: "1px solid rgba(34,197,94,0.6)",
                                borderRadius: 8,
                                color: "rgba(34,197,94,1)",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 2,
                                cursor: "pointer",
                                fontFamily: "monospace",
                              }}
                            >
                              ✓ COLLECT REPORT
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-ocid="plot_info.survey.collect_button"
                              disabled
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: "rgba(34,197,94,0.08)",
                                border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: 8,
                                color: "rgba(34,197,94,0.5)",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 2,
                                cursor: "not-allowed",
                                fontFamily: "monospace",
                              }}
                            >
                              {surveyTimer > 0
                                ? `READY IN ${String(Math.floor(surveyTimer / 60)).padStart(2, "0")}:${String(surveyTimer % 60).padStart(2, "0")}`
                                : "PENDING..."}
                            </button>
                          )}
                          {surveyReportData && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: "rgba(0,255,200,0.05)",
                                border: "1px solid rgba(0,255,200,0.2)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#67e8f9",
                                  letterSpacing: 1.2,
                                  marginBottom: 6,
                                }}
                              >
                                SURVEY REPORT
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#e2e8f0",
                                  marginBottom: 4,
                                }}
                              >
                                Biome:{" "}
                                <span style={{ color: "#a5f3fc" }}>
                                  {surveyReportData.biome}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#e2e8f0",
                                  marginBottom: 4,
                                }}
                              >
                                Resource Richness:
                              </div>
                              <div
                                style={{
                                  height: 6,
                                  borderRadius: 3,
                                  background: "rgba(255,255,255,0.1)",
                                  marginBottom: 8,
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: 3,
                                    background:
                                      "linear-gradient(90deg, #06b6d4, #10b981)",
                                    width: `${surveyReportData.resourcePct}%`,
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "#94a3b8",
                                  letterSpacing: 0.5,
                                }}
                              >
                                MINING ANALYSIS:{" "}
                                <span style={{ color: "#475569" }}>
                                  COMING SOON
                                </span>
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 10,
                                  color: "#34d399",
                                }}
                              >
                                Reward: +
                                {(surveyReportData.rewardE8s / 1e8).toFixed(4)}{" "}
                                FRNTR
                              </div>
                            </div>
                          )}
                          {surveyCollectConfirmOpen && (
                            <ActionConfirmModal
                              isOpen={surveyCollectConfirmOpen}
                              actionType="survey"
                              title="Collect Survey Report"
                              details={[
                                {
                                  label: "Plot",
                                  value: String(selectedPlotId || ""),
                                },
                                {
                                  label: "Reward",
                                  value: `~${surveyView?.estimatedReward ? (surveyView.estimatedReward / 1e8).toFixed(2) : "?"} FRNTR`,
                                },
                              ]}
                              warningText="Once collected, the survey report is finalized."
                              onConfirm={async () => {
                                setSurveyCollectConfirmOpen(false);
                                try {
                                  const result = await actor!.claimSurveyReward(
                                    String(selectedPlotId || ""),
                                  );
                                  if ("ok" in result) {
                                    setSurveyReportData({
                                      biome: surveyView?.biome || "",
                                      resourcePct: surveyView?.resourcePct || 0,
                                      rewardE8s: Number(result.ok.rewardE8s),
                                    });
                                  }
                                } catch (e) {
                                  console.error("Survey collect failed", e);
                                }
                              }}
                              onCancel={() =>
                                setSurveyCollectConfirmOpen(false)
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB: UPGRADE ───────────────────────────────────────────── */}
                  {activeTab === "upgrade" && (
                    <div data-ocid="plot_info.upgrade.panel">
                      {!isOwnedByMe ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "24px 0",
                            color: TEXT_DIM,
                            fontSize: 10,
                            fontFamily: "monospace",
                            letterSpacing: 1,
                          }}
                        >
                          Purchase this plot to
                          <br />
                          unlock generator upgrades
                        </div>
                      ) : isMaxTier ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "24px 0",
                            color: "#fbbf24",
                            fontSize: 10,
                            fontFamily: "monospace",
                            letterSpacing: 1,
                          }}
                        >
                          ⭐ MAX TIER REACHED
                          <br />
                          <span style={{ color: TEXT_DIM, fontSize: 9 }}>
                            Singularity Drive active
                          </span>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              padding: "10px 12px",
                              background: `${CYAN}08`,
                              border: `1px solid ${CYAN}18`,
                              borderRadius: 8,
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ ...labelStyle, marginBottom: 3 }}>
                              CURRENT TIER
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: CYAN,
                                fontFamily: "monospace",
                              }}
                            >
                              Tier {currentTier} — {TIER_NAMES[currentTier]}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: TEXT_DIM,
                                fontFamily: "monospace",
                                marginTop: 2,
                              }}
                            >
                              {dailyRate} FRNTR/day
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign: "center",
                              color: CYAN_DIM,
                              fontSize: 14,
                              marginBottom: 6,
                            }}
                          >
                            ↓
                          </div>

                          <div
                            style={{
                              padding: "10px 12px",
                              background: `${TEAL}0a`,
                              border: `1px solid ${TEAL}30`,
                              borderRadius: 8,
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ ...labelStyle, marginBottom: 3 }}>
                              NEXT TIER
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: TEAL,
                                fontFamily: "monospace",
                              }}
                            >
                              Tier {nextTier} — {TIER_NAMES[nextTier]}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: TEXT_DIM,
                                fontFamily: "monospace",
                                marginTop: 2,
                              }}
                            >
                              {TIER_DAILY_RATES[nextTier]} FRNTR/day · +
                              {(TIER_DAILY_RATES[nextTier] ?? 0) - dailyRate}{" "}
                              bonus
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span style={labelStyle}>UPGRADE COST</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: canAfford ? TEAL : "#ef4444",
                                fontFamily: "monospace",
                              }}
                            >
                              {upgradeCost.toLocaleString()} FRNTR
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 14,
                            }}
                          >
                            <span style={labelStyle}>YOUR BALANCE</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: canAfford ? "#22c55e" : "#ef4444",
                                fontFamily: "monospace",
                              }}
                            >
                              {formatFrntr(displayBal)} FRNTR
                            </span>
                          </div>

                          {!canAfford && (
                            <div
                              data-ocid="plot_info.upgrade.insufficient"
                              style={{
                                fontSize: 9,
                                color: "#ef4444",
                                marginBottom: 8,
                                fontFamily: "monospace",
                                textAlign: "center",
                                letterSpacing: 1,
                              }}
                            >
                              INSUFFICIENT FRNTR — need{" "}
                              {(upgradeCost - displayBal).toLocaleString()} more
                            </div>
                          )}

                          {upgradeStatus === "success" ? (
                            <div
                              data-ocid="plot_info.upgrade.success_state"
                              style={{
                                padding: "10px",
                                background: "rgba(34,197,94,0.1)",
                                border: "1px solid rgba(34,197,94,0.4)",
                                animation: "upgradeFlash 0.6s ease 3",
                                borderRadius: 8,
                                textAlign: "center",
                                fontSize: 10,
                                color: "#22c55e",
                                fontFamily: "monospace",
                                fontWeight: 700,
                                letterSpacing: 1,
                              }}
                            >
                              ✓ UPGRADE COMPLETE
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-ocid="plot_info.upgrade.button"
                              onClick={openUpgradeConfirm}
                              disabled={!canAfford || upgradeLoading}
                              style={{
                                width: "100%",
                                padding: "11px",
                                background: canAfford
                                  ? `linear-gradient(135deg,${CYAN}20,${TEAL}18)`
                                  : "rgba(100,100,120,0.1)",
                                border: canAfford
                                  ? `1px solid ${CYAN}55`
                                  : "1px solid rgba(100,100,140,0.25)",
                                borderRadius: 8,
                                color: canAfford
                                  ? CYAN
                                  : "rgba(160,160,180,0.4)",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 2,
                                cursor:
                                  canAfford && !upgradeLoading
                                    ? "pointer"
                                    : "not-allowed",
                                fontFamily: "monospace",
                                transition: "all 0.15s",
                                boxShadow: canAfford
                                  ? `0 0 16px ${CYAN}22`
                                  : "none",
                              }}
                            >
                              {upgradeLoading
                                ? "UPGRADING..."
                                : `UPGRADE TO TIER ${nextTier}`}
                            </button>
                          )}

                          {upgradeStatus === "error" && upgradeError && (
                            <div
                              data-ocid="plot_info.upgrade.error_state"
                              style={{
                                fontSize: 9,
                                color: "#ef4444",
                                marginTop: 6,
                                fontFamily: "monospace",
                                textAlign: "center",
                              }}
                            >
                              {upgradeError}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <ActionConfirmModal
              isOpen={claimConfirmOpen}
              onConfirm={() => {
                setClaimConfirmOpen(false);
                executeClaim();
              }}
              onCancel={handleCancelClaim}
              title="Claim Tokens"
              actionType="claim"
              details={[
                { label: "Plot", value: plot?.id ? String(plot.id) : "" },
              ]}
              warningText="This action is permanent and cannot be undone."
            />
            <ActionConfirmModal
              isOpen={surveyConfirmOpen}
              onConfirm={() => {
                setSurveyConfirmOpen(false);
                executeSurvey();
              }}
              onCancel={handleCancelSurvey}
              title="Purchase Survey"
              actionType="survey"
              details={[
                { label: "Plot", value: plot?.id ? String(plot.id) : "" },
              ]}
              warningText="Survey cost will be deducted from your balance. Cannot be undone."
            />
            <ActionConfirmModal
              isOpen={upgradeConfirmOpen}
              onConfirm={() => {
                setUpgradeConfirmOpen(false);
                executeUpgrade();
              }}
              onCancel={handleCancelUpgrade}
              title="Upgrade Generator"
              actionType="upgrade"
              details={[
                { label: "Plot", value: plot?.id ? String(plot.id) : "" },
              ]}
              warningText="Upgrade cost will be burned. This cannot be undone."
            />
            {postActionType && (
              <PostActionToast
                actionType={postActionType}
                message="Action completed."
                onNavigate={(tab) =>
                  window.dispatchEvent(
                    new CustomEvent("navigate-tab", { detail: tab }),
                  )
                }
                onClose={() => setPostActionType(null)}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
