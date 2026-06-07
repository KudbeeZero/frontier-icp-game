import { useActor } from "@caffeineai/core-infrastructure";
import {
  AlertTriangle,
  BarChart2,
  RefreshCw,
  RotateCcw,
  Shield,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Variant_day_month_week } from "../backend";
import {
  CYCLES_CRITICAL,
  CYCLES_WARNING,
  useCanisterCycles,
} from "../hooks/useCanisterCycles";
import { setLastFaucetClaim } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";
import { GEODESIC_TILES, assignBiome } from "../utils/geodesicGrid";
import ActionConfirmModal from "./ActionConfirmModal";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

type RevenuePeriod = "day" | "week" | "month";

interface PlayerAnalyticsData {
  averageTokensPerPlayer: number;
  boughtPlot: bigint;
  activeLast24h: bigint;
  activeLast30d: bigint;
  activeLast7d: bigint;
  averagePlotsPerPlayer: number;
  topBiomes: Array<[string, bigint]>;
  claimedTokens: bigint;
  upgradedPlot: bigint;
  loggedIn: bigint;
  totalPlayersEver: bigint;
}

interface RevenueData {
  leaderboardSplitE8s: bigint;
  totalIcpE8s: bigint;
  devSplitE8s: bigint;
  usdEquivalent: number;
  liquiditySplitE8s: bigint;
  transactionCount: bigint;
}

interface AnomalyEntry {
  principal: { toString(): string };
  anomalyType: string;
  timestamp: bigint;
  details: string;
}

const BIOME_COLORS: Record<string, string> = {
  Temperate: "#22c55e",
  Desert: "#eab308",
  Ocean: "#3b82f6",
  DeepOcean: "#1e3a5f",
  Arctic: "#a5f3fc",
  Tropical: "#f97316",
  Volcanic: "#ef4444",
  AsteroidImpact: "#a855f7",
};

function truncatePrincipal(p: string): string {
  if (p.length <= 16) return p;
  return `${p.slice(0, 8)}…${p.slice(-4)}`;
}

