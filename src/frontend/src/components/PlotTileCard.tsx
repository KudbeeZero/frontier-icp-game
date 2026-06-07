import { useActor } from "@caffeineai/core-infrastructure";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import ActionConfirmModal from "../components/ActionConfirmModal";
import type { ConfirmDetail } from "../components/ActionConfirmModal";
import PostActionToast from "../components/PostActionToast";
import type { PostActionType } from "../components/PostActionToast";
import UpgradeInlinePanel from "../components/UpgradeInlinePanel";
import {
  BIOME_DOT,
  TIER_DAILY_RATES,
  TIER_NAMES,
  UPGRADE_COSTS,
} from "../constants/tiers";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier, PlotData } from "../store/gameStore";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── survey status badge ─────────────────────────────────────────────────────

type SurveyStatus = "Unsurveyed" | "Surveyed" | "Pending";

function SurveyBadge({ status }: { status: SurveyStatus }) {
  const cfg = {
    Unsurveyed: {
      color: "rgba(224,244,255,0.35)",
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.08)",
      icon: "○",
    },
    Pending: {
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.25)",
      icon: "◐",
    },
    Surveyed: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.08)",
      border: "rgba(74,222,128,0.25)",
      icon: "◉",
    },
  }[status];
  return (
    <span
      style={{
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "2px 6px",
        borderRadius: 4,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span style={{ fontSize: 8 }}>{cfg.icon}</span>
      {status.toUpperCase()}
    </span>
  );
}

// ─── live ticking unclaimed counter ─────────────────────────────────────────

export function UnclaimedTicker({
  plotId,
  tier,
}: {
  plotId: string;
  tier: GeneratorTier;
}) {
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

// ─── sub-parcel coming-soon slots ────────────────────────────────────────────

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

// ─── PlotTileCard ─────────────────────────────────────────────────────────────

interface PlotTileCardProps {
  plotId: string;
  index: number;
  /** derived plot data — pass from parent after filtering owned plots */
  plot: PlotData;
  /** called when the card surface is clicked to open detail panel */
  onClick?: () => void;
}

export default function PlotTileCard({
  plotId,
  index,
  plot,
  onClick,
}: PlotTileCardProps) {
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const spendFrntr = useGameStore((s) => s.spendFrntr);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const { actor } = useActor(createActor);

  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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

  // survey status: derive from plot data (placeholder — wired to backend in future)
  const surveyStatus: SurveyStatus = "Unsurveyed";

  useEffect(() => {
    if (!upgradeOpen) return;
    function outside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node))
        setUpgradeOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [upgradeOpen]);

  const tier = (generatorTiers[plotId] ?? 0) as GeneratorTier;
  const dailyRate = TIER_DAILY_RATES[tier];
  const hourlyRate = dailyRate / 24;
  const minRate = dailyRate / 1440;
  const biomeColor = BIOME_DOT[plot.biome] ?? "#00ffcc";
  const nextTier = Math.min(6, tier + 1) as GeneratorTier;
  const upgradeCost = tier < 6 ? (UPGRADE_COSTS[nextTier] ?? null) : null;
  const nextDailyRate = tier < 6 ? TIER_DAILY_RATES[nextTier] : null;
  const rarity = rarityLabel(plot.biome, tier);
  const biomeName = plot.biome
    .replace("AsteroidImpact", "Asteroid Impact")
    .replace("DeepOcean", "Deep Ocean");
  const plotLabel = `#${String(plot.id).padStart(4, "0").toUpperCase()}`;

  // Static glow border — intensity scales with tier; hover brightens border
  const [hovered, setHovered] = useState(false);
  const glowColor = tier > 3 ? "rgba(255,215,0,0.18)" : "rgba(0,255,204,0.12)";
  const borderColor = hovered
    ? tier > 3
      ? "rgba(255,215,0,0.65)"
      : "rgba(0,255,204,0.55)"
    : tier > 3
      ? "rgba(255,215,0,0.28)"
      : "rgba(0,255,204,0.22)";
  const shadowGlow = hovered
    ? tier > 3
      ? "0 0 22px rgba(255,215,0,0.28), 0 0 4px rgba(255,215,0,0.18)"
      : "0 0 22px rgba(0,255,204,0.22), 0 0 4px rgba(0,255,204,0.14)"
    : tier > 3
      ? "0 0 14px rgba(255,215,0,0.12), 0 0 1px rgba(255,215,0,0.08)"
      : "0 0 14px rgba(0,255,204,0.08), 0 0 1px rgba(0,255,204,0.05)";

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
      "Claimed tokens are transferred on-chain to your wallet. Cannot be reversed.",
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

  return (
    <>
      <motion.div
        ref={cardRef}
        data-ocid={`inventory.item.${index}`}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.5) }}
        whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.15 } }}
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          background: "rgba(0,10,22,0.9)",
          border: `1px solid ${borderColor}`,
          boxShadow: `${shadowGlow}, inset 0 1px 0 rgba(0,255,204,0.07), 0 4px 16px rgba(0,0,0,0.45)`,
          cursor: onClick ? "pointer" : "default",
          minWidth: 0,
          transition: "border-color 0.2s, box-shadow 0.2s",
          // Extra outer glow for higher tiers
          filter: tier >= 5 ? `drop-shadow(0 0 6px ${glowColor})` : "none",
        }}
      >
        <ScanLines />

        {/* tier accent top stripe */}
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
          {/* ── HEADER ── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 6,
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
              {/* biome dot */}
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
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <span>{biomeName}</span>
                  <span style={{ color: "rgba(224,244,255,0.25)" }}>·</span>
                  <span
                    style={{
                      color: "rgba(224,244,255,0.28)",
                      fontFamily: "monospace",
                      fontSize: 8,
                    }}
                  >
                    {plot.lat.toFixed(1)}°, {plot.lng.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>

            {/* tier + rarity badges */}
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
                  fontSize: 7.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
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
                  letterSpacing: "0.1em",
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

          {/* tier progress pips */}
          <TierPips tier={tier} />

          {/* ── GENERATION RATES ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              margin: "8px 0",
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
                  padding: "5px 4px",
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
                    letterSpacing: "0.1em",
                    marginTop: 2,
                  }}
                >
                  FRNTR{label}
                </div>
              </div>
            ))}
          </div>

          {/* ── EFFICIENCY BAR ── */}
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
                  background: `linear-gradient(90deg, ${effColor(plot.efficiency)}, ${effColor(plot.efficiency)}88)`,
                  boxShadow: `0 0 6px ${effColor(plot.efficiency)}66`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>

          {/* ── UNCLAIMED ROW ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 8px",
              background: "rgba(255,215,0,0.04)",
              border: "1px solid rgba(255,215,0,0.1)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 7.5,
                color: "rgba(224,244,255,0.38)",
                letterSpacing: "0.12em",
              }}
            >
              UNCLAIMED
            </span>
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

          {/* ── SURVEY BADGE ── */}
          <div style={{ marginBottom: 8 }}>
            <SurveyBadge status={surveyStatus} />
          </div>

          {/* ── ACTION BUTTONS ── */}
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
                border: `1px solid ${
                  actor && !claiming
                    ? "rgba(0,255,204,0.35)"
                    : "rgba(255,255,255,0.07)"
                }`,
                color:
                  actor && !claiming ? "#00ffcc" : "rgba(224,244,255,0.25)",
                boxShadow:
                  actor && !claiming ? "0 0 8px rgba(0,255,204,0.12)" : "none",
                transition: "all 0.15s",
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
                    border: `1px solid ${
                      actor && !upgrading
                        ? "rgba(255,215,0,0.3)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    color:
                      actor && !upgrading
                        ? "#ffd700"
                        : "rgba(224,244,255,0.25)",
                    transition: "all 0.15s",
                  }}
                >
                  {upgrading ? "UPGRADING…" : "UPGRADE"}
                </button>
                <UpgradeInlinePanel
                  isOpen={upgradeOpen}
                  index={index}
                  tier={tier}
                  upgrading={upgrading}
                  onCancel={() => setUpgradeOpen(false)}
                  onConfirmUpgrade={handleUpgrade}
                />
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

          {/* ── SUB-PARCELS ── */}
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
