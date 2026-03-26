import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export interface PurchaseResult {
  success: boolean;
  message: string;
}

export function usePurchasePlot() {
  const { actor } = useActor();
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
      const response = await actor.purchasePlot(BigInt(plotId));
      const success = response.__kind__ === "ok";
      const message = success ? response.ok : response.err;

      if (!success) {
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
