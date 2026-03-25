import {
  Lock,
  Pickaxe,
  Plus,
  Radio,
  Shield,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { SubParcel } from "../store/gameStore";
import BuildingPicker from "./BuildingPicker";

// Design tokens — match existing dark glass HUD
const CYAN = "#00ffcc";
const BG = "rgba(2,10,20,0.92)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

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

export default function SubParcelPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const player = useGameStore((s) => s.player);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const selectPlot = useGameStore((s) => s.selectPlot);

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
        />
      )}
    </>
  );
}
