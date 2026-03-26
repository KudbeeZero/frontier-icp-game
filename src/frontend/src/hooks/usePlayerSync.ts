import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";

/**
 * Syncs player state from the ICP canister on mount (once actor is ready).
 * Maps backend PlayerState fields to the local gameStore player object.
 * Does NOT overwrite plotsOwned array — backend only returns a count.
 */
export function usePlayerSync(): void {
  const { actor, isFetching } = useActor();

  useEffect(() => {
    if (!actor || isFetching) return;

    let cancelled = false;

    const syncPlayer = async () => {
      try {
        const state = await actor.getPlayerState();
        if (cancelled || !state) return;

        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            frntBalance: Number(state.frntBalance),
            commanderType: state.commanderType ?? s.player.commanderType,
            commanderAtk: Number(state.commanderAtk),
            commanderDef: Number(state.commanderDef),
            iron: Number(state.iron),
            fuel: Number(state.fuel),
            crystal: Number(state.crystal),
            // NOTE: plotsOwned is an array in local state; backend only returns
            // a count (bigint). We do NOT overwrite the local array here.
          },
          rankStats: {
            ...s.rankStats,
            combatWins: Number(state.combatVictories),
          },
        }));
      } catch {
        // Non-critical: local state remains as-is if sync fails
      }
    };

    void syncPlayer();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching]);
}
