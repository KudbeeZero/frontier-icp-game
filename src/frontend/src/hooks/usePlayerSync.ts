import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect } from "react";
import { createActor } from "../backend";
import { type PurchaseDebugLog, useGameStore } from "../store/gameStore";

/**
 * Polls player state and leaderboard from the ICP canister.
 * Maps backend PlayerState fields to the local gameStore.
 * Does NOT overwrite plotsOwned array — backend returns a count (bigint), not an array.
 */
export function usePlayerSync(): void {
  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (!actor || isFetching) return;

    const syncLeaderboard = async () => {
      try {
        const data = await actor.getLeaderboard(50n);
        const mapped = data.map((e) => ({
          rank: Number(e.rank),
          name:
            e.username ??
            `${e.principal.slice(0, 8)}...${e.principal.slice(-4)}`,
          plotsOwned: Number(e.plotsOwned),
          frntEarned: Number(e.frntBalance),
          victories: 0,
        }));
        useGameStore.setState({ leaderboard: mapped });
      } catch {
        // Non-critical: keep existing leaderboard if sync fails
      }
    };

    const syncPlayer = async () => {
      try {
        const state = await actor.getPlayerState();
        if (!state) return;

        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            frntBalance: Number(state.frntBalance),
            iron: Number(state.iron),
            fuel: Number(state.fuel),
            crystal: Number(state.crystal),
            // plotsOwned is local array; backend returns bigint count, not array
          },
          rankStats: {
            ...s.rankStats,
            combatWins: Number(state.combatVictories),
          },
          serverPassiveIncomePerDay: Number(state.passiveIncomePerDay),
          totalFRNTRBurned: Number(state.totalFRNTRBurned),
        }));
      } catch {
        // Non-critical: local state remains as-is if sync fails
      }
    };

    void syncPlayer();
    void syncLeaderboard();

    const interval = setInterval(() => {
      void syncPlayer();
      void syncLeaderboard();
    }, 10_000);

    return () => {
      clearInterval(interval);
    };
  }, [actor, isFetching]);
}

function makeStep(
  label: string,
  status: "pending" | "success" | "error",
  detail: string,
) {
  return { step: label, status, detail, ts: new Date() };
}

function createPurchaseLog(plotId: string): PurchaseDebugLog {
  return {
    id: `${plotId}-${Date.now()}`,
    timestamp: new Date(),
    plotId,
    steps: [
      makeStep("1. ICP Payment Sent", "pending", "Awaiting confirmation"),
      makeStep("2. Plot Minting", "pending", "Awaiting confirmation"),
      makeStep("3. Revenue Split", "pending", "Awaiting confirmation"),
      makeStep("4. FRNTR Updated", "pending", "Awaiting confirmation"),
      makeStep("5. Leaderboard Refreshed", "pending", "Awaiting confirmation"),
    ],
  };
}

/**
 * Trigger a leaderboard refresh after a plot purchase completes.
 * Call this from purchase flow handlers.
 */
export async function refreshLeaderboardAfterPurchase(): Promise<void> {
  // This will be called from the purchase flow; the usePlayerSync hook
  // already polls every 10s, but we can force an immediate refresh.
  // Since we don't have actor access here, we rely on the next poll cycle.
  // The caller can also dispatch a custom event if needed.
}

/**
 * Log a purchase step. Mutates the provided log in-place and pushes
 * the updated log to the game store (max 10 entries retained).
 */
function pushPurchaseLog(log: PurchaseDebugLog) {
  useGameStore.getState().addPurchaseDebugLog(log);
}

/**
 * High-level purchase flow with per-step debug logging.
 * Returns true on full success.
 */
export async function purchasePlotWithDebug(
  actor: any,
  plotId: string,
): Promise<boolean> {
  const log = createPurchaseLog(plotId);
  pushPurchaseLog(log);

  try {
    // Step 1: send ICP payment + mint plot
    const result = await actor.purchasePlot(plotId);
    log.steps[0] = makeStep("1. ICP Payment Sent", "success", "Confirmed");
    log.steps[1] = makeStep("2. Plot Minting", "success", "Minted");
    pushPurchaseLog(log);

    // Step 3: revenue split (read from response if available)
    const devAmt = result?.devAmount ?? "?";
    const lbAmt = result?.leaderboardAmount ?? "?";
    const liqAmt = result?.liquidityAmount ?? "?";
    log.steps[2] = makeStep(
      "3. Revenue Split",
      "success",
      `Dev ${devAmt} | LB ${lbAmt} | Liq ${liqAmt}`,
    );
    pushPurchaseLog(log);

    // Step 4: refresh player state (FRNTR)
    try {
      const state = await actor.getPlayerState();
      if (state) {
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            frntBalance: Number(state.frntBalance),
            iron: Number(state.iron),
            fuel: Number(state.fuel),
            crystal: Number(state.crystal),
          },
        }));
      }
      log.steps[3] = makeStep("4. FRNTR Updated", "success", "Synced");
    } catch {
      log.steps[3] = makeStep("4. FRNTR Updated", "error", "Sync failed");
    }
    pushPurchaseLog(log);

    // Step 5: refresh leaderboard
    try {
      const data = await actor.getLeaderboard(50n);
      const mapped = data.map((e: any) => ({
        rank: Number(e.rank),
        name:
          e.username ?? `${e.principal.slice(0, 8)}...${e.principal.slice(-4)}`,
        plotsOwned: Number(e.plotsOwned),
        frntEarned: Number(e.frntBalance),
        victories: 0,
      }));
      useGameStore.setState({ leaderboard: mapped });
      log.steps[4] = makeStep(
        "5. Leaderboard Refreshed",
        "success",
        `${mapped.length} entries`,
      );
    } catch {
      log.steps[4] = makeStep(
        "5. Leaderboard Refreshed",
        "error",
        "Fetch failed",
      );
    }
    pushPurchaseLog(log);

    return log.steps.every((s) => s.status === "success");
  } catch (err: any) {
    log.steps[0] = makeStep(
      "1. ICP Payment Sent",
      "error",
      err?.message ?? "Rejected",
    );
    pushPurchaseLog(log);
    return false;
  }
}
