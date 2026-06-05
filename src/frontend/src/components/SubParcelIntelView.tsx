import {
  ChevronRight,
  Clock,
  Cpu,
  Flame,
  Package,
  Sword,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BIOME_MINERAL_RATES } from "../constants/minerals";
import { type PlotSpecialization, useGameStore } from "../store/gameStore";

// ── Constants ─────────────────────────────────────────────────────────────────
const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";

const SPEC_COLORS: Record<PlotSpecialization, string> = {
  ARMORY: "rgba(200,50,50,0.7)",
  RESOURCES: "rgba(50,180,80,0.7)",
  ENERGY_TECH: "rgba(60,120,220,0.7)",
  TRADING_DEPOT: "rgba(200,160,40,0.7)",
};

const SPEC_STROKE: Record<PlotSpecialization, string> = {
  ARMORY: "#e05050",
  RESOURCES: "#50d070",
  ENERGY_TECH: "#4090ff",
  TRADING_DEPOT: "#d4a820",
};

const SPEC_LABELS: Record<PlotSpecialization, string> = {
  ARMORY: "ARMORY",
  RESOURCES: "RESOURCES",
  ENERGY_TECH: "ENERGY & TECH",
  TRADING_DEPOT: "TRADING DEPOT",
};

const SPEC_ICONS: Record<PlotSpecialization, React.ReactNode> = {
  ARMORY: <Sword size={9} />,
  RESOURCES: <Package size={9} />,
  ENERGY_TECH: <Cpu size={9} />,
  TRADING_DEPOT: <Flame size={9} />,
};

const EMPTY_FILL = "rgba(25,35,50,0.65)";
const EMPTY_STROKE = "rgba(0,255,204,0.15)";
const LOCKED_FILL = "rgba(40,20,20,0.6)";
const LOCKED_STROKE = "rgba(255,100,80,0.35)";

const SECTOR_LABELS = ["α", "β", "γ", "δ", "ε", "ζ"];

const NEXUS_BONUS: Record<number, number> = { 0: 0, 1: 8, 2: 24, 3: 48 };

// ── Math helpers ──────────────────────────────────────────────────────────────
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

