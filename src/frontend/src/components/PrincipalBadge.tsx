import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useActor } from "@caffeineai/core-infrastructure";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";

export default function PrincipalBadge() {
  const { isAuthenticated, clear } = useInternetIdentity();
  const { actor } = useActor(createActor);
  const player = useGameStore((s) => s.player);
  const setAuth = useGameStore((s) => s.setAuth);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (!actor) return;
    const fetchPrincipal = async () => {
      try {
        const data = await actor.getPrincipal();
        setDisplayText(data.short);
        setIsAuthed(data.isAuthed);
        if (data.isAuthed && data.full) {
          setAuth(data.full);
          useGameStore.setState((s) => ({
            player: { ...s.player, principal: data.full },
          }));
        }
      } catch {
        // fallback to store
        if (player.principal) {
          const p = player.principal;
          setDisplayText(`${p.slice(0, 8)}...${p.slice(-4)}`);
          setIsAuthed(true);
        }
      }
    };
    void fetchPrincipal();
  }, [actor, player.principal, setAuth]);

  const isConnected = isAuthed || !!player.principal;
  const text =
    displayText ??
    (player.principal
      ? `${player.principal.slice(0, 8)}...${player.principal.slice(-4)}`
      : null);

  if (!isConnected || !text) return null;

  return (
    <div
      data-ocid="principal.badge"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 6,
        background: "rgba(0,255,204,0.07)",
        border: `1px solid ${BORDER}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* Green checkmark indicator */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: isAuthenticated ? "#00ff88" : CYAN_DIM,
          boxShadow: isAuthenticated ? "0 0 6px #00ff88" : "none",
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono"
        title={player.principal ?? undefined}
        style={{
          fontSize: 9,
          color: CYAN,
          fontWeight: 700,
          letterSpacing: 0.5,
          whiteSpace: "nowrap",
          cursor: "help",
        }}
      >
        {text}
      </span>
      <button
        type="button"
        data-ocid="principal.logout_button"
        onClick={() => {
          clear();
          setAuth(null);
          setDisplayText(null);
          setIsAuthed(false);
        }}
        title="Logout"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 2,
          color: CYAN_DIM,
          display: "flex",
          alignItems: "center",
        }}
      >
        <LogOut size={10} />
      </button>
    </div>
  );
}
