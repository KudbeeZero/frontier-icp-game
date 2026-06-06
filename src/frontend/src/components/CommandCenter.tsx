import { useActor } from "@caffeineai/core-infrastructure";
import {
  CheckCircle,
  Circle,
  Flame,
  Globe,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";
import AuditHistoryPanel from "./AuditHistoryPanel";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const GOLD = "#ffd700";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

import { TIER_DAILY_RATES, TIER_NAMES } from "../constants/tiers";

const _MiniBar = ({
  value,
  max,
  color,
}: { value: number; max: number; color: string }) => (
  <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
    <div
      className="h-full rounded"
      style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

function fmtFrntr(n: number): string {
  if (Number.isNaN(n) || n === undefined) return "0.00000000";
  if (n >= 1_000_000) return n.toFixed(2);
  if (n >= 1_000) return n.toFixed(4);
  return n.toFixed(8);
}

export default function CommandCenter() {
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);
  const plots = useGameStore((s) => s.plots);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);
  const incrementClaimCount = useGameStore((s) => s.incrementClaimCount);
  const addFrntr = useGameStore((s) => s.addFrntr);
  const { actor } = useActor(createActor);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<"tokens" | "missions">("tokens");
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Missions ──────────────────────────────────────────────────────────────
  const MISSIONS_LS_KEY = "frontier_missions_v1";

  type MissionState = { completed: boolean; claimed: boolean };
  type MissionsMap = Record<string, MissionState>;

  const loadMissions = (): MissionsMap => {
    try {
      const raw = localStorage.getItem(MISSIONS_LS_KEY);
      return raw ? (JSON.parse(raw) as MissionsMap) : {};
    } catch {
      return {};
    }
  };

  const saveMissions = useCallback((m: MissionsMap) => {
    try {
      localStorage.setItem(MISSIONS_LS_KEY, JSON.stringify(m));
    } catch {}
  }, []);

  const [missions, setMissions] = useState<MissionsMap>(loadMissions);

  const MISSION_DEFS = useMemo(
    () => [
      {
        id: "first_plot",
        title: "Purchase your first plot",
        desc: "Buy any hex territory on the globe",
        reward: 200,
        check: () => player.plotsOwned.length >= 1,
      },
      {
        id: "tier2_upgrade",
        title: "Upgrade a plot to tier 2",
        desc: "Reach Ion Capacitor tier on any plot",
        reward: 350,
        check: () =>
          Object.values(generatorTiers).some((t) => (t as number) >= 2),
      },
      {
        id: "tier3_upgrade",
        title: "Upgrade a plot to tier 3",
        desc: "Reach Fusion Core tier on any plot",
        reward: 500,
        check: () =>
          Object.values(generatorTiers).some((t) => (t as number) >= 3),
      },
      {
        id: "acc_1000",
        title: "Accumulate 1,000 FRNTR",
        desc: "Hold at least 1,000 FRNTR in your balance",
        reward: 300,
        check: () => player.frntBalance >= 1000,
      },
      {
        id: "acc_5000",
        title: "Accumulate 5,000 FRNTR",
        desc: "Hold at least 5,000 FRNTR in your balance",
        reward: 750,
        check: () => player.frntBalance >= 5000,
      },
      {
        id: "five_plots",
        title: "Own 5 plots",
        desc: "Expand your territory to 5 hex plots",
        reward: 1000,
        check: () => player.plotsOwned.length >= 5,
      },
      {
        id: "claim_10",
        title: "Claim tokens 10 times",
        desc: "Use the Claim All button 10 times",
        reward: 400,
        check: () => (useGameStore.getState().claimCount ?? 0) >= 10,
      },
    ],
    [player.plotsOwned, player.frntBalance, generatorTiers],
  );

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
            // Fire-and-forget canister call; UI already updated optimistically above
            (async () => {
              if (!actor) {
                toast.error("Not connected — mission reward not credited", {
                  duration: 5000,
                });
                return;
              }
              try {
                const result = await actor.completeMission(m.id);
                if (result.__kind__ === "ok") {
                  // result.ok is the new confirmed balance returned by the canister
                  setFrntrBalance(result.ok);
                  toast.success(`Mission complete! +${m.reward} FRNTR`, {
                    duration: 4000,
                  });
                } else {
                  toast.error(`Mission failed: ${result.err}`, {
                    duration: 5000,
                  });
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                toast.error(`Mission error: ${msg}`, { duration: 5000 });
              }
            })();
          }
        }
        if (changed) saveMissions(next);
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [MISSION_DEFS, actor, setFrntrBalance, saveMissions]);

  // ── Per-second accrual ticker ─────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tickPassiveIncome();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const ownedPlotData = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(String(p.id))),
    [plots, player.plotsOwned],
  );

  const totalDailyFrntr = useMemo(() => {
    return ownedPlotData.reduce((sum, plot) => {
      const tier = generatorTiers[String(plot.id)] ?? 0;
      return sum + (TIER_DAILY_RATES[tier as number] ?? 7);
    }, 0);
  }, [ownedPlotData, generatorTiers]);

  const displayBalance = useGameStore(
    (s) => s.confirmedFrntBalance + s.accruedFrntSinceSync,
  );
  const perHourRate = totalDailyFrntr / 24;
  const perMinRate = totalDailyFrntr / 1440;
  const perSecRate = totalDailyFrntr / 86400;
  const displayBurned = totalFRNTRBurned;

  const highestTier = useMemo(() => {
    if (player.plotsOwned.length === 0) return 0;
    return Math.max(
      ...player.plotsOwned.map((id) => (generatorTiers[id] ?? 0) as number),
    );
  }, [player.plotsOwned, generatorTiers]);

  const handleClaimAll = async () => {
    if (!actor || isClaiming || player.plotsOwned.length === 0) return;
    setIsClaiming(true);
    try {
      const res = await actor.claimAllPlots();
      if ("ok" in res) {
        const { amount, plotsClaimed } = (
          res as { ok: { amount: bigint; plotsClaimed: bigint } }
        ).ok;
        const claimed = Number(amount) / 1e8;
        toast.success(
          `Claimed ${fmtFrntr(claimed)} FRNTR from ${Number(plotsClaimed)} plot${
            Number(plotsClaimed) !== 1 ? "s" : ""
          }!`,
          { duration: 4000 },
        );
        incrementClaimCount();
        try {
          const state = await actor.getPlayerState();
          if (state) setFrntrBalance(state.frntBalance);
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

  const plotCount = player.plotsOwned.length;
  const canClaim = plotCount > 0 && !isClaiming && !!actor;

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
      {/* Audit log */}
      <AuditHistoryPanel
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["tokens", "missions"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid={`command.${tab}.tab`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 6,
              background:
                activeTab === tab
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(0,10,20,0.5)",
              border: `1px solid ${activeTab === tab ? `${CYAN}66` : BORDER}`,
              color: activeTab === tab ? CYAN : TEXT_DIM,
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
              textTransform: "uppercase",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${CYAN}`
                  : "1px solid transparent",
            }}
          >
            {tab === "tokens" ? "TOKEN ECONOMY" : "MISSIONS"}
          </button>
        ))}
      </div>

      {activeTab === "tokens" && (
        <>
          {/* FRNTR Balance + Claim All */}
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
                marginBottom: 4,
              }}
            >
              YOUR FRNTR BALANCE
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
                textShadow: `0 0 12px ${CYAN}`,
                marginBottom: 2,
              }}
            >
              {fmtFrntr(displayBalance)}
            </div>
            <div style={{ fontSize: 8, color: CYAN_DIM, marginBottom: 10 }}>
              +{totalDailyFrntr.toFixed(2)} FRNTR/day &nbsp;&middot;&nbsp; +
              {perHourRate.toFixed(4)}/hr &nbsp;&middot;&nbsp; +
              {perSecRate.toFixed(8)}/sec
            </div>
            {/* AUDIT LOG button */}
            <button
              type="button"
              data-ocid="command.audit_button"
              onClick={() => setAuditOpen(true)}
              style={{
                width: "100%",
                padding: "7px 0",
                borderRadius: 6,
                background: "rgba(0,255,204,0.04)",
                border: `1px solid ${BORDER}`,
                color: CYAN_DIM,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
                fontFamily: "monospace",
                marginBottom: 6,
              }}
            >
              🔐 AUDIT LOG
            </button>

            {/* CLAIM ALL button */}
            <button
              type="button"
              data-ocid="command.claim_button"
              onClick={handleClaimAll}
              disabled={!canClaim}
              style={{
                width: "100%",
                padding: "9px 0",
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
                  ? "CLAIM ALL — (no plots owned)"
                  : `CLAIM ALL — ${plotCount} plot${
                      plotCount !== 1 ? "s" : ""
                    } / ${totalDailyFrntr.toFixed(2)} FRNTR/day`}
            </button>
          </div>

          {/* Generation rate breakdown */}
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
                  value: perHourRate.toFixed(4),
                  color: GOLD,
                },
                { label: "PER MIN", value: perMinRate.toFixed(6), color: CYAN },
                {
                  label: "PER SEC",
                  value: perSecRate.toFixed(8),
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

          {/* Stats grid — player-specific only */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                icon: Globe,
                label: "Plots Owned",
                value: plotCount,
                color: CYAN,
                sub: `${totalDailyFrntr.toFixed(2)} FRNTR/day`,
              },
              {
                icon: Flame,
                label: "FRNTR Burned",
                value: fmtFrntr(displayBurned),
                color: "#ef4444",
                sub: "your upgrades",
              },
              {
                icon: TrendingUp,
                label: "Highest Tier",
                value: TIER_NAMES[highestTier] ?? "Outpost",
                color: GOLD,
                sub: `Tier ${highestTier} generator`,
              },
              {
                icon: Zap,
                label: "Accruing Now",
                value: fmtFrntr(accruedFrntSinceSync),
                color: "#a855f7",
                sub: "since last sync",
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
        </>
      )}

      {activeTab === "missions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontSize: 8,
              color: TEXT_DIM,
              letterSpacing: 2,
              marginBottom: 2,
            }}
          >
            ACTIVE MISSIONS
          </div>
          {MISSION_DEFS.map((m) => {
            const state = missions[m.id] ?? {
              completed: false,
              claimed: false,
            };
            const isDone = state.completed;
            return (
              <div
                key={m.id}
                data-ocid={`command.mission.${m.id}`}
                style={{
                  background: isDone
                    ? "rgba(0,255,204,0.07)"
                    : "rgba(0,10,20,0.5)",
                  border: `1px solid ${isDone ? `${CYAN}55` : BORDER}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {isDone ? (
                    <CheckCircle size={16} color={CYAN} />
                  ) : (
                    <Circle size={16} color="rgba(255,255,255,0.25)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDone ? CYAN : TEXT,
                      letterSpacing: 0.5,
                      marginBottom: 3,
                    }}
                  >
                    {m.title}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: TEXT_DIM,
                      letterSpacing: 0.3,
                      marginBottom: 6,
                    }}
                  >
                    {m.desc}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: isDone
                        ? "rgba(255,215,0,0.12)"
                        : "rgba(255,215,0,0.06)",
                      border: "1px solid rgba(255,215,0,0.3)",
                    }}
                  >
                    <Target size={9} color="#ffd700" />
                    <span
                      style={{
                        fontSize: 8,
                        color: "#ffd700",
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      +{m.reward} FRNTR
                    </span>
                  </div>
                  {state.claimed && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 7,
                        color: CYAN_DIM,
                        letterSpacing: 1,
                      }}
                    >
                      CLAIMED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
