import { Terminal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCombatLog } from "../hooks/useCombatLog";

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(2,10,20,0.92)",
  border: "1px solid rgba(0,255,204,0.22)",
  borderRadius: 8,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\u2026` : s;
}

export default function CombatLog() {
  const entries = useCombatLog();
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll-on-update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (!open) {
    return (
      <button
        type="button"
        data-ocid="combat_log.open_modal_button"
        onClick={() => setOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-lg w-9 h-9 transition-all hover:scale-110"
        style={{
          bottom: 84,
          left: 16,
          ...PANEL_STYLE,
          border: "1px solid rgba(0,255,204,0.35)",
        }}
        title="Open Combat Log"
      >
        <Terminal size={14} style={{ color: "#00ffcc" }} />
      </button>
    );
  }

  return (
    <div
      data-ocid="combat_log.panel"
      className="fixed z-40 flex flex-col"
      style={{
        bottom: 84,
        left: 16,
        width: 280,
        maxHeight: 320,
        ...PANEL_STYLE,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(0,255,204,0.15)" }}
      >
        <span
          className="text-xs font-bold uppercase tracking-[0.15em]"
          style={{
            color: "#00ffcc",
            textShadow: "0 0 8px rgba(0,255,204,0.5)",
            letterSpacing: "0.15em",
          }}
        >
          Real Time Combat Log
        </span>
        <button
          type="button"
          data-ocid="combat_log.close_button"
          onClick={() => setOpen(false)}
          className="rounded p-0.5 transition-all hover:bg-white/10"
          style={{ color: "rgba(180,220,220,0.6)" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Scrollable log */}
      <div
        ref={scrollRef}
        className="overflow-y-auto flex-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,255,204,0.2) transparent",
        }}
      >
        {entries.length === 0 ? (
          <div
            data-ocid="combat_log.empty_state"
            className="text-center py-6 text-xs"
            style={{ color: "rgba(180,220,220,0.4)" }}
          >
            No combat events yet
          </div>
        ) : (
          entries.map((entry, i) => {
            const isCapture = entry.success;
            const eventColor = isCapture ? "#22c55e" : "#ef4444";
            const eventLabel = isCapture ? "CAPTURED" : "ATTACK";
            return (
              <div
                key={entry.id}
                data-ocid={`combat_log.item.${i + 1}`}
                className="flex items-start gap-2 px-3 py-2"
                style={{ borderBottom: "1px solid rgba(0,255,204,0.06)" }}
              >
                {/* Colored indicator bar */}
                <div
                  className="w-0.5 rounded-full mt-0.5 flex-shrink-0"
                  style={{ background: eventColor, height: 36 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: eventColor, maxWidth: 80 }}
                    >
                      {truncate(entry.attacker, 10)}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "rgba(180,220,220,0.4)" }}
                    >
                      →
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: "rgba(180,220,220,0.75)", maxWidth: 80 }}
                    >
                      {truncate(entry.defender, 10)}
                    </span>
                    <span
                      className="text-xs font-bold ml-auto flex-shrink-0"
                      style={{ color: eventColor }}
                    >
                      {eventLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs font-mono"
                      style={{ color: "rgba(180,220,220,0.35)" }}
                    >
                      {fmtTime(entry.timestamp)}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "rgba(180,220,220,0.3)" }}
                    >
                      #{entry.toPlot}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
