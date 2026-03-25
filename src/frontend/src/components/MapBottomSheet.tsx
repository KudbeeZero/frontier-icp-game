import {
  Cpu,
  Folder,
  Globe,
  Lock,
  Pickaxe,
  Radio,
  Shield,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { type SubParcel, useGameStore } from "../store/gameStore";
import BuildingPicker from "./BuildingPicker";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.15)";

const BIOME_BADGE_COLORS: Record<string, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

const BUILDING_ICONS: Record<string, LucideIcon> = {
  MISSILE_SILO: Zap,
  DEFENSE_TOWER: Shield,
  RESOURCE_EXTRACTOR: Pickaxe,
  RADAR_STATION: Radio,
  SHIELD_GENERATOR: ShieldCheck,
  CYCLES_REACTOR: Cpu,
};

const BUILDING_NAMES: Record<string, string> = {
  MISSILE_SILO: "Missile Silo",
  DEFENSE_TOWER: "Defense Tower",
  RESOURCE_EXTRACTOR: "Resource Extractor",
  RADAR_STATION: "Radar Station",
  SHIELD_GENERATOR: "Shield Generator",
  CYCLES_REACTOR: "Cycles Reactor",
};

function getCountdown(purchaseTime: number): string {
  const unlockAt = purchaseTime + 4 * 60 * 60 * 1000;
  const remaining = unlockAt - Date.now();
  if (remaining <= 0) return "READY";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function focusOnPlot(
  lat: number,
  lng: number,
  controlsRef?: React.RefObject<any>,
) {
  if (!controlsRef?.current) return;
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  const r = 2.2;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const controls = controlsRef.current;
  controls.target?.set?.(0, 0, 0);
  const cam = controls.object;
  if (cam) {
    cam.position.set(x, y, z);
    controls.update?.();
  }
}

function actionBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 0",
    background: bg,
    border: `1px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    cursor: "pointer",
    textShadow: `0 0 10px ${color}`,
    boxShadow: `0 0 20px ${color}20`,
    transition: "all 0.2s",
    fontFamily: "monospace",
  };
}

function SlotRow({
  sp,
  onPickerOpen,
}: {
  sp: SubParcel;
  onPickerOpen: () => void;
}) {
  if (sp.subId === 0) {
    return (
      <div
        data-ocid="map.slot.row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(0,255,204,0.03)",
          border: "1px solid rgba(0,255,204,0.08)",
          borderRadius: 6,
          opacity: 0.7,
          minHeight: 48,
        }}
      >
        <Cpu size={14} style={{ color: CYAN, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: CYAN, letterSpacing: 1 }}>
            CANISTER NODE
          </div>
          <div style={{ fontSize: 8, color: CYAN_DIM }}>PERMANENT</div>
        </div>
        <Lock size={10} style={{ color: CYAN_DIM }} />
      </div>
    );
  }

  if (!sp.unlocked) {
    return (
      <div
        data-ocid="map.slot.row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(0,255,204,0.06)",
          borderRadius: 6,
          opacity: 0.5,
          minHeight: 48,
        }}
      >
        <Timer size={14} style={{ color: CYAN_DIM, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: CYAN_DIM, letterSpacing: 1 }}>
            SLOT {sp.subId} — LOCKED
          </div>
          <div style={{ fontSize: 8, color: "rgba(0,255,204,0.3)" }}>
            Unlocks in {getCountdown(sp.purchaseTime)}
          </div>
        </div>
        <Lock size={10} style={{ color: "rgba(0,255,204,0.2)" }} />
      </div>
    );
  }

  if (!sp.buildingType) {
    return (
      <button
        type="button"
        data-ocid="map.slot.button"
        onClick={onPickerOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(0,255,204,0.04)",
          border: "1px dashed rgba(0,255,204,0.25)",
          borderRadius: 6,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          minHeight: 48,
        }}
      >
        <Folder size={14} style={{ color: CYAN, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: CYAN, letterSpacing: 1 }}>
            SLOT {sp.subId} — EMPTY
          </div>
          <div style={{ fontSize: 8, color: CYAN_DIM }}>Tap to build</div>
        </div>
        <span style={{ fontSize: 8, color: CYAN, letterSpacing: 1 }}>
          + BUILD
        </span>
      </button>
    );
  }

  const BuildIcon: LucideIcon = BUILDING_ICONS[sp.buildingType] ?? Zap;
  return (
    <div
      data-ocid="map.slot.row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "rgba(0,255,204,0.05)",
        border: "1px solid rgba(0,255,204,0.15)",
        borderRadius: 6,
        minHeight: 48,
      }}
    >
      <BuildIcon size={14} style={{ color: CYAN, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: CYAN, letterSpacing: 1 }}>
          {BUILDING_NAMES[sp.buildingType] ?? sp.buildingType}
        </div>
        <div
          style={{
            marginTop: 4,
            height: 3,
            background: "rgba(0,255,204,0.1)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${sp.durability}%`,
              background:
                sp.durability > 50
                  ? CYAN
                  : sp.durability > 25
                    ? "#f59e0b"
                    : "#ef4444",
              borderRadius: 2,
              transition: "width 0.3s",
            }}
          />
        </div>
        <div style={{ fontSize: 7, color: CYAN_DIM, marginTop: 2 }}>
          {sp.durability}% DURABILITY
        </div>
      </div>
    </div>
  );
}

interface MapBottomSheetProps {
  onClose: () => void;
  controlsRef?: React.RefObject<any>;
}

