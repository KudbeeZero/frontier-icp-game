import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const BORDER = "rgba(0,255,204,0.18)";
const PANEL = "rgba(0,20,40,0.72)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

export type LeaderSortKey = "rank" | "player" | "plots" | "frntr" | "daily";
export type SortDir = "asc" | "desc";

export interface LeaderRow {
  id: string;
  name: string;
  principal: string;
  plots: number;
  frntr: number;
  dailyRate: number; // FRNTR/day estimate
  rank: number;
  isMe: boolean;
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: 14 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: 14 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 14 }}>🥉</span>;
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
}: { col: LeaderSortKey; active: LeaderSortKey; dir: SortDir }) {
  if (col !== active)
    return <span style={{ opacity: 0.2, fontSize: 10 }}>↕</span>;
  return dir === "asc" ? (
    <ChevronUp size={11} style={{ color: CYAN }} />
  ) : (
    <ChevronDown size={11} style={{ color: CYAN }} />
  );
}

function avatarHue(name: string) {
  return (name.charCodeAt(0) * 23) % 360;
}

interface LeaderboardTableProps {
  rows: LeaderRow[];
  isLoading: boolean;
  sortKey: LeaderSortKey;
  sortDir: SortDir;
  onSort: (key: LeaderSortKey) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function LeaderboardTable({
  rows,
  isLoading,
  sortKey,
  sortDir,
  onSort,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: LeaderboardTableProps) {
  const colStyle = (key: LeaderSortKey) => ({
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
    background: "none",
    border: "none",
  });

  // 42px rank, 48px medal, 1fr player, 70px plots, 120px frntr, 90px daily
  const GRID = "42px 48px 1fr 70px 120px 90px";

  return (
    <div>
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
            gridTemplateColumns: GRID,
            borderBottom: `1px solid ${BORDER}`,
            background: "rgba(0,255,204,0.03)",
            overflowX: "auto",
          }}
        >
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
          <div style={{ padding: "10px 4px" }} />
          <button
            type="button"
            style={colStyle("player")}
            onClick={() => onSort("player")}
          >
            PLAYER <SortIcon col="player" active={sortKey} dir={sortDir} />
          </button>
          <button
            type="button"
            style={{ ...colStyle("plots"), justifyContent: "flex-end" }}
            onClick={() => onSort("plots")}
          >
            PLOTS <SortIcon col="plots" active={sortKey} dir={sortDir} />
          </button>
          <button
            type="button"
            style={{ ...colStyle("frntr"), justifyContent: "flex-end" }}
            onClick={() => onSort("frntr")}
          >
            FRNTR <SortIcon col="frntr" active={sortKey} dir={sortDir} />
          </button>
          <button
            type="button"
            style={{ ...colStyle("daily"), justifyContent: "flex-end" }}
            onClick={() => onSort("daily")}
          >
            /DAY <SortIcon col="daily" active={sortKey} dir={sortDir} />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div data-ocid="leaderboard.loading_state" style={{ padding: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                key={i}
                className="w-full h-10 mb-2 rounded-md"
                style={{ background: "rgba(0,255,204,0.06)" }}
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            data-ocid="leaderboard.empty_state"
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: TEXT_DIM,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                color: CYAN,
                marginBottom: 6,
              }}
            >
              NO COMMANDERS ON THE BOARD YET
            </div>
            <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: 1.5 }}>
              Be the first to claim land and secure your rank!
            </div>
          </div>
        ) : (
          <div data-ocid="leaderboard.list" style={{ overflowX: "auto" }}>
            {rows.map((entry, idx) => {
              const isTop3 = entry.rank <= 3;
              const rowBg = entry.isMe
                ? "rgba(0,255,204,0.08)"
                : isTop3
                  ? `rgba(0,255,204,${0.04 - idx * 0.008})`
                  : "transparent";
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
                  transition={{ delay: Math.min(idx * 0.025, 0.5) }}
                  data-ocid={`leaderboard.item.${idx + 1}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: GRID,
                    background: rowBg,
                    borderBottom: "1px solid rgba(0,255,204,0.06)",
                    alignItems: "center",
                    minWidth: 480,
                    ...(entry.isMe
                      ? { boxShadow: "inset 2px 0 0 rgba(0,255,204,0.6)" }
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
                        background: `oklch(55% 0.2 ${avatarHue(entry.name)})`,
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

                  {/* Daily rate */}
                  <div
                    style={{
                      padding: "11px 12px",
                      textAlign: "right",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: AMBER,
                    }}
                  >
                    {entry.dailyRate > 0
                      ? `+${entry.dailyRate.toLocaleString()}`
                      : "—"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Load More */}
      {hasMore && !isLoading && rows.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            data-ocid="leaderboard.load_more_button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            style={{
              background: "rgba(0,255,204,0.07)",
              border: `1px solid ${isLoadingMore ? BORDER : CYAN}`,
              borderRadius: 8,
              color: isLoadingMore ? TEXT_DIM : CYAN,
              padding: "10px 28px",
              cursor: isLoadingMore ? "not-allowed" : "pointer",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              transition: "all 0.15s",
              opacity: isLoadingMore ? 0.6 : 1,
              boxShadow: isLoadingMore
                ? "none"
                : "0 0 12px rgba(0,255,204,0.12)",
            }}
          >
            {isLoadingMore ? "LOADING..." : "LOAD MORE"}
          </button>
        </div>
      )}
    </div>
  );
}
