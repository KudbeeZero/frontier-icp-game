import { useState } from "react";
import type { ArtilleryConfig } from "../constants/artillery";
import { useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export interface ArtilleryFireResult {
  success: boolean;
  message: string;
}

export function useFireArtillery() {
  const { actor } = useActor();
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