export default function MapBottomSheet({
  onClose,
  controlsRef,
}: MapBottomSheetProps) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const purchasePlot = useGameStore((s) => s.purchasePlot);
  const setTargetPlotId = useGameStore((s) => s.setTargetPlotId);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);

  const plot =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;
  const subParcels =
    selectedPlotId !== null ? getSubParcels(selectedPlotId) : [];

  const playerPrincipal = player.principal ?? "You";
  const isOwned = plot?.owner !== null && plot?.owner !== undefined;
  const isOwnPlot =
    isOwned &&
    (plot?.owner === playerPrincipal ||
      (selectedPlotId !== null && player.plotsOwned.includes(selectedPlotId)));
  const isEnemyPlot = isOwned && !isOwnPlot;
  const hasEmptySlot = subParcels.some(
    (sp) => sp.subId !== 0 && sp.unlocked && !sp.buildingType,
  );

  function handlePurchase() {
    if (!plot) return;
    purchasePlot(plot.id);
    onClose();
    focusOnPlot(plot.lat, plot.lng, controlsRef);
    setPlotHoverCard({
      plotId: plot.id,
      owner: player.principal ?? "You",
      action: "PURCHASING",
      nextStep: "Plot purchased! Start building.",
    });
  }

  function handleBuild() {
    const emptySlot = subParcels.find(
      (sp) => sp.subId !== 0 && sp.unlocked && !sp.buildingType,
    );
    if (!emptySlot || !plot) return;
    setPickerSlot(emptySlot.subId);
  }

  function handleSetTarget() {
    if (!plot) return;
    setTargetPlotId(plot.id);
    onClose();
    focusOnPlot(plot.lat, plot.lng, controlsRef);
    setPlotHoverCard({
      plotId: plot.id,
      owner: plot.owner ?? "UNKNOWN",
      action: "TARGET LOCKED",
      nextStep: "Select weapon and FIRE.",
    });
  }

  const biomeBadgeColor = plot
    ? (BIOME_BADGE_COLORS[plot.biome] ?? CYAN)
    : CYAN;

  return (
    <>
      <style>{`
        @keyframes mapGlobePulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 16px",
            scrollbarWidth: "none",
          }}
        >
          {!plot ? (
            <div
              data-ocid="map.empty_state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                paddingTop: 40,
              }}
            >
              <Globe
                size={48}
                style={{
                  color: CYAN,
                  animation: "mapGlobePulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: CYAN_DIM,
                  letterSpacing: 2,
                  textAlign: "center",
                  maxWidth: 200,
                  lineHeight: 1.6,
                  fontFamily: "monospace",
                }}
              >
                TAP A PLOT ON THE GLOBE TO VIEW DETAILS
              </span>
            </div>
          ) : (
            <>
              {/* PLOT HEADER */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: CYAN,
                      letterSpacing: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    PLOT #{plot.id}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 3,
                      background: `${biomeBadgeColor}22`,
                      border: `1px solid ${biomeBadgeColor}`,
                      color: biomeBadgeColor,
                      letterSpacing: 1,
                      fontWeight: 700,
                      fontFamily: "monospace",
                    }}
                  >
                    {plot.biome.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: CYAN_DIM,
                    letterSpacing: 1,
                    marginBottom: 3,
                    fontFamily: "monospace",
                  }}
                >
                  OWNER:{" "}
                  {plot.owner
                    ? plot.owner.length > 16
                      ? `${plot.owner.slice(0, 8)}…${plot.owner.slice(-4)}`
                      : plot.owner
                    : "UNOWNED"}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(0,255,204,0.3)",
                    letterSpacing: 1,
                    fontFamily: "monospace",
                  }}
                >
                  {plot.lat.toFixed(2)}°N · {plot.lng.toFixed(2)}°E
                </div>
              </div>

              {/* DIVIDER */}
              <div
                style={{ height: 1, background: BORDER, marginBottom: 12 }}
              />

              {/* SUB-PARCELS */}
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 9,
                  color: CYAN_DIM,
                  letterSpacing: 2,
                  fontFamily: "monospace",
                }}
              >
                SUB-PARCELS (7)
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  marginBottom: 16,
                }}
              >
                {subParcels.map((sp) => (
                  <SlotRow
                    key={sp.subId}
                    sp={sp}
                    onPickerOpen={() => setPickerSlot(sp.subId)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* DECISION LAYER */}
        {plot && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${BORDER}`,
              flexShrink: 0,
            }}
          >
            {!isOwned && (
              <button
                type="button"
                data-ocid="map.primary_button"
                onClick={handlePurchase}
                style={actionBtnStyle("#00ffcc", "rgba(0,255,204,0.12)")}
              >
                PURCHASE PLOT
              </button>
            )}
            {isOwnPlot && hasEmptySlot && (
              <button
                type="button"
                data-ocid="map.primary_button"
                onClick={handleBuild}
                style={actionBtnStyle("#00ffcc", "rgba(0,255,204,0.12)")}
              >
                BUILD STRUCTURE
              </button>
            )}
            {isEnemyPlot && (
              <button
                type="button"
                data-ocid="map.primary_button"
                onClick={handleSetTarget}
                style={actionBtnStyle("#ef4444", "rgba(239,68,68,0.12)")}
              >
                SET AS TARGET
              </button>
            )}
          </div>
        )}
      </div>

      {/* BuildingPicker overlay */}
      {pickerSlot !== null && selectedPlotId !== null && (
        <BuildingPicker
          plotId={selectedPlotId}
          subId={pickerSlot}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </>
  );
}
