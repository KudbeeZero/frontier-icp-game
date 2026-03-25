import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  TIER_COLORS,
  commanderHasWings,
  getCommander,
} from "../constants/commanders";
import { useGameStore } from "../store/gameStore";

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
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);
  const ownedCommanders = useGameStore((s) => s.ownedCommanders);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const isTarget = action === "TARGET LOCKED";
  const isOwned = action === "TERRITORY ACQUIRED" || action === "YOU OWN THIS";
  const actionColor = isTarget ? "#ef4444" : CYAN;

  const assignedInstanceId = commanderAssignments[plotId];
  const commander = assignedInstanceId
    ? getCommander(assignedInstanceId)
    : null;
  const ownedInstance = ownedCommanders.find(
    (c) => c.instanceId === assignedInstanceId,
  );
  const hasWings = ownedInstance ? commanderHasWings(ownedInstance) : false;
  const tierColor = commander ? (TIER_COLORS[commander.tier] ?? CYAN) : CYAN;

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
      {/* Top row */}
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
            ? `${owner.slice(0, 10)}\u2026${owner.slice(-6)}`
            : owner}
        </span>
      </div>

      {/* Commander block */}
      {commander ? (
        <div
          style={{
            background: `${tierColor}06`,
            border: `1px solid ${tierColor}28`,
            borderRadius: 7,
            padding: "8px 10px",
            marginBottom: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 6,
                overflow: "hidden",
                background: "rgba(0,0,0,0.6)",
                boxShadow: `0 0 8px ${tierColor}55`,
                border: `1px solid ${tierColor}44`,
              }}
            >
              <img
                src={commander.badge}
                alt={commander.name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#e0f4ff",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {commander.name}
                {hasWings && (
                  <span
                    style={{ fontSize: 10 }}
                    title="Wings Earned — F-16 Eligible"
                  >
                    ✈
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: tierColor,
                  background: `${tierColor}18`,
                  border: `1px solid ${tierColor}44`,
                  borderRadius: 3,
                  padding: "1px 5px",
                  letterSpacing: 1,
                  fontFamily: "monospace",
                }}
              >
                {commander.tier.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#ef4444",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 4,
                padding: "2px 7px",
                fontFamily: "monospace",
                letterSpacing: 0.5,
              }}
            >
              ATK +{commander.atk}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#3b82f6",
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: 4,
                padding: "2px 7px",
                fontFamily: "monospace",
                letterSpacing: 0.5,
              }}
            >
              DEF +{commander.def}
            </span>
          </div>
          <div
            style={{
              fontSize: 8,
              color: CYAN,
              fontFamily: "monospace",
              letterSpacing: 0.5,
              opacity: 0.85,
            }}
          >
            +{(commander.rarityBonus * 100).toFixed(0)}% FRNTR/DAY BONUS
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 7,
            padding: "7px 10px",
            marginBottom: 8,
            fontSize: 8,
            color: "rgba(200,220,255,0.3)",
            fontFamily: "monospace",
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          NO COMMANDER ASSIGNED
        </div>
      )}

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

      {/* Owner action */}
      {isOwned && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            gap: 8,
          }}
        >
          <button
            type="button"
            data-ocid="map.card.open_modal_button"
            onClick={onDismiss}
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "rgba(0,255,204,0.12)",
              border: `1px solid ${CYAN}55`,
              borderRadius: 6,
              color: CYAN,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.15s",
            }}
          >
            OPEN MAP
          </button>
          <div
            style={{
              fontSize: 8,
              color: "rgba(0,255,204,0.5)",
              letterSpacing: 0.8,
              fontFamily: "monospace",
              textAlign: "center",
              padding: "0 4px",
              whiteSpace: "nowrap",
            }}
          >
            ⚡{" "}
            {commander
              ? `${(50 * (1 + commander.rarityBonus)).toFixed(1)}`
              : "50"}{" "}
            FRNTR/DAY
            <br />
            GENERATING
          </div>
        </div>
      )}
    </div>
  );
}
