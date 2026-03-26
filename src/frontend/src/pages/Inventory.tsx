import { Flame, Gem, Wrench, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import { COMMANDERS, TIER_COLORS } from "../constants/commanders";
import { BIOME_COLORS, useGameStore } from "../store/gameStore";

export default function Inventory() {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const ownedCommanderIds = useGameStore((s) => s.ownedCommanderIds);
  const commanderUpgrades = useGameStore((s) => s.commanderUpgrades);
  const commanderAssignments = useGameStore((s) => s.commanderAssignments);

  const ownedPlots = plots.filter(
    (p) => player.plotsOwned.includes(p.id) || p.owner === player.principal,
  );

  const ownedCommanders = COMMANDERS.filter((c) =>
    ownedCommanderIds.includes(c.id),
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #0a1628 0%, #04070d 70%)",
      }}
    >
      <Navbar />
      <div
        className="pt-20 pb-8 px-6 max-w-6xl mx-auto overflow-y-auto"
        style={{ maxHeight: "100vh" }}
      >
        <h2 className="font-display font-bold text-3xl tracking-widest text-primary uppercase mb-6">
          Inventory
        </h2>

        {/* Resource totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Iron",
              value: player.iron,
              icon: <Wrench size={18} />,
              color: "#a0aec0",
            },
            {
              label: "Fuel",
              value: player.fuel,
              icon: <Flame size={18} />,
              color: "#F59E0B",
            },
            {
              label: "Crystal",
              value: player.crystal,
              icon: <Gem size={18} />,
              color: "#8B5CF6",
            },
            {
              label: "FRNTR",
              value: player.frntBalance,
              icon: <Zap size={18} />,
              color: "#35E7FF",
            },
          ].map((r) => (
            <div key={r.label} className="glass rounded-xl p-4 text-center">
              <div
                className="flex justify-center mb-2"
                style={{ color: r.color }}
              >
                {r.icon}
              </div>
              <div className="text-2xl font-bold" style={{ color: r.color }}>
                {r.value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {r.label}
              </div>
            </div>
          ))}
        </div>

        {/* ICP Balance */}
        <div className="glass rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Mock ICP Balance
            </div>
            <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
              {player.mockIcpBalance.toFixed(3)} ICP
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>For Commander NFT purchases</div>
            <div style={{ color: "#f59e0b" }}>Testing mode</div>
          </div>
        </div>

        {/* Commander section */}
        <h3 className="font-display font-bold text-lg tracking-widest text-foreground uppercase mb-3">
          Commanders ({ownedCommanders.length})
        </h3>
        {ownedCommanders.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground mb-6">
            <div className="text-4xl mb-3">⚔️</div>
            <div className="font-bold mb-1">No commanders recruited yet</div>
            <div className="text-sm">
              Visit the COMMANDER tab to purchase NFT commanders with ICP
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {ownedCommanders.map((c) => {
              const tierColor = TIER_COLORS[c.tier];
              const upgradeLevel = commanderUpgrades[c.id] ?? 0;
              const effectiveAtk = c.atk + upgradeLevel * 5;
              const effectiveDef = c.def + upgradeLevel * 5;
              const assignedPlot = Object.entries(commanderAssignments).find(
                ([, cid]) => cid === c.id,
              );
              const isActive = player.commanderType === c.id;

              return (
                <div
                  key={c.id}
                  className="glass rounded-xl p-4 flex flex-col items-center gap-3"
                  style={{
                    border: `1px solid ${tierColor}44`,
                    boxShadow: isActive ? `0 0 16px ${tierColor}33` : "none",
                  }}
                >
                  <img
                    src={c.badge}
                    alt={c.name}
                    className="w-16 h-16 object-contain"
                    style={{
                      filter: `drop-shadow(0 0 8px ${tierColor})`,
                    }}
                  />
                  <div className="text-center">
                    <div
                      className="font-bold text-sm"
                      style={{ color: tierColor }}
                    >
                      {c.name}
                    </div>
                    <div
                      className="text-xs mt-1 px-2 py-0.5 rounded"
                      style={{
                        color: tierColor,
                        background: `${tierColor}18`,
                        border: `1px solid ${tierColor}44`,
                        display: "inline-block",
                      }}
                    >
                      {c.tier}
                    </div>
                    {upgradeLevel > 0 && (
                      <div
                        className="text-xs mt-1"
                        style={{ color: "#f59e0b" }}
                      >
                        LVL {upgradeLevel} UPGRADE
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "#ef4444" }}>ATK {effectiveAtk}</span>
                    <span style={{ color: "#3b82f6" }}>DEF {effectiveDef}</span>
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(0,255,204,0.6)" }}
                  >
                    +{(c.rarityBonus * 100).toFixed(0)}% FRNTR/DAY
                  </div>
                  {assignedPlot && (
                    <div
                      className="text-xs"
                      style={{ color: "rgba(0,255,204,0.4)" }}
                    >
                      Deployed → Plot #{assignedPlot[0]}
                    </div>
                  )}
                  {isActive && (
                    <div
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={{
                        color: tierColor,
                        background: `${tierColor}18`,
                        border: `1px solid ${tierColor}55`,
                      }}
                    >
                      ✓ ACTIVE COMMANDER
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Owned plots */}
        <h3 className="font-display font-bold text-lg tracking-widest text-foreground uppercase mb-3">
          Owned Plots ({ownedPlots.length})
        </h3>
        {ownedPlots.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-3">🌍</div>
            <div className="font-bold mb-1">No plots owned yet</div>
            <div className="text-sm">
              Visit the Universe to purchase hexagonal plots
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ownedPlots.slice(0, 60).map((p) => (
              <div key={p.id} className="glass rounded-xl p-3 text-center">
                <div
                  className="w-10 h-10 hex-clip mx-auto mb-2"
                  style={{ background: BIOME_COLORS[p.biome] ?? "#1a2030" }}
                />
                <div className="text-xs font-bold text-foreground">
                  # {p.id}
                </div>
                <div className="text-xs text-muted-foreground">{p.biome}</div>
                <div className="text-xs text-primary mt-1">
                  {"★".repeat(Math.ceil(p.efficiency / 3))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
