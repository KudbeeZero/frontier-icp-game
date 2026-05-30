import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useState } from "react";
import { createActor } from "../backend";
import type { ArtilleryConfig } from "../constants/artillery";
import { useGameStore } from "../store/gameStore";
import type { CombatEntry } from "../store/gameStore";

export interface ArtilleryFireResult {
  success: boolean;
  message: string;
}

export function useFireArtillery() {
  const { actor } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const [isFiring, setIsFiring] = useState(false);
  const [lastResult, setLastResult] = useState<ArtilleryFireResult | null>(
    null,
  );

  const fireArtillery = useGameStore((s) => s.fireArtillery);
  const artilleryInventory = useGameStore((s) => s.artilleryInventory);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const targetPlotId = useGameStore((s) => s.targetPlotId);
  const player = useGameStore((s) => s.player);

  async function fireArtilleryWeapon(
    artillery: ArtilleryConfig,
  ): Promise<ArtilleryFireResult> {
    if ((artilleryInventory[artillery.id] ?? 0) <= 0) {
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
    fireArtillery(artillery.id);
    setIsFiring(true);
    setLastResult(null);

    // Offline / unauthenticated mode
    if (!identity || !actor) {
      await new Promise((r) => setTimeout(r, 600));
      // Trigger 2D battle view in IntelTab via game store combat log
      // Remove offlineEntry variable — inlined above
      void 0;
      useGameStore.setState((s) => ({
        combatLog: [
          {
            id: Date.now(),
            timestamp: Date.now(),
            attacker: "You",
            defender: `Plot #${toPlotId}`,
            fromPlot: fromPlotId,
            toPlot: toPlotId,
            success: true,
            damageDealt: Math.floor(Math.random() * 30) + 10,
          } as CombatEntry,
          ...s.combatLog.slice(0, 49),
        ],
        activeBattleEntry: {
          isArtillery: true,
          weaponType: artillery.id,
          fromPlotId: fromPlotId,
          toPlotId: toPlotId,
          result: null,
        },
      }));
      setIsFiring(false);
      const result: ArtilleryFireResult = {
        success: true,
        message: `[OFFLINE] ${artillery.name} FIRED — TARGET PLOT #${toPlotId}`,
      };
      setLastResult(result);
      return result;
    }

    try {
      const response = await actor.launchMissile(
        BigInt(fromPlotId),
        BigInt(toPlotId),
        artillery.id,
      );

      const success = response.__kind__ === "ok";
      const message = success
        ? (response as { __kind__: "ok"; ok: string }).ok
        : (response as { __kind__: "err"; err: string }).err;

      const result: ArtilleryFireResult = { success, message };
      setLastResult(result);

      if (success) {
        useGameStore.setState((s) => ({
          rankStats: {
            ...s.rankStats,
            combatWins: s.rankStats.combatWins + 1,
          },
        }));

        // Pull fresh combat log and trigger 2D battle view
        try {
          const rawLog = await actor.getCombatLog(BigInt(20));
          const plots = useGameStore.getState().plots;
          const freshLog = rawLog.map((e, i) => {
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
              damageDealt: 0,
              weaponType: artillery.id,
              isArtillery: true,
            };
          });
          useGameStore.setState({
            combatLog: freshLog,
            activeBattleEntry: freshLog[0]
              ? {
                  isArtillery: true,
                  weaponType: artillery.id,
                  fromPlotId: freshLog[0].fromPlot,
                  toPlotId: freshLog[0].toPlot,
                  result: freshLog[0],
                }
              : null,
          });
        } catch {
          // non-critical
        }
      } else {
        // Rollback
        useGameStore.setState((s) => ({
          artilleryInventory: {
            ...s.artilleryInventory,
            [artillery.id]: (s.artilleryInventory[artillery.id] ?? 0) + 1,
          },
        }));
      }

      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "FIRE FAILED — NETWORK ERROR";

      // Rollback
      useGameStore.setState((s) => ({
        artilleryInventory: {
          ...s.artilleryInventory,
          [artillery.id]: (s.artilleryInventory[artillery.id] ?? 0) + 1,
        },
      }));

      const result: ArtilleryFireResult = { success: false, message };
      setLastResult(result);
      return result;
    } finally {
      setIsFiring(false);
    }
  }

  return { fireArtilleryWeapon, isFiring, lastResult };
}
