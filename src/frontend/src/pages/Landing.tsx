import { useNavigate } from "@tanstack/react-router";
import { Cpu, Globe, Shield, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const STATS = [
  { icon: <Globe size={20} />, value: "10,000", label: "Hex Plots" },
  { icon: <Users size={20} />, value: "4", label: "AI Factions" },
  { icon: <Cpu size={20} />, value: "3", label: "Resources" },
  { icon: <Shield size={20} />, value: "100%", label: "On-Chain" },
];

export default function Landing() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, #0a1628 0%, #04070d 70%)",
      }}
    >
      {/* Starfield */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 127 + 13) % 100}%`,
              top: `${(i * 71 + 29) % 100}%`,
              width: i % 5 === 0 ? "2px" : "1px",
              height: i % 5 === 0 ? "2px" : "1px",
              background: "#aaccff",
              opacity: 0.3 + (i % 7) * 0.1,
              animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i % 3) * 0.7}s`,
            }}
          />
        ))}
      </div>

      {/* Orbital rings decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute rounded-full border border-primary/10"
          style={{
            width: "600px",
            height: "600px",
            animation: "orbit 30s linear infinite",
          }}
        />
        <div
          className="absolute rounded-full border border-accent/8"
          style={{
            width: "800px",
            height: "500px",
            transform: "rotate(30deg)",
            animation: "orbit 45s linear infinite reverse",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="font-display font-bold text-xl tracking-[0.2em] text-primary glow-text uppercase">
          FRONTIER
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/leaderboard" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/manual" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Manual
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        {/* Globe visual */}
        <div className="relative mb-8 animate-float">
          <div
            className="w-48 h-48 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #1a4a6e, #0a1628 60%, #04070d)",
              boxShadow:
                "0 0 60px oklch(82% 0.19 195 / 0.3), 0 0 120px oklch(82% 0.19 195 / 0.1), inset 0 0 30px rgba(0,0,0,0.5)",
            }}
          >
            {/* Plot dots */}
            {Array.from({ length: 30 }, (_, i) => i).map((i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${15 + ((i * 47 + 11) % 70)}%`,
                  top: `${15 + ((i * 31 + 7) % 70)}%`,
                  width: "4px",
                  height: "4px",
                  background: [
                    "#EF4444",
                    "#8B5CF6",
                    "#22C3C9",
                    "#F59E0B",
                    "#35E7FF",
                  ][i % 5],
                  boxShadow: `0 0 6px ${["#EF4444", "#8B5CF6", "#22C3C9", "#F59E0B", "#35E7FF"][i % 5]}`,
                }}
              />
            ))}
          </div>
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow"
            style={{ background: "transparent" }}
          />
        </div>

        {/* Title */}
        <h1 className="font-display font-bold text-6xl md:text-8xl tracking-[0.15em] text-primary glow-text uppercase mb-4">
          FRONTIER
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-2 uppercase tracking-widest">
          Conquer the Universe.
        </p>
        <p className="text-accent text-base md:text-lg mb-10 uppercase tracking-widest">
          Own the Blockchain.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button
            type="button"
            onClick={isAuthenticated ? () => navigate({ to: "/play" }) : login}
            className="px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(82% 0.19 195), oklch(68% 0.185 185))",
              color: "#04070d",
              boxShadow: "0 0 20px oklch(82% 0.19 195 / 0.4)",
            }}
          >
            {isAuthenticated ? "Enter Universe" : "Connect Wallet"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/play" })}
            className="px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm border border-primary/50 text-primary hover:bg-primary/10 transition-all"
          >
            Explore the Map
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full">
          {STATS.map((s) => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2 text-primary">
                {s.icon}
              </div>
              <div className="font-display font-bold text-2xl text-primary">
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Faction badges */}
      <div className="relative z-10 flex justify-center gap-4 px-4 pb-12">
        {[
          { name: "NEXUS-7", color: "#EF4444", desc: "Aggressive Expansion" },
          { name: "KRONOS", color: "#8B5CF6", desc: "Defensive Fortress" },
          { name: "VANGUARD", color: "#22C3C9", desc: "Resource Mastery" },
          { name: "SPECTRE", color: "#F59E0B", desc: "Shadow Ops" },
        ].map((f) => (
          <div key={f.name} className="glass rounded-xl px-4 py-3 text-center">
            <div
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: f.color }}
            >
              {f.name}
            </div>
            <div className="text-xs text-muted-foreground">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 border-t border-border/30">
        <div className="flex justify-center gap-6 mb-2">
          {["About", "Manual", "Leaderboard", "Forum", "Discord"].map((l) => (
            <span
              key={l}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {l}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Frontier ICP Game · Fully Decentralized
          on Internet Computer
        </p>
      </footer>
    </div>
  );
}
