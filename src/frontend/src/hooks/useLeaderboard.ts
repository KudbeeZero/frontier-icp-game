import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

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

      // Fetch both treasury state and leaderboard stats in parallel
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
    staleTime: 30_000, // refresh every 30s
    refetchInterval: 30_000,
  });
}