function sliceMidLabel(
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

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(unlockAt: number) {
  const [remaining, setRemaining] = useState(
    Math.max(0, unlockAt - Date.now()),
  );
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(
      () => setRemaining(Math.max(0, unlockAt - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [unlockAt, remaining]);

  if (remaining <= 0) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

// ── Cooldown timer cell (standalone component so hook rules are obeyed) ───────
function CooldownTimer({ unlockAt }: { unlockAt: number }) {
  const timer = useCountdown(unlockAt);
  if (!timer) return <span style={{ color: CYAN }}>UNLOCKED</span>;
  return (
    <span className="flex items-center gap-1" style={{ color: "#ff8040" }}>
      <Clock size={9} />
      {timer}
    </span>
  );
}

// ── Segment detail card ───────────────────────────────────────────────────────
interface SegmentInfo {
  index: number; // 0 = nexus, 1-6 = outer
  isLocked: boolean;
  unlockAt: number;
  buildingType: string | null;
  spec: PlotSpecialization | null;
  biome: string;
  nexusLevel: number;
}

function SegmentDetailCard({ info }: { info: SegmentInfo }) {
  const isNexus = info.index === 0;
  const label = isNexus ? "NEXUS" : `SECTOR ${SECTOR_LABELS[info.index - 1]}`;
  const bonus = isNexus ? (NEXUS_BONUS[info.index] ?? 0) : 0;
  const specColor = info.spec ? SPEC_STROKE[info.spec] : CYAN;
  const rates = BIOME_MINERAL_RATES[info.biome];

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{
        background: "rgba(0,255,204,0.04)",
        border: `1px solid ${specColor}44`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {info.spec && (
            <span style={{ color: specColor }}>{SPEC_ICONS[info.spec]}</span>
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: specColor }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            background: info.isLocked
              ? "rgba(255,80,40,0.12)"
              : "rgba(0,255,204,0.08)",
            color: info.isLocked ? "#ff8040" : CYAN,
          }}
        >
          {info.isLocked ? "LOCKED" : info.buildingType ? "ACTIVE" : "VACANT"}
        </span>
      </div>

      {/* Cooldown timer */}
      {info.isLocked && (
        <div className="text-[9px]" style={{ color: "rgba(180,220,220,0.5)" }}>
          <CooldownTimer unlockAt={info.unlockAt} />
        </div>
      )}

      {/* Building */}
      {!info.isLocked && info.buildingType && (
        <div className="text-[9px]" style={{ color: "rgba(180,220,220,0.6)" }}>
          <span style={{ color: "rgba(180,220,220,0.4)" }}>STRUCTURE: </span>
          {info.buildingType}
        </div>
      )}

      {/* Nexus details */}
      {isNexus && (
        <div className="flex items-center gap-3">
          <div>
            <div
              className="text-[9px]"
              style={{ color: "rgba(0,255,204,0.45)" }}
            >
              ELECTRICITY LVL
            </div>
            <div
              className="font-mono text-xs font-bold"
              style={{ color: CYAN }}
            >
              {info.nexusLevel} / 3
            </div>
          </div>
          <div>
            <div
              className="text-[9px]"
              style={{ color: "rgba(0,255,204,0.45)" }}
            >
              BONUS FRNTR/DAY
            </div>
            <div
              className="font-mono text-xs font-bold"
              style={{ color: bonus > 0 ? CYAN : "rgba(0,255,204,0.3)" }}
            >
              +{NEXUS_BONUS[info.nexusLevel] ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* Specialization */}
      {!isNexus && info.spec && (
        <div className="text-[9px]" style={{ color: specColor }}>
          <span style={{ color: "rgba(180,220,220,0.4)" }}>SPEC: </span>
          {SPEC_LABELS[info.spec]}
        </div>
      )}

      {/* Mineral output row */}
      {!isNexus && rates && (
        <div className="flex gap-3">
          {(
            [
              ["IRON", rates.iron, "#9aa"],
              ["FUEL", rates.fuel, "#fa0"],
              ["XTAL", rates.crystal, "#8cf"],
              ["RARE", rates.rareEarth, "#d8f"],
            ] as [string, number, string][]
          ).map(([name, rate, color]) => (
            <div key={name}>
              <div
                className="text-[8px]"
                style={{ color: "rgba(180,220,220,0.35)" }}
              >
                {name}
              </div>
              <div className="font-mono text-[9px] font-bold" style={{ color }}>
                {rate}/day
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main sub-parcel intel view ────────────────────────────────────────────────
export default function SubParcelIntelView() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const subParcels = useGameStore((s) => s.subParcels);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const plotPurchaseTimes = useGameStore((s) => s.plotPurchaseTimes);

  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

  // Reset selected segment when plot changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPlotId is the meaningful trigger here
  useEffect(() => {
    setSelectedSegment(null);
  }, [selectedPlotId]);

  const ownedPlots = player.plotsOwned;

  // Empty states
  if (ownedPlots.length === 0) {
    return (
      <div
        data-ocid="intel.subparcel.empty_state"
        className="flex flex-col items-center justify-center h-48 gap-3"
        style={{ color: "rgba(0,255,204,0.35)" }}
      >
        <Package size={32} style={{ opacity: 0.3 }} />
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold">
            No Plots Owned
          </p>
          <p
            className="text-[9px] mt-1"
            style={{ color: "rgba(0,255,204,0.25)" }}
          >
            Purchase a plot to view sub-parcel details
          </p>
        </div>
      </div>
    );
  }

  if (selectedPlotId === null || !ownedPlots.includes(selectedPlotId)) {
    return (
      <div
        data-ocid="intel.subparcel.no_selection"
        className="flex flex-col items-center justify-center h-48 gap-3"
        style={{ color: "rgba(0,255,204,0.35)" }}
      >
        <ChevronRight size={28} style={{ opacity: 0.3 }} />
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold">
            No Plot Selected
          </p>
          <p
            className="text-[9px] mt-1"
            style={{ color: "rgba(0,255,204,0.25)" }}
          >
            Select one of your plots to view sub-parcels
          </p>
        </div>
        {/* Owned plot quick-select */}
        {ownedPlots.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center px-4 mt-1">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{
                color: "rgba(0,255,204,0.3)",
                width: "100%",
                textAlign: "center",
              }}
            >
              Your plots:
            </span>
            {ownedPlots.map((pid) => (
              <PlotQuickSelect key={pid} plotId={pid} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const plot = plots.find((p) => p.id === selectedPlotId);
  if (!plot) return null;

  const subs = subParcels[selectedPlotId] ?? getSubParcels(selectedPlotId);
  const purchaseTime = plotPurchaseTimes[selectedPlotId] ?? Date.now();
  const nexusLevel =
    (plot as { nexusElectricityLevel?: number }).nexusElectricityLevel ?? 0;

  // Build segment info array: [0]=nexus, [1-6]=outer
  const segments: SegmentInfo[] = Array.from({ length: 7 }, (_, i) => {
    const sub = subs[i];
    const isLocked = sub
      ? !sub.unlocked
      : Date.now() - purchaseTime < COOLDOWN_MS;
    const unlockAt = sub
      ? sub.purchaseTime + COOLDOWN_MS
      : purchaseTime + COOLDOWN_MS;
    return {
      index: i,
      isLocked,
      unlockAt,
      buildingType: sub?.buildingType ?? null,
      spec: i === 0 ? null : (plot.specialization ?? null),
      biome: plot.biome,
      nexusLevel,
    };
  });

  // SVG geometry
  const CX = 110;
  const CY = 110;
  const OUTER_R = 92;
  const INNER_R = 36;
  const CENTER_R = 30;
  const GAP = 4;
  const SLICES = 6;
  const SLICE_DEG = 360 / SLICES;

  function sliceFill(seg: SegmentInfo, selected: boolean): string {
    if (seg.isLocked) return LOCKED_FILL;
    if (seg.spec)
      return selected
        ? `${SPEC_COLORS[seg.spec]}`
        : `${SPEC_COLORS[seg.spec].replace("0.7", "0.4")}`;
    return selected ? "rgba(0,255,204,0.18)" : EMPTY_FILL;
  }

  function sliceStroke(seg: SegmentInfo, selected: boolean): string {
    if (seg.isLocked) return selected ? "rgba(255,100,80,0.6)" : LOCKED_STROKE;
    if (seg.spec)
      return selected ? SPEC_STROKE[seg.spec] : `${SPEC_STROKE[seg.spec]}88`;
    return selected ? "rgba(0,255,204,0.7)" : EMPTY_STROKE;
  }

  const selectedInfo =
    selectedSegment !== null ? segments[selectedSegment] : null;

  return (
    <div
      data-ocid="intel.subparcel.panel"
      className="flex flex-col gap-3 pb-4"
      style={{ color: "rgba(180,220,220,0.85)" }}
    >
      {/* Plot badge */}
      <div
        className="mx-3 rounded-lg px-3 py-2 flex items-center gap-2"
        style={{
          background: "rgba(0,255,204,0.04)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0"
          style={{
            background: "rgba(0,255,204,0.12)",
            border: `1px solid ${CYAN}`,
            color: CYAN,
          }}
        >
          #{selectedPlotId}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: CYAN }}
          >
            {plot.biome} SECTOR
          </span>
          <span
            className="text-[9px] ml-2"
            style={{ color: "rgba(0,255,204,0.4)" }}
          >
            EFF {plot.efficiency}%
          </span>
        </div>
        {plot.specialization && (
          <span
            className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: `${SPEC_COLORS[plot.specialization].replace("0.7", "0.15")}`,
              color: SPEC_STROKE[plot.specialization],
              border: `1px solid ${SPEC_STROKE[plot.specialization]}44`,
            }}
          >
            {SPEC_LABELS[plot.specialization]}
          </span>
        )}
      </div>

      {/* SVG radial diagram */}
      <div className="flex justify-center">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          role="img"
          aria-labelledby="intel-subparcel-svg-title"
        >
          <title id="intel-subparcel-svg-title">Sub-parcel radial layout</title>

          {/* Outer glow ring */}
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 7}
            fill="none"
            stroke="rgba(0,255,204,0.06)"
            strokeWidth="14"
          />
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 2}
            fill="none"
            stroke="rgba(0,255,204,0.12)"
            strokeWidth="1"
          />

          {/* 6 outer slices */}
          {Array.from({ length: SLICES }, (_, i) => {
            const idx = i + 1;
            const startDeg = i * SLICE_DEG + GAP / 2;
            const endDeg = (i + 1) * SLICE_DEG - GAP / 2;
            const seg = segments[idx];
            const isSelected = selectedSegment === idx;
            const lp = sliceMidLabel(
              CX,
              CY,
              OUTER_R,
              INNER_R,
              startDeg,
              endDeg,
            );

            return (
              <g key={idx}>
                <path
                  d={slicePath(CX, CY, OUTER_R, INNER_R, startDeg, endDeg)}
                  fill={sliceFill(seg, isSelected)}
                  stroke={sliceStroke(seg, isSelected)}
                  strokeWidth={isSelected ? 1.5 : 0.75}
                  style={{
                    cursor: "pointer",
                    transition: "fill 0.15s, stroke 0.15s",
                  }}
                  onClick={() => setSelectedSegment(isSelected ? null : idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSegment(isSelected ? null : idx);
                    }
                  }}
                  tabIndex={0}
                  data-ocid={`intel.subparcel.slice.${idx}`}
                  role="button"
                  aria-label={`Sub-parcel sector ${SECTOR_LABELS[i]}`}
                  aria-pressed={isSelected}
                />

                {/* Sector label */}
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fontFamily="monospace"
                  fill={sliceStroke(seg, isSelected)}
                  style={{ pointerEvents: "none" }}
                >
                  {SECTOR_LABELS[i]}
                </text>

                {/* Lock icon dot */}
                {seg.isLocked && (
                  <circle
                    cx={lp.x}
                    cy={lp.y + 11}
                    r="2.5"
                    fill="rgba(255,100,80,0.7)"
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Building active dot */}
                {!seg.isLocked && seg.buildingType && (
                  <circle
                    cx={lp.x}
                    cy={lp.y + 11}
                    r="2.5"
                    fill={CYAN}
                    style={{
                      pointerEvents: "none",
                      animation: "pulse-glow 2s ease-in-out infinite",
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Center nexus */}
          {(() => {
            const nexusSeg = segments[0];
            const isSelected = selectedSegment === 0;
            const nexusBonus = NEXUS_BONUS[nexusLevel] ?? 0;
            const nexusFill = isSelected
              ? "rgba(0,255,204,0.22)"
              : nexusLevel > 0
                ? "rgba(0,255,204,0.12)"
                : "rgba(15,25,40,0.75)";
            const nexusStroke = isSelected
              ? CYAN
              : nexusLevel > 0
                ? "rgba(0,255,204,0.5)"
                : "rgba(0,255,204,0.2)";
            // suppress unused warning — nexusSeg is used for isLocked check
            void nexusSeg;

            return (
              <g
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedSegment(isSelected ? null : 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSegment(isSelected ? null : 0);
                  }
                }}
                tabIndex={0}
                data-ocid="intel.subparcel.nexus"
                aria-label="Center Nexus"
                aria-pressed={isSelected}
              >
                {/* Outer glow ring when upgraded */}
                {nexusLevel > 0 && (
                  <circle
                    cx={CX}
                    cy={CY}
                    r={CENTER_R + 5}
                    fill="none"
                    stroke={
                      isSelected
                        ? "rgba(0,255,204,0.55)"
                        : "rgba(0,255,204,0.18)"
                    }
                    strokeWidth="1"
                    style={{ transition: "stroke 0.15s" }}
                  />
                )}
                <circle
                  cx={CX}
                  cy={CY}
                  r={CENTER_R}
                  fill={nexusFill}
                  stroke={nexusStroke}
                  strokeWidth={isSelected ? 1.5 : 1}
                  style={{ transition: "fill 0.15s, stroke 0.15s" }}
                />

                {/* Nexus label lines */}
                <text
                  x={CX}
                  y={CY - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="monospace"
                  fill={isSelected ? CYAN : "rgba(0,255,204,0.65)"}
                  style={{ pointerEvents: "none" }}
                >
                  NEXUS
                </text>
                <text
                  x={CX}
                  y={CY + 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fontFamily="monospace"
                  fill={
                    nexusBonus > 0
                      ? isSelected
                        ? CYAN
                        : "rgba(0,255,204,0.55)"
                      : "rgba(0,255,204,0.2)"
                  }
                  style={{ pointerEvents: "none" }}
                >
                  {`LV${nexusLevel}`}
                </text>
                {nexusBonus > 0 && (
                  <text
                    x={CX}
                    y={CY + 15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7"
                    fontFamily="monospace"
                    fill="rgba(0,255,204,0.4)"
                    style={{ pointerEvents: "none" }}
                  >
                    {`+${nexusBonus}/d`}
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2.5 px-3 -mt-1">
        {(
          [
            {
              color: SPEC_COLORS.ARMORY,
              stroke: SPEC_STROKE.ARMORY,
              label: "Armory",
            },
            {
              color: SPEC_COLORS.RESOURCES,
              stroke: SPEC_STROKE.RESOURCES,
              label: "Resources",
            },
            {
              color: SPEC_COLORS.ENERGY_TECH,
              stroke: SPEC_STROKE.ENERGY_TECH,
              label: "Energy & Tech",
            },
            {
              color: SPEC_COLORS.TRADING_DEPOT,
              stroke: SPEC_STROKE.TRADING_DEPOT,
              label: "Trading",
            },
            { color: EMPTY_FILL, stroke: EMPTY_STROKE, label: "Vacant" },
            { color: LOCKED_FILL, stroke: LOCKED_STROKE, label: "Locked" },
          ] as { color: string; stroke: string; label: string }[]
        ).map(({ color, stroke, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: color, border: `1px solid ${stroke}` }}
            />
            <span
              className="text-[9px] uppercase tracking-wide"
              style={{ color: "rgba(180,220,220,0.4)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Detail card for selected segment */}
      <div className="px-3">
        {selectedInfo !== null ? (
          <SegmentDetailCard info={selectedInfo} />
        ) : (
          <div
            className="rounded-lg p-3 text-center"
            style={{
              background: "rgba(0,255,204,0.02)",
              border: "1px solid rgba(0,255,204,0.08)",
            }}
          >
            <p
              className="text-[9px] uppercase tracking-widest"
              style={{ color: "rgba(0,255,204,0.3)" }}
            >
              Tap a sector or the Nexus to inspect
            </p>
          </div>
        )}
      </div>

      {/* FRNTR daily breakdown */}
      <DailyFRNTRBreakdown plotId={selectedPlotId} nexusLevel={nexusLevel} />
    </div>
  );
}

// ── Quick select button (inline to avoid cross-component hook calls) ───────────
function PlotQuickSelect({ plotId }: { plotId: number }) {
  const selectPlot = useGameStore((s) => s.selectPlot);
  const plots = useGameStore((s) => s.plots);
  const plot = plots.find((p) => p.id === plotId);
  return (
    <button
      type="button"
      data-ocid={`intel.subparcel.plot_select.${plotId}`}
      onClick={() => selectPlot(plotId)}
      className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide cursor-pointer transition-all"
      style={{
        background: "rgba(0,255,204,0.07)",
        border: "1px solid rgba(0,255,204,0.2)",
        color: "rgba(0,255,204,0.7)",
      }}
    >
      #{plotId}
      {plot?.biome ? ` · ${plot.biome}` : ""}
    </button>
  );
}

// ── Daily FRNTR breakdown mini-card ──────────────────────────────────────────
function DailyFRNTRBreakdown({
  plotId,
  nexusLevel,
}: { plotId: number; nexusLevel: number }) {
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const tier = generatorTiers[plotId] ?? 0;
  const TIER_BONUS: Record<number, number> = {
    1: 8,
    2: 24,
    3: 48,
    4: 96,
    5: 192,
    6: 384,
  };
  const base = 7;
  const tierBonus = TIER_BONUS[tier] ?? 0;
  const nexusBonus = NEXUS_BONUS[nexusLevel] ?? 0;
  const total = base + tierBonus + nexusBonus;

  return (
    <div
      className="mx-3 rounded-lg p-3"
      style={{
        background: "rgba(0,255,204,0.04)",
        border: "1px solid rgba(0,255,204,0.12)",
      }}
    >
      <div
        className="text-[9px] uppercase tracking-widest mb-2"
        style={{ color: "rgba(0,255,204,0.45)" }}
      >
        <Zap size={9} className="inline mr-1" />
        DAILY FRNTR BREAKDOWN
      </div>
      <div className="flex flex-col gap-1">
        {[
          { label: "Base Plot", value: base },
          { label: `Generator Tier ${tier}`, value: tierBonus },
          { label: `Nexus Lv${nexusLevel}`, value: nexusBonus },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-[9px]">
            <span style={{ color: "rgba(180,220,220,0.45)" }}>{label}</span>
            <span
              className="font-mono font-bold"
              style={{ color: value > 0 ? CYAN : "rgba(0,255,204,0.25)" }}
            >
              +{value} FRNTR
            </span>
          </div>
        ))}
        <div
          className="flex justify-between text-[10px] pt-1 mt-1"
          style={{ borderTop: "1px solid rgba(0,255,204,0.1)" }}
        >
          <span
            className="font-bold uppercase tracking-wider"
            style={{ color: CYAN }}
          >
            TOTAL
          </span>
          <span
            className="font-mono font-bold"
            style={{ color: CYAN, textShadow: `0 0 8px ${CYAN}` }}
          >
            {total} FRNTR/DAY
          </span>
        </div>
      </div>
    </div>
  );
}
