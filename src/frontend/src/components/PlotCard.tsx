import { useActor } from "@caffeineai/core-infrastructure";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
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

function efficiencyColor(eff: number): string {
  if (eff >= 85) return "text-green-400";
  if (eff >= 70) return "text-amber-400";
  return "text-red-400";
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
    const id = setInterval(() => setUnclaimed((v) => v + perSecond), 1000);
    return () => clearInterval(id);
  }, [plotId]);

  return (
    <span className="font-mono text-amber-400">{unclaimed.toFixed(6)}</span>
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
  const hourlyRate = (dailyRate / 24).toFixed(2);
  const minRate = (dailyRate / 1440).toFixed(4);
  const biomeColor = BIOME_DOT[plot.biome] ?? "#00ffcc";
  const plotTitle = `Plot #${String(plot.id).slice(0, 8).toUpperCase()}`;
  const nextTier = (tier + 1) as GeneratorTier;
  const upgradeCost = tier < 6 ? UPGRADE_COSTS[nextTier] : null;
  const nextDailyRate = tier < 6 ? TIER_DAILY[nextTier] : null;
  const surveyed = !!(plot as { surveyed?: boolean }).surveyed;
  const isLoggedIn = !!player.principal;
  const tierProgress = (tier / 6) * 100;

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
        { label: "Est. Unclaimed", value: "See ticker above" },
      ],
      "",
      "Claimed tokens are transferred on-chain. This action cannot be reversed.",
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
        { label: "New Rate", value: `${nextDailyRate} FRNTR/day` },
      ],
      `${upgradeCost.toLocaleString()} FRNTR`,
      "Upgrading burns FRNTR permanently from your balance and the total supply.",
      executeUpgrade,
    );
  };

  return (
    <motion.div
      data-ocid={`inventory.item.${index}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: "rgba(0,20,40,0.55)",
        border: "1px solid rgba(0,255,204,0.15)",
        boxShadow: tier > 0 ? "0 0 20px rgba(0,255,204,0.06)" : "none",
      }}
    >
      {/* Tier progress bar */}
      {tier > 0 && (
        <div
          className="absolute top-0 left-0 h-0.5 transition-all duration-700"
          style={{
            width: `${tierProgress}%`,
            background: "linear-gradient(90deg, #00ffcc, #ffd700)",
          }}
        />
      )}

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: biomeColor,
              boxShadow: `0 0 6px ${biomeColor}99`,
            }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-bold font-mono tracking-wide"
              style={{ color: "#e0f4ff" }}
            >
              {plotTitle}
            </div>
            <div
              className="text-[10px] font-medium"
              style={{ color: "rgba(224,244,255,0.5)" }}
            >
              {plot.biome}
            </div>
          </div>
          {/* Tier badge */}
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
            style={{
              background:
                tier > 0 ? "rgba(0,255,204,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${tier > 0 ? "rgba(0,255,204,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: tier > 0 ? "#00ffcc" : "rgba(224,244,255,0.45)",
            }}
          >
            {TIER_NAMES[tier]}
          </span>
          {/* Survey badge */}
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
            style={{
              background: surveyed
                ? "rgba(0,255,100,0.1)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${surveyed ? "rgba(0,255,100,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: surveyed ? "#00ff64" : "rgba(224,244,255,0.4)",
            }}
          >
            {surveyed ? "SURVEYED" : "UNSRVY"}
          </span>
        </div>

        {/* Stats grid */}
        <div
          className="grid grid-cols-3 gap-1.5 mb-3 px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(0,255,204,0.03)",
            border: "1px solid rgba(0,255,204,0.07)",
          }}
        >
          {[
            { label: "FRNTR/MIN", value: minRate },
            { label: "FRNTR/HR", value: hourlyRate },
            { label: "FRNTR/DAY", value: String(dailyRate) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div
                className="text-[8px] mb-0.5"
                style={{ color: "rgba(224,244,255,0.4)" }}
              >
                {label}
              </div>
              <div className="text-[11px] font-bold font-mono text-amber-400">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Unclaimed accumulating counter */}
        <div
          className="flex items-center justify-between mb-3 px-2.5 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
          }}
        >
          <span
            className="text-[9px] font-semibold tracking-widest"
            style={{ color: "rgba(224,244,255,0.45)" }}
          >
            ACCUMULATING
          </span>
          <div className="flex items-center gap-1">
            <UnclaimedCounter plotId={plotId} tier={tier} />
            <span
              className="text-[8px] font-bold"
              style={{ color: "rgba(255,215,0,0.55)" }}
            >
              FRNTR
            </span>
          </div>
        </div>

        {/* Efficiency bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[8px] tracking-widest"
              style={{ color: "rgba(224,244,255,0.4)" }}
            >
              EFFICIENCY
            </span>
            <span
              className={`text-[10px] font-bold font-mono ${efficiencyColor(plot.efficiency)}`}
            >
              {plot.efficiency}%
            </span>
          </div>
          <div
            className="h-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-0.5 rounded-full transition-all duration-500"
              style={{
                width: `${plot.efficiency}%`,
                background:
                  plot.efficiency >= 85
                    ? "linear-gradient(90deg, #22c55e, #4ade80)"
                    : plot.efficiency >= 70
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                      : "linear-gradient(90deg, #ef4444, #f87171)",
              }}
            />
          </div>
        </div>

        {/* Sub-parcel badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span
              key={n}
              className="px-1.5 py-0.5 rounded text-[8px] font-medium"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(224,244,255,0.35)",
              }}
            >
              SUB-{n}: SOON
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div
          className="flex gap-2"
          style={{ marginBottom: upgradeOpen ? 8 : 0 }}
        >
          <button
            type="button"
            data-ocid={`inventory.claim_button.${index}`}
            onClick={handleClaim}
            disabled={!isLoggedIn || claiming}
            className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
            style={{
              background: "rgba(0,255,204,0.08)",
              border: "1px solid rgba(0,255,204,0.22)",
              color:
                isLoggedIn && !claiming ? "#00ffcc" : "rgba(224,244,255,0.35)",
              cursor: isLoggedIn && !claiming ? "pointer" : "not-allowed",
              opacity: isLoggedIn && !claiming ? 1 : 0.45,
            }}
          >
            {claiming ? "CLAIMING..." : "CLAIM"}
          </button>
          {upgradeCost !== null && (
            <button
              type="button"
              data-ocid={`inventory.upgrade_button.${index}`}
              onClick={() => setUpgradeOpen((v) => !v)}
              disabled={!isLoggedIn}
              className="flex-1 py-2 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200"
              style={{
                background: upgradeOpen
                  ? "rgba(255,215,0,0.14)"
                  : "rgba(255,215,0,0.06)",
                border: `1px solid ${upgradeOpen ? "rgba(255,215,0,0.45)" : "rgba(255,215,0,0.2)"}`,
                color: isLoggedIn ? "#ffd700" : "rgba(224,244,255,0.35)",
                cursor: isLoggedIn ? "pointer" : "not-allowed",
                opacity: isLoggedIn ? 1 : 0.45,
              }}
            >
              {upgradeOpen ? "CANCEL" : "UPGRADE"}
            </button>
          )}
        </div>

        {/* Inline upgrade panel */}
        <AnimatePresence>
          {upgradeOpen && upgradeCost !== null && nextDailyRate !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2"
            >
              <div
                className="p-3 rounded-lg"
                style={{
                  background: "rgba(255,215,0,0.05)",
                  border: "1px solid rgba(255,215,0,0.2)",
                }}
              >
                <div
                  className="text-[9px] mb-2"
                  style={{ color: "rgba(224,244,255,0.5)" }}
                >
                  Cost:{" "}
                  <span className="font-mono font-bold text-amber-400">
                    {upgradeCost.toLocaleString()} FRNTR
                  </span>
                  {" · "}New rate:{" "}
                  <span className="font-mono font-bold text-amber-400">
                    {nextDailyRate} FRNTR/day
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid={`inventory.confirm_button.${index}`}
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200"
                    style={{
                      background: "rgba(255,215,0,0.15)",
                      border: "1px solid rgba(255,215,0,0.4)",
                      color: "#ffd700",
                      cursor: upgrading ? "not-allowed" : "pointer",
                      opacity: upgrading ? 0.5 : 1,
                    }}
                  >
                    {upgrading ? "UPGRADING..." : "CONFIRM UPGRADE"}
                  </button>
                  <button
                    type="button"
                    data-ocid={`inventory.cancel_button.${index}`}
                    onClick={() => setUpgradeOpen(false)}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(224,244,255,0.45)",
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
