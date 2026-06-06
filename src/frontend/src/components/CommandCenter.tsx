import { useActor } from "@caffeineai/core-infrastructure";
import {
  CheckCircle,
  Circle,
  Flame,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const MiniBar = ({
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

// Real tier daily rates matching backend
const _TIER_RATES: Record<number, number> = {
  0: 7,
  1: 9,
  2: 12,
  3: 17,
  4: 25,
  5: 37,
  6: 55,
};

const _TIER_COSTS: Record<number, number> = {
  1: 500,
  2: 1500,
  3: 4000,
  4: 10000,
  5: 25000,
  6: 60000,
};

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

  const addFrntr = useGameStore((s) => s.addFrntr);
  const { actor } = useActor(createActor);
  const [isClaiming, setIsClaiming] = useState(false);

  const [activeTab, setActiveTab] = useState<"tokens" | "missions">("tokens");

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
        id: "tier3_upgrade",
        title: "Upgrade a plot to tier 3",
        desc: "Reach Generator tier 3 on any plot",
        reward: 500,
        check: () =>
          Object.values(generatorTiers).some((t) => (t as number) >= 3),
      },
      {
        id: "acc_1000",
        title: "Accumulate 1000 FRNTR",
        desc: "Hold at least 1,000 FRNTR in your balance",
        reward: 300,
        check: () => player.frntBalance >= 1000,
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
            addFrntr(m.reward);
            toast.success(`Mission complete! +${m.reward} FRNTR`, {
              duration: 4000,
            });
            next[m.id] = { completed: true, claimed: true };
            changed = true;
          }
        }
        if (changed) saveMissions(next);
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [MISSION_DEFS, addFrntr, saveMissions]);

  const ownedPlotData = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(String(p.id))),
    [plots, player.plotsOwned],
  );

  const TIER_DAILY: Record<number, number> = {
    0: 7,
    1: 9,
    2: 12,
    3: 17,
    4: 25,
    5: 37,
    6: 55,
  };

  const totalDailyFrntr = useMemo(() => {
    return ownedPlotData.reduce((sum, plot) => {
      const tier = generatorTiers[String(plot.id)] ?? 0;
      return sum + (TIER_DAILY[tier] ?? 7);
    }, 0);
  }, [ownedPlotData, generatorTiers]);

  // ── Per-second accrual ticker ─────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().tickPassiveIncome();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayBalance = useGameStore(
    (s) => s.confirmedFrntBalance + s.accruedFrntSinceSync,
  );
  const perSecRate = totalDailyFrntr / 86400;
  const displayBurned = totalFRNTRBurned;

  const handleClaim = async () => {
    if (!actor || isClaiming || accruedFrntSinceSync < 0.001) return;
    setIsClaiming(true);
    try {
      const res = await actor.claimAccumulatedTokens();
      if ("ok" in res) {
        const claimed = Number((res as { ok: bigint }).ok) / 1e8;
        toast.success(`Claimed ${claimed.toFixed(4)} FRNTR!`, {
          duration: 4000,
        });
        // Refresh balance from canister
        try {
          const state = await actor.getPlayerState();
          if (state) {
            setFrntrBalance(state.frntBalance);
          }
        } catch {
          // fallback: add locally
          addFrntr(accruedFrntSinceSync);
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
          {/* FRNTR Balance */}
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
                marginBottom: 6,
              }}
            >
              FRNTR BALANCE
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
                textShadow: `0 0 12px ${CYAN}`,
                marginBottom: 4,
              }}
            >
              {fmtFrntr(displayBalance)}
            </div>
            <div style={{ fontSize: 9, color: CYAN_DIM, marginBottom: 10 }}>
              +{totalDailyFrntr.toLocaleString()} FRNTR/DAY ·{" "}
              {perSecRate.toFixed(8)} FRNTR/SEC
            </div>
            {/* CLAIM button */}
            <button
              type="button"
              data-ocid="command.claim_button"
              onClick={handleClaim}
              disabled={isClaiming || accruedFrntSinceSync < 0.001 || !actor}
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 6,
                background:
                  accruedFrntSinceSync >= 0.001 && !isClaiming
                    ? "linear-gradient(135deg, rgba(0,255,204,0.18), rgba(0,255,204,0.07))"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  accruedFrntSinceSync >= 0.001 && !isClaiming
                    ? `${CYAN}99`
                    : BORDER
                }`,
                color:
                  accruedFrntSinceSync >= 0.001 && !isClaiming
                    ? CYAN
                    : "rgba(0,255,204,0.3)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 2,
                cursor:
                  accruedFrntSinceSync >= 0.001 && !isClaiming && actor
                    ? "pointer"
                    : "not-allowed",
                fontFamily: "monospace",
                textShadow:
                  accruedFrntSinceSync >= 0.001 ? `0 0 8px ${CYAN}88` : "none",
                transition: "all 0.2s",
              }}
            >
              {isClaiming
                ? "CLAIMING…"
                : accruedFrntSinceSync < 0.001
                  ? "CLAIM (ACCUMULATING…)"
                  : `CLAIM +${fmtFrntr(accruedFrntSinceSync)} FRNTR`}
            </button>
          </div>

          {/* Stats grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                icon: Zap,
                label: "Plots Owned",
                value: player.plotsOwned.length,
                color: CYAN,
                sub: `${totalDailyFrntr} F/day`,
              },
              {
                icon: Flame,
                label: "FRNTR Burned",
                value: fmtFrntr(displayBurned),
                color: "#ef4444",
                sub: "out of circulation",
              },
              {
                icon: TrendingUp,
                label: "Daily Yield",
                value: `${totalDailyFrntr}`,
                color: "#ffd700",
                sub: "FRNTR total",
              },
              {
                icon: Zap,
                label: "Rank Points",
                value: player.plotsOwned.length * 100,
                color: "#a855f7",
                sub: "global score",
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
                    fontSize: 14,
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

          {/* Supply progress */}
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
                marginBottom: 8,
              }}
            >
              TOKEN SUPPLY OVERVIEW
            </div>
            {[
              {
                label: "Pre-Minted",
                value: 5_000_000_000,
                total: 10_000_000_000,
                color: "#ffd700",
              },
              {
                label: "Mineable Left",
                value: 5_000_000_000 - totalFRNTRBurned,
                total: 10_000_000_000,
                color: CYAN,
              },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <span style={{ fontSize: 8, color: TEXT_DIM }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: item.color,
                      fontFamily: "monospace",
                    }}
                  >
                    {(item.value / 1e9).toFixed(2)}B
                  </span>
                </div>
                <MiniBar
                  value={item.value}
                  max={item.total}
                  color={item.color}
                />
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
