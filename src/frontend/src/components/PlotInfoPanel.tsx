import type React from "react";
import { useGameStore } from "../store/gameStore";
import type { PlotData } from "../store/gameStore";

// ── Design tokens (match LeftSidebarHUD) ──────────────────────────────────────
const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BG = "rgba(2,10,20,0.9)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const LABEL_COLOR = "rgba(160,200,220,0.6)";

const glass: React.CSSProperties = {
  background: BG,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
};

// ── Biome config ──────────────────────────────────────────────────────────────
const BIOME_COLOR: Record<string, string> = {
  Forest: "#22c55e",
  Desert: "#f59e0b",
  Ocean: "#3b82f6",
  Arctic: "#a5f3fc",
  Grassland: "#84cc16",
  Volcanic: "#ef4444",
  Mountain: "#94a3b8",
  Toxic: "#a3e635",
  Nexus: "#a855f7",
  Ruins: "#78716c",
};

const BIOME_TYPE: Record<string, string> = {
  Forest: "TERRAN",
  Desert: "ARID",
  Ocean: "AQUATIC",
  Arctic: "FROZEN",
  Grassland: "TERRAN",
  Volcanic: "VOLCANIC",
  Mountain: "ALPINE",
  Toxic: "TOXIC",
  Nexus: "NEXUS NODE",
  Ruins: "ANCIENT RUINS",
};

// ── Deterministic planet name ─────────────────────────────────────────────────
const PLANET_WORDS = [
  "Kepler",
  "Arion",
  "Vega",
  "Draxis",
  "Lumis",
  "Zephyr",
  "Oryn",
  "Nexara",
  "Telos",
  "Caldris",
];

