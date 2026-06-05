import { useActor } from "@caffeineai/core-infrastructure";
import {
  Cpu,
  Folder,
  Globe,
  Lock,
  Pickaxe,
  Radio,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createActor } from "../backend";
import { getMineralYield, projectedMonthlyYield } from "../constants/minerals";
import { usePurchasePlot } from "../hooks/usePurchasePlot";
import {
  type GeneratorTier,
  type PlotSpecialization,
  type SubParcel,
  useGameStore,
} from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.15)";

const BIOME_BADGE_COLORS: Record<string, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

const COMMANDER_IMAGES: Record<string, string> = {
  "NOVA PRIME":
    "/assets/generated/commander-nova-prime-transparent.dim_300x300.png",
  "IRON CLAW":
    "/assets/generated/commander-iron-claw-transparent.dim_300x300.png",
  "PHANTOM OPS":
    "/assets/generated/commander-phantom-ops-transparent.dim_300x300.png",
  "VOID HUNTER":
    "/assets/generated/commander-void-hunter-transparent.dim_300x300.png",
};

function _getCountdown(purchaseTime: number): string {
  const unlockAt = purchaseTime + 4 * 60 * 60 * 1000;
  const remaining = unlockAt - Date.now();
  if (remaining <= 0) return "READY";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function focusOnPlot(
  lat: number,
  lng: number,
  controlsRef?: React.RefObject<any>,
) {
  if (!controlsRef?.current) return;
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  const r = 2.2;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const controls = controlsRef.current;
  controls.target?.set?.(0, 0, 0);
  const cam = controls.object;
  if (cam) {
    cam.position.set(x, y, z);
    controls.update?.();
  }
}

function actionBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 0",
    background: bg,
    border: `1px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    cursor: "pointer",
    textShadow: `0 0 10px ${color}`,
    boxShadow: `0 0 20px ${color}20`,
    transition: "all 0.2s",
    fontFamily: "monospace",
  };
}

interface MapBottomSheetProps {
  onClose: () => void;
  controlsRef?: React.RefObject<any>;
}

interface SurveyReportProps {
  plot: import("../store/gameStore").PlotData;
  isOwnPlot: boolean;
  playerFrntr: number;
  mineYield: {
    iron: number;
    fuel: number;
    crystal: number;
    rareEarth: number;
  } | null;
  regenError: string | null;
  onMine: () => void;
  onRegen: () => void;
}

function SurveyReport({
  plot,
  isOwnPlot,
  playerFrntr,
  mineYield,
  regenError,
  onMine,
  onRegen,
}: SurveyReportProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const regenActive = now < plot.regenActiveUntil;
  const regenRemaining = plot.regenActiveUntil - now;
  const regenHours = Math.floor(regenRemaining / 3600000);
  const regenMins = Math.floor((regenRemaining % 3600000) / 60000);

  const monthly = projectedMonthlyYield(plot.biome, plot.efficiency);
  const effPct = plot.efficiency;
  const effColor =
    effPct > 80 ? "#22c55e" : effPct >= 60 ? "#f59e0b" : "#ef4444";

  const previewYield = getMineralYield(
    plot.biome,
    plot.efficiency,
    regenActive,
  );

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Section header */}
      <div
        style={{
          fontSize: 9,
          color: CYAN_DIM,
          letterSpacing: 2,
          fontFamily: "monospace",
          marginBottom: 8,
        }}
      >
        SURVEY REPORT
      </div>

      {/* Efficiency bar */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: "rgba(224,244,255,0.5)",
              letterSpacing: 1,
              fontFamily: "monospace",
            }}
          >
            EFFICIENCY
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: effColor,
              fontFamily: "monospace",
              textShadow: `0 0 6px ${effColor}88`,
            }}
          >
            {effPct}%
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${effPct}%`,
              background: `linear-gradient(90deg, ${effColor}, ${effColor}aa)`,
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 7,
            color: "rgba(224,244,255,0.3)",
            fontFamily: "monospace",
            letterSpacing: 0.5,
          }}
        >
          Extracted: {plot.mineCount}x · Degrades 1% per 2 mines
        </div>
      </div>

      {/* Regen status */}
      {regenActive && (
        <div
          data-ocid="map.success_state"
          style={{
            marginBottom: 8,
            fontSize: 8,
            color: CYAN,
            fontFamily: "monospace",
            letterSpacing: 1,
            padding: "3px 6px",
            background: "rgba(0,255,204,0.07)",
            border: "1px solid rgba(0,255,204,0.2)",
            borderRadius: 3,
          }}
        >
          ⚡ REGEN ACTIVE: {regenHours}h {regenMins}m remaining
        </div>
      )}

      {/* Monthly projection */}
      <div
        style={{
          marginBottom: 10,
          padding: "7px 8px",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(0,255,204,0.12)",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            fontSize: 7,
            color: CYAN_DIM,
            letterSpacing: 2,
            fontFamily: "monospace",
            marginBottom: 5,
          }}
        >
          PROJECTED MONTHLY YIELD
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3px 10px",
          }}
        >
          {[
            { label: "IRON", val: monthly.iron, color: "#94a3b8" },
            { label: "FUEL", val: monthly.fuel, color: "#f97316" },
            { label: "CRYSTAL", val: monthly.crystal, color: "#3b82f6" },
            { label: "RARE EARTH", val: monthly.rareEarth, color: "#c084fc" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  color: "rgba(224,244,255,0.45)",
                  letterSpacing: 0.5,
                  fontFamily: "monospace",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color,
                  fontFamily: "monospace",
                }}
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 7,
            color: "rgba(224,244,255,0.25)",
            fontFamily: "monospace",
          }}
        >
          Based on 10 mines/day · Biome: {plot.biome}
        </div>
      </div>

      {/* Per-mine preview */}
      <div
        style={{
          marginBottom: isOwnPlot ? 10 : 0,
          fontSize: 7,
          color: "rgba(224,244,255,0.35)",
          fontFamily: "monospace",
          letterSpacing: 0.5,
        }}
      >
        Per mine:{" "}
        <span style={{ color: "#94a3b8" }}>+{previewYield.iron} Fe</span>{" "}
        <span style={{ color: "#f97316" }}>+{previewYield.fuel} Fuel</span>{" "}
        <span style={{ color: "#3b82f6" }}>+{previewYield.crystal} Xtal</span>{" "}
        <span style={{ color: "#c084fc" }}>+{previewYield.rareEarth} Rare</span>
      </div>

      {/* Mine yield popup */}
      {mineYield && (
        <div
          data-ocid="map.success_state"
          style={{
            marginBottom: 8,
            padding: "5px 8px",
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 4,
            fontSize: 9,
            color: "#22c55e",
            fontFamily: "monospace",
            letterSpacing: 0.5,
            fontWeight: 700,
          }}
        >
          +{mineYield.iron} IRON +{mineYield.fuel} FUEL +{mineYield.crystal}{" "}
          XTAL +{mineYield.rareEarth} RARE
        </div>
      )}

      {/* Mine + Regen buttons (own plots only) */}
      {isOwnPlot && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            data-ocid="map.primary_button"
            onClick={onMine}
            style={{
              ...actionBtnStyle("#00ffcc", "rgba(0,255,204,0.1)"),
              fontSize: 10,
            }}
          >
            ⛏ MINE RESOURCES
          </button>
          <button
            type="button"
            data-ocid="map.secondary_button"
            onClick={onRegen}
            disabled={regenActive || playerFrntr < 50}
            style={{
              ...actionBtnStyle(
                regenActive
                  ? "rgba(0,255,204,0.3)"
                  : playerFrntr < 50
                    ? "rgba(245,158,11,0.3)"
                    : "#f59e0b",
                regenActive ? "rgba(0,0,0,0.2)" : "rgba(245,158,11,0.08)",
              ),
              opacity: regenActive || playerFrntr < 50 ? 0.55 : 1,
              cursor:
                regenActive || playerFrntr < 50 ? "not-allowed" : "pointer",
              fontSize: 10,
            }}
          >
            ⚡ REGEN BOOST — 50 FRNTR
          </button>
          {regenError && (
            <div
              data-ocid="map.error_state"
              style={{
                fontSize: 9,
                color: "#ef4444",
                textAlign: "center",
                letterSpacing: 1,
                fontFamily: "monospace",
              }}
            >
              {regenError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// FRNTR daily rates per tier
const TIER_DAILY_RATES: Record<number, number> = {
  0: 7,
  1: 10,
  2: 15,
  3: 22,
  4: 32,
  5: 45,
};
// Cost in FRNTR (human-readable, not e8s) to upgrade from current tier to next
const TIER_COSTS: Record<number, number> = {
  0: 500,
  1: 1500,
  2: 4000,
  3: 8000,
  4: 15000,
};

export default function MapBottomSheet({
  onClose,
  controlsRef,
}: MapBottomSheetProps) {
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [mineYield, setMineYield] = useState<{
    iron: number;
    fuel: number;
    crystal: number;
    rareEarth: number;
  } | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [upgradeStatus, setUpgradeStatus] = useState<
    "idle" | "upgrading" | "success" | "error"
  >("idle");
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const { actor } = useActor(createActor);

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const setTargetPlotId = useGameStore((s) => s.setTargetPlotId);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);

  const mineResources = useGameStore((s) => s.mineResources);
  const activateRegenBoost = useGameStore((s) => s.activateRegenBoost);

  const { purchasePlot, isPurchasing } = usePurchasePlot();

  const plot =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;

  const handleUpgrade = useCallback(async () => {
    if (!plot || !actor || upgradeStatus === "upgrading") return;
    setUpgradeStatus("upgrading");
    setUpgradeError(null);
    try {
      const res = await actor.upgradeGenerator(BigInt(plot.id));
      if ("ok" in res) {
        const newTier = res.ok.generatorTier;
        // Map GeneratorTier enum to numeric tier
        const tierMap: Record<string, number> = {
          None: 0,
          TierI: 1,
          TierII: 2,
          TierIII: 3,
          TierIV: 4,
          TierV: 5,
        };
        const numericTier = tierMap[newTier as unknown as string] ?? 1;
        const burnCost = TIER_COSTS[numericTier - 1] ?? 0;
        useGameStore.setState((s) => ({
          generatorTiers: {
            ...s.generatorTiers,
            [plot.id]: numericTier as GeneratorTier,
          },
          totalFRNTRBurned: s.totalFRNTRBurned + burnCost,
        }));
        // Refresh player balance from canister after upgrade
        try {
          const state = await actor.getPlayerState();
          if (state) {
            useGameStore.setState((s) => ({
              player: {
                ...s.player,
                frntBalance: Number(state.frntBalance) / 100_000_000,
              },
            }));
          }
        } catch {
          /* non-critical */
        }
        setUpgradeStatus("success");
        setTimeout(() => setUpgradeStatus("idle"), 2500);
      } else {
        const errStr = String((res as { err: unknown }).err);
        setUpgradeError(errStr);
        setUpgradeStatus("error");
        setTimeout(() => setUpgradeStatus("idle"), 3000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upgrade failed";
      setUpgradeError(msg);
      setUpgradeStatus("error");
      setTimeout(() => setUpgradeStatus("idle"), 3000);
    }
  }, [actor, plot, upgradeStatus]);

  void getSubParcels;

  const playerPrincipal = player.principal ?? "You";
  const isOwned = plot?.owner !== null && plot?.owner !== undefined;
  const isOwnPlot =
    isOwned &&
    (plot?.owner === playerPrincipal ||
      (selectedPlotId !== null && player.plotsOwned.includes(selectedPlotId)));
  const isEnemyPlot = isOwned && !isOwnPlot;

  // Raw ICP price in e8s for display; formatted with USD when available
  const icpPriceE8s =
    (plot?.efficiency ?? 0) >= 90
      ? 30_0000_0000
      : (plot?.efficiency ?? 0) >= 80
        ? 9_0000_0000
        : 2_5000_0000;
  const icpFloat = icpPriceE8s / 1e8;
  const icpPriceDisplay = icpUsdPrice
    ? `${icpFloat.toFixed(4)} ICP (~${(icpFloat * icpUsdPrice).toFixed(2)})`
    : `${icpFloat.toFixed(4)} ICP ($ unavailable)`;

  async function handlePurchase() {
    if (!plot || isPurchasing) return;
    setPurchaseError(null);
    const result = await purchasePlot(plot.id);
    if (result.success) {
      onClose();
      focusOnPlot(plot.lat, plot.lng, controlsRef);
      setPlotHoverCard({
        plotId: plot.id,
        owner: player.principal ?? "You",
        action: "TERRITORY ACQUIRED",
        nextStep:
          "Open Command Center to track FRNTR generation. Build a Silo to attack.",
      });
    } else {
      setPurchaseError(result.message);
    }
  }

  function handleSetTarget() {
    if (!plot) return;
    setTargetPlotId(plot.id);
    onClose();
    focusOnPlot(plot.lat, plot.lng, controlsRef);
    setPlotHoverCard({
      plotId: plot.id,
      owner: plot.owner ?? "UNKNOWN",
      action: "TARGET LOCKED",
      nextStep: "Select weapon and FIRE.",
    });
  }

  const biomeBadgeColor = plot
    ? (BIOME_BADGE_COLORS[plot.biome] ?? CYAN)
    : CYAN;

  return (
    <>
      <style>{`
        @keyframes mapGlobePulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 16px",
            scrollbarWidth: "none",
          }}
        >
          {!plot ? (
            <div
              data-ocid="map.empty_state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                paddingTop: 40,
              }}
            >
              <Globe
                size={48}
                style={{
                  color: CYAN,
                  animation: "mapGlobePulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: CYAN_DIM,
                  letterSpacing: 2,
                  textAlign: "center",
                  maxWidth: 200,
                  lineHeight: 1.6,
                  fontFamily: "monospace",
                }}
              >
                TAP A PLOT ON THE GLOBE TO VIEW DETAILS
              </span>
            </div>
          ) : (
            <>
              {/* PLOT HEADER */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: CYAN,
                      letterSpacing: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    PLOT #{plot.id}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 3,
                      background: `${biomeBadgeColor}22`,
                      border: `1px solid ${biomeBadgeColor}`,
                      color: biomeBadgeColor,
                      letterSpacing: 1,
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {plot.biome.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: CYAN_DIM,
                    letterSpacing: 1,
                    marginBottom: 3,
                    fontFamily: "monospace",
                  }}
                >
                  OWNER:{" "}
                  {plot.owner
                    ? plot.owner.length > 16
                      ? `${plot.owner.slice(0, 8)}…${plot.owner.slice(-4)}`
                      : plot.owner
                    : "UNOWNED"}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(0,255,204,0.3)",
                    letterSpacing: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {plot.lat.toFixed(2)}°N · {plot.lng.toFixed(2)}°E
                </div>
                {commanderAssignments?.[plot.id] && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 5,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        clipPath:
                          "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid rgba(0,255,204,0.4)",
                      }}
                    >
                      <img
                        src={
                          COMMANDER_IMAGES[commanderAssignments[plot.id]] ?? ""
                        }
                        alt={commanderAssignments[plot.id]}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#00ffcc",
                        letterSpacing: 1,
                        fontFamily: "monospace",
                      }}
                    >
                      CMD: {commanderAssignments[plot.id]}
                    </span>
                  </div>
                )}
              </div>

              {/* DIVIDER */}
              <div
                style={{ height: 1, background: BORDER, marginBottom: 12 }}
              />

              {/* DIVIDER */}
              <div
                style={{ height: 1, background: BORDER, marginBottom: 12 }}
              />

              {/* SURVEY REPORT */}
              <SurveyReport
                plot={plot}
                isOwnPlot={isOwnPlot}
                playerFrntr={player.frntBalance}
                mineYield={mineYield}
                regenError={regenError}
                onMine={() => {
                  const yld = mineResources(plot.id);
                  if (yld) {
                    setMineYield(yld);
                    setTimeout(() => setMineYield(null), 3000);
                  }
                }}
                onRegen={() => {
                  setRegenError(null);
                  if (player.frntBalance < 50) {
                    setRegenError("INSUFFICIENT FRNTR");
                    return;
                  }
                  activateRegenBoost(plot.id);
                }}
              />
            </>
          )}
        </div>

        {/* DECISION LAYER */}
        {plot && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${BORDER}`,
              flexShrink: 0,
            }}
          >
            {!isOwned && (
              <div>
                <button
                  type="button"
                  data-ocid="map.primary_button"
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  style={{
                    ...actionBtnStyle(
                      "#00ffcc",
                      isPurchasing
                        ? "rgba(0,255,204,0.06)"
                        : "rgba(0,255,204,0.12)",
                    ),
                    opacity: isPurchasing ? 0.6 : 1,
                    cursor: isPurchasing ? "not-allowed" : "pointer",
                  }}
                >
                  {isPurchasing
                    ? "PROCESSING…"
                    : `PURCHASE — ${icpPriceDisplay}`}
                </button>
                {purchaseError && (
                  <div
                    data-ocid="map.error_state"
                    style={{
                      marginTop: 6,
                      fontSize: 9,
                      color: "#ef4444",
                      textAlign: "center",
                      letterSpacing: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    {purchaseError}
                  </div>
                )}
              </div>
            )}
            {isOwnPlot &&
              (() => {
                const currentTier = generatorTiers[plot.id] ?? 0;
                const dailyRate = TIER_DAILY_RATES[currentTier] ?? 7;
                const upgradeCost = TIER_COSTS[currentTier] ?? null;
                const canUpgrade =
                  upgradeCost !== null &&
                  player.frntBalance >= upgradeCost &&
                  currentTier < 5;
                const isMaxTier = currentTier >= 5;
                return (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        fontSize: 9,
                        color: CYAN_DIM,
                        fontFamily: "monospace",
                        letterSpacing: 1,
                      }}
                    >
                      <span>
                        GEN TIER {currentTier} · {dailyRate} FRNTR/DAY
                      </span>
                      {!isMaxTier && upgradeCost !== null && (
                        <span
                          style={{
                            color:
                              player.frntBalance >= upgradeCost
                                ? CYAN
                                : "#ef4444",
                          }}
                        >
                          COST: {upgradeCost.toLocaleString()} FRNTR
                        </span>
                      )}
                    </div>
                    {isMaxTier ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "10px 0",
                          fontSize: 10,
                          fontWeight: 700,
                          color: CYAN,
                          letterSpacing: 2,
                          fontFamily: "monospace",
                          border: `1px solid ${CYAN}44`,
                          borderRadius: 6,
                        }}
                      >
                        MAX TIER
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-ocid="map.upgrade_button"
                        onClick={handleUpgrade}
                        disabled={!canUpgrade || upgradeStatus === "upgrading"}
                        style={{
                          ...actionBtnStyle(
                            canUpgrade ? "#ffd700" : CYAN_DIM,
                            canUpgrade
                              ? "rgba(255,215,0,0.08)"
                              : "rgba(0,0,0,0.2)",
                          ),
                          opacity: canUpgrade ? 1 : 0.5,
                          cursor: canUpgrade ? "pointer" : "not-allowed",
                          fontSize: 10,
                        }}
                      >
                        {upgradeStatus === "upgrading"
                          ? "UPGRADING…"
                          : upgradeStatus === "success"
                            ? "✓ UPGRADED"
                            : `UPGRADE TO TIER ${currentTier + 1}`}
                      </button>
                    )}
                    {upgradeError && (
                      <div
                        data-ocid="map.error_state"
                        style={{
                          marginTop: 4,
                          fontSize: 9,
                          color: "#ef4444",
                          textAlign: "center",
                          letterSpacing: 1,
                          fontFamily: "monospace",
                        }}
                      >
                        {upgradeError}
                      </div>
                    )}
                  </div>
                );
              })()}
            {isEnemyPlot && (
              <button
                type="button"
                data-ocid="map.primary_button"
                onClick={handleSetTarget}
                style={actionBtnStyle("#ef4444", "rgba(239,68,68,0.12)")}
              >
                SET AS TARGET
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
