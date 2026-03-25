import { useState } from "react";
import {
  COMMANDER_ARCHETYPES,
  type MilitaryBranch,
  type OwnedCommander,
  TIER_COLORS,
  commanderEffectiveAtk,
  commanderEffectiveDef,
  commanderFrntrBonus,
  commanderHasWings,
  getArchetype,
  getCurrentRank,
  getNextRank,
} from "../constants/commanders";
import { useGameStore } from "../store/gameStore";
import LieutenantRankCard from "./LieutenantRankCard";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";

const BRANCH_COLORS: Record<MilitaryBranch, string> = {
  ARMY_INFANTRY: "#22c55e",
  ARMY_RANGER: "#ef4444",
  MARINE: "#3b82f6",
  MILITARY_POLICE: "#f59e0b",
  WARRANT_OFFICER: "#a855f7",
  AIR_FORCE: "#00ffcc",
};

// ─ Archetype card in store ───────────────────────────────────────────────────
function ArchetypeCard({
  archetypeId,
  onSelect,
  ownedCount,
}: {
  archetypeId: MilitaryBranch;
  onSelect: () => void;
  ownedCount: number;
}) {
  const arch = getArchetype(archetypeId)!;
  const color = BRANCH_COLORS[archetypeId];
  const startingRank = arch.rankProgression[0];

  return (
    <button
      type="button"
      data-ocid={`commander.${archetypeId.toLowerCase()}.card`}
      style={{
        background: ownedCount > 0 ? `${color}0a` : "rgba(0,255,204,0.03)",
        border: `1px solid ${ownedCount > 0 ? `${color}55` : BORDER}`,
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onSelect}
    >
      {ownedCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: `${color}33`,
            border: `1px solid ${color}66`,
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 7,
            fontWeight: 700,
            color,
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          {ownedCount}x
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: 8,
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={arch.badgeImage}
            alt={arch.name}
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color,
              fontFamily: "monospace",
              letterSpacing: 1,
              lineHeight: 1.1,
            }}
          >
            {arch.name.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "monospace",
              marginTop: 2,
            }}
          >
            Starting rank: {startingRank?.abbreviation}
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              marginTop: 1,
            }}
          >
            {arch.rankProgression.length} ranks total
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: 8,
          color: color,
          fontFamily: "monospace",
          lineHeight: 1.4,
          background: `${color}08`,
          border: `1px solid ${color}22`,
          borderRadius: 5,
          padding: "5px 7px",
        }}
      >
        {arch.archetypeBonus}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <span
            style={{
              fontSize: 7.5,
              color: "#ef4444",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 3,
              padding: "1px 5px",
              fontFamily: "monospace",
            }}
          >
            ATK{" "}
            {startingRank
              ? Math.round(startingRank.atk * arch.atkMultiplier)
              : 0}
          </span>
          <span
            style={{
              fontSize: 7.5,
              color: "#3b82f6",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 3,
              padding: "1px 5px",
              fontFamily: "monospace",
            }}
          >
            DEF{" "}
            {startingRank
              ? Math.round(startingRank.def * arch.defMultiplier)
              : 0}
          </span>
          <span
            style={{
              fontSize: 7.5,
              color: "#22c55e",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 3,
              padding: "1px 5px",
              fontFamily: "monospace",
            }}
          >
            +{(arch.frntrBonusPct * 100).toFixed(0)}%
          </span>
        </div>
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 800,
            color,
            fontFamily: "monospace",
          }}
        >
          {arch.startingICP} ICP
        </span>
      </div>
      <div
        style={{
          fontSize: 7.5,
          color: CYAN_DIM,
          fontFamily: "monospace",
          letterSpacing: 1,
          textAlign: "center",
        }}
      >
        TAP TO VIEW RANK LADDER →
      </div>
    </button>
  );
}

