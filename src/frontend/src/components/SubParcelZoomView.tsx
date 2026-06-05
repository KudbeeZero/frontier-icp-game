import { X } from "lucide-react";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubParcel {
  index: number; // 0 = center nexus, 1-6 = outer ring
  owner: string | null; // principal string or null
  upgraded: boolean;
  label: string;
}

interface SubParcelZoomViewProps {
  plotOwner: string | null;
  subParcels?: SubParcel[];
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTOR_LABELS = ["α", "β", "γ", "δ", "ε", "ζ"];

function shortPrincipal(p: string | null): string {
  if (!p) return "VACANT";
  return p.slice(0, 8).toUpperCase();
}

// ── Pie slice math ────────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const si = polarToCartesian(cx, cy, innerR, startDeg);
  const ei = polarToCartesian(cx, cy, innerR, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${si.x} ${si.y}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${si.x} ${si.y}`,
    "Z",
  ].join(" ");
}

function sliceLabelPos(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
) {
  const mid = (startDeg + endDeg) / 2;
  const labelR = (r + innerR) / 2;
  return polarToCartesian(cx, cy, labelR, mid);
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function sliceColor(parcel: SubParcel | undefined, selected: boolean) {
  if (!parcel || !parcel.owner) {
    return selected
      ? { fill: "rgba(80,100,110,0.45)", stroke: "rgba(120,160,170,0.6)" }
      : { fill: "rgba(30,40,50,0.55)", stroke: "rgba(60,90,100,0.35)" };
  }
  if (parcel.upgraded) {
    return selected
      ? { fill: "rgba(0,255,204,0.25)", stroke: "#00ffcc" }
      : { fill: "rgba(0,255,204,0.12)", stroke: "rgba(0,255,204,0.55)" };
  }
  // owned but not upgraded
  return selected
    ? { fill: "rgba(0,180,160,0.2)", stroke: "rgba(0,200,180,0.7)" }
    : { fill: "rgba(0,120,110,0.1)", stroke: "rgba(0,160,150,0.35)" };
}

// ── Sub-parcel detail card ─────────────────────────────────────────────────────
function ParcelDetail({
  parcel,
  index,
}: { parcel: SubParcel | undefined; index: number }) {
  const isCenter = index === 0;
  const label = isCenter ? "NEXUS" : `SECTOR ${SECTOR_LABELS[index - 1]}`;
  const owned = parcel?.owner != null;
  const upgraded = parcel?.upgraded ?? false;

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(0,255,204,0.04)",
        border: owned
          ? "1px solid rgba(0,255,204,0.2)"
          : "1px solid rgba(60,90,100,0.35)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: owned ? "#00ffcc" : "rgba(120,160,170,0.6)" }}
        >
          {label}
        </span>
        <span
          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            background: owned ? "rgba(0,255,204,0.1)" : "rgba(60,90,100,0.25)",
            color: owned ? "#00ffcc" : "rgba(120,160,170,0.55)",
          }}
        >
          {owned ? (upgraded ? "UPGRADED" : "OWNED") : "VACANT"}
        </span>
      </div>
      <div className="text-[11px]" style={{ color: "rgba(180,220,220,0.65)" }}>
        {owned ? (
          <>
            <div className="flex justify-between">
              <span style={{ color: "rgba(180,220,220,0.45)" }}>Owner</span>
              <span
                className="font-mono"
                style={{ color: "rgba(0,255,204,0.85)" }}
              >
                {shortPrincipal(parcel?.owner ?? null)}
              </span>
            </div>
            {isCenter && (
              <div
                className="mt-1.5 text-[9px] uppercase tracking-wider"
                style={{ color: "rgba(0,255,204,0.4)" }}
              >
                ★ Electricity bonuses available when upgraded
              </div>
            )}
          </>
        ) : (
          <span
            className="text-[10px]"
            style={{ color: "rgba(120,160,170,0.45)" }}
          >
            Unclaimed — available for purchase
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SubParcelZoomView({
  plotOwner,
  subParcels,
  onClose,
}: SubParcelZoomViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Build a lookup keyed by index
  const parcelMap = new Map<number, SubParcel>();
  for (const p of subParcels ?? []) parcelMap.set(p.index, p);

  // Fallback demo parcels so the view always has something to show
  const getParcel = (i: number): SubParcel | undefined => {
    if (parcelMap.has(i)) return parcelMap.get(i);
    // demo fill
    if (i === 0 && plotOwner)
      return { index: 0, owner: plotOwner, upgraded: false, label: "Nexus" };
    const demoOwned = !!plotOwner && i <= 2;
    return {
      index: i,
      owner: demoOwned ? plotOwner : null,
      upgraded: demoOwned && i === 1,
      label: `Sector ${i}`,
    };
  };

  const CX = 120;
  const CY = 120;
  const OUTER_R = 100;
  const INNER_R = 38;
  const CENTER_R = 32;
  const GAP = 3; // degrees of gap between slices
  const SLICES = 6;
  const SLICE_DEG = 360 / SLICES;

  return (
    <div
      data-ocid="subparcel.panel"
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "rgba(180,220,220,0.85)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,255,204,0.15)" }}
      >
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#00ffcc" }}
          >
            SUB-PARCEL SCAN
          </h3>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: "rgba(180,220,220,0.4)" }}
          >
            Owned by:{" "}
            <span className="font-mono">{shortPrincipal(plotOwner)}</span>
          </p>
        </div>
        <button
          type="button"
          data-ocid="subparcel.close_button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(0,255,204,0.2)",
          }}
          aria-label="Close sub-parcel view"
        >
          <X size={13} style={{ color: "rgba(180,220,220,0.7)" }} />
        </button>
      </div>

      {/* Main layout: SVG + detail */}
      <div className="flex-1 overflow-y-auto">
        {/* SVG Pie-slice diagram */}
        <div className="flex justify-center py-4">
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            role="img"
            aria-labelledby="subparcel-svg-title"
          >
            <title id="subparcel-svg-title">Sub-parcel pie diagram</title>
            {/* Glow ring */}
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R + 6}
              fill="none"
              stroke="rgba(0,255,204,0.08)"
              strokeWidth="12"
            />
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R + 2}
              fill="none"
              stroke="rgba(0,255,204,0.15)"
              strokeWidth="1"
            />

            {/* 6 outer slices */}
            {Array.from({ length: SLICES }, (_, i) => {
              const parcelIdx = i + 1; // outer parcels are 1-6
              const startDeg = i * SLICE_DEG + GAP / 2;
              const endDeg = (i + 1) * SLICE_DEG - GAP / 2;
              const parcel = getParcel(parcelIdx);
              const isSelected = selectedIndex === parcelIdx;
              const colors = sliceColor(parcel, isSelected);
              const labelPos = sliceLabelPos(
                CX,
                CY,
                OUTER_R,
                INNER_R,
                startDeg,
                endDeg,
              );

              return (
                <g key={parcelIdx}>
                  <path
                    d={slicePath(CX, CY, OUTER_R, INNER_R, startDeg, endDeg)}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 1.5 : 1}
                    style={{
                      cursor: "pointer",
                      transition: "fill 0.2s, stroke 0.2s",
                    }}
                    onClick={() =>
                      setSelectedIndex(isSelected ? null : parcelIdx)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedIndex(isSelected ? null : parcelIdx);
                      }
                    }}
                    tabIndex={0}
                    data-ocid={`subparcel.slice.${parcelIdx}`}
                    role="button"
                    aria-label={`Sector ${SECTOR_LABELS[i]}`}
                    aria-pressed={isSelected}
                  />
                  {/* Sector label */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill={
                      parcel?.owner
                        ? isSelected
                          ? "#00ffcc"
                          : "rgba(0,255,204,0.7)"
                        : "rgba(120,160,170,0.4)"
                    }
                    style={{ pointerEvents: "none", fontFamily: "monospace" }}
                  >
                    {SECTOR_LABELS[i]}
                  </text>
                  {/* Upgraded indicator */}
                  {parcel?.upgraded && (
                    <circle
                      cx={labelPos.x}
                      cy={labelPos.y + 11}
                      r="3"
                      fill="#00ffcc"
                      fillOpacity="0.7"
                      style={{
                        pointerEvents: "none",
                        animation: "pulse-glow 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </g>
              );
            })}

            {/* Center nexus circle */}
            {(() => {
              const nexus = getParcel(0);
              const isSelected = selectedIndex === 0;
              const owned = nexus?.owner != null;
              return (
                <g
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedIndex(isSelected ? null : 0)}
                  tabIndex={0}
                  data-ocid="subparcel.nexus"
                  aria-label="Center Nexus"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedIndex(isSelected ? null : 0);
                    }
                  }}
                >
                  {/* Outer glow ring for nexus */}
                  {owned && (
                    <circle
                      cx={CX}
                      cy={CY}
                      r={CENTER_R + 4}
                      fill="none"
                      stroke={
                        isSelected
                          ? "rgba(0,255,204,0.6)"
                          : "rgba(0,255,204,0.2)"
                      }
                      strokeWidth="1"
                      style={{ transition: "stroke 0.2s" }}
                    />
                  )}
                  <circle
                    cx={CX}
                    cy={CY}
                    r={CENTER_R}
                    fill={
                      owned
                        ? isSelected
                          ? "rgba(0,255,204,0.2)"
                          : "rgba(0,255,204,0.1)"
                        : isSelected
                          ? "rgba(80,100,110,0.4)"
                          : "rgba(20,30,40,0.7)"
                    }
                    stroke={
                      owned
                        ? isSelected
                          ? "#00ffcc"
                          : "rgba(0,255,204,0.45)"
                        : "rgba(60,90,100,0.35)"
                    }
                    strokeWidth={isSelected ? 1.5 : 1}
                    style={{ transition: "fill 0.2s, stroke 0.2s" }}
                  />
                  {owned ? (
                    <>
                      {/* Owner initials / ID */}
                      <text
                        x={CX}
                        y={CY - 5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="8"
                        fill="rgba(0,255,204,0.9)"
                        fontFamily="monospace"
                        style={{ pointerEvents: "none" }}
                      >
                        {shortPrincipal(nexus?.owner ?? null)}
                      </text>
                      <text
                        x={CX}
                        y={CY + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="7"
                        fill="rgba(0,255,204,0.45)"
                        fontFamily="sans-serif"
                        style={{ pointerEvents: "none" }}
                      >
                        NEXUS
                      </text>
                    </>
                  ) : (
                    <text
                      x={CX}
                      y={CY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8"
                      fill="rgba(120,160,170,0.4)"
                      fontFamily="sans-serif"
                      style={{ pointerEvents: "none" }}
                    >
                      NEXUS
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Cardinal direction markers */}
            {[
              ["N", CX, 10],
              ["S", CX, 230],
              ["W", 10, CY + 4],
              ["E", 230, CY + 4],
            ].map(([dir, x, y]) => (
              <text
                key={String(dir)}
                x={Number(x)}
                y={Number(y)}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(0,255,204,0.25)"
                fontFamily="monospace"
              >
                {dir}
              </text>
            ))}
          </svg>
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div className="flex justify-center gap-4 px-4 pb-2">
          {[
            { color: "rgba(0,255,204,0.55)", label: "Owned + Upgraded" },
            { color: "rgba(0,160,150,0.5)", label: "Owned" },
            { color: "rgba(60,90,100,0.5)", label: "Vacant" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: color }}
              />
              <span
                className="text-[9px] uppercase tracking-wider"
                style={{ color: "rgba(180,220,220,0.45)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Detail card for selected parcel ─────────────────────── */}
        <div className="px-3 pb-4">
          {selectedIndex !== null ? (
            <ParcelDetail
              parcel={getParcel(selectedIndex)}
              index={selectedIndex}
            />
          ) : (
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: "rgba(0,255,204,0.03)",
                border: "1px solid rgba(0,255,204,0.1)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(0,255,204,0.35)" }}
              >
                Tap a sector or the Nexus to inspect
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
