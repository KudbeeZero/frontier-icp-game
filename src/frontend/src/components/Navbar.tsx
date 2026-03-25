import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useGameStore } from "../store/gameStore";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Universe", to: "/play" },
  { label: "Inventory", to: "/inventory" },
  { label: "Leaderboard", to: "/leaderboard" },
];

export default function Navbar() {
  const { login, logout, isAuthenticated } = useAuth();
  const frntBalance = useGameStore((s) => s.player.frntBalance);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 glass-dark border-b border-border/50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <Link
          to="/"
          className="font-display font-bold text-xl tracking-[0.2em] text-primary glow-text uppercase"
        >
          FRONTIER
        </Link>

        {/* Nav pill */}
        <nav className="hidden md:flex items-center gap-1 glass rounded-full px-2 py-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              activeProps={{
                className:
                  "px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full text-primary bg-primary/15",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/play"
            className="ml-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full bg-secondary/80 text-secondary-foreground border border-primary/30 hover:bg-secondary transition-all"
          >
            Play Now
          </Link>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* FRNTR balance */}
          <div className="hidden sm:flex items-center gap-2 glass rounded-full px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-secondary/60 border border-primary/40 flex items-center justify-center">
              <Zap size={10} className="text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">FRNTR</span>
            <span className="text-xs font-bold text-primary">
              {frntBalance.toLocaleString()}
            </span>
          </div>

          {/* Auth button */}
          <button
            type="button"
            onClick={isAuthenticated ? logout : login}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-primary/50 text-primary hover:bg-primary/15 transition-all"
          >
            {isAuthenticated ? "Disconnect" : "Connect"}
          </button>
        </div>
      </div>
    </header>
  );
}
