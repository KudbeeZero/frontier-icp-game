import {
  AlertTriangle,
  CheckCircle,
  GitCompare,
  Radio,
  Shield,
  Swords,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BattleFormation, SubParcel } from "../store/gameStore";
import {
  BIOME_COLORS,
  getPlotCombatStats,
  useGameStore,
} from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.45)";
const BORDER = "rgba(0,255,204,0.18)";
const GLASS_BG = "rgba(4,16,28,0.55)";

const FORMATION_DESCRIPTIONS: Record<BattleFormation, string> = {
  SWARM: "+20% hit, ×0.7 dmg — overwhelm with volume",
  PRECISION_STRIKE: "-10% hit, ×1.5 dmg — one devastating blow",
  SUPPRESSION: "+5% hit, bypass 50% DEF — sustained pressure",
  STEALTH: "Bypass 50% interceptors — ghost approach",
};

interface CommandPanelProps {
  onFire: () => void;
  fireDisabled: boolean;
  onOpenTab: (tab: string) => void;
  onToggleCombatLog?: () => void;
}

export default function CommandPanel({
  onFire: _onFire,
  fireDisabled: _fireDisabled,
  onOpenTab,
  onToggleCombatLog,
}: CommandPanelProps) {
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

  const panelRef = useRef<HTMLDivElement>(null);

  // Detect landscape (height < 500) to collapse to strip only
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== "undefined" && window.innerHeight < 500,
  );
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerHeight < 500);
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const plot =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;
  const subParcels: SubParcel[] = plot ? getSubParcels(plot.id) : [];
  const isOwnPlot = plot ? player.plotsOwned.includes(plot.id) : false;

  const stats = plot
    ? getPlotCombatStats(
        plot,
        subParcels,
        isOwnPlot ? player.commanderAtk : 0,
        0,
      )
    : null;

  const hasSilo = subParcels.some(
    (sp) =>
      sp.buildingType &&
      (sp.buildingType.toUpperCase().includes("SILO") ||
        sp.buildingType.toUpperCase().includes("MISSILE")),
  );

  const regenTimeLeft =
    plot && plot.regenActiveUntil > Date.now()
      ? Math.ceil((plot.regenActiveUntil - Date.now()) / 60000)
      : 0;

  const now = Date.now();
  const incomingThreat = plot
    ? combatLog
        .slice(0, 10)
        .some((e) => e.toPlot === plot.id && now - e.timestamp < 60_000)
    : false;

  const interceptorBuildings = subParcels
    .filter((sp) => {
      if (!sp.buildingType) return false;
      const bt = sp.buildingType.toUpperCase();
      return (
        bt.includes("IRON_DOME") || bt.includes("THAAD") || bt.includes("AEGIS")
      );
    })
    .map((sp) => sp.buildingType ?? "");

  const effColor = !plot
    ? CYAN_DIM
    : plot.efficiency >= 70
      ? "#22c55e"
      : plot.efficiency >= 40
        ? "#f59e0b"
        : "#ef4444";

  const dmgColor = !plot
    ? CYAN_DIM
    : plot.structuralDamage < 50
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
        targetPlotId,
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
    toast.success(`Plot #${selectedPlotId} repaired.`);
  }

  // ── Frosted glass base style ──────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: GLASS_BG,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${BORDER}`,
  };

  // ── MINIMAL STRIP (no selection, or landscape) ────────────────────
  const minimalStrip = (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        paddingLeft: 14,
        paddingRight: 14,
        gap: 10,
      }}
    >
      <Swords size={11} color={CYAN} />
      <span
        style={{
          flex: 1,
          fontSize: 8,
          letterSpacing: 2.5,
          color: CYAN,
          fontFamily: "monospace",
          fontWeight: 700,
        }}
      >
        TACTICAL COMMAND
      </span>
      {/* RADAR */}
      <button
        type="button"
        data-ocid="command_panel.radar_button"
        onClick={() => onToggleCombatLog?.()}
        style={{
          background: "rgba(0,255,204,0.07)",
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Radio size={11} color={CYAN} />
        <span style={{ fontSize: 7, color: CYAN, letterSpacing: 1 }}>
          RADAR
        </span>
      </button>
    </div>
  );

  // ── EXPANDED CONTENT (plot selected) ─────────────────────────────
  const expandedContent = plot ? (
    <>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(0,255,204,0.03)",
          gap: 8,
        }}
      >
        <Swords size={11} color={CYAN} />
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 2,
          }}
        >
          TACTICAL COMMAND
        </span>
        <span style={{ fontSize: 8, color: CYAN_DIM, letterSpacing: 1 }}>
          PLOT #{plot.id}
        </span>
        {/* biome badge */}
        <span
          style={{
            fontSize: 7,
            padding: "1px 5px",
            background: `${BIOME_COLORS[plot.biome]}1a`,
            border: `1px solid ${BIOME_COLORS[plot.biome]}44`,
            borderRadius: 3,
            color: BIOME_COLORS[plot.biome],
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {plot.biome}
        </span>
        <div style={{ flex: 1 }} />
        {/* RADAR */}
        <button
          type="button"
          data-ocid="command_panel.radar_button"
          onClick={() => onToggleCombatLog?.()}
          style={{
            background: "rgba(0,255,204,0.07)",
            border: `1px solid ${BORDER}`,
            borderRadius: 5,
            padding: "3px 7px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Radio size={10} color={CYAN} />
          <span style={{ fontSize: 7, color: CYAN, letterSpacing: 1 }}>
            RADAR
          </span>
        </button>
      </div>

      {/* Total destruction banner */}
      {plot.isDestroyed && (
        <div
          style={{
            background: "rgba(239,68,68,0.12)",
            borderBottom: "1px solid rgba(239,68,68,0.3)",
            padding: "5px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={11} color="#ef4444" />
          <span
            style={{
              fontSize: 7,
              color: "#ef4444",
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            TOTAL DESTRUCTION — ALL BUILDINGS WIPED
          </span>
        </div>
      )}

      {/* Incoming threat */}
      {incomingThreat && !plot.isDestroyed && (
        <div
          style={{
            background: "rgba(239,68,68,0.10)",
            borderBottom: "1px solid rgba(239,68,68,0.22)",
            padding: "4px 14px",
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

      {/* Body */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* ── LAND STATUS ── */}
        <section>
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

          {/* Efficiency */}
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

          {/* Structural damage (only if > 0) */}
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
                  }}
                />
              </div>
            </div>
          )}

          {/* Sub-parcel dot indicators */}
          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginBottom: 5,
            }}
          >
            {subParcels.slice(0, 7).map((sp, i) => (
              <div
                key={sp.subId}
                title={sp.buildingType ?? `Sub-parcel ${i + 1}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: sp.buildingType
                    ? sp.durability < 25
                      ? "transparent"
                      : CYAN
                    : "transparent",
                  border: `1.5px solid ${
                    sp.durability < 25
                      ? "#ef4444"
                      : sp.buildingType
                        ? CYAN
                        : CYAN_DIM
                  }`,
                  boxShadow:
                    sp.buildingType && sp.durability >= 25
                      ? `0 0 4px ${CYAN}66`
                      : "none",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {plot.specialization && (
              <span
                style={{
                  fontSize: 7,
                  padding: "2px 6px",
                  background: "rgba(0,255,204,0.08)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  color: CYAN,
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
                  padding: "2px 6px",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 3,
                  color: "#22c55e",
                  letterSpacing: 1,
                }}
              >
                REGEN {regenTimeLeft}m
              </span>
            )}
            {plot.structuralDamage >= 50 && !plot.isDestroyed && (
              <span
                style={{
                  fontSize: 7,
                  padding: "2px 6px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 3,
                  color: "#ef4444",
                  letterSpacing: 1,
                }}
              >
                SYSTEMS OFFLINE
              </span>
            )}
          </div>
        </section>

        {/* ── DEFENSE & WEAPONS MONITOR ── */}
        {stats && (
          <section>
            <div
              style={{
                fontSize: 7,
                color: CYAN_DIM,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              DEFENSE &amp; WEAPONS
            </div>

            {/* ATK / DEF chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 7 }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 6,
                  padding: "5px 10px",
                }}
              >
                <Swords size={10} color="#ef4444" />
                <div>
                  <div
                    style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}
                  >
                    ATK
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#ef4444",
                      fontFamily: "monospace",
                    }}
                  >
                    {Math.round(stats.atk)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 6,
                  padding: "5px 10px",
                }}
              >
                <Shield size={10} color="#22c55e" />
                <div>
                  <div
                    style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}
                  >
                    DEF
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#22c55e",
                      fontFamily: "monospace",
                    }}
                  >
                    {Math.round(stats.def)}
                  </div>
                </div>
              </div>
            </div>

            {/* Interceptors */}
            {interceptorBuildings.length > 0 && (
              <div style={{ marginBottom: 5 }}>
                {interceptorBuildings.map((b) => (
                  <div
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          plot.structuralDamage < 75 ? "#22c55e" : "#ef4444",
                      }}
                    />
                    <span
                      style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}
                    >
                      {b.toUpperCase()} —{" "}
                      {plot.structuralDamage < 75 ? "ACTIVE" : "OFFLINE"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Silo status */}
            {hasSilo && (
              <div
                style={{
                  fontSize: 7,
                  color: CYAN_DIM,
                  letterSpacing: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: equippedMissileId ? CYAN : "#555",
                    boxShadow: equippedMissileId ? `0 0 4px ${CYAN}` : "none",
                  }}
                />
                SILO —{" "}
                {equippedMissileId
                  ? `${equippedMissileId.toUpperCase()} LOADED`
                  : "NO WEAPON EQUIPPED"}
              </div>
            )}
          </section>
        )}

        {/* ── BATTLE FORMATION (own plot + has silo) ── */}
        {isOwnPlot && hasSilo && (
          <section>
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
              {formationList.map((f) => {
                const label = f === "PRECISION_STRIKE" ? "PRECISE" : f;
                const active = selectedFormation === f;
                return (
                  <button
                    key={f}
                    type="button"
                    data-ocid={`command_panel.formation.${f.toLowerCase()}.toggle`}
                    onClick={() => setSelectedFormation(f)}
                    style={{
                      fontSize: 7,
                      padding: "3px 7px",
                      borderRadius: 4,
                      border: `1px solid ${active ? CYAN : BORDER}`,
                      background: active
                        ? "rgba(0,255,204,0.12)"
                        : "rgba(0,0,0,0.3)",
                      color: active ? CYAN : CYAN_DIM,
                      cursor: "pointer",
                      letterSpacing: 0.8,
                      fontFamily: "monospace",
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 0.5 }}>
              {FORMATION_DESCRIPTIONS[selectedFormation]}
            </div>
          </section>
        )}

        {/* ── ACTION ROW ── */}
        <section
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            paddingTop: 4,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          {/* FIRE — only own plot with silo */}
          {isOwnPlot && hasSilo && (
            <button
              type="button"
              data-ocid="command_panel.fire.button"
              disabled={isFiring || targetPlotId === null}
              onClick={handleFire}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 8,
                padding: "4px 10px",
                borderRadius: 5,
                border: `1px solid rgba(239,68,68,${
                  isFiring || targetPlotId === null ? 0.25 : 0.7
                })`,
                background: "rgba(239,68,68,0.08)",
                color:
                  isFiring || targetPlotId === null
                    ? "rgba(239,68,68,0.4)"
                    : "#ef4444",
                cursor:
                  isFiring || targetPlotId === null ? "not-allowed" : "pointer",
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              <Zap size={10} />
              {isFiring ? "FIRING..." : "FIRE"}
            </button>
          )}

          {/* SET DEFENSE */}
          <button
            type="button"
            data-ocid="command_panel.set_defense.button"
            onClick={() => onOpenTab("arsenal")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 8,
              padding: "4px 10px",
              borderRadius: 5,
              border: `1px solid ${BORDER}`,
              background: "rgba(0,255,204,0.05)",
              color: CYAN_DIM,
              cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            <Shield size={10} />
            SET DEFENSE
          </button>

          {/* COMPARE */}
          <button
            type="button"
            data-ocid="command_panel.compare.button"
            onClick={() => setCompareModeActive(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 8,
              padding: "4px 10px",
              borderRadius: 5,
              border: `1px solid ${BORDER}`,
              background: "rgba(0,255,204,0.05)",
              color: CYAN_DIM,
              cursor: "pointer",
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            <GitCompare size={10} />
            COMPARE
          </button>

          {/* REPAIR — only if own plot with damage */}
          {isOwnPlot && plot.structuralDamage > 0 && (
            <button
              type="button"
              data-ocid="command_panel.repair.button"
              onClick={handleRepair}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 8,
                padding: "4px 10px",
                borderRadius: 5,
                border: "1px solid rgba(251,191,36,0.4)",
                background: "rgba(251,191,36,0.06)",
                color: "rgba(251,191,36,0.8)",
                cursor: "pointer",
                fontFamily: "monospace",
                letterSpacing: 1,
              }}
            >
              <Wrench size={10} />
              REPAIR (100 FRNTR)
            </button>
          )}
        </section>

        {/* Fire result feedback */}
        {fireResult && (
          <div
            data-ocid={
              fireResult.success
                ? "command_panel.success_state"
                : "command_panel.error_state"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 5,
              background: fireResult.success
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
              border: fireResult.success
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {fireResult.success ? (
              <CheckCircle size={11} color="#22c55e" />
            ) : (
              <AlertTriangle size={11} color="#ef4444" />
            )}
            <span
              style={{
                fontSize: 8,
                color: fireResult.success ? "#22c55e" : "#ef4444",
                letterSpacing: 1,
                fontFamily: "monospace",
              }}
            >
              {fireResult.message}
            </span>
          </div>
        )}
      </div>
    </>
  ) : null;

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        ref={panelRef}
        data-ocid="command_panel.panel"
        style={{
          position: "fixed",
          bottom: 64,
          left: 180,
          width: 260,
          zIndex: 30,
          ...glassStyle,
          borderRadius: "10px 10px 0 0",
          fontFamily: "monospace",
          overflowY: "auto",
          maxHeight: "60vh",
        }}
      >
        <style>{`
          @keyframes cmdPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>
        {plot ? expandedContent : minimalStrip}
      </div>
    );
  }

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────
  // Landscape: always minimal strip only
  if (isLandscape) {
    return (
      <div
        ref={panelRef}
        data-ocid="command_panel.panel"
        style={{
          position: "fixed",
          bottom: 64,
          left: 0,
          right: 0,
          zIndex: 35,
          ...glassStyle,
          borderRadius: "10px 10px 0 0",
          fontFamily: "monospace",
        }}
      >
        {minimalStrip}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      data-ocid="command_panel.panel"
      style={{
        position: "fixed",
        bottom: 64,
        left: 0,
        right: 0,
        zIndex: 35,
        ...glassStyle,
        borderRadius: "10px 10px 0 0",
        fontFamily: "monospace",
        // Animated height: expanded when plot selected
        maxHeight: plot ? "65vh" : 44,
        overflowY: plot ? "auto" : "hidden",
        transition: "max-height 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes cmdPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
      {plot ? expandedContent : minimalStrip}
    </div>
  );
}
