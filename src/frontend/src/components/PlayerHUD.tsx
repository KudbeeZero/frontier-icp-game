import { Shield, Star, Sword } from "lucide-react";
import { useGameStore } from "../store/gameStore";

const COMMANDER_COLORS: Record<string, string> = {
  Sentinel: "#22C3C9",
  Phantom: "#A855F7",
  Reaper: "#EF4444",
};

export default function PlayerHUD() {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const ownedCount = player.plotsOwned.length;
  const rank =
    ownedCount > 100
      ? "Admiral"
      : ownedCount > 50
        ? "Commander"
        : ownedCount > 10
          ? "Captain"
          : ownedCount > 0
            ? "Recruit"
            : "Civilian";

  // Generate avatar color from principal
  const avatarHue = player.principal
    ? (player.principal.charCodeAt(0) * 7) % 360
    : 195;

  const commanderColor = player.commanderType
    ? (COMMANDER_COLORS[player.commanderType] ?? "#22C3C9")
    : "#2DD4FF";
  void plots;

  return (
    <div className="glass rounded-xl p-4 w-60">
      {/* Avatar + info */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 hex-clip flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, oklch(40% 0.18 ${avatarHue}) 0%, oklch(65% 0.22 ${avatarHue}) 100%)`,
            boxShadow: `0 0 12px oklch(65% 0.22 ${avatarHue} / 0.5)`,
          }}
        />
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Commander
          </div>
          <div className="text-sm font-bold text-foreground truncate max-w-[100px]">
            {player.principal
              ? `${player.principal.slice(0, 8)}...`
              : "Anonymous"}
          </div>
          <div className="text-xs text-primary">{rank}</div>
        </div>
      </div>

      {/* Commander */}
      <div className="border-t border-border/50 pt-3 mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Active Commander
        </div>
        {player.commanderType ? (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 hex-clip"
              style={{
                background: commanderColor,
                boxShadow: `0 0 8px ${commanderColor}60`,
              }}
            />
            <div>
              <div
                className="text-xs font-bold"
                style={{ color: commanderColor }}
              >
                {player.commanderType}
              </div>
              <div className="flex gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sword size={10} />
                  {player.commanderAtk}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield size={10} />
                  {player.commanderDef}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No Commander</div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{ownedCount}</div>
          <div className="text-xs text-muted-foreground">Plots</div>
        </div>
        <div className="text-center">
          <div className="flex">
            {[1, 2, 3].map((i) => (
              <Star
                key={i}
                size={12}
                className={
                  i <= Math.ceil(ownedCount / 10)
                    ? "text-primary"
                    : "text-muted"
                }
                fill={i <= Math.ceil(ownedCount / 10) ? "currentColor" : "none"}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Stars</div>
        </div>
      </div>
    </div>
  );
}
