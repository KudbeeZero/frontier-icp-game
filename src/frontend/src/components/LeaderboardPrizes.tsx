import { useLeaderboardPrizes } from "@/hooks/useLeaderboard";
import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const BORDER = "rgba(0,255,204,0.18)";
const PANEL = "rgba(0,20,40,0.72)";
const TEXT_DIM = "rgba(224,244,255,0.45)";

function useCountUp(target: number, duration = 1500) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const start = prev.current;
    const end = target;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return display;
}

export function LeaderboardPrizes() {
  const { data, isLoading } = useLeaderboardPrizes();

  const leaderboardPot = data?.leaderboardPot ?? 0;
  const totalPlotsOwned = data?.totalPlotsOwned ?? 0;
  const nextPayoutMilestone = data?.nextPayoutMilestone ?? 1500;
  const plotsUntilPayout = data?.plotsUntilPayout ?? 1500;
  const prizeDistribution = data?.prizeDistribution ?? {
    first: 50,
    second: 30,
    third: 20,
  };
  const activePlayers = data?.activePlayers ?? 0;

  const animatedPot = useCountUp(leaderboardPot);
  const progress = Math.min(
    (totalPlotsOwned % 1500) / Math.max(nextPayoutMilestone % 1500 || 1500, 1),
    1,
  );

  const prizeRows = [
    {
      place: 1,
      label: "1ST PLACE",
      pct: prizeDistribution.first,
      color: GOLD,
      medal: "🥇",
    },
    {
      place: 2,
      label: "2ND PLACE",
      pct: prizeDistribution.second,
      color: "#c0c0c0",
      medal: "🥈",
    },
    {
      place: 3,
      label: "3RD PLACE",
      pct: prizeDistribution.third,
      color: AMBER,
      medal: "🥉",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      data-ocid="leaderboard.prizes_section"
      className="mt-6"
      style={{
        background: PANEL,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "rgba(255,215,0,0.06)",
          borderBottom: "1px solid rgba(255,215,0,0.15)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Trophy size={16} style={{ color: GOLD }} />
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 3,
                color: GOLD,
                textTransform: "uppercase",
              }}
            >
              LEADERBOARD GRAND PRIZE POOL
            </div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              AWARDED EVERY 1,500 PLOTS MINTED
            </div>
          </div>
        </div>
        {activePlayers > 0 && (
          <div
            style={{
              fontSize: 8,
              color: CYAN,
              letterSpacing: 1.5,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            {activePlayers.toLocaleString()} ACTIVE PLAYERS
          </div>
        )}
      </div>

      <div style={{ padding: "16px 18px" }}>
        {/* Current pot balance + next payout */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 3,
              }}
            >
              CURRENT POT
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "monospace",
                color: GOLD,
                textShadow: `0 0 12px ${GOLD}55`,
              }}
            >
              {isLoading ? (
                <span style={{ fontSize: 13, color: TEXT_DIM }}>
                  LOADING...
                </span>
              ) : leaderboardPot > 0 ? (
                `${animatedPot.toFixed(4)} ICP`
              ) : (
                <span style={{ fontSize: 14, color: TEXT_DIM }}>
                  0.0000 ICP
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 3,
              }}
            >
              NEXT PAYOUT IN
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                fontFamily: "monospace",
                color: CYAN,
              }}
            >
              {plotsUntilPayout.toLocaleString()} PLOTS
            </div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              AT {nextPayoutMilestone.toLocaleString()} MINTED
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
              PROGRESS TO PAYOUT — {totalPlotsOwned.toLocaleString()} /{" "}
              {nextPayoutMilestone.toLocaleString()} PLOTS MINTED
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: CYAN,
                fontFamily: "monospace",
              }}
            >
              {(progress * 100).toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${CYAN}, ${GOLD})`,
                borderRadius: 3,
                transition: "width 0.6s ease",
                boxShadow: `0 0 8px ${CYAN}55`,
              }}
            />
          </div>
        </div>

        {/* Prize distribution */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 2,
              color: CYAN,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            PRIZE DISTRIBUTION
          </div>
          {prizeRows.map((row) => (
            <div
              key={row.place}
              data-ocid={`leaderboard.prize_row.${row.place}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                marginBottom: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{row.medal}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: row.color,
                    letterSpacing: 1,
                  }}
                >
                  {row.label}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: row.color,
                  }}
                >
                  {row.pct}%
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: TEXT_DIM,
                    fontFamily: "monospace",
                  }}
                >
                  {leaderboardPot > 0
                    ? `${(animatedPot * (row.pct / 100)).toFixed(4)} ICP`
                    : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon note */}
        <div
          data-ocid="leaderboard.prizes_coming_soon"
          style={{
            textAlign: "center",
            padding: "10px",
            background: "rgba(0,255,204,0.04)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            fontSize: 9,
            color: TEXT_DIM,
            letterSpacing: 1.5,
          }}
        >
          <span style={{ color: CYAN }}>⚡</span> FULL RANKINGS &amp; MORE PRIZE
          TIERS COMING SOON
        </div>
      </div>
    </motion.div>
  );
}
