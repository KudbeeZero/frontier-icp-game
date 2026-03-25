import { Flame, Gem, Wrench, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import { BIOME_COLORS, useGameStore } from "../store/gameStore";

const COMMANDERS = [
  {
    type: "Sentinel",
    color: "#22C3C9",
    desc: "Defense Specialist",
    atk: 2,
    def: 8,
    cost: 200,
  },
  {
    type: "Phantom",
    color: "#A855F7",
    desc: "Shadow Operative",
    atk: 5,
    def: 5,
    cost: 250,
  },
  {
    type: "Reaper",
    color: "#EF4444",
    desc: "Assault Commander",
    atk: 10,
    def: 2,
    cost: 300,
  },
];

export default function Inventory() {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);

  const ownedPlots = plots.filter(
    (p) => player.plotsOwned.includes(p.id) || p.owner === player.principal,
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

        {/* Commander section */}
        <h3 className="font-display font-bold text-lg tracking-widest text-foreground uppercase mb-3">
          Commander
        </h3>
        {player.commanderType ? (
          <div className="glass rounded-xl p-4 mb-6 flex items-center gap-4">
            <div
              className="w-16 h-16 hex-clip"
              style={{
                background:
                  COMMANDERS.find((c) => c.type === player.commanderType)
                    ?.color ?? "#22C3C9",
              }}
            />
            <div>
              <div className="font-bold text-lg text-foreground">
                {player.commanderType}
              </div>
              <div className="text-xs text-muted-foreground">
                Active Commander
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {COMMANDERS.map((c) => (
              <div
                key={c.type}
                className="glass rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 hex-clip"
                    style={{ background: c.color }}
                  />
                  <div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: c.color }}
                    >
                      {c.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.desc}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    ATK:{" "}
                    <span className="text-destructive font-bold">{c.atk}</span>
                  </span>
                  <span>
                    DEF: <span className="text-accent font-bold">{c.def}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="mt-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border"
                  style={{
                    borderColor: `${c.color}60`,
                    color: c.color,
                    background: `${c.color}15`,
                  }}
                >
                  Hire — {c.cost} FRNTR
                </button>
              </div>
            ))}
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
                  {"★".repeat(Math.ceil(p.richness / 3))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
