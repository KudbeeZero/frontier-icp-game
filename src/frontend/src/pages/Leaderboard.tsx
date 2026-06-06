import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  RefreshCw,
  Sword,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const BORDER = "rgba(0,255,204,0.18)";
const PANEL = "rgba(0,20,40,0.72)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

type SortKey = "rank" | "player" | "plots" | "frntr" | "wins" | "score";
type SortDir = "asc" | "desc";

function computeScore(
  plots: number | undefined,
  frntr: number | undefined,
  wins: number | undefined,
): number {
  return Math.round(
    (plots ?? 0) * 100 + (frntr ?? 0) * 0.01 + (wins ?? 0) * 50,
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span style={{ fontSize: 14 }} title="1st Place">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span style={{ fontSize: 14 }} title="2nd Place">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span style={{ fontSize: 14 }} title="3rd Place">
        🥉
      </span>
    );
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "monospace",
        color: TEXT_DIM,
      }}
    >
      #{rank}
    </span>
  );
}

function SortIcon({
  col,
  active,
  dir,
}: {
  col: SortKey;
  active: SortKey;
  dir: SortDir;
}) {
  if (col !== active)
    return <span style={{ opacity: 0.2, fontSize: 10 }}>↕</span>;
  return dir === "asc" ? (
    <ChevronUp size={11} style={{ color: CYAN }} />
  ) : (
    <ChevronDown size={11} style={{ color: CYAN }} />
  );
}

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
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return display;
}