function formatRelativeTime(ns: bigint): string {
  const nowMs = Date.now();
  const tsMs = Number(ns / 1_000_000n);
  const diffSec = Math.floor((nowMs - tsMs) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatAnomalyType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatICP(e8s: bigint): string {
  return (Number(e8s) / 1e8).toFixed(2);
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: TEXT_DIM,
        letterSpacing: 2.5,
        textTransform: "uppercase" as const,
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {label}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(0,255,204,0.04)",
        border: `1px solid ${BORDER}`,
        backdropFilter: "blur(8px)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 7,
          color: TEXT_DIM,
          letterSpacing: 1.5,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: color ?? CYAN,
          fontFamily: "monospace",
          letterSpacing: 0.5,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AnalyticsTab({
  actor,
}: { actor: ReturnType<typeof createActor> | null }) {
  const [analytics, setAnalytics] = useState<PlayerAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("day");
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[] | null>(null);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  useEffect(() => {
    if (!actor) return;
    setAnalyticsLoading(true);
    actor
      .getPlayerAnalytics()
      .then((d) => setAnalytics(d))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));

    setAnomalyLoading(true);
    actor
      .getAnomalies()
      .then((d) => {
        setAnomalies(d.anomalies as AnomalyEntry[]);
        setAnomalyCount(Number(d.totalCount));
      })
      .catch(() => {})
      .finally(() => setAnomalyLoading(false));
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    setRevenueLoading(true);
    const period = {
      __kind__: revenuePeriod,
    } as unknown as Variant_day_month_week;
    actor
      .getRevenueByPeriod(period)
      .then((d) => setRevenueData(d))
      .catch(() => {})
      .finally(() => setRevenueLoading(false));
  }, [actor, revenuePeriod]);

  // DAU bar chart — 3 bars from aggregate data
  const dauBars = analytics
    ? [
        {
          label: "Today",
          value: Number(analytics.activeLast24h),
          period: "24h",
        },
        {
          label: "This Week",
          value: Number(analytics.activeLast7d),
          period: "7d",
        },
        {
          label: "This Month",
          value: Number(analytics.activeLast30d),
          period: "30d",
        },
      ]
    : [];
  const dauMax = Math.max(...dauBars.map((b) => b.value), 1);

  // Conversion funnel stages
  const funnelStages = analytics
    ? [
        { label: "Logged In", count: Number(analytics.loggedIn) },
        { label: "Bought Plot", count: Number(analytics.boughtPlot) },
        { label: "Upgraded", count: Number(analytics.upgradedPlot) },
        { label: "Claimed", count: Number(analytics.claimedTokens) },
      ]
    : [];

  // Top biomes
  const topBiomes = analytics?.topBiomes ?? [];
  const maxBiomeCount = Math.max(...topBiomes.map(([, c]) => Number(c)), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Player Activity */}
      <div>
        <SectionHeader label="Player Activity" />
        {analyticsLoading ? (
          <div style={{ fontSize: 10, color: TEXT_DIM, padding: "8px 0" }}>
            Loading…
          </div>
        ) : analytics ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <StatBox
                label="TOTAL PLAYERS"
                value={Number(analytics.totalPlayersEver).toLocaleString()}
              />
              <StatBox
                label="ACTIVE 24H"
                value={Number(analytics.activeLast24h).toLocaleString()}
                color="#22c55e"
              />
              <StatBox
                label="ACTIVE 7D"
                value={Number(analytics.activeLast7d).toLocaleString()}
                color="#86efac"
              />
              <StatBox
                label="ACTIVE 30D"
                value={Number(analytics.activeLast30d).toLocaleString()}
              />
            </div>

            {/* DAU Bar Chart */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.35)",
                border: `1px solid ${BORDER}`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                DAILY ACTIVE USERS
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 16,
                  height: 80,
                }}
              >
                {dauBars.map((bar) => {
                  const heightPct = Math.max((bar.value / dauMax) * 100, 4);
                  return (
                    <div
                      key={bar.period}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: CYAN,
                          fontFamily: "monospace",
                        }}
                      >
                        {bar.value.toLocaleString()}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: `${heightPct}%`,
                          minHeight: 4,
                          borderRadius: 4,
                          background: `linear-gradient(to top, ${CYAN}cc, ${CYAN}44)`,
                          boxShadow: `0 0 8px ${CYAN}66`,
                          transition: "height 0.4s ease",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 7,
                          color: TEXT_DIM,
                          letterSpacing: 1,
                        }}
                      >
                        {bar.label}
                      </div>
                      <div style={{ fontSize: 6, color: TEXT_DIM }}>
                        {bar.period}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 9, color: TEXT_DIM }}>No data available.</div>
        )}
      </div>

      {/* Conversion Funnel */}
      <div>
        <SectionHeader label="Conversion Funnel" />
        {analytics && funnelStages.length > 0 ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${BORDER}`,
              backdropFilter: "blur(8px)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {funnelStages.map((stage, i) => {
              const prevCount =
                i === 0 ? funnelStages[0].count : funnelStages[i - 1].count;
              const pct =
                prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
              const maxCount = funnelStages[0].count || 1;
              const barWidthPct = Math.max((stage.count / maxCount) * 100, 2);
              return (
                <div key={stage.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{ fontSize: 8, color: TEXT, letterSpacing: 0.5 }}
                    >
                      {i + 1}. {stage.label}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        color: CYAN,
                        fontFamily: "monospace",
                      }}
                    >
                      {stage.count.toLocaleString()}
                      {i > 0 && (
                        <span
                          style={{
                            fontSize: 7,
                            color:
                              pct >= 50
                                ? "#22c55e"
                                : pct >= 20
                                  ? "#eab308"
                                  : "#ef4444",
                            marginLeft: 6,
                          }}
                        >
                          ({pct}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidthPct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background:
                          i === 0
                            ? CYAN
                            : pct >= 50
                              ? "#22c55e"
                              : pct >= 20
                                ? "#eab308"
                                : "#ef4444",
                        boxShadow: `0 0 6px ${CYAN}55`,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : analyticsLoading ? (
          <div style={{ fontSize: 10, color: TEXT_DIM, padding: "8px 0" }}>
            Loading…
          </div>
        ) : (
          <div style={{ fontSize: 9, color: TEXT_DIM }}>No funnel data.</div>
        )}
      </div>

      {/* Revenue by Period */}
      <div>
        <SectionHeader label="Revenue by Period" />
        {/* Period selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {(["day", "week", "month"] as RevenuePeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              data-ocid={`admin.revenue_period_${p}`}
              onClick={() => setRevenuePeriod(p)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 6,
                border: `1px solid ${revenuePeriod === p ? CYAN : BORDER}`,
                background:
                  revenuePeriod === p
                    ? "rgba(0,255,204,0.12)"
                    : "rgba(0,255,204,0.03)",
                color: revenuePeriod === p ? CYAN : TEXT_DIM,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase" as const,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p === "day" ? "Day" : p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>

        {revenueLoading ? (
          <div style={{ fontSize: 10, color: TEXT_DIM, padding: "8px 0" }}>
            Loading…
          </div>
        ) : revenueData ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${BORDER}`,
              backdropFilter: "blur(8px)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <StatBox
                label="TOTAL ICP"
                value={`${formatICP(revenueData.totalIcpE8s)} ICP`}
                color={CYAN}
              />
              <StatBox
                label="USD EQUIV"
                value={`${revenueData.usdEquivalent.toFixed(2)}`}
                color="#86efac"
              />
              <StatBox
                label="TRANSACTIONS"
                value={Number(revenueData.transactionCount).toLocaleString()}
              />
            </div>

            {/* 25/25/50 split visualization */}
            <div>
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 2,
                  marginBottom: 6,
                }}
              >
                TREASURY SPLIT
              </div>
              {[
                {
                  label: "Developer (25%)",
                  value: revenueData.devSplitE8s,
                  pct: 25,
                  color: "#818cf8",
                },
                {
                  label: "Leaderboard (25%)",
                  value: revenueData.leaderboardSplitE8s,
                  pct: 25,
                  color: "#fbbf24",
                },
                {
                  label: "Liquidity (50%)",
                  value: revenueData.liquiditySplitE8s,
                  pct: 50,
                  color: CYAN,
                },
              ].map((split) => (
                <div key={split.label} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontSize: 7, color: TEXT_DIM }}>
                      {split.label}
                    </span>
                    <span
                      style={{
                        fontSize: 7,
                        color: split.color,
                        fontFamily: "monospace",
                      }}
                    >
                      {formatICP(split.value)} ICP
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${split.pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: split.color,
                        boxShadow: `0 0 6px ${split.color}55`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 9, color: TEXT_DIM }}>No revenue data.</div>
        )}
      </div>

      {/* Top Biomes */}
      <div>
        <SectionHeader label="Top Biomes" />
        {analyticsLoading ? (
          <div style={{ fontSize: 10, color: TEXT_DIM, padding: "8px 0" }}>
            Loading…
          </div>
        ) : topBiomes.length > 0 ? (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${BORDER}`,
              backdropFilter: "blur(8px)",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {topBiomes.map(([biome, count], idx) => {
              const cnt = Number(count);
              const barW = Math.max((cnt / maxBiomeCount) * 100, 2);
              const biomeColor = BIOME_COLORS[biome] ?? CYAN;
              return (
                <div key={biome}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span style={{ fontSize: 8, color: TEXT }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: biomeColor,
                          marginRight: 5,
                          verticalAlign: "middle",
                          boxShadow: `0 0 4px ${biomeColor}88`,
                        }}
                      />
                      #{idx + 1} {biome}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        color: biomeColor,
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      {cnt.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barW}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: biomeColor,
                        boxShadow: `0 0 6px ${biomeColor}55`,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 9, color: TEXT_DIM }}>No biome data.</div>
        )}
      </div>

      {/* Anomaly Alerts */}
      <div>
        <SectionHeader label="Anomaly Alerts" />
        {anomalyLoading ? (
          <div style={{ fontSize: 10, color: TEXT_DIM, padding: "8px 0" }}>
            Loading…
          </div>
        ) : anomalies !== null ? (
          <>
            {anomalyCount === 0 ? (
              <div
                data-ocid="admin.anomaly_status"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  fontSize: 9,
                  color: "#22c55e",
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ✓ No anomalies detected
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 9,
                    color: "#ef4444",
                    fontWeight: 700,
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={12} />
                  {anomalyCount} {anomalyCount === 1 ? "anomaly" : "anomalies"}{" "}
                  detected
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {anomalies.map((a, i) => (
                    <div
                      key={`${a.principal.toString()}-${i}`}
                      data-ocid={`admin.anomaly.item.${i + 1}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: "#fca5a5",
                            letterSpacing: 0.5,
                          }}
                        >
                          {formatAnomalyType(a.anomalyType)}
                        </span>
                        <span style={{ fontSize: 7, color: TEXT_DIM }}>
                          {formatRelativeTime(a.timestamp)}
                        </span>
                      </div>
                      <div
                        className="font-mono"
                        style={{ fontSize: 8, color: TEXT_DIM }}
                      >
                        {truncatePrincipal(a.principal.toString())}
                      </div>
                      <div
                        style={{ fontSize: 8, color: TEXT, lineHeight: 1.5 }}
                      >
                        {a.details}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 9, color: TEXT_DIM }}>
            Failed to load anomalies.
          </div>
        )}
      </div>
    </div>
  );
}

