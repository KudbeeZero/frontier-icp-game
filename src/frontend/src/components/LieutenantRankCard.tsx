import {
  COMMANDER_ARCHETYPES,
  TIER_COLORS,
  getCurrentRank,
  getNextRank,
} from "../constants/commanders";
import { useGameStore } from "../store/gameStore";

const BRANCH_COLORS: Record<string, { primary: string; glow: string }> = {
  ARMY_INFANTRY: { primary: "#22c55e", glow: "rgba(34,197,94,0.6)" },
  ARMY_RANGER: { primary: "#ef4444", glow: "rgba(239,68,68,0.6)" },
  MARINE: { primary: "#3b82f6", glow: "rgba(59,130,246,0.6)" },
  MILITARY_POLICE: { primary: "#f59e0b", glow: "rgba(245,158,11,0.6)" },
  WARRANT_OFFICER: { primary: "#a855f7", glow: "rgba(168,85,247,0.6)" },
  AIR_FORCE: { primary: "#00ffcc", glow: "rgba(0,255,204,0.6)" },
};

export default function LieutenantRankCard() {
  const rankStats = useGameStore((s) => s.rankStats);
  const ownedCommanders = useGameStore((s) => s.ownedCommanders);

  // Find highest-ranked owned commander
  const topCommander = ownedCommanders.reduce((best, c) => {
    if (!best) return c;
    return c.currentRankIndex > best.currentRankIndex ? c : best;
  }, ownedCommanders[0] ?? null);

  const arch = topCommander
    ? COMMANDER_ARCHETYPES.find((a) => a.id === topCommander.archetypeId)
    : null;
  const currentRank = topCommander ? getCurrentRank(topCommander) : null;
  const nextRank = topCommander ? getNextRank(topCommander) : null;

  const { primary, glow } = topCommander
    ? (BRANCH_COLORS[topCommander.archetypeId] ?? {
        primary: "#00ffcc",
        glow: "rgba(0,255,204,0.6)",
      })
    : { primary: "#00ffcc", glow: "rgba(0,255,204,0.6)" };

  const branchColor = TIER_COLORS[topCommander?.archetypeId ?? ""] ?? primary;

  const totalRanks = arch?.rankProgression.length ?? 1;
  const progressPct = topCommander
    ? (topCommander.currentRankIndex + 1) / totalRanks
    : 0;

  return (
    <div
      data-ocid="commander.rank.card"
      style={{
        margin: "0 12px 14px",
        background: "rgba(4,12,24,0.9)",
        border: `1px solid ${primary}44`,
        borderRadius: 12,
        padding: "14px 14px 12px",
        boxShadow: `0 0 24px ${primary}18, inset 0 0 32px rgba(0,0,0,0.4)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: "100%",
          background: `linear-gradient(270deg, ${primary}08, transparent)`,
          pointerEvents: "none",
        }}
      />

      {topCommander && arch && currentRank ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Rank insignia */}
            <div
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: 8,
                  background: `radial-gradient(circle, ${primary}22, transparent 70%)`,
                  animation: "rankPulse 2.5s ease-in-out infinite",
                }}
              />
              {/* Archetype badge overlay */}
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: "rgba(4,12,24,0.9)",
                  border: `1px solid ${branchColor}66`,
                  zIndex: 2,
                  padding: 2,
                }}
              >
                <img
                  src={arch.badgeImage}
                  alt={arch.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23112233' rx='6'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='%2300ffcc' font-size='20'%3E%E2%98%85%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <img
                src={currentRank.image}
                alt={currentRank.name}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  filter: `drop-shadow(0 0 10px ${glow})`,
                  position: "relative",
                  zIndex: 1,
                  borderRadius: 8,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23112233' rx='6'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='%2300ffcc' font-size='20'%3E%E2%98%85%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 7.5,
                  color: "rgba(0,255,204,0.4)",
                  letterSpacing: 2.5,
                  fontFamily: "monospace",
                  marginBottom: 2,
                }}
              >
                HIGHEST RANK
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: primary,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  textShadow: `0 0 16px ${glow}`,
                  fontFamily: "monospace",
                  lineHeight: 1.1,
                  marginBottom: 2,
                }}
              >
                {currentRank.abbreviation}
              </div>
              <div
                style={{
                  fontSize: 8.5,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "monospace",
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                {currentRank.name}
              </div>
              <div
                style={{
                  fontSize: 7.5,
                  color: branchColor,
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  marginBottom: 6,
                  opacity: 0.8,
                }}
              >
                {arch.name.toUpperCase()}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "MISSIONS", val: rankStats.missionsLaunched },
                  { label: "PLOTS", val: rankStats.plotsOwned },
                  { label: "WINS", val: rankStats.combatWins },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: primary,
                        fontFamily: "monospace",
                        lineHeight: 1,
                        textShadow: `0 0 8px ${glow}`,
                      }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        fontSize: 7,
                        color: "rgba(0,255,204,0.35)",
                        letterSpacing: 1,
                        fontFamily: "monospace",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${primary}33, transparent)`,
              margin: "10px 0",
            }}
          />

          {/* Progress */}
          {nextRank ? (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontSize: 7.5,
                    color: "rgba(0,255,204,0.5)",
                    letterSpacing: 1.5,
                    fontFamily: "monospace",
                  }}
                >
                  PROGRESS → {nextRank.abbreviation}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: primary,
                    fontFamily: "monospace",
                  }}
                >
                  {nextRank.promotionCost.toLocaleString()} FRNTR
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "rgba(0,255,204,0.08)",
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `1px solid ${primary}22`,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct * 100}%`,
                    background: `linear-gradient(90deg, ${primary}88, ${primary})`,
                    boxShadow: `0 0 6px ${glow}`,
                    borderRadius: 2,
                    transition: "width 0.8s ease-out",
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 8.5,
                color: primary,
                fontFamily: "monospace",
                letterSpacing: 2,
                textAlign: "center",
                textShadow: `0 0 10px ${glow}`,
                padding: "4px 0 8px",
              }}
            >
              ★ MAX RANK ACHIEVED ★
            </div>
          )}

          {/* Archetype bonus */}
          <div
            style={{
              background: `${primary}08`,
              border: `1px solid ${primary}22`,
              borderRadius: 6,
              padding: "7px 10px",
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "rgba(0,255,204,0.35)",
                letterSpacing: 2,
                fontFamily: "monospace",
                marginBottom: 4,
              }}
            >
              ARCHETYPE BONUS
            </div>
            <div
              style={{
                fontSize: 9,
                color: primary,
                fontFamily: "monospace",
                letterSpacing: 0.5,
                lineHeight: 1.4,
              }}
            >
              ▸ {arch.archetypeBonus}
            </div>
          </div>
        </>
      ) : (
        /* No commanders yet */
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎖️</div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(0,255,204,0.5)",
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            NO COMMANDERS ENLISTED
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(0,255,204,0.25)",
              fontFamily: "monospace",
              marginTop: 5,
            }}
          >
            Visit the ENLIST tab to recruit
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {[
              { label: "MISSIONS", val: rankStats.missionsLaunched },
              { label: "PLOTS", val: rankStats.plotsOwned },
              { label: "WINS", val: rankStats.combatWins },
            ].map(({ label, val }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: primary,
                    fontFamily: "monospace",
                    textShadow: `0 0 8px ${glow}`,
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "rgba(0,255,204,0.35)",
                    letterSpacing: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes rankPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
