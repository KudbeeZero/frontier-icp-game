import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const GOLD = "#ffd700";

const TOTAL_SUPPLY = 10_000_000_000;
const PRE_MINTED = 5_000_000_000;
const MINEABLE = 5_000_000_000;
const _MAX_PLOTS = 5882;

const GENERATOR_TIERS = [
  { tier: "I", production: "7 FRNTR/day", cost: "500 FRNTR", color: "#94a3b8" },
  {
    tier: "II",
    production: "15 FRNTR/day",
    cost: "1,500 FRNTR",
    color: "#22c55e",
  },
  {
    tier: "III",
    production: "31 FRNTR/day",
    cost: "4,000 FRNTR",
    color: "#3b82f6",
  },
  {
    tier: "IV",
    production: "63 FRNTR/day",
    cost: "10,000 FRNTR",
    color: "#8b5cf6",
  },
  {
    tier: "V",
    production: "127 FRNTR/day",
    cost: "25,000 FRNTR",
    color: "#f59e0b",
  },
  {
    tier: "VI",
    production: "255 FRNTR/day",
    cost: "60,000 FRNTR",
    color: CYAN,
  },
];

function fmtBig(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function GlowCard({
  children,
  style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(0,20,40,0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 3,
        color: CYAN,
        textTransform: "uppercase",
        marginBottom: 12,
        textShadow: `0 0 8px ${CYAN}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{ width: 2, height: 12, background: CYAN, borderRadius: 1 }}
      />
      {children}
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplay(value);
    ref.current = setInterval(() => {
      setDisplay((d) => d + 0.00000127);
    }, 80);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [value]);

  return <span style={{ fontFamily: "monospace" }}>{fmtBig(display)}</span>;
}

interface Props {
  onClose?: () => void;
  /** When true, render as inline content (no fixed overlay wrapper) */
  inline?: boolean;
}

export default function UniversePanel({ onClose, inline = false }: Props) {
  const player = useGameStore((s) => s.player);
  const totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  // Use all plots from the store for accurate global stats
  const allPlots = useGameStore((s) => s.plots);
  // Live on-chain global stats synced every 30s
  const globalStats = useGameStore((s) => s.globalStats);

  // ── Global counts: prefer on-chain data, fall back to local plot state ──
  const globalOwnedPlots = allPlots.filter((p) => p.owner !== null);
  const localPlotsOwned = globalOwnedPlots.length;
  const totalPlotsOwned = globalStats?.totalPlotsOwned ?? localPlotsOwned;
  const leaderboardProgress = Math.min((totalPlotsOwned % 1500) / 1500, 1);
  const nextPayout = 1500 - (totalPlotsOwned % 1500);

  // ── Token supply: use on-chain when available ──
  const TOTAL_SUPPLY_VAL = globalStats?.totalSupply ?? TOTAL_SUPPLY;
  const PRE_MINTED_VAL = globalStats?.preMinted ?? PRE_MINTED;
  const MINEABLE_VAL = globalStats?.mineableSupply ?? MINEABLE;

  // ── TIER_BONUS shared for player and global calculation ──
  const TIER_BONUS: Record<number, number> = {
    1: 8,
    2: 24,
    3: 48,
    4: 96,
    5: 192,
    6: 384,
  };

  // ── Player's daily FRNTR rate ──
  let playerDailyFrntr = 0;
  for (const pid of player.plotsOwned) {
    playerDailyFrntr += 7;
    const tier = generatorTiers[pid] ?? 0;
    if (tier > 0) playerDailyFrntr += TIER_BONUS[tier] ?? 0;
  }

  // ── Global daily emission: on-chain if available, else compute locally ──
  let localDailyEmission = 0;
  for (const plot of globalOwnedPlots) {
    localDailyEmission += 7;
    const tier = generatorTiers[plot.id] ?? plot.generatorTier ?? 0;
    if (tier > 0) localDailyEmission += TIER_BONUS[tier] ?? 0;
  }
  const globalDailyEmission =
    globalStats?.currentDailyEmissionRate ?? localDailyEmission;

  // ── Network burn: on-chain if available ──
  const networkBurned = globalStats?.totalFRNTRBurned ?? totalFRNTRBurned;

  // ── Active players from on-chain data ──
  const activePlayers = globalStats?.activePlayerCount ?? 0;

  // ── FRNTR mined across the network ──
  const networkFRNTRMined =
    globalStats?.totalFRNTRMined ?? globalDailyEmission * 30;

  // ── Live circulating supply: on-chain if available, else estimate ──
  const estimatedNetworkMined = globalDailyEmission * 30;
  const circulatingEstimate = Math.min(
    PRE_MINTED_VAL + player.frntBalance + estimatedNetworkMined,
    TOTAL_SUPPLY_VAL,
  );
  const circulating =
    globalStats?.totalFRNTRInCirculation ?? circulatingEstimate;

  // ── Burn rate: scales with global plot activity ──
  const burnRate = 0.00042 + totalPlotsOwned * 0.0000015;

  // ── Treasury pots: reflect real ICP from all sold plots ──
  const avgIcpPerPlot = 2.5;
  const prizePoolIcp = globalStats?.leaderboardPrizePool
    ? (globalStats.leaderboardPrizePool / 1e8).toFixed(4)
    : (totalPlotsOwned * avgIcpPerPlot * 0.25).toFixed(3);
  const devPot = (totalPlotsOwned * avgIcpPerPlot * 0.25).toFixed(3);
  const leaderPot = prizePoolIcp;
  const liquidPot = (totalPlotsOwned * avgIcpPerPlot * 0.5).toFixed(3);

  /** Inner scrollable content — shared between inline and overlay modes */
  const content = (
    <div
      data-ocid="universe.content"
      style={{
        padding: inline ? "12px 12px 80px" : "16px 16px 80px",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* ── PLAYER STATS (live) ── */}
      <SectionTitle>Your Command Stats</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              FRNTR BALANCE
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
                textShadow: `0 0 10px ${CYAN}`,
              }}
            >
              {player.frntBalance.toFixed(8)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              DAILY RATE
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: GOLD,
                fontFamily: "monospace",
              }}
            >
              +{playerDailyFrntr} / day
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {[
            { label: "IRON", value: player.iron },
            { label: "FUEL", value: player.fuel },
            { label: "CRYSTAL", value: player.crystal },
            { label: "RARE EARTH", value: player.rareEarth },
          ].map((r) => (
            <div key={r.label}>
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 1,
                  marginBottom: 2,
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: TEXT,
                  fontFamily: "monospace",
                }}
              >
                {r.value.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                letterSpacing: 1,
                marginBottom: 2,
              }}
            >
              PLOTS OWNED
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
              }}
            >
              {player.plotsOwned.length}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                letterSpacing: 1,
                marginBottom: 2,
              }}
            >
              TOTAL BURNED
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#ef4444",
                fontFamily: "monospace",
              }}
            >
              {networkBurned.toFixed(4)}
            </div>
          </div>
        </div>
      </GlowCard>

      {/* ── GLOBAL NETWORK STATS (on-chain) ── */}
      <SectionTitle>Global Network Stats</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {[
            {
              label: "TOTAL PLOTS OWNED",
              value: totalPlotsOwned.toLocaleString(),
              color: CYAN,
              sub: "of 5,882 max",
            },
            {
              label: "ACTIVE PLAYERS",
              value: activePlayers > 0 ? activePlayers.toLocaleString() : "—",
              color: GOLD,
              sub: "registered commanders",
            },
            {
              label: "FRNTR MINED (NET)",
              value: fmtBig(networkFRNTRMined),
              color: "#22c55e",
              sub: "by landowners",
            },
            {
              label: "GLOBAL DAILY OUTPUT",
              value: fmtBig(globalDailyEmission),
              color: "#3b82f6",
              sub: "FRNTR / day",
            },
          ].map((item) => (
            <div key={item.label}>
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 1,
                  marginBottom: 3,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: item.color,
                  fontFamily: "monospace",
                  textShadow: `0 0 8px ${item.color}55`,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: 7,
                  color: item.color,
                  opacity: 0.55,
                  marginTop: 1,
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: globalStats ? "#22c55e" : "#f59e0b",
              boxShadow: `0 0 6px ${globalStats ? "#22c55e" : "#f59e0b"}`,
            }}
          />
          <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
            {globalStats
              ? "LIVE ON-CHAIN DATA · SYNCED 30s"
              : "ESTIMATING FROM LOCAL STATE"}
          </span>
        </div>
      </GlowCard>

      {/* TOKEN ECONOMICS */}
      <SectionTitle>Token Economics</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          {
            label: "Total Supply",
            value: fmtBig(TOTAL_SUPPLY_VAL),
            sub: "FRNTR",
            color: CYAN,
          },
          {
            label: "Pre-Minted",
            value: fmtBig(PRE_MINTED_VAL),
            sub: "Backed w/ liquidity",
            color: GOLD,
          },
          {
            label: "Mineable Supply",
            value: fmtBig(MINEABLE_VAL),
            sub: "By landowners only",
            color: "#3b82f6",
          },
          {
            label: "Total Burned",
            value: fmtBig(networkBurned),
            sub: "Out of circulation",
            color: "#ef4444",
          },
        ].map((item) => (
          <GlowCard key={item.label}>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              {item.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: item.color,
                fontFamily: "monospace",
                textShadow: `0 0 10px ${item.color}66`,
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: 8,
                color: item.color,
                opacity: 0.6,
                marginTop: 2,
              }}
            >
              {item.sub}
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Live counters */}
      <GlowCard style={{ marginBottom: 16 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              CIRCULATING SUPPLY
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
              }}
            >
              <AnimatedCounter value={circulating} />
            </div>
            <div style={{ fontSize: 8, color: CYAN_DIM, marginTop: 2 }}>
              ~{fmtBig((circulating / TOTAL_SUPPLY_VAL) * 100)}% of total
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              BURN RATE
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#ef4444",
                fontFamily: "monospace",
              }}
            >
              {burnRate.toFixed(5)}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(239,68,68,0.5)",
                marginTop: 2,
              }}
            >
              FRNTR/sec avg
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              NETWORK EMISSION
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: GOLD,
                fontFamily: "monospace",
              }}
            >
              {fmtBig(globalDailyEmission)}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(255,215,0,0.5)",
                marginTop: 2,
              }}
            >
              FRNTR/day · all plots
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              ACTIVE PLOTS
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#22c55e",
                fontFamily: "monospace",
              }}
            >
              {totalPlotsOwned}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(34,197,94,0.5)",
                marginTop: 2,
              }}
            >
              of 5,882 total
            </div>
          </div>
        </div>
      </GlowCard>

      {/* EMISSION SCHEDULE */}
      <SectionTitle>Emission Schedule</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 8,
            color: TEXT_DIM,
            marginBottom: 12,
            letterSpacing: 0.5,
          }}
        >
          5-year mining curve · 6 generator upgrade tiers
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GENERATOR_TIERS.map((g) => (
            <div
              key={g.tier}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: `${g.color}22`,
                  border: `1px solid ${g.color}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  color: g.color,
                  flexShrink: 0,
                }}
              >
                {g.tier}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      fontFamily: "monospace",
                    }}
                  >
                    {g.production}
                  </span>
                  <span style={{ fontSize: 8, color: g.color }}>{g.cost}</span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${((GENERATOR_TIERS.indexOf(g) + 1) / 6) * 100}%`,
                      background: g.color,
                      borderRadius: 2,
                      boxShadow: `0 0 6px ${g.color}`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* TREASURY */}
      <SectionTitle>Treasury</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              label: "Developer Treasury",
              pct: "25%",
              value: `${devPot} ICP`,
              color: GOLD,
            },
            {
              label: "Leaderboard Pot",
              pct: "25%",
              value: `${leaderPot} ICP`,
              color: "#22c55e",
            },
            {
              label: "Liquidity Pot",
              pct: "50%",
              value: `${liquidPot} ICP`,
              color: "#3b82f6",
            },
          ].map((pot) => (
            <div key={pot.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: pot.color,
                    }}
                  />
                  <span style={{ fontSize: 9, color: TEXT, fontWeight: 600 }}>
                    {pot.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 8,
                      color: pot.color,
                      fontFamily: "monospace",
                    }}
                  >
                    {pot.value}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: TEXT_DIM,
                      fontFamily: "monospace",
                    }}
                  >
                    {pot.pct}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 4,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: pot.pct,
                    background: pot.color,
                    borderRadius: 3,
                    boxShadow: `0 0 6px ${pot.color}66`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* LEADERBOARD MILESTONE */}
      <SectionTitle>Leaderboard Milestone</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 2,
              }}
            >
              NEXT PAYOUT AT
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: GOLD,
                fontFamily: "monospace",
              }}
            >
              1,500 PLOTS
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 2,
              }}
            >
              PRIZE POOL
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#22c55e",
                fontFamily: "monospace",
              }}
            >
              {leaderPot} ICP
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 8, color: TEXT_DIM }}>
              {totalPlotsOwned} plots minted
            </span>
            <span style={{ fontSize: 8, color: CYAN }}>
              {nextPayout} remaining
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              overflow: "hidden",
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${leaderboardProgress * 100}%`,
                background: `linear-gradient(90deg, ${GOLD}, ${CYAN})`,
                borderRadius: 4,
                boxShadow: `0 0 8px ${GOLD}88`,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: 8, color: TEXT_DIM }}>
          Top FRNTR holders receive ICP payout from prize pool every 1,500 plot
          mints
        </div>
      </GlowCard>

      {/* MARKET DATA */}
      <SectionTitle>Market Data</SectionTitle>
      <GlowCard>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            DEX LISTING COMING SOON
          </div>
          <div style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1.6 }}>
            FRNTR/ICP pool will be seeded on ICPSwap using the Liquidity Pot.
            Trading will go live after v1.0 launch milestone.
          </div>
          <div
            style={{
              marginTop: 12,
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 20,
              border: `1px solid ${CYAN}44`,
              fontSize: 8,
              color: CYAN,
              letterSpacing: 1.5,
              background: "rgba(0,255,204,0.05)",
            }}
          >
            FOLLOW @FRONTIER_ICP FOR UPDATES
          </div>
        </div>
      </GlowCard>
    </div>
  );

  // ── Inline mode: just the content, no overlay wrapper ──
  if (inline) {
    return content;
  }

  // ── Overlay mode: full-screen fixed panel ──
  return (
    <div
      data-ocid="universe.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(1,5,12,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.015) 2px, rgba(0,255,204,0.015) 4px)",
        }}
      />

      <div
        style={{ position: "relative", zIndex: 2, padding: "16px 16px 80px" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: CYAN_DIM,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              SYSTEM OVERVIEW
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: CYAN,
                letterSpacing: 4,
                textTransform: "uppercase",
                textShadow: `0 0 20px ${CYAN}`,
              }}
            >
              UNIVERSE
            </div>
          </div>
          <button
            type="button"
            data-ocid="universe.close_button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(0,255,204,0.08)",
              border: `1px solid ${BORDER}`,
              color: CYAN,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
