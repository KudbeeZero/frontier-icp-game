import { X } from "lucide-react";
import { projectedMonthlyYield } from "../constants/minerals";
import {
  BIOME_COLORS,
  getPlotCombatStats,
  useGameStore,
} from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.18)";
const GLASS_BG = "rgba(5, 20, 30, 0.72)";

interface CompareRowProps {
  label: string;
  aVal: string | number;
  bVal: string | number;
  higherIsBetter?: boolean;
}

function CompareRow({
  label,
  aVal,
  bVal,
  higherIsBetter = true,
}: CompareRowProps) {
  const aNum =
    typeof aVal === "number" ? aVal : Number.parseFloat(String(aVal));
  const bNum =
    typeof bVal === "number" ? bVal : Number.parseFloat(String(bVal));
  const aWins =
    !Number.isNaN(aNum) &&
    !Number.isNaN(bNum) &&
    (higherIsBetter ? aNum > bNum : aNum < bNum);
  const bWins =
    !Number.isNaN(aNum) &&
    !Number.isNaN(bNum) &&
    (higherIsBetter ? bNum > aNum : bNum < aNum);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 1fr",
        gap: 4,
        padding: "4px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "right",
          fontSize: 10,
          fontWeight: 700,
          color: aWins ? CYAN : "rgba(255,255,255,0.7)",
          boxShadow: aWins ? "0 0 8px rgba(0,255,204,0.25)" : "none",
          fontFamily: "monospace",
        }}
      >
        {String(aVal)}
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 7,
          color: CYAN_DIM,
          letterSpacing: 1,
          fontFamily: "monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          textAlign: "left",
          fontSize: 10,
          fontWeight: 700,
          color: bWins ? CYAN : "rgba(255,255,255,0.7)",
          boxShadow: bWins ? "0 0 8px rgba(0,255,204,0.25)" : "none",
          fontFamily: "monospace",
        }}
      >
        {String(bVal)}
      </div>
    </div>
  );
}

export default function PlotComparisonView() {
  const compareModeActive = useGameStore((s) => s.compareModeActive);
  const comparePlotId = useGameStore((s) => s.comparePlotId);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const setCompareModeActive = useGameStore((s) => s.setCompareModeActive);
  const setComparePlotId = useGameStore((s) => s.setComparePlotId);

  if (!compareModeActive || comparePlotId === null || selectedPlotId === null)
    return null;

  const plotA = plots.find((p) => p.id === selectedPlotId);
  const plotB = plots.find((p) => p.id === comparePlotId);

  if (!plotA || !plotB) return null;

  const parcelsA = getSubParcels(selectedPlotId);
  const parcelsB = getSubParcels(comparePlotId);
  const statsA = getPlotCombatStats(plotA, parcelsA);
  const statsB = getPlotCombatStats(plotB, parcelsB);
  const yieldsA = projectedMonthlyYield(plotA.biome, plotA.efficiency);
  const yieldsB = projectedMonthlyYield(plotB.biome, plotB.efficiency);
  const builtA = parcelsA.filter((sp) => sp.buildingType).length;
  const builtB = parcelsB.filter((sp) => sp.buildingType).length;

  function close() {
    setCompareModeActive(false);
    setComparePlotId(null);
  }

  return (
    <div
      data-ocid="compare.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 8px 72px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      tabIndex={-1}
    >
      <div
        style={{
          background: GLASS_BG,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 480,
          maxHeight: "70vh",
          overflowY: "auto",
          padding: "12px 14px",
          fontFamily: "monospace",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
            }}
          >
            PLOT COMPARISON
          </span>
          <button
            type="button"
            data-ocid="compare.close_button"
            onClick={close}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 6,
              padding: "4px 8px",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 8,
            }}
          >
            <X size={10} /> CANCEL
          </button>
        </div>

        {/* Plot header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 1fr",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              textAlign: "right",
              padding: "6px 8px",
              background: "rgba(0,255,204,0.06)",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
              PLOT
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>
              #{selectedPlotId}
            </div>
            <div
              style={{
                fontSize: 7,
                color: BIOME_COLORS[plotA.biome],
                marginTop: 2,
              }}
            >
              {plotA.biome.toUpperCase()}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              color: CYAN_DIM,
            }}
          >
            VS
          </div>
          <div
            style={{
              textAlign: "left",
              padding: "6px 8px",
              background: "rgba(0,255,204,0.06)",
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 1 }}>
              PLOT
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>
              #{comparePlotId}
            </div>
            <div
              style={{
                fontSize: 7,
                color: BIOME_COLORS[plotB.biome],
                marginTop: 2,
              }}
            >
              {plotB.biome.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Comparison rows */}
        <CompareRow
          label="OWNER"
          aVal={plotA.owner ? `${plotA.owner.slice(0, 8)}...` : "—"}
          bVal={plotB.owner ? `${plotB.owner.slice(0, 8)}...` : "—"}
          higherIsBetter={false}
        />
        <CompareRow
          label="EFFIC %"
          aVal={plotA.efficiency}
          bVal={plotB.efficiency}
        />
        <CompareRow
          label="DMG %"
          aVal={Math.round(plotA.structuralDamage)}
          bVal={Math.round(plotB.structuralDamage)}
          higherIsBetter={false}
        />
        <CompareRow label="BUILT" aVal={builtA} bVal={builtB} />
        <CompareRow
          label="ATK"
          aVal={Math.round(statsA.atk)}
          bVal={Math.round(statsB.atk)}
        />
        <CompareRow
          label="DEF"
          aVal={Math.round(statsA.def)}
          bVal={Math.round(statsB.def)}
        />
        <CompareRow
          label="SPEC"
          aVal={plotA.specialization?.replace("_", " ") ?? "—"}
          bVal={plotB.specialization?.replace("_", " ") ?? "—"}
          higherIsBetter={false}
        />
        <CompareRow
          label="IRON/mo"
          aVal={Math.round(yieldsA.iron)}
          bVal={Math.round(yieldsB.iron)}
        />
        <CompareRow
          label="FUEL/mo"
          aVal={Math.round(yieldsA.fuel)}
          bVal={Math.round(yieldsB.fuel)}
        />
        <CompareRow
          label="XTAL/mo"
          aVal={Math.round(yieldsA.crystal)}
          bVal={Math.round(yieldsB.crystal)}
        />
        <CompareRow
          label="RARE/mo"
          aVal={Math.round(yieldsA.rareEarth)}
          bVal={Math.round(yieldsB.rareEarth)}
        />
      </div>
    </div>
  );
}
