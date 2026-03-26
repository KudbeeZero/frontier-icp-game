import { useState } from "react";
import type { PlotData, SubParcel } from "../store/gameStore";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.2)";
const BG = "rgba(4,12,24,0.92)";
const PANEL = "rgba(0,20,40,0.85)";
const TEXT_DIM = "rgba(224,244,255,0.55)";

const CENTER_X = 150;
const CENTER_Y = 150;
const INNER_R = 62;
const OUTER_R = 132;

function getSliceColor(sp: SubParcel | undefined): string {
  if (!sp || !sp.unlocked) return "rgba(100,120,140,0.18)";
  if (!sp.buildingType) return "rgba(0,255,204,0.14)";
  const bt = sp.buildingType.toUpperCase();
  if (
    bt.includes("MISSILE_SILO") ||
    bt.includes("SILO") ||
    bt.includes("ARMORY") ||
    bt.includes("DEFENSE_TOWER") ||
    bt.includes("TOWER")
  )
    return "#ef4444";
  if (
    bt.includes("RESOURCE_EXTRACTOR") ||
    bt.includes("EXTRACTOR") ||
    bt.includes("MINING")
  )
    return "#22c55e";
  if (
    bt.includes("CYCLES_REACTOR") ||
    bt.includes("REACTOR") ||
    bt.includes("ENERGY") ||
    bt.includes("SHIELD_GENERATOR")
  )
    return "#3b82f6";
  if (
    bt.includes("RADAR_STATION") ||
    bt.includes("RADAR") ||
    bt.includes("TRADING") ||
    bt.includes("MARKET")
  )
    return "#f59e0b";
  return "rgba(0,255,204,0.14)";
}

