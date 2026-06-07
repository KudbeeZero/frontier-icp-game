import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

// TIER_DAILY_RATES: base daily FRNTR per tier (index 0-6)
const TIER_DAILY_RATES = [7, 9, 12, 17, 25, 37, 55];

/** Estimate a player's daily rate: plots * avg tier base rate (tier 0 baseline = 7/plot) */
export function estimateDailyRate(plotsOwned: number): number {
  return plotsOwned * TIER_DAILY_RATES[0];
}

export interface LeaderboardEntry {
  principal: string;
  username?: string;
  rank: number;
  frntBalance: number;
  plotsOwned: number;
  dailyRate: number;
}

export interface LeaderboardPrizesData {
  leaderboardPot: number; // ICP (float, already divided by 1e8)
  devPot: number;
  liquidityPot: number;
  totalPlotsOwned: number;
  nextPayoutMilestone: number;
  plotsUntilPayout: number;
  prizeDistribution: { first: number; second: number; third: number };
  activePlayers: number;
  totalFRNTRMined: number;
  totalFRNTRBurned: number;
}

const PAGE_SIZE = 50;

/**
 * Paginated leaderboard hook — fetches top 50 first, then allows loading more.
 * Returns all accumulated entries, a loadMore fn, and hasMore/isLoadingMore flags.
 */
export function useLeaderboardPaginated() {
  const { actor, isFetching } = useActor(createActor);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1); // 1 = first 50 already fetched
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (!actor) return;
      const limit = BigInt(pageNum * PAGE_SIZE);
      const raw = await actor.getLeaderboard(limit);
      const mapped: LeaderboardEntry[] = raw.map((e) => ({
        principal: e.principal,
        username: e.username,
        rank: Number(e.rank),
        frntBalance: Number(e.frntBalance) / 1e8,
        plotsOwned: Number(e.plotsOwned),
        dailyRate: estimateDailyRate(Number(e.plotsOwned)),
      }));
      if (replace) {
        setAllEntries(mapped);
      } else {
        setAllEntries((prev) => {
          // Merge: keep all existing, append truly new entries
          const existing = new Set(prev.map((e) => e.principal));
          const newOnes = mapped.filter((e) => !existing.has(e.principal));
          return [...prev, ...newOnes];
        });
      }
      // hasMore if backend returned exactly the limit (there might be more)
      setHasMore(raw.length >= pageNum * PAGE_SIZE);
      setPage(pageNum);
      setLastRefresh(Date.now());
    },
    [actor],
  );

  const { isLoading, refetch } = useQuery({
    queryKey: ["leaderboard-paginated", actor ? "ready" : "waiting"],
    queryFn: async () => {
      await fetchPage(1, true);
      return null;
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!actor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await fetchPage(page + 1, false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [actor, isLoadingMore, fetchPage, page]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    entries: allEntries,
    isLoading,
    hasMore,
    isLoadingMore,
    lastRefresh,
    loadMore,
    refresh,
  };
}

export function useLeaderboardPrizes() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<LeaderboardPrizesData>({
    queryKey: ["leaderboard-prizes"],
    queryFn: async (): Promise<LeaderboardPrizesData> => {
      if (!actor) {
        return {
          leaderboardPot: 0,
          devPot: 0,
          liquidityPot: 0,
          totalPlotsOwned: 0,
          nextPayoutMilestone: 1500,
          plotsUntilPayout: 1500,
          prizeDistribution: { first: 50, second: 30, third: 20 },
          activePlayers: 0,
          totalFRNTRMined: 0,
          totalFRNTRBurned: 0,
        };
      }

      const [treasury, stats] = await Promise.all([
        actor.getTreasuryState(),
        actor.getLeaderboardStats(),
      ]);

      const leaderboardPot = Number(treasury.leaderboard) / 1e8;
      const devPot = Number(treasury.developer) / 1e8;
      const liquidityPot = Number(treasury.liquidity) / 1e8;

      const totalPlotsOwned = Number(stats.totalPlotsOwned);
      const nextPayoutMilestone =
        (Math.floor(totalPlotsOwned / 1500) + 1) * 1500;
      const plotsUntilPayout = nextPayoutMilestone - totalPlotsOwned;

      return {
        leaderboardPot,
        devPot,
        liquidityPot,
        totalPlotsOwned,
        nextPayoutMilestone,
        plotsUntilPayout,
        prizeDistribution: { first: 50, second: 30, third: 20 },
        activePlayers: Number(stats.activePlayers),
        totalFRNTRMined: Number(stats.totalFRNTRMined),
        totalFRNTRBurned: Number(stats.totalFRNTRBurned),
      };
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
