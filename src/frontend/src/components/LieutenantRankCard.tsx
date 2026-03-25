import { useGameStore } from "../store/gameStore";

type Rank = "Lieutenant" | "Captain" | "Colonel" | "General";

const RANK_BADGES: Record<Rank, string> = {
  Lieutenant:
    "/assets/uploads/4bf293ca-38e7-4c5a-8af9-30823a7fdec3-019d259f-0a63-72ba-8c8c-5645132a2e13-1.png",
  Captain: "/assets/generated/captain-nft-badge-transparent.dim_512x512.png",
  Colonel: "/assets/generated/colonel-nft-badge-transparent.dim_512x512.png",
  General:
    "/assets/uploads/8b9b0c04-b938-4dda-bb30-0ee19d09eb49-019d259f-141b-7509-acb8-4c4fe578f26c-2.png",
};

const RANK_PERKS: Record<Rank, string> = {
  Lieutenant: "Base rank — establish your command",
  Captain: "+5% FRNTR/day from all owned plots",
  Colonel: "+15% FRNTR/day + faster silo cooldown",
  General: "+25% FRNTR/day + elite commander slots",
};

const RANK_ORDER: Rank[] = ["Lieutenant", "Captain", "Colonel", "General"];

const RANK_COLORS: Record<Rank, { primary: string; glow: string }> = {
  Lieutenant: { primary: "#00ffcc", glow: "rgba(0,255,204,0.6)" },
  Captain: { primary: "#3b82f6", glow: "rgba(59,130,246,0.6)" },
  Colonel: { primary: "#a855f7", glow: "rgba(168,85,247,0.6)" },
  General: { primary: "#ffd700", glow: "rgba(255,215,0,0.6)" },
};

function deriveRank(stats: {
  missionsLaunched: number;
  plotsOwned: number;
  combatWins: number;
}): Rank {
  if (stats.missionsLaunched >= 30 || stats.plotsOwned >= 15) return "General";
  if (stats.missionsLaunched >= 15 || stats.plotsOwned >= 8) return "Colonel";
  if (stats.missionsLaunched >= 5 || stats.plotsOwned >= 3) return "Captain";
  return "Lieutenant";
}

function nextRankThreshold(rank: Rank): {
  nextRank: Rank | null;
  missionTarget: number;
  plotTarget: number;
} {
  const thresholds: Record<
    Rank,
    { nextRank: Rank | null; missionTarget: number; plotTarget: number }
  > = {
    Lieutenant: { nextRank: "Captain", missionTarget: 5, plotTarget: 3 },
    Captain: { nextRank: "Colonel", missionTarget: 15, plotTarget: 8 },
    Colonel: { nextRank: "General", missionTarget: 30, plotTarget: 15 },
    General: { nextRank: null, missionTarget: 30, plotTarget: 15 },
  };
  return thresholds[rank];
}

export default function LieutenantRankCard() {
  const rankStats = useGameStore((s) => s.rankStats);
  const rank = deriveRank(rankStats);
  const { primary, glow } = RANK_COLORS[rank];
  const { nextRank, missionTarget, plotTarget } = nextRankThreshold(rank);

  const missionProgress = Math.min(
    rankStats.missionsLaunched / missionTarget,
    1,
  );
  const plotProgress = Math.min(rankStats.plotsOwned / plotTarget, 1);
  const overallProgress = Math.max(missionProgress, plotProgress);

  const rankIdx = RANK_ORDER.indexOf(rank);

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
      {/* Background rank stripes */}
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

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Badge */}
        <div
          style={{
            width: 100,
            height: 100,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${primary}22, transparent 70%)`,
              animation: "rankPulse 2.5s ease-in-out infinite",
            }}
          />
          <img
            src={RANK_BADGES[rank]}
            alt={rank}
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
              filter: `drop-shadow(0 0 10px ${glow})`,
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>

        {/* Rank info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 7.5,
              color: "rgba(0,255,204,0.4)",
              letterSpacing: 2.5,
              fontFamily: "monospace",
              marginBottom: 3,
            }}
          >
            YOUR RANK
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: primary,
              letterSpacing: 3,
              textTransform: "uppercase",
              textShadow: `0 0 16px ${glow}, 0 0 32px ${primary}44`,
              fontFamily: "monospace",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            {rank.toUpperCase()}
          </div>

          {/* Rank tier pips */}
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {RANK_ORDER.map((r, i) => (
              <div
                key={r}
                style={{
                  width: i <= rankIdx ? 20 : 10,
                  height: 6,
                  borderRadius: 3,
                  background: i <= rankIdx ? primary : "rgba(0,255,204,0.1)",
                  boxShadow: i <= rankIdx ? `0 0 6px ${glow}` : "none",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "MISSIONS", val: rankStats.missionsLaunched },
              { label: "PLOTS", val: rankStats.plotsOwned },
              { label: "WINS", val: rankStats.combatWins },
            ].map(({ label, val }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 13,
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

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${primary}33, transparent)`,
          margin: "12px 0 10px",
        }}
      />

      {/* Progress to next rank */}
      {nextRank ? (
        <div style={{ marginBottom: 10 }}>
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
                fontSize: 8,
                color: "rgba(0,255,204,0.5)",
                letterSpacing: 1.5,
                fontFamily: "monospace",
              }}
            >
              PROGRESS TO {nextRank.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 8,
                color: primary,
                fontFamily: "monospace",
                letterSpacing: 0.5,
              }}
            >
              {rankStats.missionsLaunched}/{missionTarget} missions ·{" "}
              {rankStats.plotsOwned}/{plotTarget} plots
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
                width: `${overallProgress * 100}%`,
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

      {/* Perks */}
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
          ACTIVE RANK PERKS
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
          ▸ {RANK_PERKS[rank]}
        </div>
      </div>

      <style>{`
        @keyframes rankPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
