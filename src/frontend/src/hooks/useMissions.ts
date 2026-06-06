import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Mission } from "../backend";
import { useGameStore } from "../store/gameStore";

export interface PlayerMission {
  mission: Mission;
  completed: boolean;
}

export interface UseMissionsReturn {
  playerMissions: PlayerMission[];
  completedMissionIds: string[];
  loading: boolean;
  error: string | null;
  loadMissions: () => Promise<void>;
  completeMission: (missionId: string, rewardE8s: bigint) => Promise<boolean>;
}

export function useMissions(): UseMissionsReturn {
  const { actor } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();

  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);

  const [playerMissions, setPlayerMissions] = useState<PlayerMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedMissionIds: string[] = playerMissions
    .filter((pm) => pm.completed)
    .map((pm) => pm.mission.id);

  const loadMissions = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await actor.getPlayerMissions();
      setPlayerMissions(result);
    } catch (e) {
      setError("Failed to load missions. Please try again.");
      console.error("useMissions load error:", e);
    } finally {
      setLoading(false);
    }
  }, [actor, isAuthenticated]);

  const completeMission = useCallback(
    async (missionId: string, rewardE8s: bigint): Promise<boolean> => {
      if (!actor) {
        toast.error("Not connected to canister");
        return false;
      }
      try {
        const res = await actor.completeMission(missionId);
        if ("ok" in res) {
          const rewardFrntr = Number(res.ok) / 1e8;
          toast.success(
            `Mission complete! +${rewardFrntr.toFixed(2)} FRNTR minted to your wallet`,
            { duration: 5000 },
          );
          const rewardAmount = Number(rewardE8s);
          setFrntrBalance(
            BigInt(Math.round(confirmedFrntBalance * 1e8 + rewardAmount)),
          );
          await loadMissions();
          return true;
        }
        toast.error(res.err || "Failed to claim reward", { duration: 5000 });
        return false;
      } catch (e) {
        toast.error("Claim failed. Please try again.");
        console.error("useMissions complete error:", e);
        return false;
      }
    },
    [actor, confirmedFrntBalance, setFrntrBalance, loadMissions],
  );

  return {
    playerMissions,
    completedMissionIds,
    loading,
    error,
    loadMissions,
    completeMission,
  };
}
