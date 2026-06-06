import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect, useState } from "react";
import { createActor } from "../backend";

export interface CanisterCyclesState {
  cycles: bigint | null;
  cyclesFormatted: string;
  loading: boolean;
}

/** Format a raw cycles bigint into a human-readable string. */
export function formatCycles(cycles: bigint): string {
  const n = Number(cycles);
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
}

/** Thresholds for warning / critical display. */
export const CYCLES_WARNING = 1_000_000_000_000n; // 1T
export const CYCLES_CRITICAL = 100_000_000_000n; // 100B

export function useCanisterCycles(): CanisterCyclesState {
  const { actor, isFetching } = useActor(createActor);
  const [cycles, setCycles] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const result = await actor.getCanisterCycles();
        if (!cancelled) setCycles(result);
      } catch {
        // Leave cycles null on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [actor, isFetching]);

  return {
    cycles,
    cyclesFormatted: cycles !== null ? formatCycles(cycles) : "—",
    loading,
  };
}