// ─ Rank Ladder view ────────────────────────────────────────────────────────────
function RankLadderView({
  archetypeId,
  onBack,
  onEnlist,
  canAfford,
}: {
  archetypeId: MilitaryBranch;
  onBack: () => void;
  onEnlist: () => void;
  canAfford: boolean;
}) {
  const arch = getArchetype(archetypeId)!;
  const color = BRANCH_COLORS[archetypeId];

  return (
    <div style={{ padding: "0 12px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          data-ocid="commander.store.button"
          onClick={onBack}
          style={{
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: 5,
            color: CYAN,
            fontSize: 9,
            padding: "5px 10px",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          ← BACK
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color,
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            {arch.name.toUpperCase()}
          </div>
          <div
            style={{ fontSize: 7.5, color: CYAN_DIM, fontFamily: "monospace" }}
          >
            {arch.description}
          </div>
        </div>
        <img
          src={arch.badgeImage}
          alt={arch.name}
          style={{
            width: 36,
            height: 36,
            objectFit: "contain",
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </div>

      {/* Enlist button */}
      <button
        type="button"
        data-ocid="commander.enlist.primary_button"
        onClick={onEnlist}
        disabled={!canAfford}
        style={{
          width: "100%",
          padding: "10px",
          background: canAfford ? `${color}18` : "rgba(255,255,255,0.04)",
          border: `1px solid ${canAfford ? `${color}66` : BORDER}`,
          borderRadius: 7,
          color: canAfford ? color : CYAN_DIM,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 2,
          cursor: canAfford ? "pointer" : "not-allowed",
          fontFamily: "monospace",
          marginBottom: 12,
          transition: "all 0.15s",
        }}
      >
        ENLIST — {arch.startingICP} ICP
        {!canAfford && " (INSUFFICIENT ICP)"}
      </button>

      {/* Rank ladder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {arch.rankProgression.map((rank, i) => (
          <div
            key={rank.id}
            data-ocid={`commander.rank.item.${i + 1}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: rank.hasWings
                ? "rgba(0,255,204,0.06)"
                : "rgba(255,255,255,0.02)",
              border: rank.hasWings
                ? `1px solid ${CYAN}33`
                : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              padding: "7px 10px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: 4,
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${color}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={rank.image}
                alt={rank.name}
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: i === 0 ? color : "rgba(255,255,255,0.8)",
                    fontFamily: "monospace",
                  }}
                >
                  {rank.abbreviation}
                </span>
                <span
                  style={{
                    fontSize: 7.5,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "monospace",
                  }}
                >
                  {rank.name}
                </span>
                {rank.hasWings && (
                  <span style={{ fontSize: 9 }} title="Wings Earned">
                    ✈
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 7,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "monospace",
                }}
              >
                {rank.payGrade}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                <span
                  style={{
                    fontSize: 7.5,
                    color: "#ef4444",
                    fontFamily: "monospace",
                  }}
                >
                  ⚔{rank.atk}
                </span>
                <span
                  style={{
                    fontSize: 7.5,
                    color: "#3b82f6",
                    fontFamily: "monospace",
                  }}
                >
                  🛡{rank.def}
                </span>
              </div>
              {rank.promotionCost > 0 && (
                <span
                  style={{
                    fontSize: 7,
                    color: "#f59e0b",
                    fontFamily: "monospace",
                  }}
                >
                  {rank.promotionCost.toLocaleString()} FRNTR
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─ Owned Commander row ────────────────────────────────────────────────────────
function OwnedCommanderRow({
  commander,
  index,
  frntBalance,
  commanderAssignments,
  plotsOwned,
  onPromote,
  onActivate,
  onAssign,
  onUnassign,
  isActive,
}: {
  commander: OwnedCommander;
  index: number;
  frntBalance: number;
  commanderAssignments: Record<number, string>;
  plotsOwned: number[];
  onPromote: (instanceId: string) => void;
  onActivate: (instanceId: string, atk: number, def: number) => void;
  onAssign: (plotId: number, instanceId: string) => void;
  onUnassign: (plotId: number) => void;
  isActive: boolean;
}) {
  const [expandAssign, setExpandAssign] = useState(false);
  const arch = getArchetype(commander.archetypeId)!;
  const currentRank = getCurrentRank(commander);
  const nextRank = getNextRank(commander);
  const color = BRANCH_COLORS[commander.archetypeId];
  const atk = commanderEffectiveAtk(commander);
  const def = commanderEffectiveDef(commander);
  const frntrBonus = commanderFrntrBonus(commander);
  const hasWings = commanderHasWings(commander);
  const assignedPlot = Object.entries(commanderAssignments).find(
    ([, cid]) => cid === commander.instanceId,
  );
  const canPromote = nextRank && frntBalance >= nextRank.promotionCost;

  if (!currentRank) return null;

  return (
    <div
      data-ocid={`commander.item.${index + 1}`}
      style={{
        background: isActive ? `${color}0e` : "rgba(0,255,204,0.04)",
        border: isActive ? `1px solid ${color}88` : `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: 12,
        boxShadow: isActive ? `0 0 18px ${color}22` : "none",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}
        >
          {/* Archetype badge overlay */}
          <div
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              width: 18,
              height: 18,
              borderRadius: 3,
              background: "rgba(4,12,24,0.9)",
              border: `1px solid ${color}55`,
              zIndex: 2,
              padding: 2,
            }}
          >
            <img
              src={arch.badgeImage}
              alt={arch.name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <img
            src={currentRank.image}
            alt={currentRank.name}
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              filter: `drop-shadow(0 0 6px ${color})`,
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color,
                fontFamily: "monospace",
                letterSpacing: 1,
              }}
            >
              {currentRank.abbreviation}
            </span>
            {hasWings && (
              <span
                style={{ fontSize: 11 }}
                title="Wings Earned — F-16 Eligible"
              >
                ✈
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "monospace",
              marginBottom: 3,
            }}
          >
            {currentRank.name}
          </div>
          <div
            style={{
              fontSize: 7.5,
              color,
              fontFamily: "monospace",
              opacity: 0.7,
              marginBottom: 4,
            }}
          >
            {arch.name}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                fontSize: 7.5,
                color: "#ef4444",
                fontFamily: "monospace",
              }}
            >
              ATK {atk}
            </span>
            <span
              style={{
                fontSize: 7.5,
                color: "#3b82f6",
                fontFamily: "monospace",
              }}
            >
              DEF {def}
            </span>
            <span
              style={{
                fontSize: 7.5,
                color: "#22c55e",
                fontFamily: "monospace",
              }}
            >
              +{(frntrBonus * 100).toFixed(0)}% FRNTR
            </span>
          </div>
          {assignedPlot && (
            <div
              style={{
                fontSize: 7.5,
                color: CYAN_DIM,
                fontFamily: "monospace",
                marginTop: 3,
              }}
            >
              ▸ PLOT #{assignedPlot[0]}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 6 }}>
        {isActive ? (
          <div
            style={{
              flex: 1,
              padding: "6px",
              background: `${color}18`,
              border: `1px solid ${color}66`,
              borderRadius: 5,
              color,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              textAlign: "center",
              fontFamily: "monospace",
            }}
          >
            ✓ ACTIVE
          </div>
        ) : (
          <button
            type="button"
            data-ocid={`commander.item.${index + 1}.button`}
            onClick={() => onActivate(commander.instanceId, atk, def)}
            style={{
              flex: 1,
              padding: "6px",
              background: "transparent",
              border: `1px solid ${color}55`,
              borderRadius: 5,
              color,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            ACTIVATE
          </button>
        )}

        {nextRank ? (
          <button
            type="button"
            data-ocid={`commander.item.${index + 1}.secondary_button`}
            onClick={() => onPromote(commander.instanceId)}
            style={{
              flex: 1,
              padding: "6px",
              background: canPromote
                ? "rgba(245,158,11,0.1)"
                : "rgba(0,0,0,0.2)",
              border: canPromote
                ? "1px solid rgba(245,158,11,0.5)"
                : `1px solid ${BORDER}`,
              borderRadius: 5,
              color: canPromote ? "#f59e0b" : "rgba(0,255,204,0.3)",
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: canPromote ? "pointer" : "not-allowed",
              fontFamily: "monospace",
            }}
          >
            ↑ PROMOTE {nextRank.promotionCost.toLocaleString()} FRNTR
          </button>
        ) : (
          <div
            style={{
              flex: 1,
              padding: "6px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 5,
              color: "#f59e0b",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              textAlign: "center",
              fontFamily: "monospace",
            }}
          >
            ★ MAX RANK
          </div>
        )}
      </div>

      {/* Deploy */}
      {isActive && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setExpandAssign((x) => !x)}
            style={{
              width: "100%",
              padding: "6px",
              background: "transparent",
              border: `1px solid ${CYAN}44`,
              borderRadius: 5,
              color: CYAN,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            DEPLOY TO PLOT {expandAssign ? "▴" : "▾"}
          </button>
          {expandAssign && (
            <div
              style={{
                marginTop: 6,
                background: "rgba(0,255,204,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: "8px 8px",
              }}
            >
              {plotsOwned.length === 0 ? (
                <div
                  style={{
                    fontSize: 8,
                    color: CYAN_DIM,
                    fontFamily: "monospace",
                    textAlign: "center",
                  }}
                >
                  Purchase plots first
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {plotsOwned.map((pid) => {
                    const assigned =
                      commanderAssignments[pid] === commander.instanceId;
                    return (
                      <div
                        key={pid}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            color: assigned ? CYAN : CYAN_DIM,
                            fontFamily: "monospace",
                          }}
                        >
                          PLOT #{pid}
                        </span>
                        {assigned ? (
                          <button
                            type="button"
                            onClick={() => onUnassign(pid)}
                            style={{
                              fontSize: 7.5,
                              color: CYAN,
                              background: `${CYAN}18`,
                              border: `1px solid ${CYAN}66`,
                              borderRadius: 3,
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontFamily: "monospace",
                            }}
                          >
                            ASSIGNED ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAssign(pid, commander.instanceId)}
                            style={{
                              fontSize: 7.5,
                              color: CYAN,
                              background: "transparent",
                              border: `1px solid ${CYAN}66`,
                              borderRadius: 3,
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontFamily: "monospace",
                            }}
                          >
                            ASSIGN
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─ Main CommanderStore ──────────────────────────────────────────────────────────
export default function CommanderStore() {
  const ownedCommanders = useGameStore((s) => s.ownedCommanders);
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);
  const player = useGameStore((s) => s.player);
  const purchaseArchetype = useGameStore((s) => s.purchaseArchetype);
  const promoteCommander = useGameStore((s) => s.promoteCommander);
  const selectCommander = useGameStore((s) => s.selectCommander);
  const assignCommanderToPlot = useGameStore((s) => s.assignCommanderToPlot);
  const removeCommanderFromPlot = useGameStore(
    (s) => s.removeCommanderFromPlot,
  );

  const [flash, setFlash] = useState<string | null>(null);
  const [section, setSection] = useState<"store" | "owned">("store");
  const [selectedArchetype, setSelectedArchetype] =
    useState<MilitaryBranch | null>(null);

  const triggerFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  };

  const handleEnlist = (archetypeId: MilitaryBranch) => {
    const ok = purchaseArchetype(archetypeId);
    if (ok) {
      triggerFlash("COMMANDER ENLISTED");
      setSelectedArchetype(null);
      setSection("owned");
    } else {
      triggerFlash("INSUFFICIENT ICP");
    }
  };

  const handlePromote = (instanceId: string) => {
    const ok = promoteCommander(instanceId);
    if (ok) {
      triggerFlash("PROMOTED!");
    } else {
      triggerFlash("INSUFFICIENT FRNTR");
    }
  };

  const ownedCountByArchetype = COMMANDER_ARCHETYPES.reduce(
    (acc, arch) => {
      acc[arch.id] = ownedCommanders.filter(
        (c) => c.archetypeId === arch.id,
      ).length;
      return acc;
    },
    {} as Record<MilitaryBranch, number>,
  );

  return (
    <div style={{ paddingBottom: 12 }}>
      <style>{`
        @keyframes storeFlash { 0%,100%{opacity:0;transform:translateY(-8px)} 15%,85%{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Flash notification */}
      {flash && (
        <div
          data-ocid="commander.success_state"
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "8px 20px",
            background: flash.includes("INSUFFICIENT")
              ? "rgba(239,68,68,0.15)"
              : "rgba(0,255,204,0.15)",
            border: `1px solid ${flash.includes("INSUFFICIENT") ? "rgba(239,68,68,0.5)" : "rgba(0,255,204,0.5)"}`,
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            color: flash.includes("INSUFFICIENT") ? "#ef4444" : CYAN,
            letterSpacing: 2,
            fontFamily: "monospace",
            backdropFilter: "blur(10px)",
            animation: "storeFlash 2.2s ease forwards",
            whiteSpace: "nowrap",
          }}
        >
          {flash}
        </div>
      )}

      {/* Rank card */}
      <LieutenantRankCard />

      {/* Balance bar */}
      <div
        style={{
          margin: "0 12px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,255,204,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 7.5,
              color: CYAN_DIM,
              letterSpacing: 2,
              fontFamily: "monospace",
              marginBottom: 2,
            }}
          >
            MOCK ICP BALANCE
          </div>
          <div
            data-ocid="commander.panel"
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "#f59e0b",
              fontFamily: "monospace",
              letterSpacing: 1,
              textShadow: "0 0 10px rgba(245,158,11,0.6)",
            }}
          >
            {player.mockIcpBalance.toFixed(3)}
            <span
              style={{
                fontSize: 10,
                marginLeft: 4,
                color: "rgba(245,158,11,0.7)",
              }}
            >
              ICP
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 7.5,
              color: CYAN_DIM,
              letterSpacing: 2,
              fontFamily: "monospace",
              marginBottom: 2,
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
              letterSpacing: 1,
            }}
          >
            {player.frntBalance.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", margin: "0 12px 10px", gap: 4 }}>
        {(["store", "owned"] as const).map((s) => (
          <button
            key={s}
            type="button"
            data-ocid={`commander.${s}.tab`}
            onClick={() => {
              setSection(s);
              setSelectedArchetype(null);
            }}
            style={{
              flex: 1,
              padding: "7px 0",
              background:
                section === s ? "rgba(0,255,204,0.12)" : "rgba(0,255,204,0.03)",
              border: `1px solid ${section === s ? `${CYAN}88` : `${CYAN}22`}`,
              borderRadius: 6,
              color: section === s ? CYAN : CYAN_DIM,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.15s",
            }}
          >
            {s === "store" ? "ENLIST" : `ROSTER (${ownedCommanders.length})`}
          </button>
        ))}
      </div>

      {/* ─ STORE SECTION ───────────────────────────────────────────────────── */}
      {section === "store" && (
        <div>
          {selectedArchetype ? (
            <RankLadderView
              archetypeId={selectedArchetype}
              onBack={() => setSelectedArchetype(null)}
              onEnlist={() => handleEnlist(selectedArchetype)}
              canAfford={
                player.mockIcpBalance >=
                (getArchetype(selectedArchetype)?.startingICP ?? 999)
              }
            />
          ) : (
            <div
              style={{
                padding: "0 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: CYAN_DIM,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                SELECT YOUR ARCHETYPE
              </div>
              {COMMANDER_ARCHETYPES.map((arch) => (
                <ArchetypeCard
                  key={arch.id}
                  archetypeId={arch.id}
                  onSelect={() => setSelectedArchetype(arch.id)}
                  ownedCount={ownedCountByArchetype[arch.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─ OWNED SECTION ───────────────────────────────────────────────────── */}
      {section === "owned" && (
        <div style={{ padding: "0 12px" }}>
          {ownedCommanders.length === 0 ? (
            <div
              data-ocid="commander.empty_state"
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: CYAN_DIM,
                fontFamily: "monospace",
                fontSize: 9,
                letterSpacing: 1.5,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎖️</div>
              NO COMMANDERS IN ROSTER
              <div
                style={{
                  fontSize: 8,
                  color: "rgba(0,255,204,0.2)",
                  marginTop: 6,
                }}
              >
                Visit ENLIST to recruit your first archetype
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ownedCommanders.map((commander, i) => (
                <OwnedCommanderRow
                  key={commander.instanceId}
                  commander={commander}
                  index={i}
                  frntBalance={player.frntBalance}
                  commanderAssignments={commanderAssignments}
                  plotsOwned={player.plotsOwned}
                  onPromote={handlePromote}
                  onActivate={(id, atk, def) => selectCommander(id, atk, def)}
                  onAssign={assignCommanderToPlot}
                  onUnassign={removeCommanderFromPlot}
                  isActive={player.commanderType === commander.instanceId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
