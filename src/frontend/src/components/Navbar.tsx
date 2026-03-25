import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useTokenBalance } from "../hooks/useTokenBalance";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Universe", to: "/play" },
  { label: "Factions", to: "/factions" },
  { label: "Marketplace", to: "/marketplace" },
];

export default function Navbar() {
  const { login, clear, identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const balance = useTokenBalance();

  return (
    <header
      data-ocid="navbar.panel"
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-6"
      style={{
        background: "rgba(2,10,20,0.88)",
        borderBottom: "1px solid rgba(0,255,204,0.22)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        data-ocid="navbar.link"
        className="font-bold text-xl tracking-[0.25em] uppercase"
        style={{
          color: "#00ffcc",
          textShadow:
            "0 0 12px rgba(0,255,204,0.7), 0 0 24px rgba(0,255,204,0.3)",
          letterSpacing: "0.25em",
        }}
      >
        FRONTIER
      </Link>

      {/* Center nav pill */}
      <nav
        className="flex items-center gap-1 rounded-full px-2 py-1"
        style={{
          background: "rgba(0,255,204,0.06)",
          border: "1px solid rgba(0,255,204,0.18)",
          backdropFilter: "blur(8px)",
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            data-ocid="navbar.link"
            className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-full transition-all"
            style={{ color: "rgba(180,220,220,0.7)" }}
            activeProps={{
              style: {
                color: "#00ffcc",
                background: "rgba(0,255,204,0.12)",
                textShadow: "0 0 8px rgba(0,255,204,0.5)",
              },
            }}
            inactiveProps={{}}
          >
            {link.label}
          </Link>
        ))}
        <Link
          to="/play"
          data-ocid="navbar.primary_button"
          className="ml-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all"
          style={{
            background: "rgba(0,255,204,0.15)",
            border: "1px solid rgba(0,255,204,0.4)",
            color: "#00ffcc",
            boxShadow: "0 0 10px rgba(0,255,204,0.2)",
          }}
        >
          Play Now
        </Link>
      </nav>

      {/* Right: balance + auth */}
      <div className="flex items-center gap-3">
        {/* FRNTR balance chip */}
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: "rgba(0,255,204,0.06)",
            border: "1px solid rgba(0,255,204,0.22)",
          }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(0,255,204,0.15)",
              border: "1px solid rgba(0,255,204,0.4)",
            }}
          >
            <Zap size={10} style={{ color: "#00ffcc" }} />
          </div>
          <span className="text-xs" style={{ color: "rgba(180,220,220,0.6)" }}>
            FRNTR
          </span>
          <span className="text-xs font-bold" style={{ color: "#00ffcc" }}>
            {balance}
          </span>
        </div>

        {/* Auth button */}
        <button
          type="button"
          data-ocid="navbar.button"
          onClick={isAuthenticated ? clear : login}
          className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all"
          style={{
            border: "1px solid rgba(0,255,204,0.5)",
            color: "#00ffcc",
          }}
        >
          {isAuthenticated ? "Disconnect" : "Connect"}
        </button>
      </div>
    </header>
  );
}
