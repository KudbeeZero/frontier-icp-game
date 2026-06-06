import { useActor } from "@caffeineai/core-infrastructure";
import {
  Cpu,
  Folder,
  Globe,
  Lock,
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
  Temperate: "#4a9b5f",
  Desert: "#e8c97a",
  Arctic: "#a8d8ea",
  Tropical: "#22c55e",
  Ocean: "#1a6b9e",
  DeepOcean: "#0f3460",
  Volcanic: "#c0392b",
  AsteroidImpact: "#9333ea",
  // Legacy biomes for backward compat
  Forest: "#4a9b5f",
  Mountain: "#7a6b5a",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

const RARITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  AsteroidImpact: {
    label: "RARE",
    color: "#9333ea",
    bg: "rgba(147,51,234,0.18)",
  },
  Volcanic: {
    label: "UNCOMMON",
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
  },
};

function getRarity(biome: string): {
  label: string;
  color: string;
  bg: string;
} {
  return (
    RARITY_CONFIG[biome] ?? {
      label: "COMMON",
      color: "rgba(148,163,184,0.8)",
      bg: "rgba(148,163,184,0.12)",
    }
  );
}

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
}

function SurveyReport({ plot, isOwnPlot: _isOwnPlot }: SurveyReportProps) {
  const effPct = plot.efficiency;
  const effColor =
    effPct > 80 ? "#22c55e" : effPct >= 60 ? "#f59e0b" : "#ef4444";

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
      </div>
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
  3: 10000,
  4: 25000,
  5: 60000,
};

