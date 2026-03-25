import { Flame, Gem, Wrench } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export default function ResourceCard() {
  const player = useGameStore((s) => s.player);

  const resources = [
    {
      label: "Iron",
      value: player.iron,
      icon: <Wrench size={14} />,
      color: "#a0aec0",
    },
    {
      label: "Fuel",
      value: player.fuel,
      icon: <Flame size={14} />,
      color: "#F59E0B",
    },
    {
      label: "Crystal",
      value: player.crystal,
      icon: <Gem size={14} />,
      color: "#8B5CF6",
    },
  ];

  return (
    <div className="glass rounded-xl p-4 w-60 mt-2">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Resources
      </div>
      <div className="space-y-2">
        {resources.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: r.color }}>
              {r.icon}
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {r.label}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: r.color }}>
              {r.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 w-full py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 transition-all"
      >
        Claim All
      </button>
    </div>
  );
}
