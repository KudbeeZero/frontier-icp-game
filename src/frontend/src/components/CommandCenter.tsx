import { X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BIOME_TIER, MINERAL_USES, TIER_MINERALS } from "../constants/minerals";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const GOLD = "#ffd700";
const BG = "rgba(4,12,24,0.97)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const BIOME_COLORS: Record<string, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

const BASE_RATE = 50.0; // FRNTR/day per plot
const SUB_PARCEL_RATE = 10.0; // FRNTR/day per unlocked edge sub-parcel
const MS_PER_DAY = 86400000;

interface CommandCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandCenter({ open, onClose }: CommandCenterProps) {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const getSubParcels = useGameStore((s) => s.getSubParcels);
  const claimResources = useGameStore((s) => s.claimResources);
  const claimAllFrntr = useGameStore((s) => s.claimAllFrntr);

  const [searchQuery, setSearchQuery] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Live counter — ticks every second
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Build per-plot data from real owned plots only
  const ownedPlotData = player.plotsOwned
    .map((id) => plots.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => {
      const subParcels = getSubParcels(p!.id);
      const unlockedEdge = subParcels.filter(
        (sp) => sp.subId > 0 && sp.unlocked === true,
      ).length;
      const dayRate = BASE_RATE + unlockedEdge * SUB_PARCEL_RATE;
      const accumulated = (dayRate / MS_PER_DAY) * elapsed;
      return {
        id: p!.id,
        biome: p!.biome as string,
        dayRate,
        accumulated: Number.isNaN(accumulated) ? 0 : accumulated,
        unlockedEdge,
      };
    });

  const totalDayRate = ownedPlotData.reduce((s, p) => s + p.dayRate, 0);
  const totalAccumulated = ownedPlotData.reduce((s, p) => s + p.accumulated, 0);

  const filtered = ownedPlotData.filter(
    (p) => searchQuery === "" || String(p.id).includes(searchQuery),
  );

