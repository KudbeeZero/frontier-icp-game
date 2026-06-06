import { useActor } from "@caffeineai/core-infrastructure";
import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createActor } from "../backend";
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
const _MAX_PLOTS = 10242;

// Hardcoded tiers removed — fetched live from canister via getGeneratorTierCatalog()

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

interface LiveTierEntry {
  tier: string;
  production: string;
  cost: string;
  color: string;
}

const TIER_COLORS = [
  "#94a3b8",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  CYAN,
];

export default function UniversePanel({ onClose, inline = false }: Props) {
  const { actor } = useActor(createActor);
  const player = useGameStore((s) => s.player);
  const totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  // icpUsdPrice from gameStore — polled every 60s by usePlayerSync (foundation)
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const setTreasuryState = useGameStore((s) => s.setTreasuryState);
  // FRNTR/ICP price — shown as 'Pool not yet seeded' if unavailable
  const [frntrIcpPrice, _setFrntrIcpPrice] = useState<number | null>(null);

  // Live generator tier catalog from canister
  const [liveTiers, setLiveTiers] = useState<LiveTierEntry[] | null>(null);
  useEffect(() => {
    if (!actor) return;
    actor
      .getGeneratorTierCatalog()
      .then((catalog) => {
        const TIER_NAMES = ["I", "II", "III", "IV", "V", "VI"];
        const sorted = [...catalog].sort(
          (a, b) => Number(a.tierIndex) - Number(b.tierIndex),
        );
        setLiveTiers(
          sorted.map((t, i) => ({
            tier: TIER_NAMES[i] ?? String(Number(t.tierIndex)),
            production: `${t.bonusPerDay.toFixed(0)} FRNTR/day`,
            cost: `${(Number(t.cost) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 0 })} FRNTR`,
            color: TIER_COLORS[i] ?? CYAN,
          })),
        );
      })
      .catch(() => {
        // Fallback to hardcoded correct values if canister unavailable
        setLiveTiers([
          {
            tier: "I",
            production: "9 FRNTR/day",
            cost: "500 FRNTR",
            color: TIER_COLORS[0],
          },
          {
            tier: "II",
            production: "12 FRNTR/day",
            cost: "1,500 FRNTR",
            color: TIER_COLORS[1],
          },
          {
            tier: "III",
            production: "17 FRNTR/day",
            cost: "4,000 FRNTR",
            color: TIER_COLORS[2],
          },
          {
            tier: "IV",
            production: "25 FRNTR/day",
            cost: "10,000 FRNTR",
            color: TIER_COLORS[3],
          },
          {
            tier: "V",
            production: "37 FRNTR/day",
            cost: "25,000 FRNTR",
            color: TIER_COLORS[4],
          },
          {
            tier: "VI",
            production: "55 FRNTR/day",
            cost: "60,000 FRNTR",
            color: TIER_COLORS[5],
          },
        ]);
      });
  }, [actor]);

  // ── Pot balances fetched directly every 10 seconds ──
  const [potBalances, setPotBalances] = useState<{
    dev: number;
    leaderboard: number;
    liquidity: number;
  }>({ dev: 0, leaderboard: 0, liquidity: 0 });

  useEffect(() => {
    if (!actor) return;
    const fetchPots = () => {
      actor
        .getTreasuryBalances()
        .then((res) => {
          setPotBalances({
            dev: Number(res.devPot) / 1e8,
            leaderboard: Number(res.leaderboardPot) / 1e8,
            liquidity: Number(res.liquidityPot) / 1e8,
          });
        })
        .catch(() => {});
    };
    fetchPots();
    const id = setInterval(fetchPots, 10_000);
    return () => clearInterval(id);
  }, [actor]);

  // ── Treasury auto-refresh every 10 seconds (store sync) ──
  useEffect(() => {
    if (!actor) return;
    const fetchTreasury = () => {
      actor
        .getTreasuryState()
        .then((res) =>
          setTreasuryState({
            developer: res.developer,
            leaderboard: res.leaderboard,
            liquidity: res.liquidity,
          }),
        )
        .catch(() => {});
    };
    fetchTreasury();
    const id = setInterval(fetchTreasury, 10_000);
    return () => clearInterval(id);
  }, [actor, setTreasuryState]);

  // Use all plots from the store for accurate global stats
  const allPlots = useGameStore((s) => s.plots);
  // Live on-chain global stats synced every 30s
  const globalStats = useGameStore((s) => s.globalStats);
  // Live treasury state from canister (polled every 10s in this component)
  const _treasuryState = useGameStore((s) => s.treasuryState);

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

  // ── Correct tier daily rates: tier 0=7, I=9, II=12, III=17, IV=25, V=37, VI=55 ──
  const TIER_RATES: Record<number, number> = {
    0: 7,
    1: 9,
    2: 12,
    3: 17,
    4: 25,
    5: 37,
    6: 55,
  };

  // ── Player's daily FRNTR rate ──
  let _playerDailyFrntr = 0;
  for (const pid of player.plotsOwned) {
    const tier = (generatorTiers[pid] ?? 0) as number;
    _playerDailyFrntr += TIER_RATES[tier] ?? 7;
  }

  // ── Global daily emission: on-chain if available, else compute locally ──
  let localDailyEmission = 0;
  for (const plot of globalOwnedPlots) {
    const tier = (generatorTiers[String(plot.id)] ??
      plot.generatorTier ??
      0) as number;
    localDailyEmission += TIER_RATES[tier] ?? 7;
  }
  const globalDailyEmission =
    globalStats?.currentDailyEmissionRate ?? localDailyEmission;

  // ── Global unclaimed tokens from store (set by usePlayerSync) ──
  const globalUnclaimedTokens = useGameStore((s) => s.globalUnclaimedTokens);

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
              sub: "of 10,242 max",
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
            {
              label: "UNCLAIMED IN CIRCULATION",
              value: fmtBig(globalUnclaimedTokens),
              color: "#a855f7",
              sub: "across all plots",
            },
            {
              label: "ON-CHAIN ACTIONS",
              value:
                globalStats?.totalActionCount !== undefined
                  ? Number(globalStats.totalActionCount).toLocaleString()
                  : "—",
              color: "#f97316",
              sub: "confirmed on-chain",
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
              of 10,242 total
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
          {liveTiers === null ? (
            <div
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              Loading tier data…
            </div>
          ) : (
            liveTiers.map((g, idx) => (
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
                    <span style={{ fontSize: 8, color: g.color }}>
                      {g.cost}
                    </span>
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
                        width: `${((idx + 1) / liveTiers.length) * 100}%`,
                        background: g.color,
                        borderRadius: 2,
                        boxShadow: `0 0 6px ${g.color}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </GlowCard>

      {/* TREASURY STATUS */}
      <SectionTitle>Treasury Status</SectionTitle>
      {/* FRNTR/ICP rate badge */}
      <div style={{ marginBottom: 10 }}>
        {frntrIcpPrice !== null && frntrIcpPrice > 0 ? (
          <span
            style={{
              display: "inline-block",
              background: "rgba(0,255,204,0.08)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 9,
              color: CYAN,
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            FRNTR/ICP: {frntrIcpPrice.toFixed(6)}
          </span>
        ) : (
          <span
            style={{
              display: "inline-block",
              background: "rgba(100,100,100,0.12)",
              border: "1px solid rgba(150,150,150,0.25)",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 9,
              color: TEXT_DIM,
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            Pool not yet seeded
          </span>
        )}
      </div>
      <div
        data-ocid="universe.treasury_status"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {(
          [
            {
              key: "dev",
              name: "DEVELOPER",
              pct: "25%",
              balance: potBalances.dev,
              accentClass: "treasury-pot-accent-border",
              accentStyle: { borderTopColor: "rgba(255,200,100,0.8)" },
            },
            {
              key: "leaderboard",
              name: "LEADERBOARD",
              pct: "25%",
              balance: potBalances.leaderboard,
              accentClass: "treasury-pot-accent-border",
              accentStyle: { borderTopColor: "rgba(100,220,230,0.8)" },
            },
            {
              key: "liquidity",
              name: "LIQUIDITY",
              pct: "50%",
              balance: potBalances.liquidity,
              accentClass: "treasury-pot-accent-border",
              accentStyle: { borderTopColor: "rgba(0,255,204,0.8)" },
            },
          ] as const
        ).map((pot) => {
          const icpDisplay = `${pot.balance.toFixed(4)} ICP`;
          const usdDisplay =
            icpUsdPrice !== null
              ? `${(pot.balance * icpUsdPrice).toFixed(2)} USD`
              : "$ --";
          return (
            <div
              key={pot.key}
              className={`treasury-card-enhanced ${pot.accentClass}`}
              data-ocid={`universe.treasury_${pot.key}`}
              style={pot.accentStyle}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 2,
                      color: CYAN,
                      textTransform: "uppercase" as const,
                      marginBottom: 2,
                    }}
                  >
                    {pot.name}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: TEXT_DIM,
                      letterSpacing: 1,
                    }}
                  >
                    {pot.pct} of purchases
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="monospace-number" style={{ fontSize: 13 }}>
                    {icpDisplay}
                  </div>
                  <div
                    className="monospace-number"
                    style={{ fontSize: 10, opacity: 0.7 }}
                  >
                    {usdDisplay}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              {potBalances.leaderboard.toFixed(4)} ICP
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

      {/* ── SYSTEM HEALTH ── */}
      <SectionTitle>System Health</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              label: "Backend Canister",
              status: globalStats ? "ONLINE" : "CONNECTING",
              ok: !!globalStats,
            },
            {
              label: "FRNTR Token",
              status: globalStats ? "OPERATIONAL" : "CONNECTING",
              ok: !!globalStats,
            },
            {
              label: "Plot Registry",
              status: globalStats ? "OPERATIONAL" : "CONNECTING",
              ok: !!globalStats,
            },
            {
              label: "Leaderboard",
              status: globalStats ? "ACTIVE" : "CONNECTING",
              ok: !!globalStats,
            },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: row.ok ? "#00FF88" : "#FF4444",
                    boxShadow: `0 0 6px ${row.ok ? "#00FF88" : "#FF4444"}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 9, color: TEXT, fontWeight: 600 }}>
                  {row.label}
                </span>
              </div>
              <span
                style={{
                  fontSize: 8,
                  color: row.ok ? "#00FF88" : "#FF4444",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                }}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 7,
            color: TEXT_DIM,
            letterSpacing: 0.5,
          }}
        >
          {globalStats
            ? `All systems nominal · Last sync: ${new Date().toLocaleTimeString()}`
            : "Connecting to ICP network…"}
        </div>
      </GlowCard>

      {/* ── FUND YOUR WALLET ── */}
      <SectionTitle>Fund Your Wallet</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              step: "1",
              title: "Buy ICP on any major exchange",
              detail: "Coinbase, Kraken, Binance, or any ICP-listed exchange",
            },
            {
              step: "2",
              title: "Transfer ICP to your wallet address",
              detail: player.principal
                ? player.principal
                : "Login with Internet Identity to see your address",
              mono: !!player.principal,
            },
            {
              step: "3",
              title: "Get free test tokens",
              detail:
                "Use the TESTNET FAUCET button (upper right of globe) — no cost",
            },
            {
              step: "4",
              title: "Purchase a plot to start earning",
              detail:
                "Common plots start at 2–3 ICP · FRNTR accrues immediately",
            },
          ].map((item) => (
            <div key={item.step} style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: `${CYAN}18`,
                  border: `1px solid ${CYAN}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  color: CYAN,
                  flexShrink: 0,
                }}
              >
                {item.step}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: TEXT,
                    marginBottom: 2,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: TEXT_DIM,
                    fontFamily: item.mono ? "monospace" : undefined,
                    wordBreak: item.mono ? "break-all" : undefined,
                    lineHeight: 1.5,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* ── LIQUIDITY ── */}
      <SectionTitle>Liquidity</SectionTitle>
      <GlowCard style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 1.5,
                  marginBottom: 3,
                }}
              >
                ICP / USD
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: GOLD,
                  fontFamily: "monospace",
                }}
              >
                ${icpUsdPrice != null ? icpUsdPrice.toFixed(2) : "--"} USD
              </div>
            </div>
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                fontStyle: "italic",
                textAlign: "right",
              }}
            >
              Live pricing
              <br />
              coming soon
            </div>
          </div>
          <div style={{ height: 1, background: BORDER }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 1.5,
                  marginBottom: 3,
                }}
              >
                FRNTR / ICP
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: CYAN,
                  fontFamily: "monospace",
                }}
              >
                TBD
              </div>
            </div>
            <div style={{ fontSize: 7, color: CYAN_DIM, textAlign: "right" }}>
              Pool launch
              <br />
              pending
            </div>
          </div>
          <div style={{ height: 1, background: BORDER }} />
          <div>
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 3,
              }}
            >
              LIQUIDITY POT BALANCE
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#3b82f6",
                fontFamily: "monospace",
              }}
            >
              {globalStats?.liquidityPotICP != null
                ? `${globalStats.liquidityPotICP.toFixed(6)} ICP`
                : `${potBalances.liquidity.toFixed(4)} ICP`}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(59,130,246,0.6)",
                marginTop: 2,
              }}
            >
              Available for DEX seeding (ICPSwap FRNTR/ICP)
            </div>
          </div>
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
