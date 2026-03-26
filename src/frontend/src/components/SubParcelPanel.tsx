import {
  Lock,
  Pickaxe,
  Plus,
  Radio,
  Shield,
  ShieldCheck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type MilitaryBranch,
  type OwnedCommander,
  getArchetype,
  getCurrentRank,
} from "../constants/commanders";
import { type PlotSpecialization, useGameStore } from "../store/gameStore";
import type { PlayerRank, SubParcel } from "../store/gameStore";
import BuildingPicker from "./BuildingPicker";

// Fallback image for broken commander insignia
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23112233' rx='6'/%3E%3Ctext x='24' y='32' text-anchor='middle' fill='%2300ffcc' font-size='20'%3E%E2%98%85%3C/text%3E%3C/svg%3E";

// Map account-level PlayerRank to a numeric tier for comparisons
const PLAYER_RANK_LEVEL: Record<PlayerRank, number> = {
  Lieutenant: 0,
  Captain: 1,
  Colonel: 2,
  General: 3,
};

// Map commander pay grade to required minimum PlayerRank level
function requiredPlayerLevel(payGrade: string): number {
  if (payGrade.startsWith("E")) return 0; // NCO — any rank
  if (payGrade.startsWith("W")) return 1; // Warrant — Captain+
  if (payGrade.startsWith("O")) {
    const n = Number.parseInt(payGrade.split("-")[1] ?? "1", 10);
    if (n <= 3) return 1; // O-1 to O-3 — Captain+
    if (n <= 6) return 2; // O-4 to O-6 — Colonel+
    return 3; // O-7+ — General
  }
  return 0;
}

// Design tokens — match existing dark glass HUD
const CYAN = "#00ffcc";
const BG = "rgba(2,10,20,0.92)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const SPEC_CONFIG: Record<
  PlotSpecialization,
  { color: string; label: string; buff: string }
> = {
  TRADING_DEPOT: {
    color: "#f59e0b",
    label: "TRADING DEPOT",
    buff: "+10% FRNTR from combat wins",
  },
  ENERGY_TECH: {
    color: "#3b82f6",
    label: "ENERGY & TECH",
    buff: "Dome Shield -10% damage taken",
  },
  ARMORY: {
    color: "#ef4444",
    label: "ARMORY",
    buff: "+5% hit target accuracy",
  },
  RESOURCES: {
    color: "#22c55e",
    label: "RESOURCES",
    buff: "+15% mineral yield",
  },
};

const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// 7 positions in a flower layout: center + 6 edges
// Expressed as [x%, y%] offsets from a 260px × 280px container
const POSITIONS: [number, number][] = [
  [50, 50], // 0 center
  [50, 10], // 1 top
  [82, 28], // 2 top-right
  [82, 68], // 3 bottom-right
  [50, 86], // 4 bottom
  [18, 68], // 5 bottom-left
  [18, 28], // 6 top-left
];

