import { Star } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export default function PlayerHUD() {
  const player = useGameStore((s) => s.player);
  const ownedCount = player.plotsOwned.length;
  const rank =
    ownedCount > 100
      ? "Admiral"
      : ownedCount > 50
        ? "General"
        : ownedCount > 10
          ? "Captain"
          : ownedCount > 0
            ? "Recruit"
            : "Civilian";

  // Generate avatar color from principal
  const avatarHue = player.principal
    ? (player.principal.charCodeAt(0) * 7) % 360
    : 195;

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
            Player
          </div>
          <div className="text-sm font-bold text-foreground truncate max-w-[100px]">
            {player.principal
              ? `${player.principal.slice(0, 8)}...`
              : "Anonymous"}
          </div>
          <div className="text-xs text-primary">{rank}</div>
        </div>
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
