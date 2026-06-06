import { useActor } from "@caffeineai/core-infrastructure";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import LiquiditySeedingPanel from "../components/LiquiditySeedingPanel";
import PlotCard, { TIER_DAILY } from "../components/PlotCard";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier } from "../store/gameStore";

// Scrolling accumulation total across all owned plots
function GlobalUnclaimedCounter({ plotsOwned }: { plotsOwned: string[] }) {
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const [total, setTotal] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: recalculate when plotsOwned changes
  useEffect(() => {
    setTotal(0);
    const perSecond = plotsOwned.reduce((sum, id) => {
      const tier = (generatorTiers[id] ?? 0) as GeneratorTier;
      return sum + TIER_DAILY[tier] / 86400;
    }, 0);
    if (perSecond === 0) return;
    const id = setInterval(() => setTotal((v) => v + perSecond), 1000);
    return () => clearInterval(id);
  }, [plotsOwned.join(",")]);

  return (
    <span className="font-mono text-amber-400 font-bold text-sm">
      {total.toFixed(6)}
    </span>
  );
}

function BalanceHeader() {
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const { actor } = useActor(createActor);
  const [claimingAll, setClaimingAll] = useState(false);

  const totalBalance = confirmedFrntBalance + accruedFrntSinceSync;
  const plotCount = plotsOwned.length;

  const fmtFrntr = (n: number) =>
    n >= 1_000_000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : n >= 1_000
        ? n.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : n.toLocaleString(undefined, {
            minimumFractionDigits: 8,
            maximumFractionDigits: 8,
          });

  const handleClaimAll = async () => {
    if (!actor || claimingAll || plotsOwned.length === 0) return;
    setClaimingAll(true);
    let successCount = 0;
    try {
      for (const plotId of plotsOwned) {
        try {
          const res = await actor.claimAccumulatedTokens(plotId);
          if ("ok" in res) successCount++;
        } catch {
          // skip failed individual claims
        }
      }
      if (successCount > 0) {
        incrementClaimCount();
        try {
          const state = await actor.getPlayerState();
          if (state) setFrntrBalance(BigInt(state.frntBalance));
        } catch {
          // non-critical
        }
        toast.success(
          `Claimed tokens from ${successCount} plot${successCount !== 1 ? "s" : ""}`,
        );
      } else {
        toast.error("No tokens available to claim yet.");
      }
    } catch {
      toast.error("Claim All failed");
    } finally {
      setClaimingAll(false);
    }
  };

  return (
    <motion.div
      data-ocid="inventory.balance_header"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl mb-3 overflow-hidden"
      style={{
        background: "rgba(0,20,40,0.70)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(0,255,204,0.18)",
      }}
    >
      <div
        className="h-0.5 w-full"
        style={{
          background: "linear-gradient(90deg, #00ffcc, #ffd700, #00ffcc)",
        }}
      />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-[9px] font-bold tracking-widest uppercase mb-1"
              style={{ color: "#00ffcc" }}
            >
              FRNTR BALANCE
            </div>
            <div
              data-ocid="inventory.frntr_counter"
              className="font-mono font-black leading-none"
              style={{
                fontSize: 26,
                color: "#ffd700",
                textShadow: "0 0 16px rgba(255,215,0,0.3)",
              }}
            >
              {fmtFrntr(totalBalance)}
            </div>
            <div
              className="text-[8px] mt-1"
              style={{ color: "rgba(224,244,255,0.45)" }}
            >
              FRNTR &nbsp;&middot;&nbsp; {plotCount} PLOT
              {plotCount !== 1 ? "S" : ""} ACTIVE
            </div>
          </div>
          <button
            type="button"
            data-ocid="inventory.claim_all_button"
            onClick={handleClaimAll}
            disabled={!actor || claimingAll || plotCount === 0}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
            style={{
              background:
                actor && !claimingAll && plotCount > 0
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(255,255,255,0.04)",
              border: `1px solid ${actor && !claimingAll && plotCount > 0 ? "rgba(0,255,204,0.35)" : "rgba(255,255,255,0.08)"}`,
              color:
                actor && !claimingAll && plotCount > 0
                  ? "#00ffcc"
                  : "rgba(224,244,255,0.35)",
              cursor:
                actor && !claimingAll && plotCount > 0
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {claimingAll ? "CLAIMING..." : "CLAIM ALL"}
          </button>
        </div>
        <div
          className="flex items-center justify-between rounded-lg px-2.5 py-2"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
          }}
        >
          <div>
            <div
              className="text-[8px] font-bold tracking-widest uppercase mb-0.5"
              style={{ color: "rgba(224,244,255,0.4)" }}
            >
              ACCUMULATING ACROSS ALL PLOTS
            </div>
            <div
              className="text-[8px]"
              style={{ color: "rgba(224,244,255,0.35)" }}
            >
              Since last sync — claim to add to your balance
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <GlobalUnclaimedCounter plotsOwned={plotsOwned} />
            <span
              className="text-[8px] font-bold"
              style={{ color: "rgba(255,215,0,0.55)" }}
            >
              FRNTR
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Inventory() {
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const player = useGameStore((s) => s.player);

  return (
    <div
      data-ocid="inventory.page"
      className="flex flex-col h-full overflow-y-auto"
      style={{ padding: "12px 12px 4px" }}
    >
      <BalanceHeader />
      {player.isAdmin && <LiquiditySeedingPanel />}
      <div
        className="flex items-center justify-between mb-2.5"
        style={{ color: "#00ffcc" }}
      >
        <span className="text-[9px] font-bold tracking-widest uppercase">
          OWNED PLOTS
        </span>
        <span
          className="text-[10px] font-extrabold font-mono"
          style={{ color: "#e0f4ff" }}
        >
          {plotsOwned.length}
        </span>
      </div>
      {plotsOwned.length === 0 ? (
        <div
          data-ocid="inventory.empty_state"
          className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 px-5 py-8"
          style={{ color: "rgba(224,244,255,0.45)" }}
        >
          <div className="text-3xl">🌍</div>
          <div
            className="text-[11px] font-bold tracking-widest"
            style={{ color: "#e0f4ff" }}
          >
            NO PLOTS OWNED YET
          </div>
          <div
            className="text-[9px] max-w-[260px] leading-relaxed"
            style={{ color: "rgba(224,244,255,0.45)" }}
          >
            Purchase your first plot on the globe to start earning FRNTR tokens
            and resources passively.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pb-3">
          {plotsOwned.map((plotId, idx) => (
            <PlotCard key={plotId} plotId={plotId} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