function getSliceLabel(sp: SubParcel | undefined): string {
  if (!sp || !sp.unlocked) return "LOCKED";
  if (!sp.buildingType) return "EMPTY";
  const bt = sp.buildingType.toUpperCase();
  if (bt.includes("MISSILE_SILO") || bt.includes("SILO")) return "SILO";
  if (bt.includes("DEFENSE_TOWER") || bt.includes("TOWER")) return "TOWER";
  if (bt.includes("RESOURCE_EXTRACTOR") || bt.includes("EXTRACTOR"))
    return "EXTRACT";
  if (bt.includes("RADAR_STATION") || bt.includes("RADAR")) return "RADAR";
  if (bt.includes("SHIELD_GENERATOR") || bt.includes("SHIELD")) return "SHIELD";
  if (bt.includes("CYCLES_REACTOR") || bt.includes("REACTOR")) return "REACTOR";
  if (bt.includes("TRADING") || bt.includes("MARKET")) return "MARKET";
  return bt.slice(0, 7);
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
  gap = 3,
): string {
  const s = startDeg + gap;
  const e = endDeg - gap;
  const o1 = polarToCart(cx, cy, outerR, s);
  const o2 = polarToCart(cx, cy, outerR, e);
  const i1 = polarToCart(cx, cy, innerR, e);
  const i2 = polarToCart(cx, cy, innerR, s);
  const large = e - s > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function labelPos(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  midDeg: number,
) {
  const midR = (innerR + outerR) / 2;
  const pt = polarToCart(cx, cy, midR, midDeg);
  return pt;
}

interface SubParcelPieViewProps {
  plotId: number;
  plot: PlotData | null;
  subParcels: SubParcel[];
  onClose: () => void;
}

export default function SubParcelPieView({
  plotId,
  plot,
  subParcels,
  onClose,
}: SubParcelPieViewProps) {
  const [highlightedSlice, setHighlightedSlice] = useState<number | null>(null);

  // subParcels[0] = center nexus, subParcels[1..6] = edge slices
  const edgeParcels = subParcels.slice(1, 7);
  // If fewer than 6, fill with undefined
  const slices: (SubParcel | undefined)[] = Array.from(
    { length: 6 },
    (_, i) => edgeParcels[i],
  );

  const ownerLabel = plot?.owner
    ? plot.owner === "You" || (plot && plot.owner.length > 20)
      ? "YOU"
      : plot.owner.length > 10
        ? `${plot.owner.slice(0, 8)}...`
        : plot.owner
    : "VACANT";

  const isOwned = Boolean(plot?.owner);

  return (
    <div
      data-ocid="map.sub_parcel_pie.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 55,
        background: BG,
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 3,
              color: CYAN,
              fontFamily: "monospace",
            }}
          >
            SUB-PARCELS
          </div>
          <div
            style={{
              fontSize: 9,
              color: TEXT_DIM,
              letterSpacing: 1,
              fontFamily: "monospace",
              marginTop: 1,
            }}
          >
            PLOT #{plotId} &middot; {plot?.biome?.toUpperCase() ?? "UNKNOWN"}
          </div>
        </div>
        <button
          type="button"
          data-ocid="map.sub_parcel_pie.close_button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: TEXT_DIM,
            fontSize: 16,
            width: 32,
            height: 32,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &#215;
        </button>
      </div>

      {/* SVG Pie */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 16px",
          gap: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 16,
            backdropFilter: "blur(12px)",
          }}
        >
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            role="img"
            aria-label="Sub-parcel layout"
          >
            <title>Sub-parcel layout for plot</title>
            {/* Glow filter */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glowBright">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid rings */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={OUTER_R + 8}
              fill="none"
              stroke="rgba(0,255,204,0.04)"
              strokeWidth="1"
            />
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={OUTER_R}
              fill="none"
              stroke="rgba(0,255,204,0.08)"
              strokeWidth="0.5"
            />
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={INNER_R}
              fill="none"
              stroke="rgba(0,255,204,0.12)"
              strokeWidth="0.5"
            />

            {/* 6 Slices */}
            {slices.map((sp, i) => {
              const startDeg = i * 60;
              const endDeg = startDeg + 60;
              const midDeg = startDeg + 30;
              const color = getSliceColor(sp);
              const label = getSliceLabel(sp);
              const isHighlighted = highlightedSlice === i;
              const path = slicePath(
                CENTER_X,
                CENTER_Y,
                INNER_R,
                OUTER_R,
                startDeg,
                endDeg,
              );
              const lp = labelPos(CENTER_X, CENTER_Y, INNER_R, OUTER_R, midDeg);
              const highlightPath = slicePath(
                CENTER_X,
                CENTER_Y,
                INNER_R - 4,
                OUTER_R + 10,
                startDeg,
                endDeg,
                1,
              );

              return (
                <g key={sp?.subId ?? i + 100}>
                  {/* Highlight glow ring when selected */}
                  {isHighlighted && (
                    <path
                      d={highlightPath}
                      fill="none"
                      stroke={
                        color === "rgba(0,255,204,0.14)" ||
                        color === "rgba(100,120,140,0.18)"
                          ? CYAN
                          : color
                      }
                      strokeWidth="2"
                      opacity="0.8"
                      filter="url(#glowBright)"
                    />
                  )}
                  {/* Slice fill */}
                  <path
                    d={path}
                    fill={color}
                    stroke={
                      isHighlighted
                        ? color === "rgba(0,255,204,0.14)"
                          ? CYAN
                          : color
                        : "rgba(0,255,204,0.12)"
                    }
                    strokeWidth={isHighlighted ? 1.5 : 0.5}
                    style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                    opacity={isHighlighted ? 1 : 0.75}
                    onClick={() =>
                      setHighlightedSlice(isHighlighted ? null : i)
                    }
                    onKeyUp={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setHighlightedSlice(isHighlighted ? null : i);
                    }}
                    tabIndex={0}
                    data-ocid={`map.sub_parcel_pie.item.${i + 1}`}
                  />
                  {/* Label */}
                  <text
                    x={lp.x}
                    y={lp.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="0.5"
                    fill={isHighlighted ? "#fff" : "rgba(224,244,255,0.7)"}
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                  {/* Slot number */}
                  <text
                    x={
                      labelPos(
                        CENTER_X,
                        CENTER_Y,
                        OUTER_R - 12,
                        OUTER_R,
                        midDeg,
                      ).x
                    }
                    y={
                      labelPos(
                        CENTER_X,
                        CENTER_Y,
                        OUTER_R - 12,
                        OUTER_R,
                        midDeg,
                      ).y
                    }
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="6"
                    fontFamily="monospace"
                    fill="rgba(224,244,255,0.35)"
                    style={{ pointerEvents: "none" }}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={INNER_R - 4}
              fill="rgba(4,12,24,0.9)"
              stroke={CYAN}
              strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,255,204,0.4))" }}
            />

            {/* Center icon / text */}
            {isOwned ? (
              <>
                <text
                  x={CENTER_X}
                  y={CENTER_Y - 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="22"
                  fill={CYAN}
                >
                  {ownerLabel === "YOU" ? "\u2606" : "\u2691"}
                </text>
                <text
                  x={CENTER_X}
                  y={CENTER_Y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="1"
                  fill={CYAN}
                >
                  {ownerLabel}
                </text>
                <text
                  x={CENTER_X}
                  y={CENTER_Y + 22}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fill="rgba(0,255,204,0.5)"
                >
                  NEXUS
                </text>
              </>
            ) : (
              <>
                <text
                  x={CENTER_X}
                  y={CENTER_Y - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  fill="rgba(224,244,255,0.2)"
                >
                  &#9898;
                </text>
                <text
                  x={CENTER_X}
                  y={CENTER_Y + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="700"
                  letterSpacing="1"
                  fill="rgba(224,244,255,0.3)"
                >
                  VACANT
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div
          style={{
            width: "100%",
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "10px 12px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: TEXT_DIM,
              letterSpacing: 2,
              fontFamily: "monospace",
              marginBottom: 8,
            }}
          >
            LEGEND
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5px 12px",
            }}
          >
            {[
              { color: "#ef4444", label: "ARMORY / SILO / TOWER" },
              { color: "#22c55e", label: "RESOURCES / EXTRACTOR" },
              { color: "#3b82f6", label: "ENERGY / REACTOR" },
              { color: "#f59e0b", label: "TRADING / RADAR" },
              { color: "rgba(0,255,204,0.5)", label: "EMPTY (UNLOCKED)" },
              { color: "rgba(100,120,140,0.5)", label: "LOCKED" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 7.5,
                    color: TEXT_DIM,
                    fontFamily: "monospace",
                    letterSpacing: 0.5,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slice detail (when highlighted) */}
        {highlightedSlice !== null &&
          (() => {
            const sp = slices[highlightedSlice];
            const color = getSliceColor(sp);
            return (
              <div
                data-ocid="map.sub_parcel_pie.panel"
                style={{
                  width: "100%",
                  background: `${color}12`,
                  border: `1px solid ${color}55`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color,
                    letterSpacing: 2,
                    fontFamily: "monospace",
                    marginBottom: 4,
                  }}
                >
                  SLOT {highlightedSlice + 1}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: TEXT_DIM,
                    fontFamily: "monospace",
                    letterSpacing: 0.5,
                  }}
                >
                  Status: {sp?.unlocked ? "UNLOCKED" : "LOCKED"}
                </div>
                {sp?.buildingType && (
                  <div
                    style={{
                      fontSize: 8,
                      color: TEXT_DIM,
                      fontFamily: "monospace",
                      letterSpacing: 0.5,
                      marginTop: 2,
                    }}
                  >
                    Building: {sp.buildingType}
                  </div>
                )}
                {sp?.durability != null && sp.durability > 0 && (
                  <div
                    style={{
                      fontSize: 8,
                      color: TEXT_DIM,
                      fontFamily: "monospace",
                      letterSpacing: 0.5,
                      marginTop: 2,
                    }}
                  >
                    Durability: {sp.durability}%
                  </div>
                )}
              </div>
            );
          })()}

        <button
          type="button"
          data-ocid="map.sub_parcel_pie.close_button"
          onClick={onClose}
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "13px 0",
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${CYAN}`,
            borderRadius: 8,
            color: CYAN,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