function AdminButton({
  label,
  icon: Icon,
  onClick,
  loading,
  danger,
}: {
  label: string;
  icon: React.ElementType<{
    size?: number;
    color?: string;
    style?: React.CSSProperties;
    className?: string;
  }>;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "11px 14px",
        borderRadius: 8,
        background: danger ? "rgba(255,68,68,0.10)" : "rgba(0,255,204,0.08)",
        border: `1px solid ${
          danger ? "rgba(255,68,68,0.35)" : "rgba(0,255,204,0.3)"
        }`,
        color: danger ? "#ff6666" : CYAN,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: "uppercase" as const,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <Icon size={14} style={{}} />
      {loading ? "WORKING..." : label}
    </button>
  );
}

export default function AdminPanel() {
  const player = useGameStore((s) => s.player);
  const { actor } = useActor(createActor);

  const {
    cycles,
    cyclesFormatted,
    loading: cyclesLoading,
  } = useCanisterCycles();

  const [activeTab, setActiveTab] = useState<"control" | "analytics">(
    "control",
  );
  const [mintLoading, setMintLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [reseedLoading, setReseedLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  if (!player.isAdmin) return null;

  async function handleMintToSelf() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setMintLoading(true);
    try {
      const result = await actor.testFaucetV2();
      if ("ok" in result) {
        const grant = (
          result as { ok: { frntGranted: bigint; icpGranted: bigint } }
        ).ok;
        const frntr = Number(grant.frntGranted) / 1e8;
        const icp = Number(grant.icpGranted) / 1e8;
        setLastFaucetClaim();
        toast.success(
          `+${frntr.toFixed(4)} FRNTR & +${icp.toFixed(4)} ICP minted`,
          {
            duration: 4000,
          },
        );
        // Trigger player sync after 3 seconds
        setTimeout(() => {
          useGameStore.setState((s) => ({
            player: {
              ...s.player,
              frntBalance: s.player.frntBalance + frntr,
            },
          }));
        }, 3000);
      } else {
        toast.error(`Faucet failed: ${result.err}`);
      }
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setMintLoading(false);
    }
  }

  async function handleResetAll() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setResetLoading(true);
    setShowConfirm(false);
    try {
      await actor.resetAllData();
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          frntBalance: 0,
          plotsOwned: [],
          iron: 0,
          fuel: 0,
          crystal: 0,
          rareEarth: 0,
        },
        leaderboard: [],
        totalFRNTRBurned: 0,
      }));
      toast.success("All state reset", { duration: 4000 });
    } catch (e) {
      toast.error(`Reset failed: ${String(e)}`);
    } finally {
      setResetLoading(false);
    }
  }

  const handlePurgeTestPlayers = async () => {
    if (!actor) {
      setPurgeResult("Error: Actor not ready");
      return;
    }
    setIsPurging(true);
    setShowPurgeConfirm(false);
    try {
      const result = await actor.purgeTestPlayers();
      if (result.__kind__ === "ok") {
        setPurgeResult(`Removed ${Number(result.ok)} test entries`);
      } else {
        setPurgeResult(`Error: ${result.err}`);
      }
    } catch (e) {
      setPurgeResult(`Error: ${String(e)}`);
    } finally {
      setIsPurging(false);
    }
  };

  async function handleReseedPlots() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setReseedLoading(true);
    try {
      const count = await actor.getPlotCount();
      if (count >= 100n) {
        toast(`Plots already seeded — canister has ${count} plots`, {
          duration: 3000,
        });
        setReseedLoading(false);
        return;
      }
      const tiles = GEODESIC_TILES.slice(0, 500);
      const plotData: [string, string, number, number, bigint][] = tiles.map(
        (tile, i) => [
          String(i),
          assignBiome(tile.lat, tile.lng),
          tile.lat,
          tile.lng,
          BigInt(Math.floor(78 + (((i * 2654435761) >>> 0) % 21))),
        ],
      );
      await actor.initPlots(plotData);
      toast.success(`Seeded ${tiles.length} plots`, { duration: 4000 });
    } catch (e) {
      toast.error(`Reseed failed: ${String(e)}`);
    } finally {
      setReseedLoading(false);
    }
  }

  return (
    <div
      data-ocid="admin.panel"
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shield
          size={18}
          color={CYAN}
          style={{ filter: `drop-shadow(0 0 6px ${CYAN})` }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: CYAN,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
            textShadow: `0 0 10px ${CYAN}`,
          }}
        >
          ADMIN CONTROL
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 10,
            background: "rgba(0,255,204,0.12)",
            border: `1px solid ${CYAN}55`,
            fontSize: 7,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 2,
          }}
        >
          ADMIN
        </span>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4 }}>
        {(
          [
            { id: "control", label: "CONTROL", icon: Shield },
            { id: "analytics", label: "ANALYTICS", icon: BarChart2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-ocid={`admin.tab_${id}`}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "6px 8px",
              borderRadius: 7,
              border: `1px solid ${activeTab === id ? CYAN : BORDER}`,
              background:
                activeTab === id
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(0,255,204,0.03)",
              color: activeTab === id ? CYAN : TEXT_DIM,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: activeTab === id ? `0 0 8px ${CYAN}33` : "none",
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: BORDER }} />

      {/* Tab content */}
      {activeTab === "control" ? (
        <>
          {/* Canister Cycles */}
          {(() => {
            const isCritical = cycles !== null && cycles < CYCLES_CRITICAL;
            const isWarning =
              cycles !== null &&
              cycles >= CYCLES_CRITICAL &&
              cycles < CYCLES_WARNING;
            const accentColor = isCritical
              ? "#ff4444"
              : isWarning
                ? "#ffcc00"
                : CYAN;
            const bgColor = isCritical
              ? "rgba(255,68,68,0.08)"
              : isWarning
                ? "rgba(255,204,0,0.07)"
                : "rgba(0,255,204,0.04)";
            const borderColor = isCritical
              ? "rgba(255,68,68,0.35)"
              : isWarning
                ? "rgba(255,204,0,0.35)"
                : BORDER;

            return (
              <div
                data-ocid="admin.cycles_card"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 7,
                      color: TEXT_DIM,
                      letterSpacing: 1.5,
                      textTransform: "uppercase" as const,
                    }}
                  >
                    CANISTER CYCLES
                  </span>
                  {(isCritical || isWarning) && (
                    <span
                      style={{
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        color: accentColor,
                        textTransform: "uppercase" as const,
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: isCritical
                          ? "rgba(255,68,68,0.15)"
                          : "rgba(255,204,0,0.12)",
                        border: `1px solid ${accentColor}55`,
                      }}
                    >
                      {isCritical ? "⚠ CRITICAL" : "⚠ LOW"}
                    </span>
                  )}
                </div>
                <div
                  data-ocid="admin.cycles_value"
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: accentColor,
                    letterSpacing: 1,
                    fontFamily: "monospace",
                    textShadow: `0 0 10px ${accentColor}99`,
                    lineHeight: 1.1,
                  }}
                >
                  {cyclesLoading ? (
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>
                      Loading…
                    </span>
                  ) : (
                    cyclesFormatted
                  )}
                </div>
                {isCritical && (
                  <div
                    data-ocid="admin.cycles_warning"
                    style={{
                      fontSize: 8,
                      color: "#ff8888",
                      letterSpacing: 0.3,
                      marginTop: 2,
                    }}
                  >
                    ⚠ Critical — top up canister cycles immediately.
                  </div>
                )}
                {isWarning && (
                  <div
                    data-ocid="admin.cycles_warning"
                    style={{
                      fontSize: 8,
                      color: "#ffdd66",
                      letterSpacing: 0.3,
                      marginTop: 2,
                    }}
                  >
                    ⚠ Below 1T cycles — consider topping up soon.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Principal display */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(0,255,204,0.04)",
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 3,
              }}
            >
              ADMIN PRINCIPAL
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 9, color: TEXT, wordBreak: "break-all" }}
            >
              {player.principal ?? "—"}
            </div>
          </div>

          {/* Action section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 2,
              }}
            >
              ACTIONS
            </div>

            <div data-ocid="admin.mint_button">
              <AdminButton
                label="Mint to Self (Faucet)"
                icon={Zap}
                onClick={handleMintToSelf}
                loading={mintLoading}
              />
            </div>

            <AdminButton
              label="Reseed Plots"
              icon={RefreshCw}
              onClick={handleReseedPlots}
              loading={reseedLoading}
            />

            {!showConfirm ? (
              <AdminButton
                label="Reset All State"
                icon={RotateCcw}
                onClick={() => setShowConfirm(true)}
                danger
              />
            ) : (
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid rgba(255,68,68,0.4)",
                  background: "rgba(255,68,68,0.07)",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#ff6666",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  This wipes ALL player data and plots. Confirm?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    data-ocid="admin.confirm_button"
                    onClick={handleResetAll}
                    disabled={resetLoading}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 6,
                      background: "rgba(255,68,68,0.2)",
                      border: "1px solid rgba(255,68,68,0.5)",
                      color: "#ff6666",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: resetLoading ? "not-allowed" : "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    {resetLoading ? "RESETTING..." : "CONFIRM"}
                  </button>
                  <button
                    type="button"
                    data-ocid="admin.cancel_button"
                    onClick={() => setShowConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 6,
                      background: "rgba(0,255,204,0.06)",
                      border: `1px solid ${BORDER}`,
                      color: CYAN,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Maintenance */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              LEADERBOARD MAINTENANCE
            </div>
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              disabled={isPurging}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.4)",
                color: "#f87171",
                fontSize: 10,
                letterSpacing: 0.8,
                cursor: isPurging ? "not-allowed" : "pointer",
                opacity: isPurging ? 0.5 : 1,
              }}
            >
              {isPurging ? "PURGING..." : "PURGE TEST PLAYERS"}
            </button>
            {purgeResult && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: purgeResult.startsWith("Error")
                    ? "#f87171"
                    : "#34d399",
                  letterSpacing: 0.5,
                }}
              >
                {purgeResult}
              </div>
            )}
          </div>

          {showPurgeConfirm && (
            <ActionConfirmModal
              isOpen={showPurgeConfirm}
              actionType="purchase"
              title="Purge Test Players"
              details={[
                {
                  label: "Action",
                  value: "Remove all test/placeholder leaderboard entries",
                },
              ]}
              warningText="This cannot be undone. All test player entries will be permanently removed."
              onConfirm={handlePurgeTestPlayers}
              onCancel={() => setShowPurgeConfirm(false)}
            />
          )}

          {/* Info */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(0,10,20,0.4)",
              border: `1px solid ${BORDER}`,
              fontSize: 8,
              color: TEXT_DIM,
              lineHeight: 1.7,
              letterSpacing: 0.3,
            }}
          >
            ⚡ Admin panel is only visible to the registered admin principal.
            Reset All State is irreversible — use before mainnet migration only.
          </div>
        </>
      ) : (
        <AnalyticsTab actor={actor} />
      )}
    </div>
  );
}
