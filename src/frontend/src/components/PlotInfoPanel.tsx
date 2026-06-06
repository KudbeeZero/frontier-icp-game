import { useActor } from "@caffeineai/core-infrastructure";
import type React from "react";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";
import type { PlotData } from "../store/gameStore";

// Biome colors matching the globe tile palette
const BIOME_HEX_COLORS: Record<string, string> = {
  Temperate: "#4a7c59",
  Desert: "#c8a96e",
  Arctic: "#a8d8ea",
  Tropical: "#2d6a4f",
  Ocean: "#1a4a6e",
  DeepOcean: "#0d2d45",
  Volcanic: "#6b3a3a",
  AsteroidImpact: "#7b5ea7",
  // Legacy mappings
  Forest: "#4a7c59",
  Grassland: "#4a7c59",
  Mountain: "#a8d8ea",
  Toxic: "#2d6a4f",
};

// ── Design tokens (match LeftSidebarHUD) ──────────────────────────────────────
const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BG = "rgba(2,10,20,0.9)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const glass: React.CSSProperties = {
  background: BG,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
};

// ── Biome config ──────────────────────────────────────────────────────────────
// ── Price formatting ─────────────────────────────────────────────────────────
export function formatIcpPrice(
  priceE8s: bigint | number,
  icpUsdPrice: number | null,
): string {
  const icp = Number(priceE8s) / 1e8;
  const icpStr = icp.toFixed(4);
  if (icpUsdPrice === null) return `${icpStr} ICP ($ unavailable)`;
  const usd = (icp * icpUsdPrice).toFixed(2);
  return `${icpStr} ICP (~${usd})`;
}

export function getPlotPriceE8s(efficiency: number): number {
  if (efficiency >= 90) return 30_0000_0000;
  if (efficiency >= 80) return 9_0000_0000;
  return 2_5000_0000;
}

export default function PlotInfoPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const icpUsdPrice = useGameStore((s) => s.icpUsdPrice);
  const { actor } = useActor(createActor);

  const [fetchedPriceE8s, setFetchedPriceE8s] = useState<bigint | null>(null);

  const plot: PlotData | null =
    selectedPlotId !== null
      ? (plots.find((p) => p.id === selectedPlotId) ?? null)
      : null;

  useEffect(() => {
    setFetchedPriceE8s(null);
    if (!actor || selectedPlotId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const price = await (actor as any).getPlotPrice(BigInt(selectedPlotId));
        if (!cancelled) setFetchedPriceE8s(BigInt(price));
      } catch {
        if (!cancelled && plot) {
          setFetchedPriceE8s(BigInt(getPlotPriceE8s(plot.efficiency)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, selectedPlotId, plot]);

  const isVisible = selectedPlotId !== null && plot !== null;
  const biomeColor = plot
    ? (BIOME_HEX_COLORS[plot.biome] ?? "#4a7c59")
    : "#4a7c59";

  // Resource % = efficiency as 0-100
  const resourcePct = plot ? Math.max(0, Math.min(100, plot.efficiency)) : 0;
  const resourcePctColor =
    resourcePct >= 80 ? "#22c55e" : resourcePct >= 60 ? "#f59e0b" : "#ef4444";

  const ownerLabel = !plot?.owner
    ? "UNOWNED"
    : plot.owner === "player"
      ? "YOU"
      : `${plot.owner.slice(0, 8)}…${plot.owner.slice(-4)}`;

  const priceE8s =
    fetchedPriceE8s ?? (plot ? BigInt(getPlotPriceE8s(plot.efficiency)) : null);
  const plotPriceLabel =
    priceE8s !== null ? formatIcpPrice(priceE8s, icpUsdPrice) : "";

  const panelStyle: React.CSSProperties = {
    ...glass,
    position: "fixed",
    top: 80,
    right: 0,
    width: 260,
    maxHeight: "calc(100vh - 100px)",
    overflowY: "auto",
    zIndex: 200,
    transform: isVisible ? "translateX(0)" : "translateX(280px)",
    transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
    padding: 14,
    boxSizing: "border-box",
    pointerEvents: isVisible ? "auto" : "none",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRight: "none",
  };

  return (
    <div style={panelStyle} data-ocid="plot_info.panel">
      {/* Close */}
      <button
        type="button"
        data-ocid="plot_info.close_button"
        onClick={() => selectPlot(null)}
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          background: "transparent",
          border: "none",
          color: CYAN,
          fontSize: 18,
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
          {/* Plot ID */}
          <div style={{ paddingRight: 20, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                color: CYAN,
                fontWeight: 700,
                letterSpacing: 1,
                fontFamily: "monospace",
              }}
            >
              PLOT #{plot.id}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(0,255,204,0.4)",
                letterSpacing: 1,
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {plot.lat.toFixed(2)}°N · {plot.lng.toFixed(2)}°E
            </div>
          </div>

          {/* Biome badge with color */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                background: `${biomeColor}22`,
                border: `1px solid ${biomeColor}88`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: biomeColor,
                  boxShadow: `0 0 6px ${biomeColor}`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: biomeColor,
                  letterSpacing: 1.5,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              >
                {plot.biome}
              </span>
            </div>
          </div>

          {/* Resource % bar */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: CYAN_DIM,
                  letterSpacing: 1,
                  fontFamily: "monospace",
                }}
              >
                RESOURCE %
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: resourcePctColor,
                  fontFamily: "monospace",
                }}
              >
                {resourcePct}%
              </span>
            </div>
            <div
              style={{
                height: 5,
                background: "rgba(255,255,255,0.07)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${resourcePct}%`,
                  background: `linear-gradient(90deg, ${resourcePctColor}, ${resourcePctColor}88)`,
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                  boxShadow: `0 0 6px ${resourcePctColor}66`,
                }}
              />
            </div>
          </div>

          {/* Owner */}
          <div
            style={{
              marginBottom: 10,
              fontSize: 9,
              color: CYAN_DIM,
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            OWNER:{" "}
            <span style={{ color: TEXT, fontWeight: 700 }}>{ownerLabel}</span>
          </div>

          {/* Price (unowned only) */}
          {!plot.owner && priceE8s !== null && (
            <div
              data-ocid="plot_info.price_display"
              style={{
                padding: "6px 8px",
                background: "rgba(0,255,204,0.06)",
                border: `1px solid ${BORDER}`,
                borderRadius: 5,
                fontSize: 10,
                color: CYAN,
                fontFamily: "monospace",
                textAlign: "center",
                letterSpacing: 0.5,
              }}
            >
              {plotPriceLabel}
            </div>
          )}
        </>
      )}
    </div>
  );
}
