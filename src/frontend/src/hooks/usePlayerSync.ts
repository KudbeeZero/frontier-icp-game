import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect } from "react";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";

/**
 * Polls player state from the ICP canister every 10 seconds.
 * Maps backend PlayerState fields to the local gameStore.
 * Does NOT overwrite plotsOwned array — backend returns a count (bigint), not an array.
 */
export function usePlayerSync(): void {
  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (!actor || isFetching) return;

    const syncPlayer = async () => {
      try {
        const state = await actor.getPlayerState();
        if (!state) return;

        const commanderName = state.commanderType ?? null;

        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            frntBalance: Number(state.frntBalance),
            commanderType: commanderName ?? s.player.commanderType,
            commanderAtk: Number(state.commanderAtk),
            commanderDef: Number(state.commanderDef),
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
    const interval = setInterval(() => {
      void syncPlayer();
    }, 10_000);

    return () => {
      clearInterval(interval);
    };
  }, [actor, isFetching]);
}
