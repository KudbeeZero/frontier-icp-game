import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useState } from "react";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";

export interface PurchaseResult {
  success: boolean;
  message: string;
}

export function usePurchasePlot() {
  const { actor } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lastResult, setLastResult] = useState<PurchaseResult | null>(null);

  const purchasePlotLocal = useGameStore((s) => s.purchasePlot);

  async function purchasePlot(plotId: number): Promise<PurchaseResult> {
    setIsPurchasing(true);
    setLastResult(null);

    // Optimistic local update
    purchasePlotLocal(plotId);

    if (!identity || !actor) {
      // Offline / unauthenticated — keep local update, report offline
      await new Promise((r) => setTimeout(r, 500));
      setIsPurchasing(false);
      const result: PurchaseResult = {
        success: true,
        message: `[OFFLINE] PLOT #${plotId} ACQUIRED`,
      };
      setLastResult(result);
      return result;
    }

    try {
      const res = await actor.purchasePlot(BigInt(plotId));
      const success = res.__kind__ === "ok";
      const message = success
        ? `PLOT #${plotId} ACQUIRED`
        : `PLOT #${plotId} PURCHASE FAILED`;

      if (success) {
        // Record 4-hour sub-parcel cooldown for this plot
        const unlockTs = Date.now() + 4 * 60 * 60 * 1000;
        useGameStore.setState((s) => ({
          subParcelCooldowns: {
            ...s.subParcelCooldowns,
            [String(plotId)]: unlockTs,
          },
        }));
      } else {
        // Rollback: un-own the plot locally
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
            frntBalance: s.player.frntBalance + 100,
          },
          plots: s.plots.map((p) =>
            p.id === plotId ? { ...p, owner: null } : p,
          ),
        }));
      }

      const result: PurchaseResult = { success, message };
      setLastResult(result);
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "PURCHASE FAILED — NETWORK ERROR";

      // Rollback
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
          frntBalance: s.player.frntBalance + 100,
        },
        plots: s.plots.map((p) =>
          p.id === plotId ? { ...p, owner: null } : p,
        ),
      }));

      const result: PurchaseResult = { success: false, message };
      setLastResult(result);
      return result;
    } finally {
      setIsPurchasing(false);
    }
  }

  return { purchasePlot, isPurchasing, lastResult };
}
