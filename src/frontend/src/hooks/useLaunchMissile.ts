import { useState } from "react";
import type { MissileConfig } from "../constants/missiles";
import { type CombatEntry, useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export interface LaunchResult {
  success: boolean;
  message: string;
}

/** Map a raw CombatEvent array from the chain into CombatEntry records. */
function mapCombatEvents(
  raw: Array<{
    attacker: { toString(): string };
    toPlot: bigint;
    fromPlot: bigint;
    success: boolean;
    timestamp: bigint;
    atkPower: bigint;
    defPower: bigint;
  }>,
  plots: ReturnType<typeof useGameStore.getState>["plots"],
): CombatEntry[] {
  return raw.map((e, i) => {
    const toPlotNum = Number(e.toPlot);
    const defenderPlot = plots.find((p) => p.id === toPlotNum);
    return {
      id: i,
      timestamp: Number(e.timestamp) / 1_000_000,
      attacker: e.attacker.toString(),
      defender: defenderPlot?.owner ?? `Plot #${toPlotNum}`,
      fromPlot: Number(e.fromPlot),
      toPlot: toPlotNum,
      success: e.success,
      atkPower: Number(e.atkPower),
      defPower: Number(e.defPower),
    };
  });
}

export function useLaunchMissile() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<LaunchResult | null>(null);

  const fireArsenalMissile = useGameStore((s) => s.fireArsenalMissile);
  const arsenalInventory = useGameStore((s) => s.arsenalInventory);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const targetPlotId = useGameStore((s) => s.targetPlotId);
  const player = useGameStore((s) => s.player);

  async function launchMissile(missile: MissileConfig): Promise<LaunchResult> {
    // Pre-flight checks
    if ((arsenalInventory[missile.id] ?? 0) <= 0) {
      return { success: false, message: "OUT OF AMMO" };
    }

    const fromPlotId =
      selectedPlotId !== null && player.plotsOwned.includes(selectedPlotId)
        ? selectedPlotId
        : (player.plotsOwned[0] ?? null);

    const toPlotId = targetPlotId ?? selectedPlotId;

    if (fromPlotId === null || toPlotId === null) {
      return { success: false, message: "SELECT A TARGET PLOT FIRST" };
    }

    if (fromPlotId === toPlotId) {
      return { success: false, message: "CANNOT TARGET OWN PLOT" };
    }

    // Optimistic UI
    fireArsenalMissile(missile.id);
    setIsLaunching(true);
    setLastResult(null);

    // Offline / unauthenticated mode
    if (!identity || !actor) {
      await new Promise((r) => setTimeout(r, 600));
      setIsLaunching(false);
      const result: LaunchResult = {
        success: true,
        message: `[OFFLINE] ${missile.name} LAUNCHED — TARGET PLOT #${toPlotId}`,
      };
      setLastResult(result);
      return result;
    }

    try {
      const response = await actor.launchMissile(
        BigInt(fromPlotId),
        BigInt(toPlotId),
        missile.id,
      );

      const success = response.__kind__ === "ok";
      const message = success
        ? (response as { __kind__: "ok"; ok: string }).ok
        : (response as { __kind__: "err"; err: string }).err;

      const result: LaunchResult = { success, message };
      setLastResult(result);

      if (success) {
        // Increment combat wins in store
        useGameStore.setState((s) => ({
          rankStats: {
            ...s.rankStats,
            combatWins: s.rankStats.combatWins + 1,
          },
        }));

        // Pull fresh combat log from chain
        try {
          const rawLog = await actor.getCombatLog(BigInt(20));
          const plots = useGameStore.getState().plots;
          const freshLog = mapCombatEvents(rawLog, plots);
          useGameStore.setState({ combatLog: freshLog });
        } catch {
          // non-critical — log already has optimistic entry
        }
      } else {
        // On-chain rejected — rollback optimistic changes
        useGameStore.setState((s) => ({
          arsenalInventory: {
            ...s.arsenalInventory,
            [missile.id]: (s.arsenalInventory[missile.id] ?? 0) + 1,
          },
          rankStats: {
            ...s.rankStats,
            missionsLaunched: Math.max(0, s.rankStats.missionsLaunched - 1),
          },
        }));
      }

      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "LAUNCH FAILED — NETWORK ERROR";

      // Rollback optimistic update
      useGameStore.setState((s) => ({
        arsenalInventory: {
          ...s.arsenalInventory,
          [missile.id]: (s.arsenalInventory[missile.id] ?? 0) + 1,
        },
        rankStats: {
          ...s.rankStats,
          missionsLaunched: Math.max(0, s.rankStats.missionsLaunched - 1),
        },
      }));

      const result: LaunchResult = { success: false, message };
      setLastResult(result);
      return result;
    } finally {
      setIsLaunching(false);
    }
  }

  return { launchMissile, isLaunching, lastResult };
}
