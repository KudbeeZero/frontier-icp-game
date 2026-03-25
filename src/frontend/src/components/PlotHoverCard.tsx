import { X } from "lucide-react";
import { useEffect, useState } from "react";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.2)";

interface PlotHoverCardProps {
  plotId: number;
  owner: string;
  action: string;
  nextStep: string;
  onDismiss: () => void;
}

export default function PlotHoverCard({
  plotId,
  owner,
  action,
  nextStep,
  onDismiss,
}: PlotHoverCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-up animation
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const isTarget = action === "TARGET LOCKED";
  const actionColor = isTarget ? "#ef4444" : CYAN;

  return (
    <div
      data-ocid="map.card"
      style={{
        position: "fixed",
        bottom: visible ? 90 : 60,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(340px, calc(100vw - 32px))",
        background: "rgba(4,12,24,0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${BORDER}`,
        borderTop: `2px solid ${actionColor}`,
        borderRadius: 10,
        padding: "14px 16px",
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transition:
          "bottom 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${actionColor}18`,
        pointerEvents: "auto",
      }}
    >
      {/* Top row: plot badge + action label + close */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: CYAN,
              background: "rgba(0,255,204,0.1)",
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: "2px 8px",
              letterSpacing: 1,
              fontFamily: "monospace",
            }}
          >
            PLOT #{plotId}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: actionColor,
              letterSpacing: 2,
              fontFamily: "monospace",
              textShadow: `0 0 8px ${actionColor}`,
            }}
          >
            {action}
          </span>
        </div>
        <button
          type="button"
          data-ocid="map.card.close_button"
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: CYAN_DIM,
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(0,255,204,0.1)",
          marginBottom: 10,
        }}
      />

      {/* Owner row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 8,
            color: CYAN_DIM,
            letterSpacing: 1,
            fontFamily: "monospace",
          }}
        >
          OWNER
        </span>
        <span
          style={{
            fontSize: 9,
            color: "#e0f4ff",
            fontFamily: "monospace",
            letterSpacing: 0.5,
          }}
        >
          {owner.length > 20
            ? `${owner.slice(0, 10)}…${owner.slice(-6)}`
            : owner}
        </span>
      </div>

      {/* Next step */}
      <div
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 6,
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10 }}>⚡</span>
        <span
          style={{
            fontSize: 9,
            color: "#f59e0b",
            letterSpacing: 0.5,
            fontFamily: "monospace",
          }}
        >
          {nextStep}
        </span>
      </div>
    </div>
  );
}
