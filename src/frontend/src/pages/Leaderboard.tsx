import { Globe, Sword, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import Navbar from "../components/Navbar";
import { useGameStore } from "../store/gameStore";

type SortKey = "plotsOwned" | "frntEarned" | "victories";

export default function Leaderboard() {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const [sort, setSort] = useState<SortKey>("plotsOwned");

  const sorted = [...leaderboard].sort((a, b) => {
    if (sort === "plotsOwned") return b.plotsOwned - a.plotsOwned;
    if (sort === "frntEarned") return b.frntEarned - a.frntEarned;
    return b.victories - a.victories;
  });

  const RANK_STYLES = ["text-yellow-400", "text-gray-300", "text-amber-600"];

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
        className="pt-20 pb-8 px-6 max-w-4xl mx-auto overflow-y-auto"
        style={{ maxHeight: "100vh" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={28} className="text-primary" />
          <h2 className="font-display font-bold text-3xl tracking-widest text-primary uppercase">
            Leaderboard
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            {
              key: "plotsOwned" as SortKey,
              label: "Plots",
              icon: <Globe size={14} />,
            },
            {
              key: "frntEarned" as SortKey,
              label: "FRNTR",
              icon: <Zap size={14} />,
            },
            {
              key: "victories" as SortKey,
              label: "Victories",
              icon: <Sword size={14} />,
            },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background:
                  sort === tab.key
                    ? "oklch(82% 0.19 195 / 0.2)"
                    : "oklch(13% 0.03 240 / 0.75)",
                border: `1px solid ${sort === tab.key ? "oklch(82% 0.19 195 / 0.5)" : "oklch(28% 0.07 200 / 0.5)"}`,
                color:
                  sort === tab.key
                    ? "oklch(82% 0.19 195)"
                    : "oklch(58% 0.04 220)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Player
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Plots
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  FRNTR
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Victories
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, i) => (
                <tr
                  key={entry.name}
                  className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                  style={
                    i < 3
                      ? {
                          background: `oklch(13% 0.03 240 / ${0.15 - i * 0.04})`,
                        }
                      : {}
                  }
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-bold ${RANK_STYLES[i] ?? "text-muted-foreground"}`}
                    >
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 hex-clip"
                        style={{
                          background: `oklch(55% 0.2 ${(entry.name.charCodeAt(0) * 23) % 360})`,
                        }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {entry.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 text-sm font-bold text-primary">
                    {entry.plotsOwned}
                  </td>
                  <td className="text-right px-4 py-3 text-sm font-bold text-accent">
                    {entry.frntEarned.toLocaleString()}
                  </td>
                  <td className="text-right px-4 py-3 text-sm font-bold text-destructive">
                    {entry.victories}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
