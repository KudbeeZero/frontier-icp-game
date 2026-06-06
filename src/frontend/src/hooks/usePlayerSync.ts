import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useRef } from "react";
import { createActor } from "../backend";
import {
  type Biome,
  type GlobalStats,
  type PurchaseDebugLog,
  type TreasuryState,
  useGameStore,
} from "../store/gameStore";
import { GEODESIC_TILES, assignBiome } from "../utils/geodesicGrid";

/**
 * Accumulation-model helpers.
 * The store now tracks confirmedFrntBalance (last known from canister)
 * and accruedFrntSinceSync (per-second ticker). These helpers simply
 * pass through to the store's setFrntrBalance which resets accrued.
 */
export function applyConfirmedFrntrBalance(rawE8s: bigint): void {
  useGameStore.getState().setFrntrBalance(rawE8s);
}

export const lastFaucetClaimRef = { current: 0 };
export function setLastFaucetClaim() {
  lastFaucetClaimRef.current = Date.now();
}
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
          principal: e.principal as string,
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
        // Initialize plots array from GEODESIC_TILES if store is empty
        if (useGameStore.getState().plots.length === 0) {
          useGameStore.getState().setPlots(
            GEODESIC_TILES.map((tile, i) => ({
              id: i,
              lat: tile.lat,
              lng: tile.lng,
              biome: assignBiome(tile.lat, tile.lng) as Biome,
              efficiency: Math.floor(78 + (((i * 2654435761) >>> 0) % 21)),
              mineCount: 0,
              regenActiveUntil: 0,
              owner: null,
              isOwnedByMe: false,
              iron: 0,
              fuel: 0,
              crystal: 0,
              rareEarth: 0,
              defenses: { turrets: 0, shields: 0, walls: 0 },
              specialization: null,
              generatorTier: 0,
            })),
          );
        }

        const owners = await actor.getLivePlotOwners();
        const myPrincipal = useGameStore.getState().player.principal ?? "";
        useGameStore.getState().setLivePlotOwners(owners, myPrincipal);

        // Find first unowned plot for stress tests / purchase UI
        const ownedSet = new Set(owners.map(([id]) => id));
        const firstAvailable =
          owners.length > 0
            ? await actor.getFirstAvailablePlot()
            : (useGameStore
                .getState()
                .plots.find((p) => !ownedSet.has(String(p.id)))
                ?.id?.toString() ?? null);
        useGameStore.setState({ firstAvailablePlotId: firstAvailable });
      } catch {
        // Non-critical: keep existing plot ownership if sync fails
      }
    };

    const syncPlayer = async () => {
      try {
        const state = await actor.getPlayerState();
        if (!state) return;

        // Accumulation model: sync only updates the confirmed base IF the new
        // value is higher. setFrntrBalance ignores downward syncs internally.
        const newRawFrnt = BigInt(state.frntBalance);
        useGameStore.getState().setFrntrBalance(newRawFrnt);

        // Read icpBalance from PlayerState if available (testnet local tracking)
        const icpFromState =
          "icpBalance" in state && typeof state.icpBalance !== "undefined"
            ? Number(state.icpBalance) / 1e8
            : null;

        // Read plotIds (string[]) from getPlayerState response
        const plotIds: string[] = Array.isArray(state.plotIds)
          ? state.plotIds
          : [];

        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            // Use backend icpBalance as fallback when live ledger has no value
            icpBalance:
              icpFromState !== null && s.player.icpBalance === 0
                ? icpFromState
                : s.player.icpBalance,
            iron: Number(state.iron) / 100_000_000,
            fuel: Number(state.fuel) / 100_000_000,
            crystal: Number(state.crystal) / 100_000_000,
            // Update plotsOwned from backend if it has data
            plotsOwned: plotIds.length > 0 ? plotIds : s.player.plotsOwned,
          },
          rankStats: {
            ...((s.rankStats as Record<string, unknown> | undefined) ?? {}),
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
        const [g, t, treasury, gameStats] = await Promise.all([
          actor.getGlobalStats(),
          actor.getTokenomics(),
          actor.getTreasuryBalances().catch(() => ({
            devPot: 0n,
            leaderboardPot: 0n,
            liquidityPot: 0n,
          })),
          actor.getGameStats().catch(() => null),
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
          devPotICP: Number(treasury.devPot) / 1e8,
          leaderboardPotICP: Number(treasury.leaderboardPot) / 1e8,
          liquidityPotICP: Number(treasury.liquidityPot) / 1e8,
        };
        if (gameStats && gameStats.totalActionCount !== undefined) {
          stats.totalActionCount = Number(gameStats.totalActionCount);
        }
        useGameStore.getState().setGlobalStats(stats);
        useGameStore.getState().setTreasuryState({
          developer: BigInt(Math.floor(Number(treasury.devPot))),
          leaderboard: BigInt(Math.floor(Number(treasury.leaderboardPot))),
          liquidity: BigInt(Math.floor(Number(treasury.liquidityPot))),
          totalPlayers: gameStats ? Number(gameStats.totalPlayers) : undefined,
          totalPlotsSold: gameStats ? Number(gameStats.totalPlots) : undefined,
        } as TreasuryState);
        // Extract totalDailyOutput and globalUnclaimedTokens from getGameStats()
        if (gameStats) {
          const store = useGameStore.getState();
          store.setTotalGlobalDailyOutput(
            Number(gameStats.totalDailyOutput) / 1e8,
          );
          store.setGlobalUnclaimedTokens(
            Number(gameStats.globalUnclaimedTokens) / 1e8,
          );
        }
      } catch {
        // Non-critical: keep existing globalStats
      }
    };

    void syncPrincipal();
    void syncPlayer();
    void syncLeaderboard();
    void syncPlotOwners();
    void syncGlobalStats();
    // Check admin status once per actor session
    void (async () => {
      try {
        const adminPrincipal = await actor.getAdminPrincipal();
        const myPrincipal = useGameStore.getState().player.principal;
        const isAdmin = !!myPrincipal && myPrincipal === adminPrincipal;
        useGameStore.setState((s) => ({
          player: { ...s.player, isAdmin },
        }));
      } catch {
        // Non-critical
      }
    })();

    const interval = setInterval(() => {
      void syncPrincipal();
      void syncPlayer();
      void syncLeaderboard();
      void syncPlotOwners(); // uses getLivePlotOwners every cycle
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
    if (!actor || isFetching) return;

    const fetchIcpPrice = async () => {
      try {
        const price = await actor.getIcpUsdPrice();
        useGameStore.getState().setIcpUsdPrice(price);
      } catch {
        // Keep previous price on error
      }
    };

    void fetchIcpPrice();
    const priceInterval = setInterval(() => {
      void fetchIcpPrice();
    }, 60_000);

    return () => clearInterval(priceInterval);
  }, [actor, isFetching]);

  // Seed ref — ensures initPlots only fires once per session
  const hasSeeded = useRef(false);

  useEffect(() => {
    if (!actor || isFetching) return;
    if (hasSeeded.current) return;

    const seed = async () => {
      hasSeeded.current = true;
      try {
        const count = await (actor as any).getPlotCount();
        if (count === 0n || count === 0) {
          // Seed ALL GEODESIC_TILES in batches of 500
          const BATCH = 500;
          for (let start = 0; start < GEODESIC_TILES.length; start += BATCH) {
            const batch = GEODESIC_TILES.slice(start, start + BATCH);
            const tuples = batch.map(
              (tile): [string, string, number, number, bigint] => [
                String(tile.id),
                assignBiome(tile.lat, tile.lng),
                tile.lat,
                tile.lng,
                BigInt(Math.floor(78 + (((tile.id * 2654435761) >>> 0) % 21))),
              ],
            );
            await (actor as any).initPlots(tuples);
          }
        }
        // After seeding (or if already seeded), sync ownership
        const owners = await actor.getLivePlotOwners();
        const myPrincipal = useGameStore.getState().player.principal ?? "";
        const storeState = useGameStore.getState();
        const ownedSet = new Set(owners.map(([id]) => id));
        const updatedPlots = storeState.plots.map((plot) => {
          const ownerEntry = owners.find(([id]) => id === String(plot.id));
          if (ownerEntry) {
            const isOwnedByMe = !!myPrincipal && ownerEntry[1] === myPrincipal;
            return { ...plot, owner: ownerEntry[1], isOwnedByMe };
          }
          return { ...plot, owner: null, isOwnedByMe: false };
        });
        const firstAvailable =
          updatedPlots
            .find((p) => !ownedSet.has(String(p.id)))
            ?.id?.toString() ?? null;
        useGameStore.setState({
          plots: updatedPlots,
          firstAvailablePlotId: firstAvailable,
        });
      } catch {
        // Allow retry on next actor change
        hasSeeded.current = false;
      }
    };
    void seed();
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
            frntBalance: Number(state.frntBalance) / 100_000_000,
            iron: Number(state.iron) / 100_000_000,
            fuel: Number(state.fuel) / 100_000_000,
            crystal: Number(state.crystal) / 100_000_000,
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
