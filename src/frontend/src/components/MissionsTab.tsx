import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Mission, MissionRequirementKind } from "../backend";
import { ActionConfirmModal } from "../components/ActionConfirmModal";
import { PostActionToast } from "../components/PostActionToast";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

interface PlayerMission {
  mission: Mission;
  completed: boolean;
}

function getMissionProgress(
  req: MissionRequirementKind,
  plotsOwned: string[],
  generatorTiers: Record<string, number>,
  frntBalance: number,
  claimCount: number,
): { current: number; target: number; label: string } {
  if (req.__kind__ === "purchasePlots") {
    return {
      current: plotsOwned.length,
      target: Number(req.purchasePlots),
      label: `${plotsOwned.length} / ${req.purchasePlots} plots owned`,
    };
  }
  if (req.__kind__ === "upgradeToTier") {
    const maxTier =
      plotsOwned.length === 0
        ? 0
        : Math.max(
            ...plotsOwned.map((id) => (generatorTiers[id] ?? 0) as number),
          );
    return {
      current: maxTier,
      target: Number(req.upgradeToTier),
      label: `Highest tier: ${maxTier} / ${req.upgradeToTier}`,
    };
  }
  if (req.__kind__ === "holdFRNTR") {
    const target = Number(req.holdFRNTR) / 1e8;
    return {
      current: frntBalance,
      target,
      label: `${frntBalance.toFixed(2)} / ${target.toFixed(2)} FRNTR`,
    };
  }
  if (req.__kind__ === "claimTokens") {
    return {
      current: claimCount,
      target: Number(req.claimTokens),
      label: `${claimCount} / ${req.claimTokens} claims made`,
    };
  }
  if (req.__kind__ === "surveyPlot") {
    return { current: 0, target: 1, label: "Survey any owned plot" };
  }
  if (req.__kind__ === "reachLeaderboardTop") {
    return {
      current: 0,
      target: Number(req.reachLeaderboardTop),
      label: `Reach leaderboard top ${req.reachLeaderboardTop}`,
    };
  }
  return { current: 0, target: 1, label: "Check requirements on-chain" };
}

