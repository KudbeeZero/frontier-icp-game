import { useActor } from "@caffeineai/core-infrastructure";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import {
  BIOME_DOT,
  TIER_DAILY_RATES as TIER_DAILY,
  TIER_NAMES,
  UPGRADE_COSTS,
} from "../constants/tiers";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier } from "../store/gameStore";
import ActionConfirmModal from "./ActionConfirmModal";
import type { ConfirmDetail } from "./ActionConfirmModal";
import PostActionToast from "./PostActionToast";
import type { PostActionType } from "./PostActionToast";

// Re-export for any consumers that imported from PlotCard
export { BIOME_DOT, TIER_DAILY, TIER_NAMES, UPGRADE_COSTS };

function effColor(eff: number): string {
  if (eff >= 85) return "#4ade80";
  if (eff >= 70) return "#fbbf24";
  return "#f87171";
}

function fmtRate(n: number, decimals = 4) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function rarityFromBiome(
  biome: string,
  tier: number,
): { label: string; color: string } {
  if (biome === "AsteroidImpact")
    return { label: "LEGENDARY", color: "#e040fb" };
  if (biome === "Volcanic") return { label: "EPIC", color: "#ff6b35" };
  if (biome === "Tropical" || biome === "Arctic")
    return { label: "RARE", color: "#00bcd4" };
  if (tier >= 4) return { label: "ELITE", color: "#ffd700" };
  return { label: "COMMON", color: "rgba(224,244,255,0.4)" };
}