function GrandPrizes({
  leaderboardPot,
  totalPlotsOwned,
}: { leaderboardPot: number; totalPlotsOwned: number }) {
  const animatedPot = useCountUp(leaderboardPot);
  const progress = Math.min((totalPlotsOwned % 1500) / 1500, 1);
  const plotsUntilPayout = 1500 - (totalPlotsOwned % 1500);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
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
          gap: 10,
        }}
      >
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

      <div style={{ padding: "16px 18px" }}>
        {/* Current pot balance */}
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
              {leaderboardPot > 0 ? (
                `${animatedPot.toFixed(4)} ICP`
              ) : (
                <span style={{ fontSize: 14, color: TEXT_DIM }}>
                  Loading...
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
          </div>
        </div>

        {/* Progress bar to next payout */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
              PROGRESS TO PAYOUT
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
          {[
            { place: 1, label: "1ST PLACE", pct: 50, color: GOLD, medal: "🥇" },
            {
              place: 2,
              label: "2ND PLACE",
              pct: 30,
              color: "#c0c0c0",
              medal: "🥈",
            },
            {
              place: 3,
              label: "3RD PLACE",
              pct: 20,
              color: AMBER,
              medal: "🥉",
            },
          ].map((row) => {
            const _potAmt = leaderboardPot * (row.pct / 100);
            return (
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
            );
          })}
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
          <span style={{ color: CYAN }}>⚡</span> FULL RANKINGS & MORE PRIZE
          TIERS COMING SOON
        </div>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const player = useGameStore((s) => s.player);
  const rankStats = useGameStore((s) => s.rankStats);
  const treasuryState = useGameStore((s) => s.treasuryState);
  const globalStats = useGameStore((s) => s.globalStats);
  const { actor, isFetching } = useActor(createActor);

  // Leaderboard pot balance from treasury state (in ICP, divide by 1e8)
  const leaderboardPot = Number(treasuryState.leaderboard) / 1e8;
  const totalPlotsOwned = globalStats?.totalPlotsOwned ?? 0;

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageTab, setPageTab] = useState<"rankings" | "prizes">("rankings");
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live leaderboard data from backend
  const fetchLeaderboard = useCallback(async () => {
    if (!actor || isFetching) return;
    try {
      const data = await actor.getLeaderboard(50n);
      const mapped = data.map((e) => ({
        rank: Number(e.rank),
        name:
          e.username ?? `${e.principal.slice(0, 8)}...${e.principal.slice(-4)}`,
        principal: e.principal,
        plotsOwned: Number(e.plotsOwned),
        frntEarned: Number(e.frntBalance),
        victories: 0,
      }));
      useGameStore.setState({ leaderboard: mapped });
    } catch {
      // Non-critical: keep existing data if fetch fails
    }
  }, [actor, isFetching]);

  // Initial load + polling every 30 seconds
  useEffect(() => {
    const load = async () => {
      await fetchLeaderboard();
      setIsLoading(false);
    };
    void load();

    refreshTimerRef.current = setInterval(() => {
      void fetchLeaderboard();
      setLastRefresh(Date.now());
    }, 30_000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchLeaderboard]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setLastRefresh(Date.now());
    setRefreshing(false);
  };

  // Build enriched entries from store
  const entries = useMemo(() => {
    const base = leaderboard.map((e) => ({
      id: e.name,
      name: e.name,
      principal: e.principal ?? "",
      plots: e.plotsOwned,
      frntr: e.frntEarned,
      wins: e.victories,
      score: computeScore(e.plotsOwned, e.frntEarned, e.victories),
      isMe: !!(player.principal && e.principal === player.principal),
    }));

    // Insert current player if not already in list
    const alreadyInList = base.some((e) => e.isMe);
    const myEntry = {
      id: "__me__",
      name: player.principal
        ? `${player.principal.slice(0, 8)}...${player.principal.slice(-4)}`
        : "YOU",
      principal: player.principal ?? "",
      plots: player.plotsOwned.length,
      frntr: Math.round(player.frntBalance),
      wins: (rankStats as { combatWins: number }).combatWins,
      score: computeScore(
        player.plotsOwned.length,
        player.frntBalance,
        (rankStats as { combatWins: number }).combatWins,
      ),
      isMe: true,
    };

    // Merge, dedup: if player already in leaderboard data, don't insert duplicate
    const merged = alreadyInList ? base : [myEntry, ...base];
    return merged.slice(0, 25);
  }, [leaderboard, player, rankStats]);

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortKey === "player") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortKey === "plots") {
        va = a.plots ?? 0;
        vb = b.plots ?? 0;
      } else if (sortKey === "frntr") {
        va = a.frntr ?? 0;
        vb = b.frntr ?? 0;
      } else if (sortKey === "wins") {
        va = a.wins ?? 0;
        vb = b.wins ?? 0;
      } else {
        va = a.score ?? 0;
        vb = b.score ?? 0;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return copy.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const myRank = sorted.findIndex(
    (e) => e.isMe || (player.principal && e.principal === player.principal),
  );

  const timeSince = Math.floor((Date.now() - lastRefresh) / 1000);

  const colStyle = (key: SortKey) => ({
    cursor: "pointer" as const,
    userSelect: "none" as const,
    padding: "10px 12px",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: sortKey === key ? CYAN : TEXT_DIM,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 3,
    whiteSpace: "nowrap" as const,
    transition: "color 0.15s",
  });

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #0a1628 0%, #04070d 70%)",
        fontFamily: "'General Sans', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="pt-6 pb-12 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "rgba(0,255,204,0.1)",
                border: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={18} style={{ color: GOLD }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 4,
                  color: TEXT,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                LEADERBOARD
              </h1>
              <p
                style={{
                  fontSize: 9,
                  color: TEXT_DIM,
                  letterSpacing: 2,
                  marginTop: 2,
                }}
              >
                GLOBAL RANKING &middot; TOP {sorted.length} COMMANDERS
              </p>
            </div>
          </div>

          {/* Refresh controls */}
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: 1 }}>
              {refreshing ? "SYNCING..." : `${timeSince}s AGO`}
            </span>
            <button
              type="button"
              data-ocid="leaderboard.button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{
                background: "rgba(0,255,204,0.07)",
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                color: CYAN,
                padding: "6px 10px",
                cursor: refreshing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={11}
                style={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              REFRESH
            </button>
          </div>
        </motion.div>

        {/* Page tab switcher: RANKINGS / PRIZES */}
        <div
          className="flex gap-2 mb-5"
          data-ocid="leaderboard.page_tab_switcher"
        >
          {(
            [
              { id: "rankings", label: "RANKINGS", emoji: "🎯" },
              { id: "prizes", label: "PRIZES", emoji: "🏆" },
            ] as { id: "rankings" | "prizes"; label: string; emoji: string }[]
          ).map((t) => {
            const active = pageTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-ocid={`leaderboard.page_tab.${t.id}`}
                onClick={() => setPageTab(t.id)}
                className="flex items-center gap-2 min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
                style={{
                  background: active
                    ? "rgba(0,255,204,0.15)"
                    : "rgba(0,20,40,0.5)",
                  border: `1px solid ${active ? CYAN : BORDER}`,
                  color: active ? CYAN : TEXT_DIM,
                  boxShadow: active ? "0 0 14px rgba(0,255,204,0.18)" : "none",
                  letterSpacing: 3,
                }}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Sort tabs — rankings only */}
        {pageTab === "rankings" && (
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { key: "score" as SortKey, label: "SCORE", icon: "🎯" },
              {
                key: "plots" as SortKey,
                label: "PLOTS",
                icon: null,
                lucide: Globe,
              },
              {
                key: "frntr" as SortKey,
                label: "FRNTR",
                icon: null,
                lucide: Zap,
              },
              {
                key: "wins" as SortKey,
                label: "WINS",
                icon: null,
                lucide: Sword,
              },
            ].map((tab) => {
              const active = sortKey === tab.key;
              const LucideIcon = tab.lucide;
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-ocid="leaderboard.tab"
                  onClick={() => handleSort(tab.key)}
                  className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg"
                  style={{
                    background: active
                      ? "rgba(0,255,204,0.15)"
                      : "rgba(0,20,40,0.5)",
                    border: `1px solid ${active ? CYAN : BORDER}`,
                    color: active ? CYAN : TEXT_DIM,
                    boxShadow: active
                      ? "0 0 10px rgba(0,255,204,0.15)"
                      : "none",
                  }}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  {LucideIcon && <LucideIcon size={13} />}
                  {tab.label}
                  {active && (
                    <span style={{ fontSize: 9 }}>
                      {sortDir === "desc" ? "▼" : "▲"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Rankings content block */}
        {pageTab === "rankings" && (
          <>
            {/* Score formula pill */}
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                background: "rgba(0,255,204,0.05)",
                border: `1px solid ${BORDER}`,
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: 1.5,
              }}
            >
              <span style={{ color: CYAN }}>⚡</span>
              SCORE = (PLOTS × 100) + (FRNTR × 0.01) + (WINS × 50)
            </div>

            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              data-ocid="leaderboard.table"
              style={{
                background: PANEL,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 48px 1fr 70px 110px 60px 90px",
                  borderBottom: `1px solid ${BORDER}`,
                  background: "rgba(0,255,204,0.03)",
                }}
              >
                {/* # rank - not sortable */}
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: TEXT_DIM,
                    textTransform: "uppercase",
                  }}
                >
                  #
                </div>
                {/* Medal */}
                <div style={{ padding: "10px 4px" }} />
                <button
                  type="button"
                  style={colStyle("player")}
                  onClick={() => handleSort("player")}
                >
                  PLAYER{" "}
                  <SortIcon col="player" active={sortKey} dir={sortDir} />
                </button>
                <button
                  type="button"
                  style={{ ...colStyle("plots"), justifyContent: "flex-end" }}
                  onClick={() => handleSort("plots")}
                >
                  PLOTS <SortIcon col="plots" active={sortKey} dir={sortDir} />
                </button>
                <button
                  type="button"
                  style={{ ...colStyle("frntr"), justifyContent: "flex-end" }}
                  onClick={() => handleSort("frntr")}
                >
                  FRNTR <SortIcon col="frntr" active={sortKey} dir={sortDir} />
                </button>
                <button
                  type="button"
                  style={{ ...colStyle("wins"), justifyContent: "flex-end" }}
                  onClick={() => handleSort("wins")}
                >
                  WINS <SortIcon col="wins" active={sortKey} dir={sortDir} />
                </button>
                <button
                  type="button"
                  style={{ ...colStyle("score"), justifyContent: "flex-end" }}
                  onClick={() => handleSort("score")}
                >
                  SCORE <SortIcon col="score" active={sortKey} dir={sortDir} />
                </button>
              </div>

              {/* Rows */}
              {isLoading ? (
                <div
                  data-ocid="leaderboard.loading_state"
                  style={{ padding: 12 }}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                      key={i}
                      className="w-full h-10 mb-2 rounded-md"
                      style={{ background: "rgba(0,255,204,0.06)" }}
                    />
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div
                  data-ocid="leaderboard.empty_state"
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: TEXT_DIM,
                    fontSize: 12,
                    letterSpacing: 2,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                  NO PLAYERS YET — BE THE FIRST TO REGISTER!
                </div>
              ) : (
                <div data-ocid="leaderboard.list">
                  {sorted.map((entry, idx) => {
                    const isTop3 = entry.rank <= 3;
                    const rowBg = entry.isMe
                      ? "rgba(0,255,204,0.08)"
                      : isTop3
                        ? `rgba(0,255,204,${0.04 - idx * 0.01})`
                        : "transparent";
                    const borderColor = entry.isMe
                      ? "rgba(0,255,204,0.25)"
                      : "rgba(0,255,204,0.06)";
                    const rankColor =
                      entry.rank === 1
                        ? GOLD
                        : entry.rank === 2
                          ? "#c0c0c0"
                          : entry.rank === 3
                            ? AMBER
                            : TEXT_DIM;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        data-ocid={`leaderboard.item.${idx + 1}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "42px 48px 1fr 70px 110px 60px 90px",
                          background: rowBg,
                          borderBottom: `1px solid ${borderColor}`,
                          alignItems: "center",
                          transition: "background 0.15s",
                          ...(entry.isMe
                            ? {
                                boxShadow: "inset 2px 0 0 rgba(0,255,204,0.6)",
                              }
                            : {}),
                        }}
                      >
                        {/* Rank number */}
                        <div
                          style={{
                            padding: "11px 12px",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: rankColor,
                          }}
                        >
                          {entry.rank}
                        </div>
                        {/* Medal */}
                        <div style={{ padding: "11px 4px" }}>
                          <RankMedal rank={entry.rank} />
                        </div>
                        {/* Player */}
                        <div
                          style={{
                            padding: "11px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: `oklch(55% 0.2 ${(entry.name.charCodeAt(0) * 23) % 360})`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            {entry.name.slice(0, 1).toUpperCase()}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: entry.isMe ? 800 : 500,
                              color: entry.isMe ? CYAN : TEXT,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              letterSpacing: 0.5,
                            }}
                          >
                            {entry.name}
                            {entry.isMe && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 7,
                                  fontWeight: 700,
                                  color: CYAN,
                                  border: "1px solid rgba(0,255,204,0.4)",
                                  borderRadius: 3,
                                  padding: "1px 4px",
                                  letterSpacing: 1,
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Plots */}
                        <div
                          style={{
                            padding: "11px 12px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: TEXT,
                          }}
                        >
                          {entry.plots}
                        </div>
                        {/* FRNTR */}
                        <div
                          style={{
                            padding: "11px 12px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: entry.isMe ? CYAN : "rgba(0,255,204,0.7)",
                          }}
                        >
                          {entry.frntr.toLocaleString()}
                        </div>
                        {/* Wins */}
                        <div
                          style={{
                            padding: "11px 12px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: "#22c55e",
                          }}
                        >
                          {entry.wins}
                        </div>
                        {/* Score */}
                        <div
                          style={{
                            padding: "11px 12px",
                            textAlign: "right",
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: entry.isMe ? GOLD : AMBER,
                          }}
                        >
                          {entry.score.toLocaleString()}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* YOUR RANK card */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              data-ocid="leaderboard.your_rank_card"
              className="mt-4 flex items-center justify-between rounded-xl px-5 py-4"
              style={{
                background: "rgba(0,255,204,0.06)",
                border: "1px solid rgba(0,255,204,0.25)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center gap-3">
                <Trophy size={16} style={{ color: GOLD }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: TEXT_DIM,
                    textTransform: "uppercase",
                  }}
                >
                  YOUR RANK
                </span>
              </div>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: myRank >= 0 ? CYAN : TEXT_DIM,
                  letterSpacing: 1,
                }}
              >
                {myRank >= 0 ? `#${myRank + 1}` : "UNRANKED"}
              </span>
            </motion.div>

            {/* Auto-refresh indicator */}
            <div
              className="mt-3 flex items-center justify-end gap-2"
              style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: 1.5 }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: CYAN,
                  animation: "pulse 2s infinite",
                  boxShadow: "0 0 6px rgba(0,255,204,0.7)",
                }}
              />
              AUTO-REFRESH EVERY 30S
            </div>
          </>
        )}

        {/* GRAND PRIZES tab */}
        {pageTab === "prizes" && (
          <GrandPrizes
            leaderboardPot={leaderboardPot}
            totalPlotsOwned={totalPlotsOwned}
          />
        )}
      </div>
    </div>
  );
}
