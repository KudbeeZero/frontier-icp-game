import { useEffect, useState } from "react";
import { type CombatEntry, useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";

export function useCombatLog(): CombatEntry[] {
  const { actor, isFetching } = useActor();
  const mockLog = useGameStore((s) => s.combatLog);
  const [log, setLog] = useState<CombatEntry[]>(mockLog);

  useEffect(() => {
    if (!actor || isFetching) return;

    const fetchLog = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (await (actor as any).getCombatLog()) as Array<{
          attacker: string;
          defender: string;
          fromPlot: bigint;
          toPlot: bigint;
          success: boolean;
          timestamp: bigint;
        }>;
        const entries: CombatEntry[] = raw.map((e, i) => ({
          id: i,
          timestamp: Number(e.timestamp) / 1e6,
          attacker: e.attacker,
          defender: e.defender,
          fromPlot: Number(e.fromPlot),
          toPlot: Number(e.toPlot),
          success: e.success,
        }));
        setLog(entries);
      } catch {
        // Fall back to mock data silently
      }
    };

    void fetchLog();
    const interval = setInterval(() => {
      void fetchLog();
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, isFetching]);

  return log;
}
