import { useActor } from "@caffeineai/core-infrastructure";
import {
  BarChart3,
  Flame,
  Globe,
  Shield,
  Sword,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { TIER_DAILY_RATES, TIER_NAMES } from "../constants/tiers";
import { useGameStore } from "../store/gameStore";
import AuditHistoryPanel from "./AuditHistoryPanel";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const GOLD = "#ffd700";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const AMBER = "#da913c";
const AMBER_DIM = "rgba(218,145,60,0.45)";
const AMBER_BORDER = "rgba(218,145,60,0.25)";

type ActiveTab = "tokens" | "mining" | "commander";

function fmtFrntr(n: number): string {
  if (Number.isNaN(n) || n === undefined) return "0.00000000";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return n.toFixed(4);
  return n.toFixed(8);
}

function fmtShort(n: number): string {
  if (Number.isNaN(n) || n === undefined) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

// ── Mineral definitions for MINING tab ────────────────────────────────────
const MINERALS = [
  {
    id: "iron",
    name: "Iron",
    emoji: "⛏️",
    color: "#b0c4de",
    desc: "Core structural resource. Powers base construction and defensive fortifications across all terrain biomes.",
  },
  {
    id: "fuel",
    name: "Fuel",
    emoji: "🛢️",
    color: AMBER,
    desc: "Energy currency for missile launches, rapid deployment, and generator boost cycles.",
  },
  {
    id: "crystal",
    name: "Crystal",
    emoji: "💎",
    color: "#7dd3fc",
    desc: "Advanced tech component. Required for Neural Matrix upgrades and precision targeting systems.",
  },
  {
    id: "rare_earth",
    name: "Rare Earth",
    emoji: "🌐",
    color: "#a78bfa",
    desc: "Ultra-rare compound found in Volcanic and Asteroid biomes. Unlocks Apex Nexus tier and exotic weaponry.",
  },
  {
    id: "exotic",
    name: "Exotic Matter",
    emoji: "✨",
    color: "#f0abfc",
    desc: "Phase-shifted material from deep-ocean anomalies. Future: enables dimensional relay structures.",
  },
] as const;

type MissionState = { completed: boolean; claimed: boolean };
type MissionsMap = Record<string, MissionState>;
const MISSIONS_LS_KEY = "frontier_missions_v1";

function loadMissions(): MissionsMap {
  try {
    const raw = localStorage.getItem(MISSIONS_LS_KEY);
    return raw ? (JSON.parse(raw) as MissionsMap) : {};
  } catch {
    return {};
  }
}

export default function CommandCenter() {
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);
  const plots = useGameStore((s) => s.plots);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const claimAllFrntr = useGameStore((s) => s.claimAllFrntr);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const addFrntr = useGameStore((s) => s.addFrntr);
  const claimCount = useGameStore((s) => s.claimCount);
  const { actor } = useActor(createActor);

  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tokens");
  const [auditOpen, setAuditOpen] = useState(false);

  // Live stats from canister — loaded on mount and after claim
  const [liveStats, setLiveStats] = useState<{
    totalFrntrBurned: number;
    globalDailyOutput: number;
    globalUnclaimed: number;
    totalPlots: number;
  } | null>(null);

  const [livePlayerState, setLivePlayerState] = useState<{
    totalDailyRate: number;
    totalUnclaimed: number;
    burnContributed: number;
    confirmedBalance: number;
  } | null>(null);

  // ── Missions state (preserved, runs silently in background) ──────────────
  const [missions, setMissions] = useState<MissionsMap>(loadMissions);

  const saveMissions = useCallback((m: MissionsMap) => {
    try {
      localStorage.setItem(MISSIONS_LS_KEY, JSON.stringify(m));
    } catch {}
  }, []);

  const MISSION_DEFS = useMemo(
    () => [
      {
        id: "first_plot",
        title: "Purchase your first plot",
        reward: 200,
        check: () => player.plotsOwned.length >= 1,
      },
      {
        id: "tier2_upgrade",
        title: "Upgrade a plot to tier 2",
        reward: 350,
        check: () =>
          Object.values(generatorTiers).some((t) => (t as number) >= 2),
      },
      {
        id: "acc_1000",
        title: "Accumulate 1,000 FRNTR",
        reward: 300,
        check: () => player.frntBalance >= 1000,
      },
      {
        id: "five_plots",
        title: "Own 5 plots",
        reward: 1000,
        check: () => player.plotsOwned.length >= 5,
      },
      {
        id: "claim_10",
        title: "Claim tokens 10 times",
        reward: 400,
        check: () => (useGameStore.getState().claimCount ?? 0) >= 10,
      },
    ],
    [player.plotsOwned, player.frntBalance, generatorTiers],
  );

  // Silent mission completion in background
  useEffect(() => {
    const interval = setInterval(() => {
      setMissions((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const m of MISSION_DEFS) {
          const current = next[m.id] ?? { completed: false, claimed: false };
          if (!current.claimed && !current.completed && m.check()) {
            next[m.id] = { completed: true, claimed: false };
            changed = true;
          }
          if (current.completed && !current.claimed) {
            next[m.id] = { completed: true, claimed: true };
            changed = true;
            (async () => {
              if (!actor) return;
              try {
                const result = await actor.completeMission(m.id);
                if (result.__kind__ === "ok") {
                  setFrntrBalance(result.ok);
                  toast.success(`Mission complete! +${m.reward} FRNTR`, {
                    duration: 4000,
                  });
                }
              } catch {}
            })();
          }
        }
        if (changed) saveMissions(next);
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [MISSION_DEFS, actor, setFrntrBalance, saveMissions]);

  // ── Per-second passive income ticker ─────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tickPassiveIncome();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch live stats from canister on mount ───────────────────────────────
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!actor || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const [stats, playerState] = await Promise.all([
          actor.getGameStats(),
          actor.getPlayerState(),
        ]);
        setLiveStats({
          totalFrntrBurned: Number(stats.totalFrntrBurned) / 1e8,
          globalDailyOutput: Number(stats.totalDailyOutput) / 1e8,
          globalUnclaimed: Number(stats.globalUnclaimedTokens) / 1e8,
          totalPlots: Number(stats.totalPlots),
        });
        setLivePlayerState({
          totalDailyRate: Number(playerState.totalDailyRate) / 1e8,
          totalUnclaimed: Number(playerState.totalUnclaimed) / 1e8,
          burnContributed: Number(playerState.burnContributed) / 1e8,
          confirmedBalance: Number(playerState.confirmedBalance) / 1e8,
        });
        // Sync confirmed balance from canister without resetting accrued
        if (playerState.confirmedBalance > 0n) {
          setFrntrBalance(playerState.confirmedBalance);
        }
      } catch {
        // If canister unreachable, keep local state
      }
    })();
  }, [actor, setFrntrBalance]);

  // ── Derived display values ─────────────────────────────────────────────
  const ownedPlotData = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(String(p.id))),
    [plots, player.plotsOwned],
  );

  const totalDailyFrntr = useMemo(() => {
    if (livePlayerState?.totalDailyRate && livePlayerState.totalDailyRate > 0) {
      return livePlayerState.totalDailyRate;
    }
    return ownedPlotData.reduce((sum, plot) => {
      const tier = generatorTiers[String(plot.id)] ?? 0;
      return sum + (TIER_DAILY_RATES[tier as number] ?? 7);
    }, 0);
  }, [ownedPlotData, generatorTiers, livePlayerState]);

  // Displayed balance: confirmed + live accrual ticker. Never reset on sync.
  const displayBalance = confirmedFrntBalance + accruedFrntSinceSync;

  // Unclaimed tokens: use live canister data if available, else local accrued
  const displayUnclaimed =
    livePlayerState?.totalUnclaimed ?? accruedFrntSinceSync;

  // Burn: prefer live canister data
  const displayBurned = livePlayerState?.burnContributed ?? totalFRNTRBurned;

  const perHourRate = totalDailyFrntr / 24;
  const perMinRate = totalDailyFrntr / 1440;
  const perSecRate = totalDailyFrntr / 86400;

  const highestTier = useMemo(() => {
    if (player.plotsOwned.length === 0) return 0;
    return Math.max(
      ...player.plotsOwned.map((id) => (generatorTiers[id] ?? 0) as number),
    );
  }, [player.plotsOwned, generatorTiers]);

  // Tier breakdown for Commander Stats
  const tierCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const id of player.plotsOwned) {
      const tier = (generatorTiers[id] ?? 0) as number;
      counts[tier] = (counts[tier] ?? 0) + 1;
    }
    return counts;
  }, [player.plotsOwned, generatorTiers]);

  const avgEfficiency = useMemo(() => {
    if (ownedPlotData.length === 0) return 0;
    return (
      ownedPlotData.reduce((sum, p) => sum + (p.efficiency ?? 88), 0) /
      ownedPlotData.length
    );
  }, [ownedPlotData]);

  const missionsDone = useMemo(
    () => Object.values(missions).filter((m) => m.completed).length,
    [missions],
  );

  const plotCount = player.plotsOwned.length;
  const canClaim = plotCount > 0 && !isClaiming && !!actor;

  // ── CLAIM ALL handler ─────────────────────────────────────────────────────
  const handleClaimAll = async () => {
    if (!actor || isClaiming || plotCount === 0) return;
    setIsClaiming(true);
    try {
      const res = await actor.claimAllPlots();
      if ("ok" in res) {
        const { amount, plotsClaimed } = (
          res as { ok: { amount: bigint; plotsClaimed: bigint } }
        ).ok;
        const claimed = Number(amount) / 1e8;
        // Atomically move accrued → confirmed, never reset balance
        claimAllFrntr(claimed);
        incrementClaimCount();
        toast.success(
          `Claimed ${fmtShort(claimed)} FRNTR from ${Number(plotsClaimed)} plot${
            Number(plotsClaimed) !== 1 ? "s" : ""
          }!`,
          { duration: 4000 },
        );
        // Refresh confirmed balance from ledger (anti-flicker: only go up)
        try {
          const state = await actor.getPlayerState();
          if (state?.confirmedBalance) {
            setFrntrBalance(state.confirmedBalance);
          } else if (state?.frntBalance) {
            setFrntrBalance(state.frntBalance);
          }
          // Refresh live stats after claim
          const stats = await actor.getGameStats();
          setLiveStats({
            totalFrntrBurned: Number(stats.totalFrntrBurned) / 1e8,
            globalDailyOutput: Number(stats.totalDailyOutput) / 1e8,
            globalUnclaimed: Number(stats.globalUnclaimedTokens) / 1e8,
            totalPlots: Number(stats.totalPlots),
          });
        } catch {
          addFrntr(claimed);
        }
      } else {
        const errMsg = (res as { err: string }).err;
        toast.error(`Claim failed: ${errMsg}`, { duration: 4000 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim failed";
      toast.error(msg, { duration: 4000 });
    } finally {
      setIsClaiming(false);
    }
  };

  // ── TAB definitions ───────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; subLabel?: string }[] = [
    { id: "tokens", label: "TOKEN ECONOMY" },
    { id: "mining", label: "MINING", subLabel: "COMING SOON" },
    { id: "commander", label: "COMMANDER STATS" },
  ];

  return (
    <div
      data-ocid="command.panel"
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Audit log panel */}
      <AuditHistoryPanel
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />

      {/* ── Tab bar ── */}
      <div className="cmd-tab-list" style={{ display: "flex", gap: 4 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isMining = tab.id === "mining";
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`command.${tab.id}.tab`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "6px 4px 5px",
                borderRadius: "6px 6px 0 0",
                background: isActive
                  ? isMining
                    ? "rgba(218,145,60,0.12)"
                    : "rgba(0,255,204,0.12)"
                  : "rgba(0,10,20,0.5)",
                border: `1px solid ${
                  isActive ? (isMining ? `${AMBER}66` : `${CYAN}66`) : BORDER
                }`,
                borderBottom: isActive
                  ? `2px solid ${isMining ? AMBER : CYAN}`
                  : "1px solid transparent",
                color: isActive ? (isMining ? AMBER : CYAN) : TEXT_DIM,
                fontSize: 6.5,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
                textTransform: "uppercase",
                lineHeight: 1.3,
                textShadow: isActive
                  ? `0 0 8px ${isMining ? AMBER : CYAN}66`
                  : "none",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              {tab.subLabel && (
                <div
                  style={{
                    fontSize: 5.5,
                    color: isActive ? AMBER_DIM : "rgba(218,145,60,0.3)",
                    letterSpacing: 1,
                    marginTop: 1,
                  }}
                >
                  {tab.subLabel}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════ TOKEN ECONOMY TAB ══════════════════════════════ */}
      {activeTab === "tokens" && (
        <>
          {/* Balance card */}
          <div
            style={{
              background: "rgba(0,20,40,0.55)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 2,
              }}
            >
              CONFIRMED WALLET BALANCE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
                textShadow: `0 0 12px ${CYAN}`,
                marginBottom: 1,
              }}
            >
              {fmtShort(confirmedFrntBalance)}
              <span style={{ fontSize: 11, marginLeft: 5, opacity: 0.7 }}>
                FRNTR
              </span>
            </div>
            <div style={{ fontSize: 8, color: TEXT_DIM, marginBottom: 6 }}>
              ACCRUING NOW
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#a855f7",
                fontFamily: "monospace",
                marginBottom: 2,
              }}
            >
              +{fmtFrntr(accruedFrntSinceSync)}
              <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>
                FRNTR
              </span>
            </div>
            <div style={{ fontSize: 8, color: CYAN_DIM, marginBottom: 10 }}>
              +{fmtShort(perHourRate)}/hr &nbsp;·&nbsp; +{fmtShort(perMinRate)}
              /min &nbsp;·&nbsp; +{perSecRate.toFixed(6)}/sec
            </div>

            {/* Audit log */}
            <button
              type="button"
              data-ocid="command.audit_button"
              onClick={() => setAuditOpen(true)}
              style={{
                width: "100%",
                padding: "6px 0",
                borderRadius: 6,
                background: "rgba(0,255,204,0.04)",
                border: `1px solid ${BORDER}`,
                color: CYAN_DIM,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
                marginBottom: 6,
              }}
            >
              🔐 AUDIT LOG
            </button>

            {/* CLAIM ALL */}
            <button
              type="button"
              data-ocid="command.claim_button"
              onClick={handleClaimAll}
              disabled={!canClaim}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 6,
                background: canClaim
                  ? "linear-gradient(135deg, rgba(0,255,204,0.18), rgba(0,255,204,0.07))"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${canClaim ? `${CYAN}99` : BORDER}`,
                color: canClaim ? CYAN : "rgba(0,255,204,0.3)",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.5,
                cursor: canClaim ? "pointer" : "not-allowed",
                fontFamily: "monospace",
                textShadow: canClaim ? `0 0 8px ${CYAN}88` : "none",
                transition: "all 0.2s",
              }}
            >
              {isClaiming
                ? "CLAIMING…"
                : plotCount === 0
                  ? "CLAIM ALL — (no plots)"
                  : `CLAIM ALL — ${plotCount} plot${
                      plotCount !== 1 ? "s" : ""
                    } · ${fmtShort(totalDailyFrntr)} FRNTR/day`}
            </button>
          </div>

          {/* Generation rates */}
          <div
            style={{
              background: "rgba(0,20,40,0.40)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              GENERATION RATES
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {[
                {
                  label: "PER HOUR",
                  value: fmtShort(perHourRate),
                  color: GOLD,
                },
                { label: "PER MIN", value: perMinRate.toFixed(4), color: CYAN },
                {
                  label: "PER SEC",
                  value: perSecRate.toFixed(6),
                  color: "#22c55e",
                },
              ].map((r) => (
                <div key={r.label}>
                  <div
                    style={{ fontSize: 7, color: TEXT_DIM, marginBottom: 2 }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: r.color,
                      fontFamily: "monospace",
                    }}
                  >
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                icon: Globe,
                label: "Plots Owned",
                value: String(plotCount),
                color: CYAN,
                sub: `${fmtShort(totalDailyFrntr)} FRNTR/day`,
              },
              {
                icon: Flame,
                label: "FRNTR Burned",
                value: fmtShort(displayBurned),
                color: "#ef4444",
                sub: "your upgrades",
              },
              {
                icon: TrendingUp,
                label: "Highest Tier",
                value: TIER_NAMES[highestTier] ?? "Outpost",
                color: GOLD,
                sub: `Tier ${highestTier}`,
              },
              {
                icon: Zap,
                label: "Unclaimed",
                value: fmtShort(displayUnclaimed),
                color: "#a855f7",
                sub: "across all plots",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(0,10,20,0.5)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  <stat.icon size={11} color={stat.color} />
                  <span
                    style={{ fontSize: 7, color: TEXT_DIM, letterSpacing: 1.5 }}
                  >
                    {stat.label.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: stat.color,
                    fontFamily: "monospace",
                    wordBreak: "break-word",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 7, color: TEXT_DIM, marginTop: 2 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Live global totals from canister */}
          {liveStats && (
            <div
              style={{
                background: "rgba(0,10,20,0.4)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  color: TEXT_DIM,
                  letterSpacing: 2,
                  marginBottom: 6,
                }}
              >
                GLOBAL TOKEN ECONOMY
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {[
                  {
                    label: "TOTAL BURNED",
                    value: fmtShort(liveStats.totalFrntrBurned),
                    color: "#ef4444",
                  },
                  {
                    label: "GLOBAL/DAY",
                    value: fmtShort(liveStats.globalDailyOutput),
                    color: GOLD,
                  },
                  {
                    label: "UNCLAIMED",
                    value: fmtShort(liveStats.globalUnclaimed),
                    color: "#a855f7",
                  },
                  {
                    label: "PLOTS LIVE",
                    value: String(liveStats.totalPlots),
                    color: CYAN,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div
                      style={{
                        fontSize: 6.5,
                        color: TEXT_DIM,
                        letterSpacing: 1.5,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.color,
                        fontFamily: "monospace",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ MINING TAB ══════════════════════════════════════ */}
      {activeTab === "mining" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(218,145,60,0.08), rgba(0,10,20,0.5))",
              border: `1px solid ${AMBER_BORDER}`,
              borderRadius: 10,
              padding: "10px 14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: AMBER,
                letterSpacing: 2,
                marginBottom: 3,
              }}
            >
              ⛰️ MINERAL EXTRACTION SYSTEM
            </div>
            <div style={{ fontSize: 7, color: AMBER_DIM, lineHeight: 1.5 }}>
              Mining operations unlock in a future phase. Acquire plots now to
              pre-position across high-yield biomes.
            </div>
          </div>

          {/* Mineral cards grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {MINERALS.map((mineral) => (
              <div
                key={mineral.id}
                data-ocid={`command.mining.${mineral.id}.card`}
                style={{
                  background: "rgba(10,8,4,0.65)",
                  border: `1px solid ${AMBER_BORDER}`,
                  borderRadius: 10,
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  position: "relative",
                  boxShadow:
                    "0 0 10px rgba(218,145,60,0.08), inset 0 0 8px rgba(218,145,60,0.04)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(218,145,60,0.5)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 0 16px rgba(218,145,60,0.15), inset 0 0 12px rgba(218,145,60,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    AMBER_BORDER;
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 0 10px rgba(218,145,60,0.08), inset 0 0 8px rgba(218,145,60,0.04)";
                }}
              >
                {/* COMING SOON badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    background: "rgba(218,145,60,0.18)",
                    border: `1px solid ${AMBER_BORDER}`,
                    borderRadius: 3,
                    padding: "2px 5px",
                    fontSize: 5.5,
                    color: AMBER,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  SOON
                </div>

                <div style={{ fontSize: 24, lineHeight: 1 }}>
                  {mineral.emoji}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: mineral.color,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {mineral.name}
                </div>
                <div
                  style={{
                    fontSize: 6.5,
                    color: TEXT_DIM,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {mineral.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Future mining section note */}
          <div
            style={{
              background: "rgba(0,10,20,0.4)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "10px 14px",
              textAlign: "center",
            }}
          >
            <BarChart3
              size={16}
              color={AMBER_DIM}
              style={{ margin: "0 auto 6px" }}
            />
            <div style={{ fontSize: 7.5, color: TEXT_DIM, lineHeight: 1.6 }}>
              Mining rates are determined by{" "}
              <span style={{ color: AMBER }}>biome type</span> and{" "}
              <span style={{ color: CYAN }}>generator tier</span>. Own plots
              across diverse biomes to maximize your mineral portfolio when
              extraction goes live.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ COMMANDER STATS TAB ════════════════════════════ */}
      {activeTab === "commander" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Plot tier breakdown */}
          <div
            style={{
              background: "rgba(0,20,40,0.55)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Globe size={12} color={CYAN} />
              <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 2 }}>
                TERRITORY BREAKDOWN
              </span>
            </div>
            {plotCount === 0 ? (
              <div
                style={{
                  fontSize: 8,
                  color: TEXT_DIM,
                  textAlign: "center",
                  padding: "8px 0",
                }}
              >
                No plots owned yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Object.entries(TIER_NAMES).map(([tierStr, name]) => {
                  const tier = Number(tierStr);
                  const count = tierCounts[tier] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={tier}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            tier === 0
                              ? TEXT_DIM
                              : tier <= 2
                                ? CYAN
                                : tier <= 4
                                  ? GOLD
                                  : "#f0abfc",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, fontSize: 8, color: TEXT }}>
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color:
                            tier === 0 ? TEXT_DIM : tier <= 2 ? CYAN : GOLD,
                          fontFamily: "monospace",
                        }}
                      >
                        {count}x
                      </div>
                      <div
                        style={{
                          fontSize: 7,
                          color: TEXT_DIM,
                          fontFamily: "monospace",
                          minWidth: 50,
                          textAlign: "right",
                        }}
                      >
                        {fmtShort(count * (TIER_DAILY_RATES[tier] ?? 7))}/day
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Commander metrics */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                icon: BarChart3,
                label: "AVG EFFICIENCY",
                value: `${avgEfficiency.toFixed(1)}%`,
                color:
                  avgEfficiency >= 90
                    ? "#22c55e"
                    : avgEfficiency >= 75
                      ? GOLD
                      : "#ef4444",
                sub: "fleet average",
              },
              {
                icon: Flame,
                label: "TOTAL BURNED",
                value: fmtShort(displayBurned),
                color: "#ef4444",
                sub: "from upgrades",
              },
              {
                icon: TrendingUp,
                label: "DAILY OUTPUT",
                value: fmtShort(totalDailyFrntr),
                color: CYAN,
                sub: "FRNTR / day",
              },
              {
                icon: Zap,
                label: "TOTAL EARNED",
                value: fmtShort(displayBalance),
                color: GOLD,
                sub: "all-time FRNTR",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(0,10,20,0.5)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  <stat.icon size={11} color={stat.color} />
                  <span
                    style={{ fontSize: 7, color: TEXT_DIM, letterSpacing: 1.5 }}
                  >
                    {stat.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: stat.color,
                    fontFamily: "monospace",
                    wordBreak: "break-word",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 7, color: TEXT_DIM, marginTop: 2 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Conquest metrics */}
          <div
            style={{
              background: "rgba(0,10,20,0.45)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Sword size={11} color={GOLD} />
              <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 2 }}>
                CONQUEST METRICS
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {[
                {
                  label: "MISSIONS",
                  value: String(missionsDone),
                  color: CYAN,
                  sub: "completed",
                },
                {
                  label: "CLAIMS",
                  value: String(claimCount),
                  color: GOLD,
                  sub: "all-time",
                },
                {
                  label: "COMBAT",
                  value: "—",
                  color: TEXT_DIM,
                  sub: "coming soon",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div
                    style={{
                      fontSize: 6.5,
                      color: TEXT_DIM,
                      letterSpacing: 1,
                      marginBottom: 2,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: item.color,
                      fontFamily: "monospace",
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ fontSize: 6.5, color: TEXT_DIM }}>
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Surveys placeholder */}
            <div
              style={{
                marginTop: 10,
                padding: "6px 10px",
                borderRadius: 6,
                background: "rgba(218,145,60,0.05)",
                border: `1px solid ${AMBER_BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Shield size={10} color={AMBER_DIM} />
              <div
                style={{ fontSize: 7, color: AMBER_DIM, letterSpacing: 0.5 }}
              >
                Survey reports, faction wars, and leaderboard rank coming in
                next phases.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
