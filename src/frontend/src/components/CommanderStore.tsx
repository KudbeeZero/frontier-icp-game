import { useState } from "react";
import { COMMANDERS, TIER_COLORS } from "../constants/commanders";
import { useGameStore } from "../store/gameStore";
import LieutenantRankCard from "./LieutenantRankCard";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const UPGRADE_COSTS = [500, 1000, 2500]; // FRNTR for level 1, 2, 3

export default function CommanderStore() {
  const ownedCommanderIds = useGameStore((s) => s.ownedCommanderIds);
  const commanderUpgrades = useGameStore((s) => s.commanderUpgrades);
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);
  const player = useGameStore((s) => s.player);
  const purchaseCommander = useGameStore((s) => s.purchaseCommander);
  const upgradeCommander = useGameStore((s) => s.upgradeCommander);
  const selectCommander = useGameStore((s) => s.selectCommander);
  const assignCommanderToPlot = useGameStore((s) => s.assignCommanderToPlot);
  const removeCommanderFromPlot = useGameStore(
    (s) => s.removeCommanderFromPlot,
  );

  const [flash, setFlash] = useState<string | null>(null);
  const [expandAssign, setExpandAssign] = useState<string | null>(null);
  const [section, setSection] = useState<"owned" | "store">("store");

  const triggerFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  };

  const handleBuy = (commanderId: string) => {
    const ok = purchaseCommander(commanderId);
    if (ok) {
      triggerFlash("COMMANDER ACQUIRED");
    } else {
      const cmd = COMMANDERS.find((c) => c.id === commanderId);
      if (cmd && player.mockIcpBalance < cmd.icpPrice) {
        triggerFlash("INSUFFICIENT ICP");
      } else {
        triggerFlash("ALREADY OWNED");
      }
    }
  };

  const handleUpgrade = (commanderId: string) => {
    const level = commanderUpgrades[commanderId] ?? 0;
    if (level >= 3) return;
    const cost = UPGRADE_COSTS[level];
    const ok = upgradeCommander(commanderId, cost);
    if (ok) {
      triggerFlash(`UPGRADED TO LVL ${level + 1}`);
    } else {
      triggerFlash("INSUFFICIENT FRNTR");
    }
  };

  const ownedCommanders = COMMANDERS.filter((c) =>
    ownedCommanderIds.includes(c.id),
  );

  return (
    <div style={{ paddingBottom: 12 }}>
      <style>{`
        @keyframes storeFlash { 0%,100%{opacity:0;transform:translateY(-8px)} 15%,85%{opacity:1;transform:translateY(0)} }
        @keyframes storePulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
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
            background:
              flash.includes("INSUFFICIENT") || flash.includes("ALREADY")
                ? "rgba(239,68,68,0.15)"
                : "rgba(0,255,204,0.15)",
            border: `1px solid ${
              flash.includes("INSUFFICIENT") || flash.includes("ALREADY")
                ? "rgba(239,68,68,0.5)"
                : "rgba(0,255,204,0.5)"
            }`,
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            color:
              flash.includes("INSUFFICIENT") || flash.includes("ALREADY")
                ? "#ef4444"
                : CYAN,
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

      {/* ICP balance bar */}
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
      <div
        style={{
          display: "flex",
          margin: "0 12px 10px",
          gap: 4,
        }}
      >
        {(["store", "owned"] as const).map((s) => (
          <button
            key={s}
            type="button"
            data-ocid={`commander.${s}.tab`}
            onClick={() => setSection(s)}
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
            {s === "store"
              ? "COMMANDER STORE"
              : `YOUR COMMANDERS (${ownedCommanders.length})`}
          </button>
        ))}
      </div>

      {/* ── STORE SECTION ─────────────────────────────────────────── */}
      {section === "store" && (
        <div style={{ padding: "0 12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {COMMANDERS.map((c, i) => {
              const owned = ownedCommanderIds.includes(c.id);
              const tierColor = TIER_COLORS[c.tier];
              const upgradeLevel = commanderUpgrades[c.id] ?? 0;
              const effectiveAtk = c.atk + upgradeLevel * 5;
              const effectiveDef = c.def + upgradeLevel * 5;

              return (
                <div
                  key={c.id}
                  data-ocid={`commander.item.${i + 1}`}
                  style={{
                    background: owned
                      ? `${tierColor}0c`
                      : "rgba(0,255,204,0.03)",
                    border: owned
                      ? `1px solid ${tierColor}55`
                      : `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    boxShadow: owned ? `0 0 12px ${tierColor}22` : "none",
                  }}
                >
                  {/* Tier corner accent */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 28,
                      height: 28,
                      background: `linear-gradient(225deg, ${tierColor}44, transparent)`,
                      borderBottomLeftRadius: 8,
                    }}
                  />

                  {/* Badge image */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    {owned && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -2,
                          borderRadius: 8,
                          background: `radial-gradient(circle, ${tierColor}18, transparent)`,
                          animation: "storePulse 2s infinite",
                        }}
                      />
                    )}
                    <img
                      src={c.badge}
                      alt={c.name}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "contain",
                        filter: owned
                          ? `drop-shadow(0 0 6px ${tierColor})`
                          : "grayscale(0.4) opacity(0.7)",
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  </div>

                  {/* Name */}
                  <div
                    style={{
                      fontSize: 7.5,
                      fontWeight: 800,
                      color: owned ? tierColor : TEXT,
                      letterSpacing: 0.5,
                      textAlign: "center",
                      fontFamily: "monospace",
                      lineHeight: 1.2,
                    }}
                  >
                    {c.name}
                  </div>

                  {/* Tier pill */}
                  <div
                    style={{
                      fontSize: 6.5,
                      fontWeight: 700,
                      color: tierColor,
                      background: `${tierColor}18`,
                      border: `1px solid ${tierColor}44`,
                      borderRadius: 3,
                      padding: "1px 5px",
                      letterSpacing: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    {c.tier}
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 7.5,
                        color: "#ef4444",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: 3,
                        padding: "1px 4px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      ⚔{effectiveAtk}
                    </span>
                    <span
                      style={{
                        fontSize: 7.5,
                        color: "#3b82f6",
                        background: "rgba(59,130,246,0.1)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        borderRadius: 3,
                        padding: "1px 4px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      🛡{effectiveDef}
                    </span>
                  </div>

                  {/* Price / owned badge */}
                  {owned ? (
                    <div
                      style={{
                        width: "100%",
                        padding: "4px",
                        background: `${tierColor}18`,
                        border: `1px solid ${tierColor}55`,
                        borderRadius: 4,
                        color: tierColor,
                        fontSize: 7.5,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textAlign: "center",
                        fontFamily: "monospace",
                      }}
                    >
                      ✓ OWNED
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-ocid={`commander.item.${i + 1}.button`}
                      onClick={() => handleBuy(c.id)}
                      style={{
                        width: "100%",
                        padding: "5px 4px",
                        background: "transparent",
                        border: `1px solid ${tierColor}55`,
                        borderRadius: 4,
                        color: tierColor,
                        fontSize: 7.5,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        cursor: "pointer",
                        fontFamily: "monospace",
                        transition: "all 0.15s",
                      }}
                    >
                      {c.icpPrice} ICP
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OWNED SECTION ─────────────────────────────────────────── */}
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
              <div style={{ fontSize: 32, marginBottom: 10 }}>⚔️</div>
              NO COMMANDERS IN ROSTER
              <div
                style={{
                  fontSize: 8,
                  color: "rgba(0,255,204,0.2)",
                  marginTop: 6,
                }}
              >
                Visit COMMANDER STORE to recruit
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ownedCommanders.map((c, i) => {
                const tierColor = TIER_COLORS[c.tier];
                const upgradeLevel = commanderUpgrades[c.id] ?? 0;
                const effectiveAtk = c.atk + upgradeLevel * 5;
                const effectiveDef = c.def + upgradeLevel * 5;
                const nextUpgradeCost =
                  upgradeLevel < 3 ? UPGRADE_COSTS[upgradeLevel] : null;
                const assignedPlot = Object.entries(commanderAssignments).find(
                  ([, cid]) => cid === c.id,
                );
                const isActive = player.commanderType === c.id;

                return (
                  <div
                    key={c.id}
                    data-ocid={`commander.item.${i + 1}`}
                    style={{
                      background: isActive
                        ? `${tierColor}0e`
                        : "rgba(0,255,204,0.04)",
                      border: isActive
                        ? `1px solid ${tierColor}88`
                        : `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: 12,
                      boxShadow: isActive ? `0 0 18px ${tierColor}22` : "none",
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
                      <img
                        src={c.badge}
                        alt={c.name}
                        style={{
                          width: 52,
                          height: 52,
                          objectFit: "contain",
                          filter: `drop-shadow(0 0 6px ${tierColor})`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: tierColor,
                              fontFamily: "monospace",
                              letterSpacing: 1,
                            }}
                          >
                            {c.name}
                          </span>
                          <span
                            style={{
                              fontSize: 6.5,
                              fontWeight: 700,
                              color: tierColor,
                              background: `${tierColor}18`,
                              border: `1px solid ${tierColor}44`,
                              borderRadius: 3,
                              padding: "1px 5px",
                              letterSpacing: 1,
                              fontFamily: "monospace",
                            }}
                          >
                            {c.tier}
                          </span>
                          {upgradeLevel > 0 && (
                            <span
                              style={{
                                fontSize: 6.5,
                                color: "#f59e0b",
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              LVL {upgradeLevel}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 8,
                              color: "#ef4444",
                              fontFamily: "monospace",
                            }}
                          >
                            ATK {effectiveAtk}
                          </span>
                          <span
                            style={{
                              fontSize: 8,
                              color: "#3b82f6",
                              fontFamily: "monospace",
                            }}
                          >
                            DEF {effectiveDef}
                          </span>
                          <span
                            style={{
                              fontSize: 8,
                              color: "#22c55e",
                              fontFamily: "monospace",
                            }}
                          >
                            +{(c.rarityBonus * 100).toFixed(0)}% FRNTR
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
                      {/* Activate / Active */}
                      {isActive ? (
                        <div
                          style={{
                            flex: 1,
                            padding: "6px",
                            background: `${tierColor}18`,
                            border: `1px solid ${tierColor}66`,
                            borderRadius: 5,
                            color: tierColor,
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
                          data-ocid={`commander.item.${i + 1}.button`}
                          onClick={() => selectCommander(c.id, c.atk, c.def)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            background: "transparent",
                            border: `1px solid ${tierColor}55`,
                            borderRadius: 5,
                            color: tierColor,
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

                      {/* Upgrade button */}
                      {nextUpgradeCost !== null && (
                        <button
                          type="button"
                          data-ocid={`commander.item.${i + 1}.secondary_button`}
                          onClick={() => handleUpgrade(c.id)}
                          style={{
                            flex: 1,
                            padding: "6px",
                            background:
                              player.frntBalance >= nextUpgradeCost
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(0,0,0,0.2)",
                            border:
                              player.frntBalance >= nextUpgradeCost
                                ? "1px solid rgba(245,158,11,0.5)"
                                : `1px solid ${BORDER}`,
                            borderRadius: 5,
                            color:
                              player.frntBalance >= nextUpgradeCost
                                ? "#f59e0b"
                                : "rgba(0,255,204,0.3)",
                            fontSize: 7.5,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            cursor:
                              player.frntBalance >= nextUpgradeCost
                                ? "pointer"
                                : "not-allowed",
                            fontFamily: "monospace",
                          }}
                        >
                          ↑ {nextUpgradeCost} FRNTR
                        </button>
                      )}
                      {upgradeLevel >= 3 && (
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
                          ★ MAX
                        </div>
                      )}
                    </div>

                    {/* Deploy / Assign to plot */}
                    {isActive && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandAssign(expandAssign === c.id ? null : c.id)
                          }
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
                          DEPLOY TO PLOT {expandAssign === c.id ? "▴" : "▾"}
                        </button>
                        {expandAssign === c.id && (
                          <div
                            style={{
                              marginTop: 6,
                              background: "rgba(0,255,204,0.03)",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 6,
                              padding: "8px 8px",
                            }}
                          >
                            {player.plotsOwned.length === 0 ? (
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
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                {player.plotsOwned.map((pid) => {
                                  const assigned =
                                    commanderAssignments[pid] === c.id;
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
                                          onClick={() =>
                                            removeCommanderFromPlot(pid)
                                          }
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
                                          onClick={() =>
                                            assignCommanderToPlot(pid, c.id)
                                          }
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
