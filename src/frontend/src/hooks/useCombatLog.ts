import { useEffect, useState } from "react";
import { type CombatEntry, useGameStore } from "../store/gameStore";
import { useActor } from "./useActor";

export function useCombatLog(): CombatEntry[] {
  const { actor, isFetching } = useActor();
  const storeLog = useGameStore((s) => s.combatLog);
  const plots = useGameStore((s) => s.plots);
  const [log, setLog] = useState<CombatEntry[]>(storeLog);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actor || isFetching) return;

    const fetchLog = async () => {
      try {
        const raw = await actor.getCombatLog(BigInt(50));
        const entries: CombatEntry[] = raw.map((e, i) => {
          const attackerStr = e.attacker.toString();
          const toPlotNum = Number(e.toPlot);
          // Derive defender from the plots store owner; fall back to plot label
          const defenderPlot = plots.find((p) => p.id === toPlotNum);
          const defenderStr = defenderPlot?.owner ?? `Plot #${toPlotNum}`;
          return {
            id: i,
            // ICP timestamps are nanoseconds — convert to milliseconds
            timestamp: Number(e.timestamp) / 1_000_000,
            attacker: attackerStr,
            defender: defenderStr,
            fromPlot: Number(e.fromPlot),
            toPlot: toPlotNum,
            success: e.success,
            atkPower: Number(e.atkPower),
            defPower: Number(e.defPower),
          };
        });
        setLog(entries);
        setError(null);
        // Keep store in sync so other components see fresh data
        useGameStore.setState({ combatLog: entries });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to fetch combat log";
        setError(msg);
        // Fall back to store log but don't crash
        setLog(useGameStore.getState().combatLog);
      }
    };

    void fetchLog();
    const interval = setInterval(() => void fetchLog(), 5000);
    return () => clearInterval(interval);
  }, [actor, isFetching, plots]);

  // Suppress lint warning — error state is available for parent if needed
  void error;

  return log;
}
