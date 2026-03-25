import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.45)";
const BORDER = "rgba(0,255,204,0.15)";
const BG = "#020509";

const FACTIONS = [
  {
    id: "NEXUS-7",
    color: "#ef4444",
    lore: "Rogue AI collective. Seeks total network domination. No mercy, no negotiation — only conquest.",
    plotRange: [0, 499],
  },
  {
    id: "KRONOS",
    color: "#8b5cf6",
    lore: "Ancient machine cult. Worships the old protocols. Time itself bends to their encrypted will.",
    plotRange: [500, 999],
  },
  {
    id: "VANGUARD",
    color: "#22c3c9",
    lore: "Human resistance. Fight for decentralized freedom. The last line against machine supremacy.",
    plotRange: [1000, 1499],
  },
  {
    id: "SPECTRE",
    color: "#f59e0b",
    lore: "Shadow network. Unknown origins. Unknown agenda. Their motives remain deeply classified.",
    plotRange: [1500, 1999],
  },
];

export default function Factions() {
  const navigate = useNavigate();
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const setFaction = useGameStore((s) => s.setFaction);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG,
        color: "#e0f4ff",
        fontFamily: "monospace",
        overflowY: "auto",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "rgba(2,5,9,0.95)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          data-ocid="factions.back_button"
          onClick={() => navigate({ to: "/" })}
          style={{
            background: "rgba(0,255,204,0.07)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: CYAN,
            cursor: "pointer",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 4,
            textShadow: `0 0 14px ${CYAN}`,
          }}
        >
          FACTIONS
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 9,
            color: CYAN_DIM,
            letterSpacing: 1,
            marginBottom: 20,
            lineHeight: 1.7,
          }}
        >
          Choose your allegiance. Each faction controls territory on the globe
          and engages in real-time warfare. Your faction determines your allies,
          enemies, and strategic objectives.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {FACTIONS.map((faction) => {
            const territory = plots.filter(
              (p) => p.owner === faction.id,
            ).length;
            const strength = Math.min(100, (territory / 500) * 100);
            const isJoined = player.faction === faction.id;

            return (
              <div
                key={faction.id}
                data-ocid={`factions.${faction.id.toLowerCase().replace("-", "_")}.card`}
                style={{
                  background: `rgba(${faction.color === "#ef4444" ? "239,68,68" : faction.color === "#8b5cf6" ? "139,92,246" : faction.color === "#22c3c9" ? "34,195,201" : "245,158,11"},0.05)`,
                  border: `1px solid ${faction.color}33`,
                  borderTop: `2px solid ${faction.color}`,
                  borderRadius: 8,
                  padding: "14px",
                  transition: "box-shadow 0.2s",
                  ...(isJoined && { boxShadow: `0 0 20px ${faction.color}44` }),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: faction.color,
                      letterSpacing: 2,
                      textShadow: `0 0 10px ${faction.color}`,
                    }}
                  >
                    {faction.id}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      padding: "2px 7px",
                      borderRadius: 3,
                      background: `${faction.color}22`,
                      border: `1px solid ${faction.color}44`,
                      color: faction.color,
                      letterSpacing: 1,
                    }}
                  >
                    {territory} PLOTS
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 9,
                    color: "rgba(224,244,255,0.65)",
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                >
                  {faction.lore}
                </p>

                {/* Strength bar */}
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 7.5,
                        color: "rgba(224,244,255,0.4)",
                        letterSpacing: 1,
                      }}
                    >
                      STRENGTH
                    </span>
                    <span style={{ fontSize: 7.5, color: faction.color }}>
                      {strength.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${strength}%`,
                        background: faction.color,
                        borderRadius: 2,
                        transition: "width 0.8s ease-out",
                        boxShadow: `0 0 6px ${faction.color}88`,
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  data-ocid={`factions.${faction.id.toLowerCase().replace("-", "_")}.join_button`}
                  onClick={() => {
                    if (!isJoined) setFaction(faction.id);
                  }}
                  disabled={isJoined}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: isJoined ? `${faction.color}22` : "transparent",
                    border: `1px solid ${faction.color}66`,
                    borderRadius: 5,
                    color: faction.color,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 2,
                    cursor: isJoined ? "default" : "pointer",
                    fontFamily: "monospace",
                    transition: "background 0.2s",
                  }}
                >
                  {isJoined ? `✓ ALLIED — ${faction.id}` : "JOIN FACTION"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
