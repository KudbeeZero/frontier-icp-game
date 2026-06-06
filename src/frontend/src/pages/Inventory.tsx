import { useActor } from "@caffeineai/core-infrastructure";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import ActionConfirmModal from "../components/ActionConfirmModal";
import type { ConfirmDetail } from "../components/ActionConfirmModal";
import LiquiditySeedingPanel from "../components/LiquiditySeedingPanel";
import PostActionToast from "../components/PostActionToast";
import type { PostActionType } from "../components/PostActionToast";
import {
  BIOME_DOT,
  TIER_DAILY_RATES,
  TIER_NAMES,
  UPGRADE_COSTS,
} from "../constants/tiers";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier, PlotData } from "../store/gameStore";

// ─── helpers ─────────────────────────────────────────────────────────────────

function effColor(eff: number): string {
  if (eff >= 90) return "#4ade80";
  if (eff >= 75) return "#fbbf24";
  return "#f87171";
}

function rarityLabel(
  biome: string,
  tier: number,
): { label: string; color: string } {
  if (biome === "AsteroidImpact")
    return { label: "LEGENDARY", color: "#e040fb" };
  if (biome === "Volcanic") return { label: "EPIC", color: "#ff6b35" };
  if (biome === "Tropical" || biome === "Arctic")
    return { label: "RARE", color: "#00bcd4" };
  if (tier >= 4) return { label: "ELITE", color: "#ffd700" };
  return { label: "COMMON", color: "rgba(224,244,255,0.38)" };
}

function fmtNum(n: number, dec = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// ─── live unclaimed counter per tile ─────────────────────────────────────────

function UnclaimedTicker({
  plotId,
  tier,
}: { plotId: string; tier: GeneratorTier }) {
  const perSec = TIER_DAILY_RATES[tier] / 86400;
  const [val, setVal] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on plotId
  useEffect(() => {
    setVal(0);
    if (perSec === 0) return;
    const id = setInterval(() => setVal((v) => v + perSec), 1000);
    return () => clearInterval(id);
  }, [plotId]);

  return (
    <span
      className="font-mono"
      style={{ color: "#ffd700", fontSize: 11, fontWeight: 700 }}
    >
      {val.toFixed(6)}
    </span>
  );
}

// ─── global unclaimed across all plots ───────────────────────────────────────

function GlobalTicker({ plotsOwned }: { plotsOwned: string[] }) {
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const [val, setVal] = useState(0);
  const key = plotsOwned.join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: recalc when plots change
  useEffect(() => {
    setVal(0);
    const perSec = plotsOwned.reduce((sum, id) => {
      const tier = (generatorTiers[id] ?? 0) as GeneratorTier;
      return sum + TIER_DAILY_RATES[tier] / 86400;
    }, 0);
    if (perSec === 0) return;
    const id = setInterval(() => setVal((v) => v + perSec), 1000);
    return () => clearInterval(id);
  }, [key]);

  return (
    <span
      className="font-mono font-bold tabular-nums"
      style={{ color: "#ffd700", fontSize: 13 }}
    >
      {val.toFixed(4)}
    </span>
  );
}

// ─── scan-line overlay ────────────────────────────────────────────────────────

const ScanLines = () => (
  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.018) 2px,rgba(0,255,255,0.018) 3px)",
      pointerEvents: "none",
      borderRadius: "inherit",
    }}
  />
);

// ─── tier progress pips ───────────────────────────────────────────────────────

