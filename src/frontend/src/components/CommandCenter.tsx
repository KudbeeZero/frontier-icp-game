import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  commanderEffectiveAtk,
  commanderEffectiveDef,
  commanderFrntrBonus,
  getArchetype,
  getCurrentRank,
  getNextRank,
} from "../constants/commanders";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const PURPLE = "#a855f7";
const RED = "#ef4444";
const GREEN = "#22c55e";
const BG_DEEP = "rgba(4,12,24,0.97)";
const PANEL = "rgba(0,20,40,0.85)";
const BORDER = "rgba(0,255,204,0.2)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.55)";

interface CommandCenterProps {
  open: boolean;
  onClose: () => void;
  onOpenCommanderStore?: () => void;
}

// -- Stat Card --
function StatCard({
  label,
  value,
  sub,
  accent,
  ocid,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  ocid?: string;
}) {
  return (
    <div
      data-ocid={ocid}
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "12px 14px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: TEXT_DIM,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          fontFamily: "monospace",
          color: accent ?? CYAN,
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 9,
            color: TEXT_DIM,
            marginTop: 3,
            fontFamily: "monospace",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// -- Section Header --
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 3,
          color: CYAN,
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// -- Commander Profile Strip --
function CommanderStrip({
  onOpenCommanderStore,
}: {
  onOpenCommanderStore?: () => void;
}) {
  const ownedCommanders = useGameStore((s) => s.ownedCommanders);
  const promoteCommander = useGameStore((s) => s.promoteCommander);
  const commander = ownedCommanders[0] ?? null;

  if (!commander) {
    return (
      <div
        data-ocid="command_center.commander.card"
        style={{
          background: PANEL,
          backdropFilter: "blur(12px)",
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          &#128100;
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: CYAN,
              textTransform: "uppercase",
            }}
          >
            No Commander Assigned
          </div>
          <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>
            Assign a Commander NFT to unlock combat buffs
          </div>
        </div>
        <button
          type="button"
          data-ocid="command_center.open_modal_button"
          onClick={onOpenCommanderStore}
          style={{
            background: "rgba(0,255,204,0.1)",
            border: `1px solid ${CYAN}`,
            borderRadius: 6,
            color: CYAN,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            padding: "7px 12px",
            cursor: "pointer",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Visit Store
        </button>
      </div>
    );
  }

  const arch = getArchetype(commander.archetypeId);
  const rankDef = getCurrentRank(commander);
  const nextRankDef = getNextRank(commander);
  const atk = commanderEffectiveAtk(commander);
  const defStat = commanderEffectiveDef(commander);
  const bonus = commanderFrntrBonus(commander);

  return (
    <div
      data-ocid="command_center.commander.card"
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Portrait */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 6,
          background: "rgba(0,255,204,0.08)",
          border: `2px solid ${CYAN}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          flexShrink: 0,
          boxShadow: "0 0 10px rgba(0,255,204,0.3)",
          overflow: "hidden",
        }}
      >
        {arch?.badgeImage ? (
          <img
            src={arch.badgeImage}
            alt={arch.name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span>&#11088;</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: TEXT,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {arch?.name ?? commander.archetypeId}
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: CYAN,
              border: `1px solid ${CYAN}`,
              borderRadius: 3,
              padding: "1px 4px",
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            {rankDef?.payGrade ?? "N/A"}
          </span>
        </div>
        <div
          style={{ fontSize: 9, color: CYAN, letterSpacing: 1, marginTop: 1 }}
        >
          {rankDef?.name ?? "Unknown Rank"} &bull; {rankDef?.abbreviation ?? ""}
        </div>
        {/* ATK / DEF bars */}
        <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: TEXT_DIM,
                marginBottom: 2,
              }}
            >
              <span>ATK</span>
              <span style={{ fontFamily: "monospace", color: TEXT }}>
                {atk}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, atk)}%`,
                  background: RED,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: TEXT_DIM,
                marginBottom: 2,
              }}
            >
              <span>DEF</span>
              <span style={{ fontFamily: "monospace", color: TEXT }}>
                {defStat}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, defStat)}%`,
                  background: CYAN,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bonus + Promote */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: GOLD,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          +{bonus}%
          <br />
          <span style={{ color: TEXT_DIM, fontWeight: 400 }}>FRNTR</span>
        </div>
        {nextRankDef && (
          <button
            type="button"
            data-ocid="command_center.primary_button"
            onClick={() => promoteCommander(commander.instanceId)}
            style={{
              background: "rgba(255,215,0,0.12)",
              border: `1px solid ${GOLD}`,
              borderRadius: 5,
              color: GOLD,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "5px 8px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Promote
          </button>
        )}
      </div>
    </div>
  );
}

// -- FRNTR Accumulation Chart --
function AccumulationChart({
  balance,
  plotCount,
}: { balance: number; plotCount: number }) {
  const data = useMemo(() => {
    const dailyGain = plotCount * 8 + 12;
    return Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const base = Math.max(0, balance - dailyGain * (30 - day));
      const noise = Math.sin(day * 2.5) * dailyGain * 0.15;
      return {
        day: i % 5 === 0 ? `D${day}` : "",
        value: Math.round(base + noise),
      };
    });
  }, [balance, plotCount]);

  return (
    <div
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "12px 10px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: CYAN,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        30-Day Token Accumulation
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CYAN} stopOpacity={0.4} />
              <stop offset="95%" stopColor={CYAN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,204,0.07)" />
          <XAxis
            dataKey="day"
            tick={{ fill: TEXT_DIM, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: TEXT_DIM, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(4,12,24,0.95)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: CYAN,
              fontSize: 10,
            }}
            formatter={(v: number) => [`${v.toLocaleString()} FRNTR`, ""]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CYAN}
            strokeWidth={1.5}
            fill="url(#cyanGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// -- Resource Holdings Bar Chart --
function ResourceChart({
  iron,
  fuel,
  crystal,
  rareEarth,
}: {
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number;
}) {
  const data = useMemo(
    () => [
      { name: "IRON", value: iron, color: "#94a3b8" },
      { name: "FUEL", value: fuel, color: AMBER },
      { name: "XTAL", value: crystal, color: CYAN },
      { name: "RARE", value: rareEarth, color: PURPLE },
    ],
    [iron, fuel, crystal, rareEarth],
  );

  return (
    <div
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "12px 10px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: CYAN,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Current Resource Holdings
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,255,204,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: TEXT_DIM, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: TEXT_DIM, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(4,12,24,0.95)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: TEXT,
              fontSize: 10,
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// -- Mining Operations Table --
function MiningTable() {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);

  const ownedPlots = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(p.id)).slice(0, 5),
    [plots, player.plotsOwned],
  );

  if (ownedPlots.length === 0) {
    return (
      <div
        data-ocid="command_center.empty_state"
        style={{
          background: PANEL,
          backdropFilter: "blur(12px)",
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: "16px",
          textAlign: "center",
          color: TEXT_DIM,
          fontSize: 11,
        }}
      >
        No plots owned. Acquire territory on the globe to begin mining.
      </div>
    );
  }

  const effColor = (e: number) => (e >= 80 ? GREEN : e >= 60 ? AMBER : RED);

  return (
    <div
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr 60px 60px 1fr",
          gap: 4,
          padding: "8px 10px",
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: TEXT_DIM,
          textTransform: "uppercase",
        }}
      >
        <span>Plot</span>
        <span>Biome</span>
        <span>Eff%</span>
        <span>Mines</span>
        <span>Est. Daily</span>
      </div>
      {/* Rows */}
      <div style={{ maxHeight: 140, overflowY: "auto" }}>
        {ownedPlots.map((plot, idx) => {
          const dailyYield = (
            (plot.iron + plot.fuel + plot.crystal + plot.rareEarth) *
            (plot.efficiency / 100) *
            30
          ).toFixed(1);
          return (
            <div
              key={plot.id}
              data-ocid={`command_center.mining.item.${idx + 1}`}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 60px 60px 1fr",
                gap: 4,
                padding: "7px 10px",
                borderBottom: "1px solid rgba(0,255,204,0.06)",
                fontSize: 10,
                fontFamily: "monospace",
                color: TEXT,
                alignItems: "center",
              }}
            >
              <span style={{ color: CYAN, fontSize: 9 }}>#{plot.id}</span>
              <span style={{ fontSize: 9, color: TEXT_DIM }}>{plot.biome}</span>
              <span
                style={{ color: effColor(plot.efficiency), fontWeight: 700 }}
              >
                {plot.efficiency}%
              </span>
              <span style={{ color: TEXT_DIM }}>{plot.mineCount}</span>
              <span style={{ color: GOLD, fontSize: 9 }}>
                {dailyYield} /day
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Combat Stats Row --
function CombatStatsRow() {
  const rankStats = useGameStore((s) => s.rankStats);
  const winRate =
    rankStats.missionsLaunched > 0
      ? ((rankStats.combatWins / rankStats.missionsLaunched) * 100).toFixed(1)
      : "0.0";
  const winRateNum = Number.parseFloat(winRate);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <StatCard
        label="Missions"
        value={rankStats.missionsLaunched}
        sub="LAUNCHED"
        accent={CYAN}
        ocid="command_center.missions.card"
      />
      <StatCard
        label="Combat Wins"
        value={rankStats.combatWins}
        sub="CONFIRMED"
        accent={GREEN}
        ocid="command_center.wins.card"
      />
      <StatCard
        label="Win Rate"
        value={`${winRate}%`}
        sub="OVERALL"
        accent={winRateNum >= 50 ? GREEN : AMBER}
        ocid="command_center.winrate.card"
      />
    </div>
  );
}

// -- Leaderboard Snapshot --
function LeaderboardSnapshot() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const top5 = leaderboard.slice(0, 5);

  return (
    <div
      style={{
        background: PANEL,
        backdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 50px 70px 50px",
          gap: 4,
          padding: "8px 10px",
          borderBottom: `1px solid ${BORDER}`,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: TEXT_DIM,
          textTransform: "uppercase",
        }}
      >
        <span>#</span>
        <span>Commander</span>
        <span>Plots</span>
        <span>FRNTR</span>
        <span>Wins</span>
      </div>
      {top5.map((entry, idx) => {
        const rankColor =
          idx === 0
            ? GOLD
            : idx === 1
              ? "#c0c0c0"
              : idx === 2
                ? AMBER
                : TEXT_DIM;
        return (
          <div
            key={entry.rank}
            data-ocid={`command_center.leaderboard.item.${idx + 1}`}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 50px 70px 50px",
              gap: 4,
              padding: "7px 10px",
              borderBottom: "1px solid rgba(0,255,204,0.06)",
              fontSize: 10,
              fontFamily: "monospace",
              color: TEXT,
              alignItems: "center",
            }}
          >
            <span style={{ color: rankColor, fontWeight: 700 }}>
              {entry.rank}
            </span>
            <span
              style={{
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.name}
            </span>
            <span style={{ color: TEXT_DIM }}>{entry.plotsOwned}</span>
            <span style={{ color: CYAN }}>
              {entry.frntEarned.toLocaleString()}
            </span>
            <span style={{ color: GREEN }}>{entry.victories}</span>
          </div>
        );
      })}
    </div>
  );
}

// -- Main CommandCenter --
export default function CommandCenter({
  open,
  onClose,
  onOpenCommanderStore,
}: CommandCenterProps) {
  const player = useGameStore((s) => s.player);
  const rankStats = useGameStore((s) => s.rankStats);

  const frnt = player.frntBalance;
  const plotCount = player.plotsOwned.length;

  const burnRate = rankStats.missionsLaunched * 15 + plotCount * 5;
  const tokensMined = Math.round(
    player.iron * 1 +
      player.fuel * 1.2 +
      player.crystal * 2 +
      player.rareEarth * 5,
  );
  const netFlow = tokensMined - burnRate;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      data-ocid="command_center.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: BG_DEEP,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(4,12,24,0.98)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>&#128752;</span>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 3,
                color: CYAN,
                textTransform: "uppercase",
              }}
            >
              Commander Dashboard
            </div>
            <div style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
              FRONTIER &middot; MISSILE HORIZON
            </div>
          </div>
        </div>
        <button
          type="button"
          data-ocid="command_center.close_button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid rgba(0,255,204,0.2)",
            borderRadius: 6,
            color: TEXT_DIM,
            fontSize: 16,
            width: 32,
            height: 32,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &#215;
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* 1. Commander Profile */}
        <CommanderStrip onOpenCommanderStore={onOpenCommanderStore} />

        {/* 2. Token Economy Cards */}
        <div>
          <SectionHeader title="Token Economy" icon="&#128160;" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatCard
              label="FRNTR Balance"
              value={frnt.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              sub="FRONTIER TOKENS"
              accent={CYAN}
              ocid="command_center.frntr.card"
            />
            <StatCard
              label="Est. Burn/Day"
              value={burnRate}
              sub="FRNTR/DAY"
              accent={RED}
              ocid="command_center.burn.card"
            />
            <StatCard
              label="Tokens Mined"
              value={tokensMined.toLocaleString()}
              sub="FRNTR-EQ"
              accent={GOLD}
              ocid="command_center.mined.card"
            />
            <StatCard
              label="Net Flow"
              value={(netFlow >= 0 ? "+" : "") + netFlow.toLocaleString()}
              sub={netFlow >= 0 ? "POSITIVE" : "NEGATIVE"}
              accent={netFlow >= 0 ? GREEN : RED}
              ocid="command_center.netflow.card"
            />
          </div>
        </div>

        {/* 3. Charts */}
        <div>
          <SectionHeader title="Analytics" icon="&#128202;" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AccumulationChart balance={frnt} plotCount={plotCount} />
            <ResourceChart
              iron={player.iron}
              fuel={player.fuel}
              crystal={player.crystal}
              rareEarth={player.rareEarth}
            />
          </div>
        </div>

        {/* 4. Mining Operations */}
        <div>
          <SectionHeader title="Mining Operations" icon="&#9935;" />
          <MiningTable />
        </div>

        {/* 5. Combat Stats */}
        <div>
          <SectionHeader title="Combat Record" icon="&#127919;" />
          <CombatStatsRow />
        </div>

        {/* 6. Leaderboard */}
        <div>
          <SectionHeader title="Leaderboard" icon="&#127942;" />
          <LeaderboardSnapshot />
        </div>
      </div>
    </motion.div>
  );
}
