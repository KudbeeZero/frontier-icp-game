import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const COOLDOWN_MS = 14_400_000; // 4 hours in ms

type SlotStatus = "ACTIVE" | "COOLDOWN" | "EMPTY";

interface SlotData {
  slotIndex: number;
  subId: number;
  label: string;
  status: SlotStatus;
  secondsRemaining: number;
  buildingType: string;
}

interface Props {
  plotId: number | string;
  plotsOwned?: (number | string)[];
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildSlots(
  plotId: number,
  purchaseTime: number | undefined,
): SlotData[] {
  const now = Date.now();
  const elapsed = purchaseTime ? now - purchaseTime : COOLDOWN_MS;
  return Array.from({ length: 7 }, (_, i) => {
    const subId = plotId * 10 + i;
    const label = i === 0 ? "NEXUS" : `SLOT ${i}`;
    let status: SlotStatus;
    let secondsRemaining = 0;
    if (i === 0) {
      // Nexus is always active
      status = "ACTIVE";
    } else if (elapsed < COOLDOWN_MS) {
      status = "COOLDOWN";
      secondsRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    } else {
      status = "EMPTY";
    }
    return {
      slotIndex: i,
      subId,
      label,
      status,
      secondsRemaining,
      buildingType: "",
    };
  });
}

export function SubParcelIntelView({ plotId, plotsOwned }: Props) {
  const plotPurchaseTimes = useGameStore((s) => s.plotPurchaseTimes);
  const storePlotsOwned = useGameStore((s) => s.player.plotsOwned);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ownedList = plotsOwned ?? storePlotsOwned;
  const isOwned = ownedList.map(String).includes(String(plotId));
  const purchaseTime = plotPurchaseTimes[Number(plotId)];

  useEffect(() => {
    if (!isOwned) return;
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOwned]);

  // suppress unused 'now' warning — used to trigger re-render for countdown
  void now;

  if (!plotId && plotId !== 0) return null;
  if (!isOwned) {
    return (
      <div
        style={{
          padding: "20px 16px",
          textAlign: "center",
          color: "#585b70",
          fontSize: "11px",
          fontFamily: "monospace",
          letterSpacing: "0.05em",
        }}
      >
        Select an owned plot on the globe to view sub-parcels.
      </div>
    );
  }

  const slots = buildSlots(Number(plotId), purchaseTime);
  const nexus = slots[0];
  // surrounding slots at 60° intervals: top-right, right, bottom-right, bottom-left, left, top-left
  const surrounding = slots.slice(1);

  // Radial layout: center = 50%,50%; radius = 42% of container
  // Angles: slot 1=−90° (top), then clockwise 60° each
  const angles = [-90, -30, 30, 90, 150, 210];

  function slotColor(status: SlotStatus): string {
    if (status === "ACTIVE") return "#00ffcc";
    if (status === "COOLDOWN") return "#f59e0b";
    return "#4b5563";
  }

  function slotBg(status: SlotStatus): string {
    if (status === "ACTIVE") return "rgba(0,255,204,0.08)";
    if (status === "COOLDOWN") return "rgba(245,158,11,0.08)";
    return "rgba(20,24,40,0.6)";
  }

  function slotBorder(status: SlotStatus): string {
    if (status === "ACTIVE") return "1px solid rgba(0,255,204,0.4)";
    if (status === "COOLDOWN") return "1px solid rgba(245,158,11,0.5)";
    return "1px solid #374151";
  }

  const containerSize = 220;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;
  const radius = 76;
  const nexusR = 36;
  const slotR = 28;

  return (
    <div style={{ padding: "12px 10px" }}>
      {/* Plot ID header */}
      <div
        style={{
          fontSize: "9px",
          color: "#7f849c",
          fontFamily: "monospace",
          letterSpacing: "0.12em",
          marginBottom: "8px",
          textTransform: "uppercase",
        }}
      >
        PLOT #{plotId} · 7 SUB-PARCELS
      </div>

      {/* SVG radial layout */}
      <div
        style={{
          position: "relative",
          width: containerSize,
          height: containerSize,
          margin: "0 auto",
        }}
      >
        <svg
          role="img"
          aria-label="Sub-parcel connector lines"
          width={containerSize}
          height={containerSize}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {/* Connector lines from center to each surrounding slot */}
          {angles.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x2 = centerX + Math.cos(rad) * radius;
            const y2 = centerY + Math.sin(rad) * radius;
            return (
              <line
                key={angle}
                x1={centerX}
                y1={centerY}
                x2={x2}
                y2={y2}
                stroke={slotColor(surrounding[i].status)}
                strokeWidth={0.5}
                strokeOpacity={0.25}
              />
            );
          })}
        </svg>

        {/* Nexus center node */}
        <div
          data-ocid={"subparcel.slot.0"}
          style={{
            position: "absolute",
            left: centerX - nexusR,
            top: centerY - nexusR,
            width: nexusR * 2,
            height: nexusR * 2,
            borderRadius: "50%",
            background: slotBg(nexus.status),
            border: `2px solid ${slotColor(nexus.status)}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              fontSize: "7px",
              color: slotColor(nexus.status),
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              fontWeight: 700,
            }}
          >
            NEXUS
          </div>
          <div
            style={{
              fontSize: "6px",
              color: "rgba(0,255,204,0.5)",
              fontFamily: "monospace",
            }}
          >
            #{nexus.subId}
          </div>
          <div
            style={{
              fontSize: "6px",
              color: slotColor(nexus.status),
              fontFamily: "monospace",
            }}
          >
            ACTIVE
          </div>
        </div>

        {/* Surrounding slots */}
        {surrounding.map((slot, i) => {
          const angle = angles[i];
          const rad = (angle * Math.PI) / 180;
          const cx = centerX + Math.cos(rad) * radius;
          const cy = centerY + Math.sin(rad) * radius;
          return (
            <div
              key={slot.slotIndex}
              data-ocid={`subparcel.slot.${slot.slotIndex}`}
              style={{
                position: "absolute",
                left: cx - slotR,
                top: cy - slotR,
                width: slotR * 2,
                height: slotR * 2,
                borderRadius: "6px",
                background: slotBg(slot.status),
                border: slotBorder(slot.status),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                backdropFilter: "blur(6px)",
              }}
            >
              <div
                style={{
                  fontSize: "7px",
                  color: slotColor(slot.status),
                  fontFamily: "monospace",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {slot.label}
              </div>
              <div
                style={{
                  fontSize: "6px",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "monospace",
                }}
              >
                #{slot.subId}
              </div>
              {slot.status === "COOLDOWN" ? (
                <div
                  style={{
                    fontSize: "6px",
                    color: "#f59e0b",
                    fontFamily: "monospace",
                  }}
                >
                  {formatCountdown(slot.secondsRemaining)}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "6px",
                    color: slotColor(slot.status),
                    fontFamily: "monospace",
                  }}
                >
                  {slot.status}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "8px",
        }}
      >
        {(["ACTIVE", "COOLDOWN", "EMPTY"] as SlotStatus[]).map((s) => (
          <div
            key={s}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: slotColor(s),
              }}
            />
            <span
              style={{
                fontSize: "7px",
                color: "#7f849c",
                fontFamily: "monospace",
                letterSpacing: "0.08em",
              }}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubParcelIntelView;