function TierPips({ tier }: { tier: GeneratorTier }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {([0, 1, 2, 3, 4, 5, 6] as GeneratorTier[]).map((t) => (
        <div
          key={t}
          style={{
            height: 2,
            flex: 1,
            borderRadius: 1,
            transition: "background 0.4s",
            background:
              t < tier
                ? "rgba(0,255,204,0.35)"
                : t === tier
                  ? tier === 6
                    ? "linear-gradient(90deg,#ffd700,#ff6b35)"
                    : "linear-gradient(90deg,#00ffcc,#ffd700)"
                  : "rgba(255,255,255,0.06)",
            boxShadow:
              t === tier && tier > 0 ? "0 0 4px rgba(0,255,204,0.7)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── sub-parcel coming soon slots ────────────────────────────────────────────

function SubParcelSlots() {
  return (
    <div className="flex gap-1 mt-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static slots
          key={i}
          title="COMING SOON"
          style={{
            width: 14,
            height: 14,
            borderRadius: 2,
            background: "rgba(0,255,204,0.04)",
            border: "1px solid rgba(0,255,204,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="6"
            height="6"
            viewBox="0 0 6 6"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="1"
              width="4"
              height="4"
              rx="0.5"
              stroke="rgba(0,255,204,0.3)"
              strokeWidth="1"
            />
            <line
              x1="3"
              y1="1"
              x2="3"
              y2="5"
              stroke="rgba(0,255,204,0.2)"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      ))}
      <span
        style={{
          fontSize: 7,
          color: "rgba(0,255,204,0.3)",
          fontWeight: 700,
          letterSpacing: "0.12em",
          alignSelf: "center",
          marginLeft: 2,
        }}
      >
        SOON™
      </span>
    </div>
  );
}

// ─── single plot tile card ────────────────────────────────────────────────────

function PlotTile({ plotId, index }: { plotId: string; index: number }) {
  const plot = useGameStore((s) =>
    s.plots.find((p) => String(p.id) === plotId),
  );
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const spendFrntr = useGameStore((s) => s.spendFrntr);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const { actor } = useActor(createActor);

  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPending, setConfirmPending] = useState<
    (() => Promise<void>) | null
  >(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmActionType, setConfirmActionType] = useState<
    "purchase" | "upgrade" | "claim" | "survey" | "mission"
  >("claim");
  const [confirmDetails, setConfirmDetails] = useState<ConfirmDetail[]>([]);
  const [confirmCostLabel, setConfirmCostLabel] = useState("");
  const [confirmWarning, setConfirmWarning] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [postActionType, setPostActionType] = useState<PostActionType | null>(
    null,
  );
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!upgradeOpen) return;
    function outside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node))
        setUpgradeOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [upgradeOpen]);

  if (!plot) return null;

  const tier = (generatorTiers[plotId] ?? 0) as GeneratorTier;
  const dailyRate = TIER_DAILY_RATES[tier];
  const hourlyRate = dailyRate / 24;
  const minRate = dailyRate / 1440;
  const biomeColor = BIOME_DOT[plot.biome] ?? BIOME_DOT.Forest ?? "#00ffcc";
  const nextTier = Math.min(6, tier + 1) as GeneratorTier;
  const upgradeCost = tier < 6 ? (UPGRADE_COSTS[nextTier] ?? null) : null;
  const nextDailyRate = tier < 6 ? TIER_DAILY_RATES[nextTier] : null;
  const rarity = rarityLabel(plot.biome, tier);
  const biomeName = plot.biome
    .replace("AsteroidImpact", "Asteroid Impact")
    .replace("DeepOcean", "Deep Ocean");
  const plotLabel = `#${String(plot.id).padStart(4, "0").toUpperCase()}`;

  function openConfirm(
    title: string,
    actionType: "purchase" | "upgrade" | "claim" | "survey" | "mission",
    details: ConfirmDetail[],
    costLabel: string,
    warning: string,
    fn: () => Promise<void>,
  ) {
    setConfirmTitle(title);
    setConfirmActionType(actionType);
    setConfirmDetails(details);
    setConfirmCostLabel(costLabel);
    setConfirmWarning(warning);
    setConfirmPending(() => fn);
    setConfirmOpen(true);
  }

  const executeClaim = async () => {
    if (!actor || claiming) return;
    setClaiming(true);
    try {
      const res = await actor.claimAccumulatedTokens(String(plot.id));
      if ("ok" in res) {
        incrementClaimCount();
        try {
          const state = await actor.getPlayerState();
          if (state) setFrntrBalance(BigInt(state.frntBalance));
        } catch {
          /* non-critical */
        }
        toast.success(`Claimed from Plot ${plotLabel}`);
        setPostActionType("claim");
      } else {
        toast.error(`Claim failed: ${JSON.stringify(res.err)}`);
      }
    } catch {
      toast.error("Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  const handleClaim = () => {
    openConfirm(
      `Claim Tokens — Plot ${plotLabel}`,
      "claim",
      [
        { label: "Plot ID", value: plotLabel },
        { label: "Daily Rate", value: `${dailyRate} FRNTR/day` },
        { label: "Hourly Rate", value: `${fmtNum(hourlyRate, 2)} FRNTR/hr` },
      ],
      "",
      "Claimed tokens are transferred on-chain to your wallet balance. Cannot be reversed.",
      executeClaim,
    );
  };

  const executeUpgrade = async () => {
    if (!actor || upgrading || upgradeCost === null) return;
    setUpgrading(true);
    try {
      const res = await actor.upgradeGenerator(String(plot.id));
      if ("ok" in res) {
        spendFrntr(upgradeCost);
        toast.success(`Plot ${plotLabel} → ${TIER_NAMES[nextTier]}`);
        setUpgradeOpen(false);
        setPostActionType("upgrade");
      } else {
        toast.error(`Upgrade failed: ${JSON.stringify(res.err)}`);
      }
    } catch {
      toast.error("Upgrade failed");
    } finally {
      setUpgrading(false);
    }
  };

  const handleUpgrade = () => {
    if (upgradeCost === null) return;
    openConfirm(
      `Upgrade Generator — Plot ${plotLabel}`,
      "upgrade",
      [
        { label: "Current Tier", value: TIER_NAMES[tier] },
        { label: "Next Tier", value: TIER_NAMES[nextTier] },
        { label: "New Daily Rate", value: `${nextDailyRate} FRNTR/day` },
        {
          label: "Rate Increase",
          value: `+${(nextDailyRate ?? 0) - dailyRate} FRNTR/day`,
        },
      ],
      `${upgradeCost.toLocaleString()} FRNTR`,
      "Upgrades permanently burn FRNTR from your balance. This cannot be undone.",
      executeUpgrade,
    );
  };

  const glowAlpha = hovered ? 0.45 : tier > 3 ? 0.22 : tier > 0 ? 0.14 : 0.08;
  const borderColor =
    tier > 3
      ? `rgba(255,215,0,${hovered ? 0.55 : 0.22})`
      : `rgba(0,255,204,${glowAlpha})`;
  const shadowColor = tier > 3 ? "rgba(255,215,0,0.12)" : "rgba(0,255,204,0.1)";

  return (
    <>
      <motion.div
        ref={cardRef}
        data-ocid={`inventory.item.${index}`}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.6) }}
        whileHover={{ y: -2 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          background: "rgba(0,10,22,0.88)",
          border: `1px solid ${borderColor}`,
          boxShadow: hovered
            ? `0 0 28px ${shadowColor}, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,255,204,0.12)`
            : `0 0 12px ${shadowColor}, inset 0 1px 0 rgba(0,255,204,0.06)`,
          transition: "border-color 0.25s, box-shadow 0.25s",
          cursor: "default",
          minWidth: 0,
        }}
      >
        <ScanLines />
        <div
          style={{
            height: 2,
            background:
              tier > 3
                ? "linear-gradient(90deg,transparent,#ffd700 40%,#ff6b35 70%,transparent)"
                : `linear-gradient(90deg,transparent,${biomeColor} 40%,#00ffcc 70%,transparent)`,
          }}
        />

        <div style={{ padding: "10px 12px 12px", position: "relative" }}>
          {/* header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: biomeColor,
                  boxShadow: `0 0 8px ${biomeColor}cc`,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#e0f4ff",
                    letterSpacing: "0.08em",
                    lineHeight: 1,
                  }}
                >
                  PLOT {plotLabel}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: biomeColor,
                    fontWeight: 600,
                    marginTop: 1,
                  }}
                >
                  {biomeName}
                  <span
                    style={{ color: "rgba(224,244,255,0.28)", margin: "0 4px" }}
                  >
                    ·
                  </span>
                  <span
                    style={{
                      color: "rgba(224,244,255,0.3)",
                      fontFamily: "monospace",
                    }}
                  >
                    {plot.lat.toFixed(1)}°, {plot.lng.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 3,
                flexShrink: 0,
                marginLeft: 6,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background:
                    tier > 0 ? "rgba(0,255,204,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${tier > 0 ? "rgba(0,255,204,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: tier > 0 ? "#00ffcc" : "rgba(224,244,255,0.4)",
                }}
              >
                T{tier} · {TIER_NAMES[tier].toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "2px 5px",
                  borderRadius: 3,
                  background: `${rarity.color}18`,
                  border: `1px solid ${rarity.color}40`,
                  color: rarity.color,
                }}
              >
                {rarity.label}
              </span>
            </div>
          </div>

          <TierPips tier={tier} />

          {/* generation rates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              margin: "10px 0 8px",
            }}
          >
            {[
              { label: "/MIN", value: fmtNum(minRate, 4) },
              { label: "/HOUR", value: fmtNum(hourlyRate, 2) },
              { label: "/DAY", value: String(dailyRate) },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,255,204,0.04)",
                  border: "1px solid rgba(0,255,204,0.1)",
                  borderRadius: 6,
                  padding: "5px 6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#00ffcc",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "rgba(0,255,204,0.45)",
                    letterSpacing: "0.12em",
                    marginTop: 2,
                  }}
                >
                  FRNTR{label}
                </div>
              </div>
            ))}
          </div>

          {/* efficiency bar */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  fontSize: 7.5,
                  color: "rgba(224,244,255,0.38)",
                  letterSpacing: "0.12em",
                }}
              >
                EFFICIENCY
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: effColor(plot.efficiency),
                }}
              >
                {plot.efficiency}%
              </span>
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${plot.efficiency}%`,
                  borderRadius: 2,
                  background: effColor(plot.efficiency),
                  boxShadow: `0 0 6px ${effColor(plot.efficiency)}88`,
                  transition: "width 0.5s",
                }}
              />
            </div>
          </div>

          {/* unclaimed counter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,215,0,0.05)",
              border: "1px solid rgba(255,215,0,0.12)",
              borderRadius: 6,
              padding: "5px 8px",
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 7,
                  color: "rgba(224,244,255,0.35)",
                  letterSpacing: "0.14em",
                  marginBottom: 1,
                }}
              >
                UNCLAIMED
              </div>
              <div style={{ fontSize: 7, color: "rgba(255,215,0,0.4)" }}>
                Claim to add to wallet
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <UnclaimedTicker plotId={plotId} tier={tier} />
              <div
                style={{
                  fontSize: 7,
                  color: "rgba(255,215,0,0.4)",
                  letterSpacing: "0.1em",
                }}
              >
                FRNTR
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              data-ocid={`inventory.claim_button.${index}`}
              onClick={handleClaim}
              disabled={!actor || claiming}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 7,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.15em",
                cursor: actor && !claiming ? "pointer" : "not-allowed",
                background:
                  actor && !claiming
                    ? "rgba(0,255,204,0.1)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${actor && !claiming ? "rgba(0,255,204,0.35)" : "rgba(255,255,255,0.07)"}`,
                color:
                  actor && !claiming ? "#00ffcc" : "rgba(224,244,255,0.25)",
                boxShadow:
                  actor && !claiming && hovered
                    ? "0 0 10px rgba(0,255,204,0.2)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              {claiming ? "CLAIMING…" : "CLAIM"}
            </button>

            {tier < 6 ? (
              <div style={{ flex: 1, position: "relative" }}>
                <button
                  type="button"
                  data-ocid={`inventory.upgrade_button.${index}`}
                  onClick={() => setUpgradeOpen((v) => !v)}
                  disabled={!actor || upgrading}
                  style={{
                    width: "100%",
                    padding: "7px 0",
                    borderRadius: 7,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    cursor: actor && !upgrading ? "pointer" : "not-allowed",
                    background:
                      actor && !upgrading
                        ? "rgba(255,215,0,0.08)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${actor && !upgrading ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.07)"}`,
                    color:
                      actor && !upgrading
                        ? "#ffd700"
                        : "rgba(224,244,255,0.25)",
                    transition: "all 0.2s",
                  }}
                >
                  {upgrading ? "UPGRADING…" : "UPGRADE"}
                </button>
                <AnimatePresence>
                  {upgradeOpen && upgradeCost !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 6px)",
                        right: 0,
                        width: 190,
                        background: "rgba(0,10,22,0.97)",
                        border: "1px solid rgba(255,215,0,0.28)",
                        borderRadius: 10,
                        boxShadow:
                          "0 0 32px rgba(255,215,0,0.12), 0 8px 24px rgba(0,0,0,0.6)",
                        padding: "12px 14px",
                        zIndex: 55,
                      }}
                    >
                      <div
                        style={{
                          height: 2,
                          marginBottom: 10,
                          background:
                            "linear-gradient(90deg,transparent,#ffd700,transparent)",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 8,
                          color: "rgba(255,215,0,0.6)",
                          letterSpacing: "0.18em",
                          marginBottom: 8,
                        }}
                      >
                        UPGRADE GENERATOR
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "6px 8px",
                          marginBottom: 10,
                        }}
                      >
                        {[
                          { l: "FROM", v: TIER_NAMES[tier] },
                          { l: "TO", v: TIER_NAMES[nextTier] },
                          { l: "DAILY RATE", v: `${nextDailyRate} FRNTR` },
                          { l: "COST", v: `${upgradeCost.toLocaleString()}` },
                        ].map(({ l, v }) => (
                          <div key={l}>
                            <div
                              style={{
                                fontSize: 7,
                                color: "rgba(224,244,255,0.3)",
                                letterSpacing: "0.1em",
                              }}
                            >
                              {l}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#ffd700",
                                fontFamily: "monospace",
                              }}
                            >
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          fontSize: 7.5,
                          color: "rgba(224,244,255,0.35)",
                          marginBottom: 10,
                          lineHeight: 1.4,
                        }}
                      >
                        Burns {upgradeCost.toLocaleString()} FRNTR from supply.
                        Cannot be undone.
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          data-ocid={`inventory.upgrade_cancel.${index}`}
                          onClick={() => setUpgradeOpen(false)}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 6,
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(224,244,255,0.4)",
                          }}
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          data-ocid={`inventory.upgrade_confirm.${index}`}
                          onClick={handleUpgrade}
                          disabled={upgrading}
                          style={{
                            flex: 1.5,
                            padding: "6px 0",
                            borderRadius: 6,
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            cursor: "pointer",
                            background: "rgba(255,215,0,0.12)",
                            border: "1px solid rgba(255,215,0,0.4)",
                            color: "#ffd700",
                            boxShadow: "0 0 10px rgba(255,215,0,0.15)",
                          }}
                        >
                          UPGRADE ↑
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 7,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,107,53,0.08))",
                  border: "1px solid rgba(255,215,0,0.22)",
                  color: "#ffd700",
                }}
              >
                MAX TIER ✦
              </div>
            )}
          </div>

          <SubParcelSlots />
        </div>
      </motion.div>

      <ActionConfirmModal
        isOpen={confirmOpen}
        onConfirm={async () => {
          setConfirmLoading(true);
          try {
            if (confirmPending) await confirmPending();
          } finally {
            setConfirmLoading(false);
            setConfirmOpen(false);
            setConfirmPending(null);
          }
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmPending(null);
          actor
            ?.logCancelledAction(
              confirmTitle,
              plotId,
              null,
              "User cancelled from inventory tile",
            )
            .catch(() => {});
        }}
        title={confirmTitle}
        actionType={confirmActionType}
        details={confirmDetails}
        costLabel={confirmCostLabel}
        warningText={confirmWarning}
        isLoading={confirmLoading}
      />

      {postActionType && (
        <PostActionToast
          actionType={postActionType}
          onNavigate={() => {}}
          onDismiss={() => setPostActionType(null)}
        />
      )}
    </>
  );
}

// ─── inventory header bar ─────────────────────────────────────────────────────

function InventoryHeader() {
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const { actor } = useActor(createActor);
  const [claimingAll, setClaimingAll] = useState(false);

  const totalDailyRate = plotsOwned.reduce((sum, id) => {
    const tier = (generatorTiers[id] ?? 0) as GeneratorTier;
    return sum + TIER_DAILY_RATES[tier];
  }, 0);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(3)}M`
      : n >= 1_000
        ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : n.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          });

  const handleClaimAll = async () => {
    if (!actor || claimingAll || plotsOwned.length === 0) return;
    setClaimingAll(true);
    let ok = 0;
    try {
      for (const id of plotsOwned) {
        try {
          const res = await actor.claimAccumulatedTokens(id);
          if ("ok" in res) ok++;
        } catch {
          /* skip */
        }
      }
      if (ok > 0) {
        incrementClaimCount();
        try {
          const state = await actor.getPlayerState();
          if (state) setFrntrBalance(BigInt(state.frntBalance));
        } catch {
          /* non-critical */
        }
        toast.success(`Claimed from ${ok} plot${ok !== 1 ? "s" : ""}`);
      } else {
        toast.info("No tokens to claim yet.");
      }
    } catch {
      toast.error("Claim All failed");
    } finally {
      setClaimingAll(false);
    }
  };

  return (
    <motion.div
      data-ocid="inventory.header"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: 10,
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(0,10,22,0.9)",
        border: "1px solid rgba(0,255,204,0.2)",
        boxShadow:
          "0 0 32px rgba(0,255,204,0.06), inset 0 1px 0 rgba(0,255,204,0.1)",
      }}
    >
      <div
        style={{
          height: 2,
          background:
            "linear-gradient(90deg,transparent,#00ffcc 35%,#ffd700 65%,transparent)",
        }}
      />
      <div style={{ padding: "12px 14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 7.5,
                color: "#00ffcc",
                letterSpacing: "0.2em",
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              ⬡ WALLET BALANCE
            </div>
            <div
              data-ocid="inventory.confirmed_balance"
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: 24,
                color: "#e0f4ff",
                lineHeight: 1,
                textShadow: "0 0 20px rgba(0,255,204,0.2)",
              }}
            >
              {fmt(confirmedFrntBalance)}
            </div>
            <div
              style={{
                fontSize: 7.5,
                color: "rgba(224,244,255,0.35)",
                marginTop: 2,
              }}
            >
              FRNTR · CONFIRMED ON-CHAIN
            </div>
          </div>
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <button
              type="button"
              data-ocid="inventory.claim_all_button"
              onClick={handleClaimAll}
              disabled={!actor || claimingAll || plotsOwned.length === 0}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.18em",
                cursor:
                  actor && !claimingAll && plotsOwned.length > 0
                    ? "pointer"
                    : "not-allowed",
                background:
                  actor && !claimingAll && plotsOwned.length > 0
                    ? "linear-gradient(135deg,rgba(0,255,204,0.15),rgba(0,255,204,0.07))"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${actor && !claimingAll && plotsOwned.length > 0 ? "rgba(0,255,204,0.4)" : "rgba(255,255,255,0.07)"}`,
                color:
                  actor && !claimingAll && plotsOwned.length > 0
                    ? "#00ffcc"
                    : "rgba(224,244,255,0.25)",
                boxShadow:
                  actor && !claimingAll && plotsOwned.length > 0
                    ? "0 0 12px rgba(0,255,204,0.15)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              {claimingAll ? "CLAIMING…" : "⬡ CLAIM ALL"}
            </button>
            <div style={{ fontSize: 7.5, color: "rgba(224,244,255,0.3)" }}>
              {plotsOwned.length} PLOT{plotsOwned.length !== 1 ? "S" : ""}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
          }}
        >
          <div
            style={{
              background: "rgba(0,255,204,0.04)",
              border: "1px solid rgba(0,255,204,0.1)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "rgba(224,244,255,0.35)",
                letterSpacing: "0.12em",
                marginBottom: 2,
              }}
            >
              TOTAL DAILY
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 12,
                color: "#00ffcc",
              }}
            >
              {totalDailyRate.toLocaleString()}
            </div>
            <div style={{ fontSize: 7, color: "rgba(0,255,204,0.4)" }}>
              FRNTR/DAY
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,215,0,0.04)",
              border: "1px solid rgba(255,215,0,0.1)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "rgba(224,244,255,0.35)",
                letterSpacing: "0.12em",
                marginBottom: 2,
              }}
            >
              UNCLAIMED
            </div>
            <GlobalTicker plotsOwned={plotsOwned} />
            <div style={{ fontSize: 7, color: "rgba(255,215,0,0.4)" }}>
              FRNTR
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,255,204,0.03)",
              border: "1px solid rgba(0,255,204,0.08)",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "rgba(224,244,255,0.35)",
                letterSpacing: "0.12em",
                marginBottom: 2,
              }}
            >
              SINCE SYNC
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 12,
                color: "rgba(0,255,204,0.8)",
              }}
            >
              {fmt(accruedFrntSinceSync)}
            </div>
            <div style={{ fontSize: 7, color: "rgba(0,255,204,0.35)" }}>
              FRNTR
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── summary stats ────────────────────────────────────────────────────────────

function InventorySummary({ plots }: { plots: PlotData[] }) {
  const generatorTiers = useGameStore((s) => s.generatorTiers);

  if (plots.length === 0) return null;

  let avgEff = 0;
  for (const p of plots) avgEff += p.efficiency;
  avgEff /= plots.length;

  const topTier = Math.max(
    ...plots.map((p) => generatorTiers[String(p.id)] ?? 0),
    0,
  );
  const upgraded = plots.filter(
    (p) => (generatorTiers[String(p.id)] ?? 0) > 0,
  ).length;

  const stats = [
    {
      label: "AVG EFF",
      value: `${avgEff.toFixed(1)}%`,
      color: avgEff >= 90 ? "#4ade80" : avgEff >= 75 ? "#fbbf24" : "#f87171",
    },
    {
      label: "TOP TIER",
      value: topTier === 0 ? "OUTPOST" : `T${topTier}`,
      color: topTier > 0 ? "#00ffcc" : "rgba(224,244,255,0.45)",
    },
    {
      label: "UPGRADED",
      value: `${upgraded}/${plots.length}`,
      color: upgraded > 0 ? "#ffd700" : "rgba(224,244,255,0.4)",
    },
  ];

  return (
    <div
      style={{
        marginBottom: 10,
        borderRadius: 8,
        padding: "6px 10px",
        background: "rgba(0,8,18,0.7)",
        border: "1px solid rgba(0,255,204,0.08)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
      }}
    >
      {stats.map(({ label, value, color }) => (
        <div key={label} style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 7,
              color: "rgba(224,244,255,0.3)",
              letterSpacing: "0.12em",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 700,
              color,
              marginTop: 1,
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      data-ocid="inventory.empty_state"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        gap: 12,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <polygon
          points="24,2 44,13 44,35 24,46 4,35 4,13"
          stroke="rgba(0,255,204,0.3)"
          strokeWidth="1.5"
          fill="rgba(0,255,204,0.04)"
        />
        <polygon
          points="24,10 38,18 38,30 24,38 10,30 10,18"
          stroke="rgba(0,255,204,0.15)"
          strokeWidth="1"
          fill="rgba(0,255,204,0.02)"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="14"
          fill="rgba(0,255,204,0.5)"
          fontFamily="monospace"
        >
          ?
        </text>
      </svg>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#e0f4ff",
          letterSpacing: "0.2em",
        }}
      >
        NO ASSETS ACQUIRED
      </div>
      <div
        style={{
          fontSize: 10,
          color: "rgba(224,244,255,0.4)",
          maxWidth: 260,
          lineHeight: 1.6,
        }}
      >
        Purchase your first hexagonal territory on the globe to begin generating
        FRNTR passively. Each plot generates tokens every second.
      </div>
      <div
        data-ocid="inventory.go_to_globe_button"
        style={{
          marginTop: 4,
          padding: "8px 18px",
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.18em",
          background: "rgba(0,255,204,0.08)",
          border: "1px solid rgba(0,255,204,0.25)",
          color: "#00ffcc",
          cursor: "pointer",
          boxShadow: "0 0 16px rgba(0,255,204,0.1)",
        }}
      >
        → SELECT A HEX ON THE GLOBE
      </div>
    </motion.div>
  );
}

// ─── main inventory page ──────────────────────────────────────────────────────

export default function Inventory() {
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const allPlots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);

  const ownedPlotData = plotsOwned
    .map((id) => allPlots.find((p) => String(p.id) === id))
    .filter((p): p is PlotData => !!p);

  return (
    <div
      data-ocid="inventory.page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        padding: "12px 12px 16px",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,255,204,0.2) transparent",
      }}
    >
      <InventoryHeader />
      <InventorySummary plots={ownedPlotData} />

      {player.isAdmin && <LiquiditySeedingPanel />}

      {plotsOwned.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 3,
              height: 12,
              borderRadius: 2,
              background: "linear-gradient(180deg,#00ffcc,#0088aa)",
            }}
          />
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: "#00ffcc",
              letterSpacing: "0.22em",
            }}
          >
            OWNED TERRITORIES
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 4,
              background: "rgba(0,255,204,0.08)",
              border: "1px solid rgba(0,255,204,0.18)",
              color: "#e0f4ff",
              marginLeft: "auto",
            }}
          >
            {plotsOwned.length}
          </span>
        </div>
      )}

      {plotsOwned.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          data-ocid="inventory.list"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            paddingBottom: 16,
          }}
        >
          {plotsOwned.map((plotId, idx) => (
            <PlotTile key={plotId} plotId={plotId} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
