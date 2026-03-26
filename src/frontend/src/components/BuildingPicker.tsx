import type { LucideIcon } from "lucide-react";
import {
  Cpu,
  Database,
  Factory,
  Flame,
  Pickaxe,
  Radio,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sigma,
  Terminal,
  Zap,
} from "lucide-react";
import { type PlotSpecialization, useGameStore } from "../store/gameStore";

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

const SPEC_BUILDINGS: Record<PlotSpecialization, BuildingDef[]> = {
  TRADING_DEPOT: [
    {
      type: "MARKET_STALL",
      name: "Market Stall",
      icon: ShoppingBag,
      cost: 200,
      desc: "Commerce hub +FRNTR income",
    },
    {
      type: "SUPPLY_CACHE",
      name: "Supply Cache",
      icon: Database,
      cost: 350,
      desc: "Stockpile resources",
    },
    {
      type: "BLACK_MARKET_TERMINAL",
      name: "Black Market Terminal",
      icon: Terminal,
      cost: 500,
      desc: "Trade with any faction",
    },
  ],
  ENERGY_TECH: [
    {
      type: "SOLAR_ARRAY",
      name: "Solar Array",
      icon: Flame,
      cost: 250,
      desc: "Clean energy generation",
    },
    {
      type: "REACTOR_CORE",
      name: "Reactor Core",
      icon: Sigma,
      cost: 400,
      desc: "Heavy power output",
    },
    {
      type: "TECH_LAB",
      name: "Tech Lab",
      icon: Cpu,
      cost: 600,
      desc: "Upgrades all tech",
    },
  ],
  ARMORY: [
    {
      type: "MISSILE_SILO",
      name: "Missile Silo",
      icon: Zap,
      cost: 500,
      desc: "Enables missile attacks",
    },
    {
      type: "DEFENSE_BUNKER",
      name: "Defense Bunker",
      icon: ShieldCheck,
      cost: 300,
      desc: "Heavy fortification",
    },
    {
      type: "TRAINING_CAMP",
      name: "Training Camp",
      icon: Shield,
      cost: 250,
      desc: "Trains combat units",
    },
  ],
  RESOURCES: [
    {
      type: "MINING_RIG",
      name: "Mining Rig",
      icon: Pickaxe,
      cost: 200,
      desc: "Extracts raw minerals",
    },
    {
      type: "ORE_PROCESSOR",
      name: "Ore Processor",
      icon: Factory,
      cost: 350,
      desc: "+25% mineral yield",
    },
    {
      type: "STORAGE_VAULT",
      name: "Storage Vault",
      icon: Database,
      cost: 150,
      desc: "Increases storage cap +50",
    },
  ],
};

const SPEC_ACCENT: Record<PlotSpecialization, string> = {
  TRADING_DEPOT: "#f59e0b",
  ENERGY_TECH: "#3b82f6",
  ARMORY: "#ef4444",
  RESOURCES: "#22c55e",
};

interface BuildingPickerProps {
  plotId: number;
  subId: number;
  onClose: () => void;
  specialization?: PlotSpecialization | null;
}

export default function BuildingPicker({
  plotId,
  subId,
  onClose,
  specialization,
}: BuildingPickerProps) {
  const player = useGameStore((s) => s.player);
  const buildStructure = useGameStore((s) => s.buildStructure);

  const buildingList = specialization
    ? SPEC_BUILDINGS[specialization]
    : BUILDINGS;
  const accent = specialization ? SPEC_ACCENT[specialization] : CYAN;

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
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: accent,
              letterSpacing: 2,
              fontWeight: 700,
            }}
          >
            SELECT BUILDING — SUB-PARCEL {subId}
          </span>
          {specialization && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                color: `${accent}99`,
                letterSpacing: 1,
              }}
            >
              {specialization.replace("_", " ")} STRUCTURES
            </span>
          )}
        </div>
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
          ✕
        </button>
      </div>

      {/* Building list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
        {buildingList.map((building) => {
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
                  background: `${accent}11`,
                  border: `1px solid ${accent}33`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  size={16}
                  color={canAfford ? accent : "rgba(100,120,140,0.5)"}
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
                    color: canAfford ? accent : "rgba(100,120,140,0.5)",
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
                      ? `${accent}1a`
                      : "rgba(50,60,70,0.3)",
                    border: `1px solid ${canAfford ? `${accent}66` : "rgba(80,100,120,0.3)"}`,
                    borderRadius: 4,
                    color: canAfford ? accent : "rgba(80,100,120,0.5)",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
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
