import { Search, Shield, ShoppingCart, Sword, X, Zap } from "lucide-react";
import { BIOME_COLORS, FACTION_COLORS, useGameStore } from "../store/gameStore";

export default function PlotInfoPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const purchasePlot = useGameStore((s) => s.purchasePlot);
  const claimResources = useGameStore((s) => s.claimResources);
  const attack = useGameStore((s) => s.attack);

  if (selectedPlotId === null) return null;

  const plot = plots.find((p) => p.id === selectedPlotId);
  if (!plot) return null;

  const isOwner =
    player.plotsOwned.includes(plot.id) || plot.owner === player.principal;
  const isUnclaimed = plot.owner === null;
  const isFaction =
    plot.owner && Object.keys(FACTION_COLORS).includes(plot.owner);
  const ownerDisplay = isOwner
    ? "You"
    : plot.owner
      ? isFaction
        ? plot.owner
        : `${plot.owner.slice(0, 10)}...`
      : "Unclaimed";
  const biomeColor = BIOME_COLORS[plot.biome];
  const factionColor = plot.owner ? FACTION_COLORS[plot.owner] : null;
  const borderColor = isOwner ? "#35E7FF" : (factionColor ?? "#334155");

  const handleAttack = () => {
    const myPlot = plots.find(
      (p) => player.plotsOwned.includes(p.id) || p.owner === player.principal,
    );
    if (myPlot) attack(myPlot.id, plot.id);
  };

  return (
    <div
      className="fixed right-4 top-16 z-40 w-72 rounded-xl p-4 glass"
      style={{ borderColor, borderWidth: "1px", borderStyle: "solid" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Sector {Math.floor(plot.id / 100)}G:
          </div>
          <div className="text-lg font-display font-bold text-foreground">
            Plot #{plot.id}
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectPlot(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Biome badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 hex-clip" style={{ background: biomeColor }} />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: biomeColor }}
        >
          {plot.biome}
        </span>
        {plot.owner && factionColor && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${factionColor}30`, color: factionColor }}
          >
            {ownerDisplay}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 border-t border-border/50 pt-3 mb-3">
        {[
          { label: "Owner", value: ownerDisplay },
          {
            label: "Richness",
            value:
              "★".repeat(Math.ceil(plot.richness / 2)) +
              "☆".repeat(5 - Math.ceil(plot.richness / 2)),
          },
          { label: "Biome", value: plot.biome },
          {
            label: "Lat/Lng",
            value: `${plot.lat.toFixed(1)}°, ${plot.lng.toFixed(1)}°`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            <span className="text-xs font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Defenses */}
      <div className="flex gap-2 mb-3">
        {[
          { label: "Turrets", value: plot.defenses.turrets },
          { label: "Shields", value: plot.defenses.shields },
          { label: "Walls", value: plot.defenses.walls },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex-1 text-center glass-dark rounded-lg py-1.5"
          >
            <div className="text-sm font-bold text-primary">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Resources on plot */}
      <div className="flex gap-2 mb-3">
        {[
          { label: "Fe", value: plot.iron, color: "#a0aec0" },
          { label: "Fu", value: plot.fuel, color: "#F59E0B" },
          { label: "Cr", value: plot.crystal, color: "#8B5CF6" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex-1 text-center glass-dark rounded-lg py-1"
          >
            <div className="text-xs font-bold" style={{ color }}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleAttack}
          disabled={isOwner || isUnclaimed}
          className="py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #5B1F22, #8B2A2A)",
            borderColor: "#D25A5A50",
            color: "#FFB0B0",
          }}
        >
          <span className="flex items-center justify-center gap-1">
            <Sword size={10} />
            Attack
          </span>
        </button>
        <button
          type="button"
          className="py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/50 bg-muted/50 text-muted-foreground hover:border-primary/40 transition-all"
        >
          <span className="flex items-center justify-center gap-1">
            <Shield size={10} />
            Trade
          </span>
        </button>
        <button
          type="button"
          onClick={() =>
            isOwner
              ? claimResources(plot.id)
              : isUnclaimed
                ? purchasePlot(plot.id)
                : undefined
          }
          disabled={!isOwner && !isUnclaimed}
          className="py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all disabled:opacity-30"
          style={{
            background: "linear-gradient(135deg, #1E6C72, #22C3C9)",
            borderColor: "#22C3C960",
            color: "#d0fffe",
          }}
        >
          <span className="flex items-center justify-center gap-1">
            <ShoppingCart size={10} />
            {isOwner ? "Claim" : "Purchase"}
          </span>
        </button>
        <button
          type="button"
          className="py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/50 bg-muted/50 text-muted-foreground hover:border-primary/40 transition-all"
        >
          <span className="flex items-center justify-center gap-1">
            <Search size={10} />
            Scan
          </span>
        </button>
      </div>

      {/* FRNTR cost hint */}
      {isUnclaimed && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">Purchase costs </span>
          <span className="text-xs font-bold text-primary flex items-center justify-center gap-1">
            <Zap size={10} />
            100 FRNTR
          </span>
        </div>
      )}
    </div>
  );
}
