import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect } from "react";
import { createActor } from "../backend";
import {
  type GlobalStats,
  type PurchaseDebugLog,
  randomBiome,
  useGameStore,
} from "../store/gameStore";
import { GEODESIC_TILES } from "../utils/geodesicGrid";

/**
 * Polls player state and leaderboard from the ICP canister.
 * Maps backend PlayerState fields to the local gameStore.
 * Does NOT overwrite plotsOwned array — backend returns a count (bigint), not an array.
 */
export function usePlayerSync(): void {
  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (!actor || isFetching) return;

    const syncPrincipal = async () => {
      try {
        const data = await actor.getPrincipal();
        if (data.isAuthed && data.full) {
          useGameStore.setState((s) => ({
            player: { ...s.player, principal: data.full },
          }));
        }
      } catch {
        // non-critical
      }
    };

    const syncLeaderboard = async () => {
      try {
        const data = await actor.getLeaderboard(50n);
        const mapped = data.map((e) => ({
          rank: Number(e.rank),
          name:
            e.username ??
            `${e.principal.slice(0, 8)}...${e.principal.slice(-4)}`,
          principal: e.principal,
          plotsOwned: Number(e.plotsOwned),
          frntEarned: Number(e.frntBalance),
          victories: 0,
        }));
        useGameStore.setState({ leaderboard: mapped });
      } catch {
        // Non-critical: keep existing leaderboard if sync fails
      }
    };

    const syncPlotOwners = async () => {
      try {
        const owners = await (actor as any).getAllPlotOwners();
        const state = useGameStore.getState();
        const updatedPlots = state.plots.map((plot) => {
          const ownerEntry = owners.find(
            ([id]: [bigint, string]) => Number(id) === plot.id,
          );
          if (ownerEntry) {
            return { ...plot, owner: ownerEntry[1] };
          }
          return plot;
        });
        useGameStore.setState({ plots: updatedPlots });
      } catch (err) {
        console.warn("syncPlotOwners error:", err);
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

    const syncGlobalStats = async () => {
      try {
        const [g, t] = await Promise.all([
          actor.getGlobalStats(),
          actor.getTokenomics(),
        ]);
        const stats: GlobalStats = {
          totalPlotsOwned: Number(g.totalPlotsOwned),
          totalFRNTRInCirculation: Number(g.circulatingSupply),
          totalFRNTRBurned: Number(g.totalBurned),
          totalFRNTRMined: 0,
          activePlayerCount: Number(g.activePlayers),
          currentDailyEmissionRate: Number(t.emissionRate),
          leaderboardPrizePool: 0,
          nextPayoutAt: 0,
          totalSupply: Number(t.maxSupply),
          preMinted: 5_000_000_000,
          mineableSupply: Number(t.remainingMineable),
          maxSupply: Number(t.maxSupply),
          remainingMineable: Number(t.remainingMineable),
          daysUntilMilestone: Number(t.daysUntilMilestone),
          burnRate: Number(t.burnRate),
          emissionRate: Number(t.emissionRate),
        };
        useGameStore.getState().setGlobalStats(stats);
      } catch {
        // Non-critical: keep existing globalStats
      }
    };

    void syncPrincipal();
    void syncPlayer();
    void syncLeaderboard();
    void syncPlotOwners();
    void syncGlobalStats();

    const interval = setInterval(() => {
      void syncPrincipal();
      void syncPlayer();
      void syncLeaderboard();
      void syncPlotOwners();
    }, 10_000);

    const globalInterval = setInterval(() => {
      void syncGlobalStats();
    }, 30_000);

    return () => {
      clearInterval(interval);
      clearInterval(globalInterval);
    };
  }, [actor, isFetching]);

  useEffect(() => {
    if (actor) {
      const seed = async () => {
        try {
          const count = await (actor as any).getPlotCount();
          if (count === 0n) {
            const tuples = GEODESIC_TILES.slice(0, 500).map(
              (tile): [bigint, string, number, number, bigint] => [
                BigInt(tile.id),
                randomBiome(tile.id),
                tile.lat,
                tile.lng,
                BigInt(Math.floor(78 + (((tile.id * 2654435761) >>> 0) % 21))),
              ],
            );
            await (actor as any).initPlots(tuples);
          }
          const owners = await (actor as any).getAllPlotOwners();
          const state = useGameStore.getState();
          const updatedPlots = state.plots.map((plot) => {
            const ownerEntry = owners.find(
              ([id]: [bigint, string]) => Number(id) === plot.id,
            );
            if (ownerEntry) {
              return { ...plot, owner: ownerEntry[1] };
            }
            return plot;
          });
          useGameStore.setState({ plots: updatedPlots });
        } catch (err) {
          console.warn("seedPlotsIfEmpty error:", err);
        }
      };
      void seed();
    }
  }, [actor]);
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
        principal: e.principal,
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