export default function MapBottomSheet({
  onClose,
  controlsRef,
}: MapBottomSheetProps) {
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<
    "idle" | "upgrading" | "success" | "error"
  >("idle");
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<
    "idle" | "claiming" | "success" | "error"
  >("idle");

  const { actor } = useActor(createActor);

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const setTargetPlotId = useGameStore((s) => s.setTargetPlotId);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const accruedSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);

  // Fix 1: Fetch plot price from canister
  const [fetchedPriceE8s, setFetchedPriceE8s] = useState<bigint | null>(null);
  const { purchasePlot, isPurchasing } = usePurchasePlot();

  const plot =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;

  // Local fallback price from efficiency
  const localPriceE8s = plot
    ? BigInt(
        (plot.efficiency ?? 0) >= 90
          ? 30_0000_0000
          : (plot.efficiency ?? 0) >= 80
            ? 9_0000_0000
            : 2_5000_0000,
      )
    : null;

  useEffect(() => {
    setFetchedPriceE8s(null);
    if (!actor || selectedPlotId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const price = await (actor as any).getPlotPrice(BigInt(selectedPlotId));
        if (!cancelled) setFetchedPriceE8s(BigInt(price));
      } catch {
        // keep localPriceE8s fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, selectedPlotId]);

  const handleUpgrade = useCallback(async () => {
    if (!plot || !actor || upgradeStatus === "upgrading") return;
    setUpgradeStatus("upgrading");
    setUpgradeError(null);
    try {
      const res = await actor.upgradeGenerator(String(plot.id));
      if (res.__kind__ === "ok") {
        const view = (
          res as { __kind__: "ok"; ok: import("../backend").PlotUpgradesView }
        ).ok;
        const newTier = view.generatorTier;
        // Map GeneratorTier enum to numeric tier
        const tierMap: Record<string, number> = {
          None: 0,
          TierI: 1,
          TierII: 2,
          TierIII: 3,
          TierIV: 4,
          TierV: 5,
          TierVI: 6,
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
        const errKind = (
          res as { __kind__: "err"; err: import("../backend").UpgradeError }
        ).err;
        setUpgradeError(String(errKind));
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
      (selectedPlotId !== null &&
        player.plotsOwned.includes(String(selectedPlotId))));
  const isEnemyPlot = isOwned && !isOwnPlot;

  // Use canister price if fetched, else local fallback (Fix 1)
  const activePriceE8s = fetchedPriceE8s ?? localPriceE8s ?? 200_000_000n;
  const icpFloat = Number(activePriceE8s) / 1e8;
  const icpPriceDisplay = icpUsdPrice
    ? `${icpFloat.toFixed(4)} ICP (~${(icpFloat * icpUsdPrice).toFixed(2)})`
    : `${icpFloat.toFixed(4)} ICP ($ unavailable)`;

  async function handlePurchase() {
    if (!plot || isPurchasing) return;
    setPurchaseError(null);
    // Show confirmation modal first
    setShowPurchaseConfirm(true);
  }

  async function handleConfirmPurchase() {
    if (!plot || isPurchasing) return;
    setShowPurchaseConfirm(false);
    setPurchaseError(null);
    const shortId = String(plot.id).slice(0, 8);
    const result = await purchasePlot(String(plot.id));
    if (result.success) {
      onClose();
      focusOnPlot(plot.lat, plot.lng, controlsRef);
      setPlotHoverCard({
        plotId: plot.id,
        owner: player.principal ?? "You",
        action: `Plot acquired! ${plot.biome} plot ${shortId}`,
        nextStep: "Open Command Center to track FRNTR generation.",
      });
    } else {
      setPurchaseError(result.message);
    }
  }

  async function handleClaimFrntr() {
    if (claimStatus === "claiming" || accruedSinceSync < 0.001) return;
    setClaimStatus("claiming");
    try {
      if (actor) {
        const res = await (
          actor as unknown as {
            claimAccumulatedTokens: () => Promise<
              { __kind__: "ok"; ok: bigint } | { __kind__: "err"; err: string }
            >;
          }
        ).claimAccumulatedTokens();
        if (res.__kind__ === "ok") {
          // Refresh balance from canister
          try {
            const state = await actor.getPlayerState();
            if (state) {
              useGameStore.setState(() => ({
                confirmedFrntBalance: Number(state.frntBalance) / 100_000_000,
                accruedFrntSinceSync: 0,
                player: {
                  ...useGameStore.getState().player,
                  frntBalance: Number(state.frntBalance) / 100_000_000,
                },
              }));
            }
          } catch {
            /* non-critical */
          }
          setClaimStatus("success");
          setTimeout(() => setClaimStatus("idle"), 2500);
        } else {
          setClaimStatus("error");
          setTimeout(() => setClaimStatus("idle"), 3000);
        }
      } else {
        setClaimStatus("error");
        setTimeout(() => setClaimStatus("idle"), 3000);
      }
    } catch {
      setClaimStatus("error");
      setTimeout(() => setClaimStatus("idle"), 3000);
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
              <SurveyReport plot={plot} isOwnPlot={isOwnPlot} />
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
                {showPurchaseConfirm && plot ? (
                  /* NFT PURCHASE CONFIRMATION CARD */
                  <div
                    data-ocid="map.dialog"
                    style={{
                      background: "rgba(0,10,20,0.85)",
                      border: "1px solid rgba(0,255,204,0.25)",
                      borderRadius: 8,
                      padding: "14px 14px 10px",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: CYAN_DIM,
                        letterSpacing: 2,
                        fontFamily: "monospace",
                        marginBottom: 10,
                      }}
                    >
                      CONFIRM PURCHASE
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ color: "rgba(224,244,255,0.45)" }}>
                          PLOT ID
                        </span>
                        <span style={{ color: CYAN, fontWeight: 700 }}>
                          {String(plot.id).slice(0, 8)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 9,
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ color: "rgba(224,244,255,0.45)" }}>
                          BIOME
                        </span>
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: `${BIOME_BADGE_COLORS[plot.biome] ?? CYAN}22`,
                            border: `1px solid ${BIOME_BADGE_COLORS[plot.biome] ?? CYAN}`,
                            color: BIOME_BADGE_COLORS[plot.biome] ?? CYAN,
                            fontWeight: 700,
                            letterSpacing: 1,
                          }}
                        >
                          {plot.biome.toUpperCase()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 9,
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ color: "rgba(224,244,255,0.45)" }}>
                          RARITY
                        </span>
                        {(() => {
                          const r = getRarity(plot.biome);
                          return (
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: 3,
                                background: r.bg,
                                border: `1px solid ${r.color}`,
                                color: r.color,
                                fontWeight: 700,
                                letterSpacing: 1,
                              }}
                            >
                              {r.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ color: "rgba(224,244,255,0.45)" }}>
                          PRICE
                        </span>
                        <span style={{ color: "#ffd700", fontWeight: 700 }}>
                          {icpPriceDisplay}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        data-ocid="map.confirm_button"
                        onClick={handleConfirmPurchase}
                        disabled={isPurchasing}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          background: isPurchasing
                            ? "rgba(34,197,94,0.06)"
                            : "rgba(34,197,94,0.15)",
                          border: "1px solid #22c55e",
                          borderRadius: 6,
                          color: "#22c55e",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 2,
                          cursor: isPurchasing ? "not-allowed" : "pointer",
                          fontFamily: "monospace",
                          textShadow: "0 0 8px #22c55e80",
                          opacity: isPurchasing ? 0.6 : 1,
                        }}
                      >
                        {isPurchasing ? "PROCESSING…" : "CONFIRM"}
                      </button>
                      <button
                        type="button"
                        data-ocid="map.cancel_button"
                        onClick={() => setShowPurchaseConfirm(false)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          background: "rgba(0,0,0,0.2)",
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6,
                          color: CYAN_DIM,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 2,
                          cursor: "pointer",
                          fontFamily: "monospace",
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
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
                )}
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
                const currentTier = generatorTiers[String(plot.id)] ?? 0;
                const dailyRate = TIER_DAILY_RATES[currentTier] ?? 7;
                const upgradeCost = TIER_COSTS[currentTier] ?? null;
                const displayBalance = confirmedFrntBalance + accruedSinceSync;
                const canUpgrade =
                  upgradeCost !== null &&
                  displayBalance >= upgradeCost &&
                  currentTier < 6;
                const isMaxTier = currentTier >= 6;
                const claimableAmount = accruedSinceSync;
                const canClaim = claimableAmount >= 0.001;
                return (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {/* MINE/CLAIM button */}
                    <button
                      type="button"
                      data-ocid="map.claim_button"
                      onClick={handleClaimFrntr}
                      disabled={!canClaim || claimStatus === "claiming"}
                      style={{
                        ...actionBtnStyle(
                          canClaim ? CYAN : "rgba(0,255,204,0.25)",
                          canClaim ? "rgba(0,255,204,0.1)" : "rgba(0,0,0,0.2)",
                        ),
                        opacity: canClaim ? 1 : 0.5,
                        cursor: canClaim ? "pointer" : "not-allowed",
                        fontSize: 10,
                      }}
                    >
                      {claimStatus === "claiming"
                        ? "CLAIMING…"
                        : claimStatus === "success"
                          ? "✓ CLAIMED"
                          : `⚡ CLAIM — ${claimableAmount >= 0.001 ? claimableAmount.toFixed(4) : "0.0000"} FRNTR`}
                    </button>

                    {/* Tier info + upgrade */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 9,
                        color: CYAN_DIM,
                        fontFamily: "monospace",
                        letterSpacing: 1,
                      }}
                    >
                      <span>
                        TIER {currentTier}/6 · {dailyRate} FRNTR/DAY
                      </span>
                      {!isMaxTier && upgradeCost !== null && (
                        <span
                          style={{
                            color:
                              displayBalance >= upgradeCost ? CYAN : "#ef4444",
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
                            : `UPGRADE TIER ${currentTier} → ${currentTier + 1}`}
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
