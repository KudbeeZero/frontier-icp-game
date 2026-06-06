import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import type { EconomySnapshot } from "../backend";

interface UseEconomySnapshotsResult {
  snapshots: EconomySnapshot[];
  latestSnapshot: EconomySnapshot | null;
  loading: boolean;
  error: string | null;
}

export function useEconomySnapshots(): UseEconomySnapshotsResult {
  const { actor, isFetching } = useActor(createActor);
  const [snapshots, setSnapshots] = useState<EconomySnapshot[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<EconomySnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actor || isFetching) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([actor.getEconomySnapshots(), actor.getLatestEconomySnapshot()])
      .then(([all, latest]) => {
        if (cancelled) return;
        setSnapshots(all);
        setLatestSnapshot(latest ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load snapshots",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [actor, isFetching]);

  return { snapshots, latestSnapshot, loading, error };
}
