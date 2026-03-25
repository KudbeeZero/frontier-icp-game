import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

export default function CombatLog() {
  const combatLog = useGameStore((s) => s.combatLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref-based
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [combatLog]);

  const fmt = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-20 glass-dark border-t border-border/50">
      <div className="flex items-center h-full px-4 gap-4">
        <div className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground whitespace-nowrap flex-shrink-0">
          Real Time
          <br />
          Combat Log
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 flex-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {combatLog.map((entry) => (
            <div
              key={entry.id}
              className="flex-shrink-0 flex items-center gap-2 glass rounded-lg px-3 py-2"
            >
              <div
                className="w-1 h-8 rounded-full"
                style={{ background: entry.success ? "#22C55E" : "#EF4444" }}
              />
              <div>
                <div className="text-xs font-medium text-foreground whitespace-nowrap">
                  <span style={{ color: "#EF4444" }}>
                    {entry.attacker.slice(0, 8)}
                  </span>
                  <span className="text-muted-foreground"> → </span>
                  <span style={{ color: "#22C3C9" }}>
                    {entry.defender.slice(0, 8)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Plot #{entry.toPlot} · {fmt(entry.timestamp)} ·{" "}
                  <span
                    style={{ color: entry.success ? "#22C55E" : "#EF4444" }}
                  >
                    {entry.success ? "WIN" : "LOSS"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