function isMissionMet(
  req: MissionRequirementKind,
  plotsOwned: string[],
  generatorTiers: Record<string, number>,
  frntBalance: number,
  claimCount: number,
): boolean {
  const prog = getMissionProgress(
    req,
    plotsOwned,
    generatorTiers,
    frntBalance,
    claimCount,
  );
  return prog.current >= prog.target;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div
      style={{
        height: 3,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background:
            pct >= 100
              ? `linear-gradient(90deg, ${CYAN}, #22c55e)`
              : `linear-gradient(90deg, ${CYAN}, rgba(0,255,204,0.4))`,
          borderRadius: 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

const COMING_SOON_MISSIONS = [
  {
    id: "cs_resource_pioneer",
    title: "Resource Pioneer",
    description: "Mine your first mineral deposit from a plot you own.",
    rewardE8s: 500_000_000n,
    icon: "⛏️",
  },
  {
    id: "cs_combat_ready",
    title: "Combat Ready",
    description:
      "Engage in your first territorial dispute and emerge victorious.",
    rewardE8s: 1_000_000_000n,
    icon: "⚔️",
  },
  {
    id: "cs_alliance_builder",
    title: "Alliance Builder",
    description: "Join or create a faction with at least 3 other players.",
    rewardE8s: 2_000_000_000n,
    icon: "🤝",
  },
];

export default function MissionsTab() {
  const { actor } = useActor(createActor);
  const { isAuthenticated } = useInternetIdentity();

  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const setFrntrBalance = useGameStore((s) => s.setFrntrBalance);

  const frntBalance = confirmedFrntBalance + accruedFrntSinceSync;
  const plotsOwned = player.plotsOwned;
  // claimCount: use totalFRNTRBurned as proxy until we have a dedicated counter
  const claimCount = useGameStore((s) => (s.totalFRNTRBurned > 0 ? 1 : 0));

  const [playerMissions, setPlayerMissions] = useState<PlayerMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missionConfirmOpen, setMissionConfirmOpen] = useState(false);
  const [pendingMissionId, setPendingMissionId] = useState<string | null>(null);
  const [pendingReward, setPendingReward] = useState<bigint>(0n);
  const [postMissionType, setPostMissionType] = useState<string | null>(null);

  const loadMissions = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await actor.getPlayerMissions();
      setPlayerMissions(result);
    } catch (e) {
      setError("Failed to load missions. Please try again.");
      console.error("MissionsTab load error:", e);
    } finally {
      setLoading(false);
    }
  }, [actor, isAuthenticated]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const handleClaim = (missionId: string, rewardE8s: bigint) => {
    setPendingMissionId(missionId);
    setPendingReward(rewardE8s);
    setMissionConfirmOpen(true);
  };

  const handleConfirmMission = async () => {
    setMissionConfirmOpen(false);
    if (pendingMissionId !== null)
      await executeClaimMission(pendingMissionId, pendingReward);
  };

  const handleCancelMission = () => {
    (async () => {
      try {
        await actor?.logCancelledAction(
          "completeMission",
          pendingMissionId,
          null,
          "User cancelled mission completion",
        );
      } catch {}
    })();
    setMissionConfirmOpen(false);
  };

  async function executeClaimMission(missionId: string, rewardE8s: bigint) {
    if (!actor) {
      toast.error("Not connected to canister");
      return;
    }
    setClaiming(missionId);
    try {
      const res = await actor.completeMission(missionId);
      if ("ok" in res) {
        const rewardFrntr = Number(res.ok) / 1e8;
        setPostMissionType("mission");
        toast.success(
          `Mission complete! +${rewardFrntr.toFixed(2)} FRNTR minted to your wallet`,
          {
            duration: 5000,
          },
        );
        // Refresh FRNTR balance from ledger
        const rewardAmount = Number(rewardE8s);
        setFrntrBalance(
          BigInt(Math.round(confirmedFrntBalance * 1e8 + rewardAmount)),
        );
        // Reload mission list
        await loadMissions();
      } else {
        toast.error(res.err || "Failed to claim reward", { duration: 5000 });
      }
    } catch (e) {
      toast.error("Claim failed. Please try again.");
      console.error("MissionsTab claim error:", e);
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div
      data-ocid="missions.panel"
      style={{
        padding: "14px 14px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 3,
            color: CYAN,
            textTransform: "uppercase" as const,
            textShadow: `0 0 8px ${CYAN}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{ width: 2, height: 12, background: CYAN, borderRadius: 1 }}
          />
          ACTIVE MISSIONS
        </div>
        <button
          type="button"
          data-ocid="missions.refresh_button"
          onClick={loadMissions}
          disabled={loading}
          style={{
            fontSize: 8,
            color: loading ? TEXT_DIM : CYAN,
            background: "transparent",
            border: `1px solid ${loading ? "rgba(0,255,204,0.1)" : BORDER}`,
            borderRadius: 4,
            padding: "3px 8px",
            cursor: loading ? "default" : "pointer",
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          {loading ? "LOADING..." : "REFRESH"}
        </button>
      </div>

      {/* Not connected state */}
      {!isAuthenticated && (
        <div
          data-ocid="missions.auth_required"
          style={{
            textAlign: "center",
            padding: "32px 16px",
            background: "rgba(0,20,40,0.55)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            color: TEXT_DIM,
            fontSize: 10,
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 8 }}>🔐</div>
          Connect your wallet to view missions
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          data-ocid="missions.error_state"
          style={{
            padding: "10px 12px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            fontSize: 9,
            color: "rgba(252,165,165,0.9)",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && playerMissions.length === 0 && (
        <div
          data-ocid="missions.loading_state"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 80,
                background: "rgba(0,255,204,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Mission cards */}
      {!loading && isAuthenticated && playerMissions.length === 0 && !error && (
        <div
          data-ocid="missions.empty_state"
          style={{
            textAlign: "center",
            padding: "32px 16px",
            color: TEXT_DIM,
            fontSize: 10,
          }}
        >
          No missions available. Check back after connecting.
        </div>
      )}

      {playerMissions.map(({ mission, completed }, idx) => {
        const rewardFrntr = Number(mission.rewardE8s) / 1e8;
        const isClaiming = claiming === mission.id;
        const met = isMissionMet(
          mission.requirement,
          plotsOwned,
          generatorTiers as Record<string, number>,
          frntBalance,
          claimCount,
        );
        const prog = getMissionProgress(
          mission.requirement,
          plotsOwned,
          generatorTiers as Record<string, number>,
          frntBalance,
          claimCount,
        );

        return (
          <div
            key={mission.id}
            data-ocid={`missions.item.${idx + 1}`}
            style={{
              background: completed
                ? "rgba(34,197,94,0.04)"
                : met
                  ? "rgba(0,255,204,0.06)"
                  : "rgba(0,20,40,0.55)",
              border: `1px solid ${
                completed
                  ? "rgba(34,197,94,0.3)"
                  : met
                    ? BORDER
                    : "rgba(0,255,204,0.12)"
              }`,
              borderTop: `2px solid ${
                completed ? "#22c55e" : met ? CYAN : "rgba(0,255,204,0.2)"
              }`,
              borderRadius: 10,
              padding: "12px 14px",
              position: "relative" as const,
              overflow: "hidden",
            }}
          >
            {/* Scanlines for active missions */}
            {!completed && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
                }}
              />
            )}

            <div style={{ position: "relative" }}>
              {/* Title row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: completed ? "#22c55e" : TEXT,
                    letterSpacing: 0.5,
                  }}
                >
                  {mission.title}
                </div>
                {/* Status badge */}
                {completed ? (
                  <span
                    data-ocid={`missions.status.${idx + 1}`}
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: "#22c55e",
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      flexShrink: 0,
                    }}
                  >
                    ✓ COMPLETE
                  </span>
                ) : met ? (
                  <span
                    data-ocid={`missions.status.${idx + 1}`}
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: GOLD,
                      background: "rgba(255,215,0,0.1)",
                      border: "1px solid rgba(255,215,0,0.3)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      flexShrink: 0,
                    }}
                  >
                    CLAIM READY
                  </span>
                ) : (
                  <span
                    data-ocid={`missions.status.${idx + 1}`}
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: CYAN,
                      background: "rgba(0,255,204,0.06)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      flexShrink: 0,
                    }}
                  >
                    IN PROGRESS
                  </span>
                )}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 9,
                  color: TEXT_DIM,
                  lineHeight: 1.6,
                  margin: "0 0 8px",
                }}
              >
                {mission.description}
              </p>

              {/* Progress */}
              {!completed && (
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 0.5 }}
                  >
                    {prog.label}
                  </div>
                  <ProgressBar current={prog.current} target={prog.target} />
                </div>
              )}

              {/* Reward + Action row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 10, color: GOLD }}>⬡</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: GOLD,
                      fontFamily: "monospace",
                    }}
                  >
                    +
                    {rewardFrntr >= 1000
                      ? rewardFrntr.toFixed(0)
                      : rewardFrntr.toFixed(2)}{" "}
                    FRNTR
                  </span>
                  <span
                    style={{
                      fontSize: 7,
                      color: TEXT_DIM,
                      letterSpacing: 0.5,
                    }}
                  >
                    REWARD
                  </span>
                </div>

                {!completed && met && (
                  <button
                    type="button"
                    data-ocid={`missions.claim_button.${idx + 1}`}
                    onClick={() => handleClaim(mission.id, mission.rewardE8s)}
                    disabled={isClaiming}
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: isClaiming ? TEXT_DIM : "#020a12",
                      background: isClaiming ? "rgba(255,215,0,0.08)" : GOLD,
                      border: `1px solid ${GOLD}`,
                      borderRadius: 5,
                      padding: "5px 12px",
                      cursor: isClaiming ? "default" : "pointer",
                      textTransform: "uppercase" as const,
                      transition: "all 0.15s",
                    }}
                  >
                    {isClaiming ? "CLAIMING..." : "CLAIM REWARD"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Coming Soon missions */}
      {playerMissions.length > 0 && (
        <>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 3,
              color: TEXT_DIM,
              textTransform: "uppercase" as const,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 2,
                height: 12,
                background: TEXT_DIM,
                borderRadius: 1,
              }}
            />
            UPCOMING MISSIONS
          </div>
          {COMING_SOON_MISSIONS.map((cs, idx) => (
            <div
              key={cs.id}
              data-ocid={`missions.coming_soon.${idx + 1}`}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px 14px",
                opacity: 0.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 900,
                    color: "rgba(224,244,255,0.5)",
                  }}
                >
                  <span>{cs.icon}</span>
                  {cs.title}
                </div>
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: "rgba(167,139,250,0.7)",
                    background: "rgba(167,139,250,0.08)",
                    border: "1px solid rgba(167,139,250,0.2)",
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  COMING SOON
                </span>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(224,244,255,0.3)",
                  lineHeight: 1.6,
                  margin: "0 0 6px",
                }}
              >
                {cs.description}
              </p>
              <div
                style={{
                  fontSize: 8,
                  color: "rgba(255,215,0,0.3)",
                  fontFamily: "monospace",
                }}
              >
                +{(Number(cs.rewardE8s) / 1e8).toFixed(0)} FRNTR REWARD
              </div>
            </div>
          ))}
        </>
      )}
      <ActionConfirmModal
        isOpen={missionConfirmOpen}
        onConfirm={handleConfirmMission}
        onCancel={handleCancelMission}
        title="Complete Mission"
        actionType="mission"
        details={[
          {
            label: "Reward",
            value: `${(Number(pendingReward) / 1e8).toFixed(2)} FRNTR`,
          },
        ]}
        warningText="Mission completion is permanent and cannot be undone."
      />
      {postMissionType !== null && (
        <PostActionToast
          actionType={postMissionType}
          message="Mission completed! Reward sent to your wallet."
          onNavigate={(tab) =>
            window.dispatchEvent(
              new CustomEvent("navigate-tab", { detail: tab }),
            )
          }
          onClose={() => setPostMissionType(null)}
        />
      )}
    </div>
  );
}