function TierBar({ tier }: { tier: GeneratorTier }) {
  return (
    <div className="flex gap-0.5">
      {([0, 1, 2, 3, 4, 5, 6] as GeneratorTier[]).map((t) => (
        <div
          key={t}
          className="h-0.5 flex-1 transition-all duration-500"
          style={{
            background:
              t < tier
                ? "rgba(0,255,204,0.4)"
                : t === tier
                  ? tier === 6
                    ? "linear-gradient(90deg, #ffd700, #ff6b35)"
                    : "linear-gradient(90deg, #00ffcc, #ffd700)"
                  : "rgba(255,255,255,0.06)",
            boxShadow:
              t === tier && tier > 0 ? "0 0 4px rgba(0,255,204,0.6)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// Live per-card unclaimed counter
function UnclaimedCounter({
  plotId,
  tier,
}: { plotId: string; tier: GeneratorTier }) {
  const perSecond = TIER_DAILY[tier] / 86400;
  const [unclaimed, setUnclaimed] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on plotId change only
  useEffect(() => {
    setUnclaimed(0);
    if (perSecond === 0) return;
    const id = setInterval(() => setUnclaimed((v) => v + perSecond), 1000);
    return () => clearInterval(id);
  }, [plotId]);

  return (
    <span className="font-mono font-bold" style={{ color: "#ffd700" }}>
      {unclaimed.toFixed(8)}
    </span>
  );
}

interface PlotCardProps {
  plotId: string;
  index: number;
}

export default function PlotCard({ plotId, index }: PlotCardProps) {
  const plot = useGameStore((s) =>
    s.plots.find((p) => String(p.id) === plotId),
  );
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const spendFrntr = useGameStore((s) => s.spendFrntr);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const player = useGameStore((s) => s.player);
  const { actor } = useActor(createActor);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  // Close upgrade on outside click
  useEffect(() => {
    if (!upgradeOpen) return;
    function onOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setUpgradeOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [upgradeOpen]);

  function openConfirmModal(
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

  async function handleConfirmAction() {
    if (!confirmPending) return;
    setConfirmLoading(true);
    try {
      await confirmPending();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmPending(null);
    }
  }

  function handleCancelConfirm() {
    setConfirmOpen(false);
    setConfirmPending(null);
    actor
      ?.logCancelledAction(
        confirmTitle,
        plotId,
        null,
        "User cancelled from inventory",
      )
      .catch(() => {});
  }

  if (!plot) return null;

  const tier = (generatorTiers[plotId] ?? 0) as GeneratorTier;
  const dailyRate = TIER_DAILY[tier];
  const hourlyRate = dailyRate / 24;
  const minRate = dailyRate / 1440;
  const biomeColor = BIOME_DOT[plot.biome] ?? "#00ffcc";
  const plotTitle = `PLOT #${String(plot.id).slice(0, 8).toUpperCase()}`;
  const nextTier = Math.min(6, tier + 1) as GeneratorTier;
  const upgradeCost = tier < 6 ? (UPGRADE_COSTS[nextTier] ?? null) : null;
  const nextDailyRate = tier < 6 ? TIER_DAILY[nextTier] : null;
  const surveyed = !!(plot as { surveyed?: boolean }).surveyed;
  const isLoggedIn = !!player.principal;
  const rarity = rarityFromBiome(plot.biome, tier);
  const biomeName = plot.biome
    .replace("AsteroidImpact", "Asteroid Impact")
    .replace("DeepOcean", "Deep Ocean");

  const executeClaim = async () => {
    if (!actor || claiming) return;
    setClaiming(true);
    try {
      const res = await actor.claimAccumulatedTokens(String(plot.id));
      if ("ok" in res) {
        incrementClaimCount();
        // Immediately refresh balance from canister
        try {
          const state = await actor.getPlayerState();
          if (state) setFrntrBalance(BigInt(state.frntBalance));
        } catch {
          /* non-critical */
        }
        toast.success(`Tokens claimed from ${plotTitle}`);
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
    openConfirmModal(
      "Claim Tokens",
      "claim",
      [
        { label: "Plot", value: plotTitle },
        { label: "Daily Rate", value: `${dailyRate} FRNTR/day` },
        { label: "Hourly Rate", value: `${fmtRate(hourlyRate, 2)} FRNTR/hr` },
      ],
      "",
      "Claimed tokens are transferred on-chain and added to your wallet balance. Cannot be reversed.",
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
        toast.success(`${plotTitle} upgraded to ${TIER_NAMES[nextTier]}`);
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
    openConfirmModal(
      "Upgrade Generator",
      "upgrade",
      [
        { label: "Plot", value: plotTitle },
        { label: "Current Tier", value: TIER_NAMES[tier] },
        { label: "Next Tier", value: TIER_NAMES[nextTier] },
        { label: "New Daily Rate", value: `${nextDailyRate} FRNTR/day` },
        {
          label: "Rate Increase",
          value: `+${(nextDailyRate ?? 0) - dailyRate} FRNTR/day`,
        },
      ],
      `${upgradeCost.toLocaleString()} FRNTR`,
      "Upgrading permanently burns FRNTR from your balance and the total supply. This cannot be undone.",
      executeUpgrade,
    );
  };

  return (
    <motion.div
      ref={cardRef}
      data-ocid={`inventory.item.${index}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: "rgba(0,12,26,0.82)",
        border: `1px solid ${
          tier > 3 ? "rgba(255,215,0,0.18)" : "rgba(0,255,204,0.14)"
        }`,
        boxShadow:
          tier > 3
            ? "0 0 24px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,215,0,0.08)"
            : tier > 0
              ? "0 0 16px rgba(0,255,204,0.05)"
              : "none",
      }}
    >
      {/* Tier colour progress bar */}
      <TierBar tier={tier} />

      <div className="p-3">
        {/* ─── Header row ─── */}
        <div className="flex items-start gap-2 mb-3">
          {/* Biome colour dot */}
          <div
            className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0"
            style={{
              background: biomeColor,
              boxShadow: `0 0 8px ${biomeColor}88`,
            }}
          />

          {/* Title + biome + coords */}
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold font-mono tracking-wider leading-tight"
              style={{ color: "#e0f4ff" }}
            >
              {plotTitle}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className="text-[9px] font-semibold"
                style={{ color: biomeColor }}
              >
                {biomeName}
              </span>
              <span style={{ color: "rgba(224,244,255,0.2)" }}>·</span>
              <span
                className="text-[8px] font-mono"
                style={{ color: "rgba(224,244,255,0.32)" }}
              >
                {plot.lat.toFixed(1)}°, {plot.lng.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Rarity + tier badges */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
              style={{
                background: `${rarity.color}18`,
                border: `1px solid ${rarity.color}44`,
                color: rarity.color,
              }}
            >
              {rarity.label}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide"
              style={{
                background:
                  tier > 0 ? "rgba(0,255,204,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  tier > 0 ? "rgba(0,255,204,0.28)" : "rgba(255,255,255,0.08)"
                }`,
                color: tier > 0 ? "#00ffcc" : "rgba(224,244,255,0.4)",
              }}
            >
              {TIER_NAMES[tier]}
            </span>
          </div>
        </div>

        {/* ─── Generation rates ─── */}
        <div
          className="grid grid-cols-3 gap-1.5 mb-2.5 px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(0,255,204,0.025)",
            border: "1px solid rgba(0,255,204,0.08)",
          }}
        >
          {[
            { label: "FRNTR / MIN", value: fmtRate(minRate, 4) },
            { label: "FRNTR / HR", value: fmtRate(hourlyRate, 2) },
            { label: "FRNTR / DAY", value: String(dailyRate) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div
                className="text-[7.5px] mb-0.5 tracking-wider"
                style={{ color: "rgba(224,244,255,0.35)" }}
              >
                {label}
              </div>
              <div
                className="text-[11px] font-bold font-mono"
                style={{ color: "#ffd700" }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Unclaimed accumulating counter ─── */}
        <div
          className="flex items-center justify-between mb-2.5 px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.12)",
          }}
        >
          <div>
            <div
              className="text-[8px] font-bold tracking-widest uppercase"
              style={{ color: "rgba(224,244,255,0.4)" }}
            >
              ACCUMULATING THIS SESSION
            </div>
            <div
              className="text-[7.5px] mt-0.5"
              style={{ color: "rgba(224,244,255,0.28)" }}
            >
              Resets on claim — adds to wallet balance
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <UnclaimedCounter plotId={plotId} tier={tier} />
            <span
              className="text-[7.5px] font-bold"
              style={{ color: "rgba(255,215,0,0.5)" }}
            >
              FRNTR
            </span>
          </div>
        </div>

        {/* ─── Efficiency bar + survey badge ─── */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[7.5px] tracking-widest uppercase"
                style={{ color: "rgba(224,244,255,0.35)" }}
              >
                EFFICIENCY
              </span>
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color: effColor(plot.efficiency) }}
              >
                {plot.efficiency}%
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{
                  width: `${plot.efficiency}%`,
                  background:
                    plot.efficiency >= 85
                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                      : plot.efficiency >= 70
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #ef4444, #f87171)",
                  boxShadow:
                    plot.efficiency >= 85
                      ? "0 0 6px rgba(74,222,128,0.4)"
                      : plot.efficiency >= 70
                        ? "0 0 6px rgba(251,191,36,0.4)"
                        : "0 0 6px rgba(248,113,113,0.4)",
                }}
              />
            </div>
          </div>
          <div
            className="flex-shrink-0 px-2 py-1.5 rounded text-[8px] font-bold tracking-wider"
            style={{
              background: surveyed
                ? "rgba(0,255,100,0.08)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${
                surveyed ? "rgba(0,255,100,0.22)" : "rgba(255,255,255,0.07)"
              }`,
              color: surveyed ? "#00ff64" : "rgba(224,244,255,0.35)",
              minWidth: 56,
              textAlign: "center",
            }}
          >
            {surveyed ? "✓ SRVY" : "UNSRVY"}
          </div>
        </div>

        {/* ─── Sub-parcel slots ─── */}
        <div className="flex flex-wrap gap-1 mb-3">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span
              key={n}
              className="px-1.5 py-0.5 rounded text-[7.5px] font-medium"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(224,244,255,0.28)",
              }}
            >
              SUB-{n}: SOON™
            </span>
          ))}
        </div>

        {/* ─── Action buttons row ─── */}
        <div className="flex gap-2">
          {/* CLAIM */}
          <button
            type="button"
            data-ocid={`inventory.claim_button.${index}`}
            onClick={handleClaim}
            disabled={!isLoggedIn || claiming}
            className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-[0.15em] uppercase transition-all duration-200"
            style={{
              background:
                isLoggedIn && !claiming
                  ? "linear-gradient(135deg, rgba(0,255,204,0.1), rgba(0,255,204,0.06))"
                  : "rgba(255,255,255,0.03)",
              border: `1px solid ${
                isLoggedIn && !claiming
                  ? "rgba(0,255,204,0.3)"
                  : "rgba(255,255,255,0.06)"
              }`,
              color:
                isLoggedIn && !claiming ? "#00ffcc" : "rgba(224,244,255,0.3)",
              cursor: isLoggedIn && !claiming ? "pointer" : "not-allowed",
              opacity: isLoggedIn && !claiming ? 1 : 0.5,
            }}
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#00ffcc" }}
                />
                CLAIMING...
              </span>
            ) : (
              "CLAIM"
            )}
          </button>

          {/* UPGRADE */}
          {upgradeCost !== null && (
            <button
              type="button"
              data-ocid={`inventory.upgrade_button.${index}`}
              onClick={() => setUpgradeOpen((v) => !v)}
              disabled={!isLoggedIn}
              className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-[0.15em] uppercase transition-all duration-200"
              style={{
                background: upgradeOpen
                  ? "rgba(255,215,0,0.14)"
                  : "rgba(255,215,0,0.06)",
                border: `1px solid ${
                  upgradeOpen ? "rgba(255,215,0,0.45)" : "rgba(255,215,0,0.18)"
                }`,
                color: isLoggedIn ? "#ffd700" : "rgba(224,244,255,0.3)",
                cursor: isLoggedIn ? "pointer" : "not-allowed",
                opacity: isLoggedIn ? 1 : 0.5,
                boxShadow: upgradeOpen
                  ? "0 0 12px rgba(255,215,0,0.1)"
                  : "none",
              }}
            >
              {upgradeOpen ? "✕ CANCEL" : "⬆ UPGRADE"}
            </button>
          )}

          {/* EXPAND details toggle */}
          <button
            type="button"
            data-ocid={`inventory.expand_button.${index}`}
            onClick={() => setExpanded((v) => !v)}
            className="w-9 py-2 rounded-lg text-[10px] transition-all duration-200"
            style={{
              background: expanded
                ? "rgba(0,255,204,0.08)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${
                expanded ? "rgba(0,255,204,0.25)" : "rgba(255,255,255,0.07)"
              }`,
              color: expanded ? "#00ffcc" : "rgba(224,244,255,0.4)",
              cursor: "pointer",
            }}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* ─── Inline upgrade panel ─── */}
        <AnimatePresence>
          {upgradeOpen && upgradeCost !== null && nextDailyRate !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden mt-2"
            >
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,215,0,0.04)",
                  border: "1px solid rgba(255,215,0,0.22)",
                  boxShadow:
                    "0 0 24px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,215,0,0.08)",
                }}
              >
                {/* Tier comparison */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex-1 px-2 py-1.5 rounded text-center"
                    style={{
                      background: "rgba(0,255,204,0.06)",
                      border: "1px solid rgba(0,255,204,0.15)",
                    }}
                  >
                    <div
                      className="text-[7.5px]"
                      style={{ color: "rgba(224,244,255,0.4)" }}
                    >
                      CURRENT
                    </div>
                    <div
                      className="text-[9px] font-bold"
                      style={{ color: "#00ffcc" }}
                    >
                      {TIER_NAMES[tier]}
                    </div>
                    <div
                      className="text-[8px] font-mono"
                      style={{ color: "rgba(224,244,255,0.5)" }}
                    >
                      {dailyRate}/day
                    </div>
                  </div>
                  <div
                    className="text-[12px]"
                    style={{ color: "rgba(255,215,0,0.5)" }}
                  >
                    →
                  </div>
                  <div
                    className="flex-1 px-2 py-1.5 rounded text-center"
                    style={{
                      background: "rgba(255,215,0,0.08)",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    <div
                      className="text-[7.5px]"
                      style={{ color: "rgba(224,244,255,0.4)" }}
                    >
                      NEXT TIER
                    </div>
                    <div
                      className="text-[9px] font-bold"
                      style={{ color: "#ffd700" }}
                    >
                      {TIER_NAMES[nextTier]}
                    </div>
                    <div
                      className="text-[8px] font-mono"
                      style={{ color: "rgba(255,215,0,0.7)" }}
                    >
                      {nextDailyRate}/day
                    </div>
                  </div>
                </div>

                {/* Cost + gain row */}
                <div
                  className="flex items-center justify-between mb-3 px-2.5 py-2 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,215,0,0.12)",
                  }}
                >
                  <div>
                    <div
                      className="text-[7.5px]"
                      style={{ color: "rgba(224,244,255,0.35)" }}
                    >
                      UPGRADE COST
                    </div>
                    <div
                      className="text-sm font-black font-mono"
                      style={{
                        color: "#ffd700",
                        textShadow: "0 0 8px rgba(255,215,0,0.25)",
                      }}
                    >
                      {upgradeCost.toLocaleString()}
                      <span
                        className="text-[8px] ml-1"
                        style={{ color: "rgba(255,215,0,0.6)" }}
                      >
                        FRNTR
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[7.5px]"
                      style={{ color: "rgba(224,244,255,0.35)" }}
                    >
                      RATE GAIN
                    </div>
                    <div
                      className="text-sm font-black font-mono"
                      style={{ color: "#4ade80" }}
                    >
                      +{nextDailyRate - dailyRate}
                      <span
                        className="text-[8px] ml-1"
                        style={{ color: "rgba(74,222,128,0.6)" }}
                      >
                        /day
                      </span>
                    </div>
                  </div>
                </div>

                {/* Burn warning */}
                <div
                  className="text-[8px] mb-2.5 px-2 py-1.5 rounded"
                  style={{
                    color: "rgba(248,113,113,0.7)",
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.1)",
                  }}
                >
                  ⚠️ Burns {upgradeCost.toLocaleString()} FRNTR permanently —
                  cannot be undone
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid={`inventory.confirm_button.${index}`}
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200"
                    style={{
                      background: upgrading
                        ? "rgba(255,215,0,0.06)"
                        : "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,215,0,0.1))",
                      border: `1px solid ${
                        upgrading
                          ? "rgba(255,215,0,0.15)"
                          : "rgba(255,215,0,0.45)"
                      }`,
                      color: upgrading ? "rgba(255,215,0,0.4)" : "#ffd700",
                      cursor: upgrading ? "not-allowed" : "pointer",
                      boxShadow: upgrading
                        ? "none"
                        : "0 0 12px rgba(255,215,0,0.12)",
                    }}
                  >
                    {upgrading ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: "#ffd700" }}
                        />
                        UPGRADING...
                      </span>
                    ) : (
                      "CONFIRM UPGRADE"
                    )}
                  </button>
                  <button
                    type="button"
                    data-ocid={`inventory.cancel_button.${index}`}
                    onClick={() => setUpgradeOpen(false)}
                    className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(224,244,255,0.4)",
                      cursor: "pointer",
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Expanded plot details ─── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2"
            >
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(0,20,40,0.5)",
                  border: "1px solid rgba(0,255,204,0.08)",
                }}
              >
                <div
                  className="text-[8px] font-bold tracking-[0.2em] uppercase mb-2"
                  style={{ color: "rgba(0,255,204,0.6)" }}
                >
                  PLOT DETAILS
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "PLOT ID", value: String(plot.id) },
                    { label: "BIOME", value: biomeName },
                    {
                      label: "COORDINATES",
                      value: `${plot.lat.toFixed(2)}° / ${plot.lng.toFixed(2)}°`,
                    },
                    { label: "MINE COUNT", value: String(plot.mineCount) },
                    { label: "TIER LEVEL", value: `${tier} / 6` },
                    {
                      label: "SURVEY",
                      value: surveyed ? "Unlocked" : "Not surveyed",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="px-2 py-1.5 rounded"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        className="text-[7px]"
                        style={{ color: "rgba(224,244,255,0.3)" }}
                      >
                        {label}
                      </div>
                      <div
                        className="text-[9px] font-mono font-semibold mt-0.5"
                        style={{ color: "rgba(224,244,255,0.7)" }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                {tier === 6 && (
                  <div
                    className="mt-2 px-2.5 py-2 rounded text-center text-[8px] font-bold tracking-wider"
                    style={{
                      background: "rgba(0,255,204,0.05)",
                      border: "1px solid rgba(0,255,204,0.15)",
                      color: "#00ffcc",
                    }}
                  >
                    ✦ APEX NEXUS — MAX TIER REACHED
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ActionConfirmModal
        isOpen={confirmOpen}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
        title={confirmTitle}
        actionType={confirmActionType}
        details={confirmDetails}
        costLabel={confirmCostLabel}
        warningText={confirmWarning}
        isLoading={confirmLoading}
      />

      <PostActionToast
        actionType={postActionType}
        onNavigate={(tab) => {
          window.dispatchEvent(
            new CustomEvent("navigate-tab", { detail: { tab } }),
          );
        }}
        onDismiss={() => setPostActionType(null)}
      />
    </motion.div>
  );
}
