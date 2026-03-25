import type { LucideIcon } from "lucide-react";
import { Cpu, Pickaxe, Radio, Shield, ShieldCheck, X, Zap } from "lucide-react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const BG = "rgba(2,5,15,0.95)";
const BORDER = "rgba(0,255,204,0.3)";
const TEXT = "#e0f4ff";

interface BuildingDef {
  type: string;
  name: string;
  icon: LucideIcon;
  cost: number;
  desc: string;
}

const BUILDINGS: BuildingDef[] = [
  {
    type: "MISSILE_SILO",
    name: "Missile Silo",
    icon: Zap,
    cost: 500,
    desc: "Enables missile attacks",
  },
  {
    type: "DEFENSE_TOWER",
    name: "Defense Tower",
    icon: Shield,
    cost: 300,
    desc: "Increases plot defense",
  },
  {
    type: "RESOURCE_EXTRACTOR",
    name: "Resource Extractor",
    icon: Pickaxe,
    cost: 200,
    desc: "Harvests resources",
  },
  {
    type: "RADAR_STATION",
    name: "Radar Station",
    icon: Radio,
    cost: 150,
    desc: "Reveals adjacent plots",
  },
  {
    type: "SHIELD_GENERATOR",
    name: "Shield Generator",
    icon: ShieldCheck,
    cost: 400,
    desc: "Orbital shield layer",
  },
  {
    type: "CYCLES_REACTOR",
    name: "Cycles Reactor",
    icon: Cpu,
    cost: 200,
    desc: "Enables mineral extraction from this plot",
  },
];

interface BuildingPickerProps {
  plotId: number;
  subId: number;
  onClose: () => void;
}

export default function BuildingPicker({
  plotId,
  subId,
  onClose,
}: BuildingPickerProps) {
  const player = useGameStore((s) => s.player);
  const buildStructure = useGameStore((s) => s.buildStructure);

  function handleBuild(building: BuildingDef) {
    if (player.frntBalance < building.cost) return;
    buildStructure(plotId, subId, building.type, building.cost);
    onClose();
  }

  return (
    <div
      data-ocid="building_picker.sheet"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 50,
        background: BG,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: `1px solid ${BORDER}`,
        borderRadius: "16px 16px 0 0",
        maxHeight: "45vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          width: 40,
          height: 4,
          background: "rgba(0,255,204,0.3)",
          borderRadius: 2,
          margin: "10px auto 0",
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 8px",
          borderBottom: "1px solid rgba(0,255,204,0.1)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: CYAN,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          SELECT BUILDING — SUB-PARCEL {subId}
        </span>
        <button
          type="button"
          data-ocid="building_picker.close_button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(0,255,204,0.5)",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Close building picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Building list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
        {BUILDINGS.map((building) => {
          const Icon = building.icon;
          const canAfford = player.frntBalance >= building.cost;
          return (
            <div
              key={building.type}
              data-ocid={`building_picker.${building.type.toLowerCase()}.row`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 8px",
                borderBottom: "1px solid rgba(0,255,204,0.07)",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(0,255,204,0.07)",
                  border: "1px solid rgba(0,255,204,0.2)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  size={16}
                  color={canAfford ? CYAN : "rgba(100,120,140,0.5)"}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: canAfford ? TEXT : "rgba(100,120,140,0.6)",
                    letterSpacing: 0.5,
                  }}
                >
                  {building.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(160,200,220,0.5)",
                    marginTop: 2,
                  }}
                >
                  {building.desc}
                </div>
                {!canAfford && (
                  <div
                    data-ocid={`building_picker.${building.type.toLowerCase()}.error_state`}
                    style={{
                      fontSize: 8,
                      color: "#ef4444",
                      marginTop: 2,
                      letterSpacing: 0.5,
                    }}
                  >
                    INSUFFICIENT FRNTR
                  </div>
                )}
              </div>

              {/* Cost + Build */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: canAfford ? CYAN : "rgba(100,120,140,0.5)",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {building.cost} FRNTR
                </span>
                <button
                  type="button"
                  data-ocid={`building_picker.${building.type.toLowerCase()}.build_button`}
                  onClick={() => handleBuild(building)}
                  disabled={!canAfford}
                  style={{
                    padding: "4px 10px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    fontFamily: "monospace",
                    background: canAfford
                      ? "rgba(0,255,204,0.1)"
                      : "rgba(50,60,70,0.3)",
                    border: `1px solid ${canAfford ? "rgba(0,255,204,0.4)" : "rgba(80,100,120,0.3)"}`,
                    borderRadius: 4,
                    color: canAfford ? CYAN : "rgba(80,100,120,0.5)",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (canAfford)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(0,255,204,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    if (canAfford)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(0,255,204,0.1)";
                  }}
                >
                  BUILD
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