function formatCountdown(purchaseTime: number): string {
  const unlockAt = purchaseTime + 4 * 60 * 60 * 1000;
  const remaining = unlockAt - Date.now();
  if (remaining <= 0) return "READY";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function buildingLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function BuildingIcon({ type, size = 18 }: { type: string; size?: number }) {
  const props = { size, color: CYAN };
  if (type === "MISSILE_SILO") return <Zap {...props} />;
  if (type === "DEFENSE_TOWER") return <Shield {...props} />;
  if (type === "RESOURCE_EXTRACTOR") return <Pickaxe {...props} />;
  if (type === "RADAR_STATION") return <Radio {...props} />;
  if (type === "SHIELD_GENERATOR") return <ShieldCheck {...props} />;
  return <Zap {...props} />;
}

function DurabilityBar({ value }: { value: number }) {
  const color = value > 60 ? "#22c55e" : value > 30 ? "#eab308" : "#ef4444";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 6,
        left: 8,
        right: 8,
        height: 3,
        background: "rgba(255,255,255,0.12)",
        borderRadius: 2,
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function HexCell({
  parcel,
  isCenter,
  onBuild,
}: {
  parcel: SubParcel;
  isCenter: boolean;
  onBuild: (subId: number) => void;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!parcel.unlocked) {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }
  }, [parcel.unlocked]);

  if (isCenter) {
    return (
      <div
        data-ocid="subparcel.center.card"
        style={{
          clipPath: HEX_CLIP,
          width: 80,
          height: 90,
          background: "rgba(20,60,30,0.85)",
          border: "1.5px solid rgba(34,197,94,0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          cursor: "default",
          position: "relative",
        }}
      >
        <Lock size={14} color="#22c55e" />
        <span
          style={{
            fontSize: 6,
            fontWeight: 700,
            color: "#22c55e",
            letterSpacing: 0.5,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          CANISTER{"\n"}NODE
        </span>
        <span
          style={{
            fontSize: 5,
            color: "rgba(160,200,160,0.6)",
            letterSpacing: 0.5,
          }}
        >
          PERMANENT
        </span>
      </div>
    );
  }

  if (!parcel.unlocked) {
    const countdown = formatCountdown(parcel.purchaseTime);
    return (
      <div
        data-ocid={`subparcel.locked.card.${parcel.subId}`}
        style={{
          clipPath: HEX_CLIP,
          width: 80,
          height: 90,
          background: "rgba(10,15,25,0.85)",
          border: "1px solid rgba(100,120,140,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          cursor: "not-allowed",
        }}
      >
        <Lock size={14} color="rgba(100,120,140,0.7)" />
        <span
          style={{
            fontSize: 7,
            color: "rgba(0,255,204,0.5)",
            fontFamily: "monospace",
            letterSpacing: 0.5,
          }}
        >
          {countdown}
        </span>
        <span
          style={{
            fontSize: 5,
            color: "rgba(100,120,140,0.5)",
            letterSpacing: 1,
          }}
        >
          LOCKED
        </span>
      </div>
    );
  }

  if (parcel.buildingType) {
    return (
      <div
        data-ocid={`subparcel.built.card.${parcel.subId}`}
        style={{
          clipPath: HEX_CLIP,
          width: 80,
          height: 90,
          background: "rgba(8,18,35,0.9)",
          border: "1px solid rgba(0,255,204,0.28)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          cursor: "default",
          position: "relative",
        }}
      >
        <BuildingIcon type={parcel.buildingType} />
        <span
          style={{
            fontSize: 6,
            color: TEXT,
            fontWeight: 700,
            letterSpacing: 0.5,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {buildingLabel(parcel.buildingType)}
        </span>
        <DurabilityBar value={parcel.durability} />
      </div>
    );
  }

  // Unlocked + empty
  return (
    <button
      type="button"
      data-ocid={`subparcel.build.button.${parcel.subId}`}
      onClick={() => onBuild(parcel.subId)}
      style={{
        clipPath: HEX_CLIP,
        width: 80,
        height: 90,
        background: "rgba(0,40,50,0.7)",
        border: "2px dashed rgba(0,255,204,0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        cursor: "pointer",
        outline: "none",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,255,204,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,40,50,0.7)";
      }}
    >
      <Plus size={18} color={CYAN} />
      <span
        style={{
          fontSize: 7,
          color: CYAN,
          letterSpacing: 1.5,
          fontWeight: 700,
        }}
      >
        BUILD
      </span>
    </button>
  );
}

// Derive the account-level PlayerRank from combat wins
function derivePlayerRank(combatWins: number): PlayerRank {
  if (combatWins >= 50) return "General";
  if (combatWins >= 20) return "Colonel";
  if (combatWins >= 5) return "Captain";
  return "Lieutenant";
}

// Commander assignment mini-panel for a sub-parcel
function CommanderAssignPanel({
  subId,
  plotId,
  playerRank,
  ownedCommanders,
  currentAssignment,
}: {
  subId: number;
  plotId: number;
  playerRank: PlayerRank;
  ownedCommanders: OwnedCommander[];
  currentAssignment: string | null;
}) {
  const [open, setOpen] = useState(false);
  const assignCommander = useGameStore((s) => s.assignCommanderToPlot);
  const removeCommander = useGameStore((s) => s.removeCommanderFromPlot);
  const isCenter = subId === 0;
  const playerLevel = PLAYER_RANK_LEVEL[playerRank];

  const validCommanders = ownedCommanders.filter((c) => {
    const rank = getCurrentRank(c);
    if (!rank) return false;
    const pg = rank.payGrade;
    // Center nexus requires an officer
    if (isCenter && !pg.startsWith("O")) return false;
    // Player's account rank must meet the requirement
    if (requiredPlayerLevel(pg) > playerLevel) return false;
    return true;
  });

  if (!open) {
    return (
      <button
        type="button"
        data-ocid={`subparcel.assign.button.${subId}`}
        onClick={() => setOpen(true)}
        title={
          isCenter
            ? "CENTER NEXUS: OFFICER RANK REQUIRED (O-1+)"
            : "Assign Commander"
        }
        style={{
          marginTop: 4,
          width: "100%",
          background: "none",
          border: "1px dashed rgba(0,255,204,0.3)",
          borderRadius: 4,
          color: "rgba(0,255,204,0.6)",
          fontSize: 7,
          fontFamily: "monospace",
          letterSpacing: 1,
          padding: "3px 0",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <UserCheck size={10} />
        {currentAssignment ? "REASSIGN" : "ASSIGN CDR"}
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 4,
        background: "rgba(2,10,20,0.95)",
        border: "1px solid rgba(0,255,204,0.2)",
        borderRadius: 4,
        padding: 4,
        maxHeight: 120,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 7,
          color: "rgba(0,255,204,0.5)",
          letterSpacing: 1,
          marginBottom: 3,
          fontFamily: "monospace",
        }}
      >
        {isCenter ? "OFFICER REQUIRED" : "SELECT CDR"}
      </div>
      {currentAssignment && (
        <button
          type="button"
          data-ocid={`subparcel.remove_commander.button.${subId}`}
          onClick={() => {
            removeCommander(plotId);
            setOpen(false);
          }}
          style={{
            width: "100%",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 3,
            color: "#ef4444",
            fontSize: 7,
            padding: "2px 4px",
            cursor: "pointer",
            marginBottom: 3,
            fontFamily: "monospace",
          }}
        >
          REMOVE
        </button>
      )}
      {validCommanders.length === 0 ? (
        <div
          style={{
            fontSize: 7,
            color: "rgba(239,68,68,0.7)",
            fontFamily: "monospace",
            textAlign: "center",
            padding: 4,
          }}
        >
          {isCenter
            ? "NO OFFICERS AVAILABLE"
            : "RANK TOO HIGH — PROMOTE YOUR ACCOUNT FIRST"}
        </div>
      ) : (
        validCommanders.map((c) => {
          const arch = getArchetype(c.archetypeId as MilitaryBranch);
          const rank = getCurrentRank(c);
          if (!arch || !rank) return null;
          return (
            <button
              key={c.instanceId}
              type="button"
              data-ocid={`subparcel.select_commander.button.${subId}`}
              onClick={() => {
                assignCommander(plotId, c.instanceId);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(0,255,204,0.05)",
                border: "1px solid rgba(0,255,204,0.15)",
                borderRadius: 3,
                padding: "3px 4px",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              <img
                src={rank.image}
                alt={rank.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
                style={{ width: 16, height: 16, objectFit: "contain" }}
              />
              <span
                style={{
                  fontSize: 7,
                  color: "#e0f4ff",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {rank.abbreviation} — {arch.name}
              </span>
            </button>
          );
        })
      )}
      <button
        type="button"
        data-ocid={`subparcel.cancel_assign.button.${subId}`}
        onClick={() => setOpen(false)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          color: "rgba(0,255,204,0.4)",
          fontSize: 7,
          cursor: "pointer",
          marginTop: 2,
          fontFamily: "monospace",
        }}
      >
        CANCEL
      </button>
    </div>
  );
}

export default function SubParcelPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const player = useGameStore((s) => s.player);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const ownedCommanders = useGameStore((s) => s.ownedCommanders);
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);
  const rankStats = useGameStore((s) => s.rankStats);
  const playerRank = derivePlayerRank(rankStats.combatWins);

  const plots = useGameStore((s) => s.plots);
  const upgradeStorage = useGameStore((s) => s.upgradeStorage);
  const getNetworkBonus = useGameStore((s) => s.getNetworkBonus);
  const [pickerSubId, setPickerSubId] = useState<number | null>(null);
  const parcelsRef = useRef<SubParcel[]>([]);

  const isOwned =
    selectedPlotId !== null &&
    (player.plotsOwned.includes(selectedPlotId) || selectedPlotId < 500);

  const visible = isOwned && selectedPlotId !== null;

  // Load sub-parcels when visible
  if (visible && selectedPlotId !== null) {
    parcelsRef.current = getSubParcels(selectedPlotId);
  }

  const parcels = parcelsRef.current;
  const currentPlot =
    selectedPlotId !== null ? plots.find((p) => p.id === selectedPlotId) : null;
  const specialization = currentPlot?.specialization ?? null;
  const networkBonus = getNetworkBonus();

  return (
    <>
      {/* Sub-parcel slide-up panel */}
      <div
        data-ocid="subparcel.panel"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 45,
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          background: BG,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${BORDER}`,
          borderRadius: "16px 16px 0 0",
          maxHeight: "60vh",
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
            background: "rgba(0,255,204,0.25)",
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
            padding: "10px 16px 6px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: CYAN,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              SUB-PARCELS — PLOT #{selectedPlotId ?? "--"}
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {specialization && (
                <span
                  data-ocid="subparcel.specialization.toggle"
                  style={{
                    fontSize: 8,
                    padding: "2px 7px",
                    borderRadius: 3,
                    background: `${SPEC_CONFIG[specialization].color}22`,
                    border: `1px solid ${SPEC_CONFIG[specialization].color}66`,
                    color: SPEC_CONFIG[specialization].color,
                    fontFamily: "monospace",
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}
                >
                  {SPEC_CONFIG[specialization].label} ·{" "}
                  {SPEC_CONFIG[specialization].buff}
                </span>
              )}
              {networkBonus && (
                <span
                  data-ocid="subparcel.network_linked.success_state"
                  style={{
                    fontSize: 8,
                    padding: "2px 7px",
                    borderRadius: 3,
                    background: "rgba(0,255,204,0.08)",
                    border: "1px solid rgba(0,255,204,0.4)",
                    color: CYAN,
                    fontFamily: "monospace",
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}
                >
                  ⧡ NETWORK LINKED
                </span>
              )}
              {specialization === "RESOURCES" &&
                player.resourceStorageCap < 500 && (
                  <button
                    type="button"
                    data-ocid="subparcel.upgrade_storage.button"
                    onClick={() =>
                      selectedPlotId !== null && upgradeStorage(selectedPlotId)
                    }
                    disabled={player.frntBalance < 150}
                    style={{
                      fontSize: 7,
                      padding: "2px 7px",
                      borderRadius: 3,
                      background:
                        player.frntBalance >= 150
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(34,197,94,0.04)",
                      border: `1px solid ${player.frntBalance >= 150 ? "#22c55e66" : "#22c55e22"}`,
                      color:
                        player.frntBalance >= 150
                          ? "#22c55e"
                          : "rgba(34,197,94,0.4)",
                      fontFamily: "monospace",
                      letterSpacing: 1,
                      fontWeight: 700,
                      cursor:
                        player.frntBalance >= 150 ? "pointer" : "not-allowed",
                    }}
                  >
                    UPGRADE STORAGE +50 → 150 FRNTR (cap:{" "}
                    {player.resourceStorageCap})
                  </button>
                )}
            </div>
          </div>
          <button
            type="button"
            data-ocid="subparcel.close_button"
            onClick={() => selectPlot(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(0,255,204,0.5)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Close sub-parcel panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hex grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 0 20px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 260,
              height: 280,
              flexShrink: 0,
            }}
          >
            {parcels.map((parcel, idx) => {
              const [px, py] = POSITIONS[idx];
              return (
                <div
                  key={parcel.subId}
                  style={{
                    position: "absolute",
                    left: `calc(${px}% - 40px)`,
                    top: `calc(${py}% - 45px)`,
                  }}
                >
                  <HexCell
                    parcel={parcel}
                    isCenter={parcel.subId === 0}
                    onBuild={setPickerSubId}
                  />
                  {parcel.unlocked && selectedPlotId !== null && (
                    <CommanderAssignPanel
                      subId={parcel.subId}
                      plotId={selectedPlotId}
                      playerRank={playerRank}
                      ownedCommanders={ownedCommanders}
                      currentAssignment={
                        commanderAssignments[selectedPlotId] ?? null
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            padding: "0 16px 16px",
            flexShrink: 0,
            borderTop: "1px solid rgba(0,255,204,0.08)",
            paddingTop: 10,
          }}
        >
          {[
            { color: "#22c55e", label: "Permanent" },
            { color: "rgba(100,120,140,0.7)", label: "Locked" },
            { color: CYAN, label: "Build" },
            { color: "#e0f4ff", label: "Built" },
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color,
                }}
              />
              <span
                style={{
                  fontSize: 8,
                  color: "rgba(160,200,220,0.5)",
                  letterSpacing: 1,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Building picker sheet */}
      {pickerSubId !== null && selectedPlotId !== null && (
        <BuildingPicker
          plotId={selectedPlotId}
          subId={pickerSubId}
          onClose={() => setPickerSubId(null)}
          specialization={specialization}
        />
      )}
    </>
  );
}
