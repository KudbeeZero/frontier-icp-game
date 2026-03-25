import { Cpu, Crosshair, Radio, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const GOLD = "#ffd700";
const BORDER = "rgba(0,255,204,0.22)";

interface CommandPanelProps {
  onFire: () => void;
  fireDisabled: boolean;
  onOpenTab: (tab: string) => void;
  onToggleCombatLog?: () => void;
}

export default function CommandPanel({
  onFire,
  fireDisabled,
  onOpenTab,
  onToggleCombatLog,
}: CommandPanelProps) {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const [expanded, setExpanded] = useState(false);
  const [devicesTooltip, setDevicesTooltip] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const targetLocked = selectedPlotId !== null;

  // Auto-collapse on outside tap (mobile only)
  useEffect(() => {
    if (isDesktop) return;
    const handler = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isDesktop]);

  const handleFire = () => {
    if (fireDisabled) return;
    onFire();
    setExpanded(false);
  };

  const glassStyle: React.CSSProperties = {
    background: "rgba(2,10,20,0.88)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${BORDER}`,
  };

  // ── LOCK INDICATOR ───────────────────────────────────────────────
  const lockIndicator = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: targetLocked
          ? "rgba(255,215,0,0.1)"
          : "rgba(100,100,100,0.1)",
        border: `1px solid ${
          targetLocked ? "rgba(255,215,0,0.4)" : "rgba(100,100,100,0.3)"
        }`,
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: targetLocked ? GOLD : "#555",
          boxShadow: targetLocked ? `0 0 6px ${GOLD}` : "none",
          animation: targetLocked ? "lockPulse 1.5s infinite" : "none",
        }}
      />
      <span
        style={{
          fontSize: 7,
          letterSpacing: 1.5,
          fontWeight: 700,
          color: targetLocked ? GOLD : "#555",
        }}
      >
        {targetLocked ? "LOCKED" : "LOCK"}
      </span>
    </div>
  );

  // ── TARGET LABEL ─────────────────────────────────────────────────
  const targetLabel = (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 2,
        color: CYAN,
        textAlign: "center",
        animation: targetLocked ? "cmdPulse 1.5s infinite" : "none",
        textShadow: targetLocked ? `0 0 8px ${CYAN}` : "none",
      }}
    >
      TARGET IN FORMATION
    </div>
  );

  // ── FIRE BUTTON ──────────────────────────────────────────────────
  const fireButton = (
    <button
      type="button"
      data-ocid="combat.fire.button"
      onClick={handleFire}
      disabled={fireDisabled}
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 40% 35%, #ff4400, #cc0000, #880000)",
        border: fireDisabled
          ? "2px solid rgba(255,100,0,0.3)"
          : `2px solid ${GOLD}`,
        boxShadow: fireDisabled
          ? "0 0 10px rgba(255,68,0,0.3)"
          : "0 0 20px #ff4400aa, 0 0 40px #ff220033",
        cursor: fireDisabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1,
        opacity: fireDisabled ? 0.5 : 1,
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <Zap size={16} color="white" />
      <span
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "white",
          letterSpacing: 3,
          textShadow: "0 0 8px white",
        }}
      >
        FIRE
      </span>
    </button>
  );

  // ── CIRCLE BUTTONS ───────────────────────────────────────────────
  const circleButtons = (
    <div
      style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {(
        [
          {
            id: "scope",
            label: "SCOPE",
            Icon: Crosshair,
            action: () => onOpenTab("map"),
          },
          {
            id: "radar",
            label: "RADAR",
            Icon: Radio,
            action: () => onToggleCombatLog?.(),
          },
          {
            id: "devices",
            label: "DEVICES",
            Icon: Cpu,
            action: () => setDevicesTooltip((v) => !v),
          },
        ] as const
      ).map(({ id, label, Icon, action }) => (
        <div
          key={id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            position: "relative",
          }}
        >
          <button
            type="button"
            data-ocid={`combat.${id}.button`}
            onClick={action}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(2,10,20,0.85)",
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon size={16} color={CYAN} />
          </button>
          <span style={{ fontSize: 6, color: CYAN_DIM, letterSpacing: 1 }}>
            {label}
          </span>
          {id === "devices" && devicesTooltip && (
            <div
              data-ocid="combat.devices.tooltip"
              style={{
                position: "absolute",
                bottom: "110%",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(2,10,20,0.95)",
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 8,
                color: CYAN,
                letterSpacing: 1,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              Coming Soon
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ── DESKTOP LAYOUT ───────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        ref={panelRef}
        data-ocid="command_panel.panel"
        style={{
          position: "fixed",
          bottom: 64,
          left: 180,
          width: 180,
          zIndex: 30,
          ...glassStyle,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          padding: 12,
          gap: 10,
        }}
      >
        <style>{`
          @keyframes cmdPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes lockPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}</style>

        {/* Lock indicator */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {lockIndicator}
        </div>

        {/* Target label */}
        {targetLabel}

        {/* Fire button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {fireButton}
        </div>

        {/* Circle buttons */}
        {circleButtons}
      </div>
    );
  }

  // ── MOBILE LAYOUT ────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      data-ocid="command_panel.panel"
      style={{
        position: "fixed",
        bottom: 64,
        left: 0,
        right: 0,
        height: expanded ? "45vh" : 60,
        zIndex: 35,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${BORDER}`,
        transition: "height 0.3s ease-out",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes cmdPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes lockPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* Collapsed strip — always visible, acts as expand/collapse handle */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: game HUD tap area */}
      <div
        data-ocid="command_panel.toggle"
        onClick={() => setExpanded((v) => !v)}
        style={{
          height: 60,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(0,255,204,0.5)",
            fontFamily: "monospace",
          }}
        >
          COMMAND PANEL
        </div>
        {lockIndicator}
        <button
          type="button"
          data-ocid="command_panel.expand_button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: CYAN,
            fontSize: 14,
            padding: "2px 4px",
            flexShrink: 0,
            transition: "transform 0.3s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▲
        </button>
      </div>

      {/* Expanded content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          padding: "8px 16px 12px",
          gap: 10,
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        {targetLabel}
        {fireButton}
        {circleButtons}
      </div>
    </div>
  );
}