  const handleClaim = () => {
    if (totalAccumulated < 0.0001) return;
    claimAllFrntr(totalAccumulated);
    startRef.current = Date.now();
    setElapsed(0);
  };

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop */}
      <div
        data-ocid="command_center.backdrop"
        onClick={handleBackdrop}
        style={{
          position: "fixed",
          inset: 0,
          background: open ? "rgba(0,0,0,0.55)" : "transparent",
          zIndex: 58,
          pointerEvents: open ? "auto" : "none",
          transition: "background 0.3s",
        }}
      />
      <div
        data-ocid="command_center.panel"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(340px, 92vw)",
          zIndex: 60,
          background: BG,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRight: `1px solid ${CYAN}44`,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 14px 10px",
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 3,
                textShadow: `0 0 12px ${CYAN}`,
              }}
            >
              COMMAND CENTER
            </span>
            <button
              type="button"
              data-ocid="command_center.close_button"
              onClick={onClose}
              style={{
                background: "rgba(0,255,204,0.08)",
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                cursor: "pointer",
                color: CYAN_DIM,
                padding: "3px 5px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ fontSize: 9, color: CYAN_DIM, letterSpacing: 0.5 }}>
            {ownedPlotData.length} plots owned ·{" "}
            <span style={{ color: GOLD }}>
              {Number.isNaN(player.frntBalance)
                ? "0.00"
                : player.frntBalance.toFixed(2)}{" "}
              FRNTR
            </span>{" "}
            balance
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            scrollbarWidth: "thin",
            scrollbarColor: `${BORDER} transparent`,
          }}
        >
          {/* FRNTR Generation Card */}
          <div
            style={{
              background: "rgba(0,255,204,0.04)",
              border: "1px solid rgba(0,255,204,0.35)",
              borderRadius: 8,
              padding: "12px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: CYAN_DIM,
                letterSpacing: 2,
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              FRNTR TOKEN GENERATION
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: CYAN,
                    lineHeight: 1,
                  }}
                >
                  {Number.isNaN(totalDayRate) ? "0.0" : totalDayRate.toFixed(1)}
                </div>
                <div
                  style={{
                    fontSize: 7.5,
                    color: CYAN_DIM,
                    marginTop: 3,
                    letterSpacing: 0.5,
                  }}
                >
                  FRNTR / DAY · across {ownedPlotData.length} plots
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: GOLD,
                    lineHeight: 1,
                  }}
                >
                  {Number.isNaN(totalAccumulated)
                    ? "0.0000"
                    : totalAccumulated.toFixed(4)}
                </div>
                <div
                  style={{
                    fontSize: 7.5,
                    color: CYAN_DIM,
                    marginTop: 3,
                    letterSpacing: 0.5,
                  }}
                >
                  ACCUMULATED THIS SESSION
                </div>
              </div>
            </div>
            <button
              type="button"
              data-ocid="command_center.claim_all.button"
              onClick={handleClaim}
              disabled={totalAccumulated < 0.0001}
              style={{
                width: "100%",
                padding: "8px",
                background:
                  totalAccumulated >= 0.0001
                    ? "rgba(0,255,204,0.14)"
                    : "rgba(0,255,204,0.04)",
                border: `1px solid ${
                  totalAccumulated >= 0.0001 ? `${CYAN}88` : BORDER
                }`,
                borderRadius: 5,
                color: totalAccumulated >= 0.0001 ? CYAN : CYAN_DIM,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: totalAccumulated >= 0.0001 ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.2s",
              }}
            >
              <Zap size={11} />
              CLAIM ALL — +
              {Number.isNaN(totalAccumulated)
                ? "0.0000"
                : totalAccumulated.toFixed(4)}{" "}
              FRNTR
            </button>
          </div>

          {/* Territories */}
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              YOUR TERRITORIES ({ownedPlotData.length})
            </div>

            {ownedPlotData.length === 0 ? (
              <div
                data-ocid="command_center.territories.empty_state"
                style={{
                  textAlign: "center",
                  padding: "28px 16px",
                  color: CYAN_DIM,
                  fontSize: 9,
                  letterSpacing: 1,
                  lineHeight: 1.8,
                  border: `1px dashed ${BORDER}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.4 }}>
                  🌐
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  NO TERRITORIES OWNED
                </div>
                <div style={{ fontSize: 8, opacity: 0.7 }}>
                  Tap a plot on the globe to purchase your first territory
                </div>
              </div>
            ) : (
              <>
                <input
                  data-ocid="command_center.search_input"
                  type="text"
                  placeholder="Search by plot ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "rgba(0,0,0,0.5)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 5,
                    color: TEXT,
                    fontSize: 9,
                    marginBottom: 8,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = CYAN;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = BORDER;
                  }}
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {filtered.map((plot, i) => (
                    <div
                      key={plot.id}
                      data-ocid={`command_center.item.${i + 1}`}
                      style={{
                        background: "rgba(0,255,204,0.04)",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        padding: "10px 10px 8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: CYAN,
                          }}
                        >
                          PLOT #{plot.id}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 8,
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: `${
                                BIOME_COLORS[plot.biome] ?? "#666"
                              }22`,
                              border: `1px solid ${
                                BIOME_COLORS[plot.biome] ?? "#666"
                              }55`,
                              color: BIOME_COLORS[plot.biome] ?? "#aaa",
                              letterSpacing: 0.5,
                            }}
                          >
                            {plot.biome.toUpperCase()}
                          </span>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "rgba(34,197,94,0.2)",
                              border: "1px solid #22c55e66",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9,
                            }}
                          >
                            ✓
                          </div>
                        </div>
                      </div>

                      {/* Rate + live accumulation */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 5,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 8, color: GOLD }}>
                          {plot.dayRate.toFixed(1)} FRNTR/day
                        </span>
                        {plot.unlockedEdge > 0 && (
                          <span
                            style={{
                              fontSize: 7.5,
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "rgba(0,255,204,0.08)",
                              border: `1px solid ${BORDER}`,
                              color: CYAN_DIM,
                              letterSpacing: 0.5,
                            }}
                          >
                            +{plot.unlockedEdge} sub-parcels
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 9,
                          color: CYAN,
                          marginBottom: 7,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {Number.isNaN(plot.accumulated)
                          ? "0.0000"
                          : plot.accumulated.toFixed(4)}{" "}
                        FRNTR accumulated
                      </div>

                      <button
                        type="button"
                        data-ocid={`command_center.mine.button.${i + 1}`}
                        onClick={() => claimResources(plot.id)}
                        style={{
                          width: "100%",
                          padding: "6px",
                          background: "transparent",
                          border: `1px solid ${CYAN}55`,
                          borderRadius: 4,
                          color: CYAN,
                          fontSize: 8.5,
                          fontWeight: 700,
                          letterSpacing: 1,
                          cursor: "pointer",
                        }}
                      >
                        ⛏ COLLECT RESOURCES
                      </button>
                    </div>
                  ))}
                  {filtered.length === 0 && searchQuery !== "" && (
                    <div
                      data-ocid="command_center.territories.empty_state"
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: CYAN_DIM,
                        fontSize: 9,
                        letterSpacing: 1,
                      }}
                    >
                      NO PLOTS MATCH YOUR SEARCH
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* MINERALS */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              MINERALS
            </div>
            {(() => {
              const totalTickRate = player.plotsOwned.reduce((acc, plotId) => {
                const plot = plots.find((p) => p.id === plotId);
                if (!plot) return acc;
                const subParcelsForPlot = getSubParcels(plotId);
                const hasReactor = subParcelsForPlot.some(
                  (sp) => sp.buildingType === "CYCLES_REACTOR",
                );
                if (!hasReactor) return acc;
                const tier = BIOME_TIER[plot.biome] ?? 1;
                const rate = TIER_MINERALS[tier] ?? TIER_MINERALS[1];
                return acc + rate.tickRate;
              }, 0);

              const mineralRows = [
                {
                  key: "iron" as const,
                  icon: "⚙",
                  label: "IRON",
                  color: "#9ca3af",
                  value: player.iron,
                },
                {
                  key: "fuel" as const,
                  icon: "⛽",
                  label: "FUEL",
                  color: "#f97316",
                  value: player.fuel,
                },
                {
                  key: "crystal" as const,
                  icon: "💎",
                  label: "CRYSTAL",
                  color: "#00ffcc",
                  value: player.crystal,
                },
              ];

              return mineralRows.map((m) => (
                <div
                  key={m.key}
                  style={{
                    background: "rgba(0,255,204,0.03)",
                    border: "1px solid rgba(0,255,204,0.12)",
                    borderRadius: 6,
                    padding: "9px 10px",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: m.color,
                        fontFamily: "monospace",
                        letterSpacing: 1,
                      }}
                    >
                      {m.icon} {m.label}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: m.color,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {m.value}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: "rgba(160,200,220,0.5)",
                          letterSpacing: 0.5,
                        }}
                      >
                        +{totalTickRate}/tick
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (m.value / 500) * 100)}%`,
                        background: m.color,
                        borderRadius: 2,
                        transition: "width 0.6s ease-out",
                        boxShadow: `0 0 6px ${m.color}66`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 7.5,
                      color: "rgba(160,200,220,0.35)",
                      marginTop: 3,
                      letterSpacing: 0.3,
                    }}
                  >
                    USED FOR: {MINERAL_USES[m.key]}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