function planetNameFromId(id: number): string {
  return PLANET_WORDS[id % 10];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function deriveFaction(owner: string | null): string {
  if (!owner) return "UNCLAIMED";
  if (owner.startsWith("AI-")) return owner.replace("AI-", "");
  if (owner === "player") return "PLAYER";
  if (owner === "unowned") return "UNCLAIMED";
  return owner.toUpperCase();
}

function deriveClass(richness: number): string {
  if (richness >= 7) return "Class I";
  if (richness >= 4) return "Class II";
  return "Class III";
}

// ── Planet thumbnail ──────────────────────────────────────────────────────────
function PlanetThumb({ biome }: { biome: string }) {
  const color = BIOME_COLOR[biome] ?? "#3b82f6";
  const glow = `0 0 24px ${color}88, 0 0 48px ${color}44`;
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${color}dd 0%, ${color}66 40%, ${color}22 70%, transparent 100%)`,
        boxShadow: glow,
        border: `1.5px solid ${color}66`,
        flexShrink: 0,
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlotInfoPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const purchasePlot = useGameStore((s) => s.purchasePlot);
  const attack = useGameStore((s) => s.attack);
  const playerData = useGameStore((s) => s.player);

  const plot: PlotData | null =
    selectedPlotId !== null ? (plots[selectedPlotId] ?? null) : null;

  const isVisible = selectedPlotId !== null && plot !== null;

  const sectorLabel = plot ? `Sector ${Math.floor(plot.id / 100)}` : "";
  const planetName = plot
    ? `${sectorLabel} / ${planetNameFromId(plot.id)}`
    : "";
  const typeTag = plot ? (BIOME_TYPE[plot.biome] ?? "UNKNOWN") : "";
  const faction = plot ? deriveFaction(plot.owner) : "";
  const plotClass = plot ? deriveClass(plot.richness) : "";
  const biomeColor = plot ? (BIOME_COLOR[plot.biome] ?? "#3b82f6") : "#3b82f6";

  const ownerLabel =
    plot?.owner === null || plot?.owner === "unowned"
      ? "UNOWNED"
      : plot?.owner === "player"
        ? "YOU"
        : (plot?.owner ?? "UNOWNED");

  function handleAttack() {
    if (selectedPlotId === null) return;
    const playerPlot = playerData.plotsOwned[0] ?? 0;
    attack(playerPlot, selectedPlotId);
  }

  function handleColonize() {
    if (selectedPlotId === null) return;
    purchasePlot(selectedPlotId);
  }

  const panelStyle: React.CSSProperties = {
    ...glass,
    position: "fixed",
    top: 80,
    right: 0,
    width: 280,
    maxHeight: "calc(100vh - 100px)",
    overflowY: "auto",
    zIndex: 200,
    transform: isVisible ? "translateX(0)" : "translateX(300px)",
    transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
    padding: 16,
    boxSizing: "border-box",
    pointerEvents: isVisible ? "auto" : "none",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRight: "none",
  };

  const sectionHeader: React.CSSProperties = {
    color: CYAN,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  };

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(0,255,204,0.08)",
    border: "1px solid rgba(0,255,204,0.2)",
    borderRadius: 20,
    padding: "3px 8px",
    fontSize: 11,
    color: TEXT,
    fontWeight: 600,
  };

  const defenseRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 8px",
    borderLeft: `2px solid ${CYAN_DIM}`,
    marginBottom: 4,
    fontSize: 12,
    color: TEXT,
  };

  const actionBtnBase: React.CSSProperties = {
    borderRadius: 8,
    padding: "8px 4px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.08em",
    transition: "all 0.15s",
    border: "none",
    width: "100%",
    textAlign: "center",
  };

  return (
    <div style={panelStyle} data-ocid="plot_info.panel">
      {/* Close button */}
      <button
        type="button"
        data-ocid="plot_info.close_button"
        onClick={() => selectPlot(null)}
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          background: "transparent",
          border: "none",
          color: CYAN,
          fontSize: 20,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Close panel"
      >
        ×
      </button>

      {plot && (
        <>
          {/* ── 1. Header ──────────────────────────────────────── */}
          <div style={{ paddingRight: 24 }}>
            <div
              style={{
                color: LABEL_COLOR,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {sectorLabel}
            </div>
            <div
              style={{
                color: CYAN,
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              {planetName}
            </div>
            <div
              style={{
                display: "inline-block",
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: CYAN,
                textTransform: "uppercase",
              }}
            >
              {typeTag}
            </div>
          </div>

          {/* ── 2. Planet thumbnail ────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 16,
              marginBottom: 4,
            }}
          >
            <PlanetThumb biome={plot.biome} />
          </div>

          {/* ── 3. Info grid ───────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 12px",
              marginTop: 16,
            }}
          >
            {(
              [
                ["Owner", ownerLabel],
                ["Faction", faction],
                ["Biome", plot.biome],
                ["Class", plotClass],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    color: LABEL_COLOR,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: BORDER,
              margin: "14px 0 0",
            }}
          />

          {/* ── 4. Defenses ────────────────────────────────────── */}
          <div style={sectionHeader}>Defenses</div>
          <div style={defenseRowStyle}>
            <span style={{ color: CYAN, fontSize: 12 }}>◈</span>
            <span>Orbital Shields: {plot.defenses.shields}</span>
          </div>
          <div style={defenseRowStyle}>
            <span style={{ color: CYAN, fontSize: 12 }}>◈</span>
            <span>Defense Turrets: {plot.defenses.turrets}</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, margin: "14px 0 0" }} />

          {/* ── 5. Resources ───────────────────────────────────── */}
          <div style={sectionHeader}>Resources</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <div style={chipStyle} data-ocid="plot_info.iron_chip">
              <span style={{ color: biomeColor }}>⬡</span> Iron:{" "}
              {fmt(plot.iron)}
            </div>
            <div style={chipStyle} data-ocid="plot_info.fuel_chip">
              <span style={{ color: "#f59e0b" }}>◈</span> Fuel: {fmt(plot.fuel)}
            </div>
            <div style={chipStyle} data-ocid="plot_info.crystal_chip">
              <span style={{ color: "#a855f7" }}>✦</span> Crystal:{" "}
              {fmt(plot.crystal)}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, margin: "14px 0 0" }} />

          {/* ── 6. Action buttons (2×2 grid) ───────────────────── */}
          <div style={sectionHeader}>Actions</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <button
              type="button"
              data-ocid="plot_info.attack_button"
              style={{
                ...actionBtnBase,
                background: "rgba(239,68,68,0.15)",
                border: "1px solid #ef4444",
                color: "#ef4444",
              }}
              onClick={handleAttack}
            >
              ⚔ ATTACK
            </button>
            <button
              type="button"
              data-ocid="plot_info.trade_button"
              style={{
                ...actionBtnBase,
                background: "rgba(0,200,180,0.12)",
                border: "1px solid #00c8b4",
                color: "#00c8b4",
              }}
            >
              ⇄ TRADE
            </button>
            <button
              type="button"
              data-ocid="plot_info.colonize_button"
              style={{
                ...actionBtnBase,
                background: "rgba(0,255,204,0.08)",
                border: `1px solid ${BORDER}`,
                color: TEXT,
              }}
              onClick={handleColonize}
            >
              ⊕ COLONIZE
            </button>
            <button
              type="button"
              data-ocid="plot_info.scan_button"
              style={{
                ...actionBtnBase,
                background: "rgba(0,255,204,0.08)",
                border: `1px solid ${BORDER}`,
                color: TEXT,
              }}
            >
              ◉ SCAN
            </button>
          </div>

          {/* Plot ID footer */}
          <div
            style={{
              marginTop: 14,
              color: LABEL_COLOR,
              fontSize: 10,
              textAlign: "center",
              letterSpacing: "0.08em",
            }}
          >
            PLOT #{plot.id} · {plot.lat.toFixed(2)}°,{plot.lng.toFixed(2)}°
          </div>
        </>
      )}
    </div>
  );
}
