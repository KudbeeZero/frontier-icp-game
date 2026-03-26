import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  GitCompare,
  Shield,
  Swords,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { BattleFormation, PlotData, SubParcel } from "../store/gameStore";
import {
  BIOME_COLORS,
  getPlotCombatStats,
  useGameStore,
} from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.18)";
const GLASS_BG = "rgba(5, 20, 30, 0.55)";

const FORMATION_DESCRIPTIONS: Record<BattleFormation, string> = {
  SWARM: "+20% hit chance, ×0.7 damage — overwhelm with volume",
  PRECISION_STRIKE: "-10% hit chance, ×1.5 damage — one devastating blow",
  SUPPRESSION: "+5% hit, bypasses 50% DEF — sustained pressure",
  STEALTH: "Bypasses 50% interceptors — ghost approach",
};

function StatChip({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${color}44`,
        borderRadius: 6,
        padding: "5px 10px",
        flex: 1,
      }}
    >
      {icon}
      <div>
        <div
          style={{
            fontSize: 7,
            color: CYAN_DIM,
            letterSpacing: 1,
            fontFamily: "monospace",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color,
            fontFamily: "monospace",
          }}
        >
          {Math.round(value)}
        </div>
      </div>
    </div>
  );
}

export default function TacticalCommandPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const targetPlotId = useGameStore((s) => s.targetPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const combatLog = useGameStore((s) => s.combatLog);
  const resolveBattle = useGameStore((s) => s.resolveBattle);
  const repairPlot = useGameStore((s) => s.repairPlot);
  const setCompareModeActive = useGameStore((s) => s.setCompareModeActive);
  const equippedMissileId = useGameStore((s) => s.equippedMissileId);

  const [selectedFormation, setSelectedFormation] =
    useState<BattleFormation>("PRECISION_STRIKE");
  const [isFiring, setIsFiring] = useState(false);
  const [fireResult, setFireResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (selectedPlotId === null) return null;

  const plot = plots.find((p) => p.id === selectedPlotId);
  if (!plot) return null;

  const subParcels: SubParcel[] = getSubParcels(selectedPlotId);
  const isOwnPlot = player.plotsOwned.includes(selectedPlotId);

  const stats = getPlotCombatStats(
    plot,
    subParcels,
    isOwnPlot ? player.commanderAtk : 0,
    0,
  );

  const hasSilo = subParcels.some(
    (sp) =>
      sp.buildingType &&
      (sp.buildingType.toUpperCase().includes("SILO") ||
        sp.buildingType.toUpperCase().includes("MISSILE")),
  );

  const regenTimeLeft =
    plot.regenActiveUntil > Date.now()
      ? Math.ceil((plot.regenActiveUntil - Date.now()) / 60000)
      : 0;

  // Check incoming threat — last 3 combat events targeting this plot within 60s
  const now = Date.now();
  const incomingThreat = combatLog
    .slice(0, 10)
    .some((e) => e.toPlot === selectedPlotId && now - e.timestamp < 60_000);

  // Interceptors — check subparcels for interceptor buildings
  const interceptorBuildings = subParcels
    .filter((sp) => {
      if (!sp.buildingType) return false;
      const bt = sp.buildingType.toUpperCase();
      return (
        bt.includes("IRON_DOME") ||
        bt.includes("IRON DOME") ||
        bt.includes("THAAD") ||
        bt.includes("AEGIS")
      );
    })
    .map((sp) => sp.buildingType ?? "");

  const effColor =
    plot.efficiency >= 70
      ? "#22c55e"
      : plot.efficiency >= 40
        ? "#f59e0b"
        : "#ef4444";
  const dmgColor =
    plot.structuralDamage < 50
      ? "#22c55e"
      : plot.structuralDamage < 75
        ? "#f59e0b"
        : "#ef4444";

  const formationList: BattleFormation[] = [
    "SWARM",
    "PRECISION_STRIKE",
    "SUPPRESSION",
    "STEALTH",
  ];

  async function handleFire() {
    if (isFiring) return;
    if (targetPlotId === null) {
      toast.error("No target selected. Tap SET AS TARGET on an enemy plot.");
      return;
    }
    setIsFiring(true);
    setFireResult(null);
    try {
      resolveBattle(
        selectedPlotId!,
        targetPlotId!,
        selectedFormation,
        equippedMissileId ?? "",
      );
      setFireResult({ success: true, message: "STRIKE RESOLVED" });
      setTimeout(() => setFireResult(null), 3000);
    } catch {
      setFireResult({ success: false, message: "LAUNCH FAILED" });
    } finally {
      setIsFiring(false);
    }
  }

  function handleRepair() {
    if (player.frntBalance < 100) {
      toast.error("Insufficient FRNTR. Need 100 FRNTR to repair.");
      return;
    }
    repairPlot(selectedPlotId!);
    toast.success(
      `Plot #${selectedPlotId} repaired. Structural damage reduced.`,
    );
  }

  return (
    <div
      data-ocid="tactical.panel"
      style={{
        background: GLASS_BG,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        margin: "0 8px 8px",
        overflow: "hidden",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(0,255,204,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Swords size={12} color={CYAN} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
            }}
          >
            TACTICAL COMMAND
          </span>
        </div>
        <div
          style={{
            fontSize: 8,
            color: CYAN_DIM,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              background: `${BIOME_COLORS[plot.biome]}22`,
              border: `1px solid ${BIOME_COLORS[plot.biome]}55`,
              color: BIOME_COLORS[plot.biome],
              borderRadius: 4,
              padding: "2px 5px",
              fontSize: 7,
              letterSpacing: 1,
            }}
          >
            {plot.biome.toUpperCase()}
          </span>
          <span>PLOT #{selectedPlotId}</span>
        </div>
      </div>

      {/* DESTROYED BANNER */}
      {plot.isDestroyed && (
        <div
          data-ocid="tactical.error_state"
          style={{
            background: "rgba(239,68,68,0.15)",
            borderBottom: "1px solid rgba(239,68,68,0.3)",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={12} color="#ef4444" />
          <span
            style={{
              fontSize: 8,
              color: "#ef4444",
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            TOTAL DESTRUCTION — ALL BUILDINGS WIPED
          </span>
        </div>
      )}

      {/* INCOMING THREAT */}
      {incomingThreat && !plot.isDestroyed && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            borderBottom: "1px solid rgba(239,68,68,0.25)",
            padding: "5px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Zap size={10} color="#ef4444" />
          <span style={{ fontSize: 7, color: "#ef4444", letterSpacing: 1 }}>
            INCOMING THREAT DETECTED
          </span>
        </div>
      )}

      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* SECTION A — LAND STATUS */}
        <div>
          <div
            style={{
              fontSize: 7,
              color: CYAN_DIM,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            LAND STATUS
          </div>

          {/* Efficiency bar */}
          <div style={{ marginBottom: 5 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 7, color: CYAN_DIM }}>EFFICIENCY</span>
              <span style={{ fontSize: 7, color: effColor, fontWeight: 700 }}>
                {plot.efficiency}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  width: `${plot.efficiency}%`,
                  height: "100%",
                  background: effColor,
                  borderRadius: 2,
                  transition: "width 0.4s",
                }}
              />
            </div>
          </div>

          {/* Structural Damage bar — only if > 0 */}
          {plot.structuralDamage > 0 && (
            <div style={{ marginBottom: 5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 7, color: CYAN_DIM }}>
                  STRUCTURAL DMG
                </span>
                <span style={{ fontSize: 7, color: dmgColor, fontWeight: 700 }}>
                  {Math.round(plot.structuralDamage)}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: `${plot.structuralDamage}%`,
                    height: "100%",
                    background: dmgColor,
                    borderRadius: 2,
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Sub-parcel dot indicators */}
          <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            {subParcels.map((sp, idx) => {
              const hasBuilding = !!sp.buildingType;
              const disabled = plot.buildingsDisabled && hasBuilding;
              return (
                <div
                  key={sp.subId}
                  title={sp.buildingType ?? `Sub-parcel ${idx + 1} (empty)`}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: disabled
                      ? "transparent"
                      : hasBuilding
                        ? CYAN
                        : "transparent",
                    border: disabled
                      ? "1.5px solid rgba(239,68,68,0.7)"
                      : hasBuilding
                        ? `1.5px solid ${CYAN}`
                        : "1.5px solid rgba(0,255,204,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 7,
                    color: disabled ? "#ef4444" : "transparent",
                    flexShrink: 0,
                  }}
                >
                  {disabled ? "×" : ""}
                </div>
              );
            })}
            <span
              style={{
                fontSize: 7,
                color: CYAN_DIM,
                alignSelf: "center",
                marginLeft: 2,
              }}
            >
              {subParcels.filter((sp) => sp.buildingType).length}/
              {subParcels.length} BUILT
            </span>
          </div>

          {/* Buffs row */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {plot.specialization && (
              <span
                style={{
                  fontSize: 7,
                  background: "rgba(0,255,204,0.08)",
                  border: "1px solid rgba(0,255,204,0.2)",
                  color: CYAN,
                  borderRadius: 4,
                  padding: "2px 5px",
                  letterSpacing: 1,
                }}
              >
                {plot.specialization.replace("_", " ")}
              </span>
            )}
            {regenTimeLeft > 0 && (
              <span
                style={{
                  fontSize: 7,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#22c55e",
                  borderRadius: 4,
                  padding: "2px 5px",
                  letterSpacing: 0.5,
                }}
              >
                ⟳ REGEN {regenTimeLeft}m
              </span>
            )}
            {plot.buildingsDisabled && (
              <span
                style={{
                  fontSize: 7,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  borderRadius: 4,
                  padding: "2px 5px",
                  letterSpacing: 0.5,
                }}
              >
                ⚠ SYSTEMS OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* SECTION B — DEFENSE & WEAPONS MONITOR */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
          <div
            style={{
              fontSize: 7,
              color: CYAN_DIM,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            DEFENSE & WEAPONS MONITOR
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <StatChip
              label="ATK SCORE"
              value={stats.atk}
              icon={<Swords size={10} color="#ef4444" />}
              color="#ef4444"
            />
            <StatChip
              label="DEF SCORE"
              value={stats.def}
              icon={<Shield size={10} color="#22c55e" />}
              color="#22c55e"
            />
          </div>

          {/* Interceptors */}
          {interceptorBuildings.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              {interceptorBuildings.map((bt, i) => (
                <div
                  key={`icp-${i}-${bt.slice(0, 8)}`}
                  style={{
                    fontSize: 7,
                    background: plot.buildingsDisabled
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(0,255,204,0.08)",
                    border: `1px solid ${
                      plot.buildingsDisabled
                        ? "rgba(239,68,68,0.3)"
                        : "rgba(0,255,204,0.25)"
                    }`,
                    color: plot.buildingsDisabled ? "#ef4444" : CYAN,
                    borderRadius: 4,
                    padding: "2px 6px",
                    letterSpacing: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Shield
                    size={8}
                    color={plot.buildingsDisabled ? "#ef4444" : CYAN}
                  />
                  {bt.replace(/_/g, " ")} —{" "}
                  {plot.buildingsDisabled ? "OFFLINE" : "ACTIVE"}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 7,
                color: "rgba(255,255,255,0.25)",
                marginBottom: 4,
                fontStyle: "italic",
              }}
            >
              No interceptors assigned
            </div>
          )}

          {/* Silo status */}
          {hasSilo && (
            <div
              style={{
                fontSize: 7,
                color: CYAN_DIM,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 2,
              }}
            >
              <Zap size={9} color="#f97316" />
              SILO ACTIVE — LOADED:{" "}
              <span style={{ color: "#f97316", fontWeight: 700 }}>
                {equippedMissileId ?? "NONE"}
              </span>
            </div>
          )}
        </div>

        {/* SECTION C — FORMATION SELECTOR (own plot with silo) */}
        {isOwnPlot && hasSilo && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
            <div
              style={{
                fontSize: 7,
                color: CYAN_DIM,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              BATTLE FORMATION
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 5,
              }}
            >
              {formationList.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-ocid={`tactical.${f.toLowerCase()}.toggle`}
                  onClick={() => setSelectedFormation(f)}
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: 1,
                    padding: "4px 8px",
                    borderRadius: 5,
                    border: `1px solid ${
                      selectedFormation === f ? CYAN : "rgba(0,255,204,0.25)"
                    }`,
                    background:
                      selectedFormation === f
                        ? "rgba(0,255,204,0.15)"
                        : "rgba(0,0,0,0.3)",
                    color: selectedFormation === f ? CYAN : CYAN_DIM,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {f === "PRECISION_STRIKE" ? "PRECISION" : f}
                </button>
              ))}
            </div>
            <div
              style={{
                fontSize: 7,
                color: "rgba(255,255,255,0.45)",
                fontStyle: "italic",
                lineHeight: 1.4,
              }}
            >
              {FORMATION_DESCRIPTIONS[selectedFormation]}
            </div>
          </div>
        )}

        {/* SECTION D — ACTION ROW */}
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 8,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {/* FIRE — only if own plot with silo */}
          {isOwnPlot && hasSilo && (
            <button
              type="button"
              data-ocid="tactical.fire.button"
              onClick={handleFire}
              disabled={isFiring}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(239,68,68,0.5)",
                background: isFiring
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(239,68,68,0.2)",
                color: isFiring ? "rgba(239,68,68,0.5)" : "#ef4444",
                cursor: isFiring ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s",
              }}
            >
              <Zap size={10} />
              {isFiring ? "LAUNCHING..." : "FIRE"}
            </button>
          )}

          {/* SET DEFENSE */}
          <button
            type="button"
            data-ocid="tactical.defense.button"
            onClick={() => toast.info("Defense assignment coming soon")}
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.3)",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Shield size={10} />
            SET DEFENSE
          </button>

          {/* COMPARE */}
          <button
            type="button"
            data-ocid="tactical.compare.button"
            onClick={() => {
              setCompareModeActive(true);
              toast.info("Compare mode: tap another plot on the globe");
            }}
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(0,255,204,0.25)",
              background: "rgba(0,0,0,0.3)",
              color: CYAN_DIM,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <GitCompare size={10} />
            COMPARE
          </button>

          {/* REPAIR — only if damage > 0 and own plot */}
          {isOwnPlot && plot.structuralDamage > 0 && (
            <button
              type="button"
              data-ocid="tactical.repair.button"
              onClick={handleRepair}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid rgba(251,191,36,0.4)",
                background: "rgba(251,191,36,0.1)",
                color: "#fbbf24",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Wrench size={10} />
              REPAIR (100 FRNTR)
            </button>
          )}

          {/* Fire result feedback */}
          {fireResult && (
            <div
              data-ocid={
                fireResult.success
                  ? "tactical.success_state"
                  : "tactical.error_state"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 8,
                color: fireResult.success ? "#22c55e" : "#ef4444",
                fontWeight: 700,
                letterSpacing: 1,
                alignSelf: "center",
              }}
            >
              {fireResult.success ? (
                <CheckCircle size={10} />
              ) : (
                <AlertTriangle size={10} />
              )}
              {fireResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
