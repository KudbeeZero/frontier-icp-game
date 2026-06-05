import { BarChart2, Flame, Pickaxe, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const GOLD = "#ffd700";

const RESOURCE_COLORS: Record<string, string> = {
  iron: "#94a3b8",
  fuel: "#f97316",
  crystal: "#3b82f6",
  rareEarth: "#c084fc",
};

const RESOURCE_LABELS: Record<string, string> = {
  iron: "IRON",
  fuel: "FUEL",
  crystal: "CRYSTAL",
  rareEarth: "RARE EARTH",
};

const GENERATOR_PRODUCTION: Record<number, number> = {
  0: 7,
  1: 15,
  2: 31,
  3: 63,
  4: 127,
  5: 255,
  6: 511,
};

function fmtFrntr(n: number): string {
  return n.toFixed(8);
}

function fmtResource(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(8);
}

function MiniBar({
  value,
  max,
  color,
}: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) * 100 : 0;
  return (
    <div
      style={{
        height: 4,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 4px ${color}88`,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

export default function CommandCenter() {
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);
  const mineResources = useGameStore((s) => s.mineResources);
  const claimAllFrntr = useGameStore((s) => s.claimAllFrntr);
  const plots = useGameStore((s) => s.plots);

  const [activeTab, setActiveTab] = useState<"tokens" | "mining">("tokens");
  const [mineMsg, setMineMsg] = useState<string | null>(null);

  const ownedPlotData = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(p.id)),
    [plots, player.plotsOwned],
  );

  const totalDailyFrntr = useMemo(() => {
    return ownedPlotData.reduce((sum, plot) => {
      const tier = generatorTiers[plot.id] ?? 0;
      return sum + (GENERATOR_PRODUCTION[tier] ?? 7);
    }, 0);
  }, [ownedPlotData, generatorTiers]);

  const handleMineAll = () => {
    let _totalIron = 0;
    let _totalFuel = 0;
    for (const plotId of player.plotsOwned) {
      const result = mineResources(plotId);
      if (result) {
        _totalIron += result.iron;
        _totalFuel += result.fuel;
      }
    }
    const bonus = (totalDailyFrntr / 86400) * 600; // 10 min worth
    claimAllFrntr(bonus);
    setMineMsg(`+${bonus.toFixed(4)} FRNTR harvested!`);
    setTimeout(() => setMineMsg(null), 3000);
  };

  const storageCap = player.resourceStorageCap;

  return (
    <div
      data-ocid="command.panel"
      style={{
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["tokens", "mining"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid={`command.${tab}.tab`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 6,
              background:
                activeTab === tab
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(0,10,20,0.5)",
              border: `1px solid ${activeTab === tab ? `${CYAN}66` : BORDER}`,

              color: activeTab === tab ? CYAN : TEXT_DIM,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: "pointer",
              textTransform: "uppercase",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${CYAN}`
                  : "1px solid transparent",
            }}
          >
            {tab === "tokens" ? "TOKEN ECONOMY" : "MINING OPS"}
          </button>
        ))}
      </div>

      {activeTab === "tokens" && (
        <>
          {/* FRNTR Balance */}
          <div
            style={{
              background: "rgba(0,20,40,0.55)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              FRNTR BALANCE
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: CYAN,
                fontFamily: "monospace",
                textShadow: `0 0 12px ${CYAN}`,
                marginBottom: 4,
              }}
            >
              {fmtFrntr(player.frntBalance)}
            </div>
            <div style={{ fontSize: 9, color: CYAN_DIM }}>
              +{totalDailyFrntr} FRNTR/DAY ·{" "}
              {(totalDailyFrntr / 86400).toFixed(8)} FRNTR/SEC
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                icon: Zap,
                label: "Plots Owned",
                value: player.plotsOwned.length,
                color: CYAN,
                sub: `${totalDailyFrntr} F/day`,
              },
              {
                icon: Flame,
                label: "FRNTR Burned",
                value: totalFRNTRBurned.toFixed(2),
                color: "#ef4444",
                sub: "out of circulation",
              },
              {
                icon: TrendingUp,
                label: "Daily Yield",
                value: `${totalDailyFrntr}`,
                color: GOLD,
                sub: "FRNTR total",
              },
              {
                icon: BarChart2,
                label: "Rank Points",
                value: player.plotsOwned.length * 100,
                color: "#a855f7",
                sub: "global score",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(0,10,20,0.5)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  <stat.icon size={11} color={stat.color} />
                  <span
                    style={{ fontSize: 7, color: TEXT_DIM, letterSpacing: 1.5 }}
                  >
                    {stat.label.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: stat.color,
                    fontFamily: "monospace",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 7, color: TEXT_DIM, marginTop: 2 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Supply progress */}
          <div
            style={{
              background: "rgba(0,20,40,0.55)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              TOKEN SUPPLY OVERVIEW
            </div>
            {[
              {
                label: "Pre-Minted",
                value: 5_000_000_000,
                total: 10_000_000_000,
                color: GOLD,
              },
              {
                label: "Mineable Left",
                value: 5_000_000_000 - totalFRNTRBurned,
                total: 10_000_000_000,
                color: CYAN,
              },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <span style={{ fontSize: 8, color: TEXT_DIM }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: item.color,
                      fontFamily: "monospace",
                    }}
                  >
                    {(item.value / 1e9).toFixed(2)}B
                  </span>
                </div>
                <MiniBar
                  value={item.value}
                  max={item.total}
                  color={item.color}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "mining" && (
        <>
          {/* Mine All button */}
          <button
            type="button"
            data-ocid="command.mine_all_button"
            onClick={handleMineAll}
            disabled={player.plotsOwned.length === 0}
            style={{
              padding: "12px",
              borderRadius: 10,
              background:
                player.plotsOwned.length > 0
                  ? "linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,255,204,0.08))"
                  : "rgba(255,255,255,0.03)",
              border: `2px solid ${player.plotsOwned.length > 0 ? CYAN : BORDER}`,
              color: player.plotsOwned.length > 0 ? CYAN : TEXT_DIM,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 2,
              cursor: player.plotsOwned.length > 0 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Pickaxe size={14} />
            MINE ALL PLOTS
          </button>

          {mineMsg && (
            <div
              data-ocid="command.success_state"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(0,255,204,0.08)",
                border: `1px solid ${BORDER}`,
                fontSize: 10,
                color: CYAN,
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              ✓ {mineMsg}
            </div>
          )}

          {/* Resource stockpiles */}
          <div
            style={{
              background: "rgba(0,20,40,0.55)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              RESOURCE STOCKPILES
            </div>
            {(["iron", "fuel", "crystal", "rareEarth"] as const).map((key) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: RESOURCE_COLORS[key],
                      fontWeight: 700,
                    }}
                  >
                    {RESOURCE_LABELS[key]}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: TEXT,
                      fontFamily: "monospace",
                    }}
                  >
                    {fmtResource(player[key])}
                  </span>
                </div>
                <MiniBar
                  value={player[key]}
                  max={storageCap}
                  color={RESOURCE_COLORS[key]}
                />
                <div style={{ fontSize: 7, color: TEXT_DIM, marginTop: 2 }}>
                  {player[key].toFixed(2)} / {storageCap} stored
                </div>
              </div>
            ))}
          </div>

          {/* Per-plot mining ops */}
          {ownedPlotData.length === 0 ? (
            <div
              data-ocid="command.empty_state"
              style={{
                padding: "24px",
                textAlign: "center",
                color: TEXT_DIM,
                fontSize: 10,
                letterSpacing: 0.5,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🌍</div>
              NO PLOTS OWNED
              <br />
              <span style={{ fontSize: 8 }}>
                Purchase land on the globe to start mining
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 8,
                  color: TEXT_DIM,
                  letterSpacing: 2,
                  marginBottom: 2,
                }}
              >
                MINING OPERATIONS
              </div>
              {ownedPlotData.map((plot, idx) => {
                const tier = generatorTiers[plot.id] ?? 0;
                const prod = GENERATOR_PRODUCTION[tier] ?? 7;
                return (
                  <div
                    key={plot.id}
                    data-ocid={`command.plot.${idx + 1}`}
                    style={{
                      background: "rgba(0,10,20,0.5)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "rgba(0,255,204,0.08)",
                        border: `1px solid ${CYAN}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        fontWeight: 900,
                        color: CYAN,
                        flexShrink: 0,
                      }}
                    >
                      #{plot.id}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 9, fontWeight: 700, color: TEXT }}
                      >
                        {plot.biome.toUpperCase()} · GEN-
                        {tier === 0 ? "0" : tier}
                      </div>
                      <div style={{ fontSize: 7, color: CYAN_DIM }}>
                        {prod} FRNTR/DAY · EFF {plot.efficiency}%
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`command.mine_button.${idx + 1}`}
                      onClick={() => mineResources(plot.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 8,
                        background: "rgba(0,255,204,0.08)",
                        border: `1px solid ${BORDER}`,
                        color: CYAN,
                        cursor: "pointer",
                        fontWeight: 700,
                        letterSpacing: 1,
                        flexShrink: 0,
                      }}
                    >
                      MINE
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
