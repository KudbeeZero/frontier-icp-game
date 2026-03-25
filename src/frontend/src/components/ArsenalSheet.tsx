import { ArrowLeft, Target, Zap } from "lucide-react";
import { useState } from "react";
import {
  CLASS_COLORS,
  MISSILE_CONFIGS,
  type MissileConfig,
} from "../constants/missiles";
import { useArsenalAudio } from "../hooks/useArsenalAudio";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.18)";
const BG = "rgba(4,12,24,0.97)";

function LaunchBadge({ type }: { type: "hot" | "cold" }) {
  const isHot = type === "hot";
  return (
    <span
      style={{
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: 1,
        padding: "2px 6px",
        borderRadius: 3,
        background: isHot ? "rgba(249,115,22,0.15)" : "rgba(59,130,246,0.15)",
        border: `1px solid ${isHot ? "#f97316" : "#3b82f6"}`,
        color: isHot ? "#f97316" : "#3b82f6",
        fontFamily: "monospace",
      }}
    >
      {isHot ? "HOT LAUNCH" : "COLD LAUNCH"}
    </span>
  );
}

function ClassBadge({ cls }: { cls: string }) {
  const color = CLASS_COLORS[cls] ?? CYAN;
  return (
    <span
      style={{
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: 1,
        padding: "2px 6px",
        borderRadius: 3,
        background: `${color}18`,
        border: `1px solid ${color}`,
        color,
        fontFamily: "monospace",
      }}
    >
      {cls}
    </span>
  );
}

function SmokeDot({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 4px ${color}`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 7, color: CYAN_DIM, letterSpacing: 0.5 }}>
        SMOKE
      </span>
    </div>
  );
}

function MissileCard({
  missile,
  isEquipped,
  qty,
  onSelect,
  onEquip,
}: {
  missile: MissileConfig;
  isEquipped: boolean;
  qty: number;
  onSelect: () => void;
  onEquip: (e: React.MouseEvent) => void;
}) {
  const accent = missile.accentColor;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: game card
    <div
      data-ocid={`arsenal.${missile.id.toLowerCase()}.card`}
      onClick={onSelect}
      style={{
        background: isEquipped ? `${accent}0f` : "rgba(4,12,24,0.85)",
        border: `1px solid ${isEquipped ? accent : `${accent}44`}`,
        borderRadius: 8,
        padding: 10,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        boxShadow: isEquipped ? `0 0 14px ${accent}30` : "none",
        transition: "all 0.2s",
        minHeight: 120,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Qty badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: qty > 0 ? `${accent}22` : "rgba(100,100,100,0.2)",
          border: `1px solid ${qty > 0 ? accent : "#555"}`,
          borderRadius: 4,
          padding: "1px 5px",
          fontSize: 9,
          fontWeight: 700,
          color: qty > 0 ? accent : "#666",
          fontFamily: "monospace",
        }}
      >
        ×{qty}
      </div>

      {/* Top badges */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <ClassBadge cls={missile.class} />
        <LaunchBadge type={missile.launchType} />
      </div>

      {/* Missile name */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
          color: accent,
          letterSpacing: 1,
          fontFamily: "'Courier New', monospace",
          textShadow: `0 0 8px ${accent}80`,
          lineHeight: 1.1,
        }}
      >
        {missile.name}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 10,
          fontSize: 8,
          color: CYAN_DIM,
          fontFamily: "monospace",
        }}
      >
        <span>📏 {missile.range}</span>
        <span>⚡ {missile.speed}</span>
      </div>

      {/* Bottom row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
        }}
      >
        <SmokeDot color={missile.smokeColor} />
        <button
          type="button"
          data-ocid={`arsenal.${missile.id.toLowerCase()}.toggle`}
          onClick={onEquip}
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 1,
            padding: "4px 10px",
            borderRadius: 4,
            background: isEquipped ? `${accent}22` : "transparent",
            border: `1px solid ${isEquipped ? accent : `${accent}88`}`,
            color: isEquipped ? accent : `${accent}cc`,
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          {isEquipped ? "✓ EQUIPPED" : "EQUIP"}
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: CYAN_DIM,
          letterSpacing: 1,
          fontFamily: "monospace",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#e0f4ff",
          letterSpacing: 0.5,
          fontFamily: "monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MissileDetailView({
  missile,
  qty,
  onBack,
  onFire,
  onPreview,
  isEquipped,
  onEquip,
}: {
  missile: MissileConfig;
  qty: number;
  onBack: () => void;
  onFire: () => void;
  onPreview: () => void;
  isEquipped: boolean;
  onEquip: () => void;
}) {
  const accent = missile.accentColor;
  const canFire = qty > 0;

  return (
    <div
      data-ocid="arsenal.detail.panel"
      style={{
        position: "absolute",
        inset: 0,
        background: BG,
        borderRadius: "inherit",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        animation: "slideUpIn 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes firePulse {
          0%, 100% { box-shadow: 0 0 12px #ef444470; }
          50% { box-shadow: 0 0 28px #ef4444cc, 0 0 48px #ef444440; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="arsenal.detail.close_button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: CYAN_DIM,
            display: "flex",
            alignItems: "center",
            padding: 2,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: accent,
              letterSpacing: 2,
              fontFamily: "'Courier New', monospace",
              textShadow: `0 0 10px ${accent}80`,
            }}
          >
            {missile.name}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <ClassBadge cls={missile.class} />
            <LaunchBadge type={missile.launchType} />
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: qty > 0 ? accent : "#666",
            fontFamily: "monospace",
            border: `1px solid ${qty > 0 ? accent : "#555"}`,
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          ×{qty}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          scrollbarWidth: "none",
        }}
      >
        {/* Stats */}
        <div style={{ marginBottom: 14 }}>
          <StatRow label="GUIDANCE" value={missile.guidance} />
          <StatRow label="RANGE" value={missile.range} />
          <StatRow label="SPEED" value={missile.speed} />
          <StatRow label="WARHEAD" value={missile.warhead} />
          <StatRow
            label="LAUNCH TYPE"
            value={missile.launchType === "hot" ? "Hot Launch" : "Cold Launch"}
          />
          <StatRow
            label="TRAJECTORY"
            value={missile.trajectory.replace("-", " ").toUpperCase()}
          />
        </div>

        {/* Smoke trail */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: CYAN_DIM,
              letterSpacing: 2,
              marginBottom: 6,
              fontFamily: "monospace",
            }}
          >
            EXHAUST SIGNATURE
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <SmokeDot color={missile.smokeColor} />
            <span style={{ fontSize: 8, color: CYAN_DIM }}>
              Density: {Math.round(missile.smokeDensity * 100)}%
            </span>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(224,244,255,0.65)",
              lineHeight: 1.6,
              fontFamily: "monospace",
            }}
          >
            {missile.description}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            data-ocid="arsenal.preview.button"
            onClick={onPreview}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "rgba(0,255,204,0.06)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: CYAN_DIM,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            ▶ PREVIEW
          </button>
          <button
            type="button"
            data-ocid="arsenal.equip.toggle"
            onClick={onEquip}
            style={{
              flex: 1,
              padding: "10px 0",
              background: isEquipped ? `${accent}22` : "rgba(0,0,0,0.3)",
              border: `1px solid ${isEquipped ? accent : `${accent}66`}`,
              borderRadius: 6,
              color: isEquipped ? accent : `${accent}cc`,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {isEquipped ? "✓ EQUIPPED" : "EQUIP"}
          </button>
        </div>
        <button
          type="button"
          data-ocid="arsenal.fire.primary_button"
          onClick={onFire}
          disabled={!canFire}
          style={{
            width: "100%",
            padding: "14px 0",
            background: canFire
              ? "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))"
              : "rgba(100,100,100,0.1)",
            border: `2px solid ${canFire ? "#ef4444" : "#444"}`,
            borderRadius: 8,
            color: canFire ? "#ef4444" : "#555",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 4,
            cursor: canFire ? "pointer" : "not-allowed",
            fontFamily: "'Courier New', monospace",
            textShadow: canFire ? "0 0 12px #ef4444" : "none",
            animation: canFire ? "firePulse 2s ease-in-out infinite" : "none",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Zap size={16} />
          {canFire ? "FIRE MISSILE" : "OUT OF AMMO"}
        </button>
        {!canFire && (
          <div
            data-ocid="arsenal.empty_state"
            style={{
              fontSize: 9,
              color: "#ef4444",
              textAlign: "center",
              letterSpacing: 1,
              fontFamily: "monospace",
            }}
          >
            RESUPPLY REQUIRED
          </div>
        )}
      </div>
    </div>
  );
}

interface ArsenalSheetProps {
  onFireMissile: (missile: MissileConfig) => void;
}

export default function ArsenalSheet({ onFireMissile }: ArsenalSheetProps) {
  const [selectedMissile, setSelectedMissile] = useState<MissileConfig | null>(
    null,
  );
  const equippedMissileId = useGameStore((s) => s.equippedMissileId);
  const arsenalInventory = useGameStore((s) => s.arsenalInventory);
  const setEquippedMissile = useGameStore((s) => s.setEquippedMissile);
  const fireArsenalMissile = useGameStore((s) => s.fireArsenalMissile);
  const { playMissileAudio } = useArsenalAudio();

  function handleFire(missile: MissileConfig) {
    if ((arsenalInventory[missile.id] ?? 0) <= 0) return;
    fireArsenalMissile(missile.id);
    playMissileAudio(missile.id, "launch");
    onFireMissile(missile);
    setSelectedMissile(null);
  }

  function handlePreview(missile: MissileConfig) {
    playMissileAudio(missile.id, "launch");
  }

  const equipped = equippedMissileId
    ? MISSILE_CONFIGS.find((m) => m.id === equippedMissileId)
    : null;

  return (
    <div
      data-ocid="arsenal.panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={14} color={CYAN} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
              fontFamily: "monospace",
              textShadow: `0 0 10px ${CYAN}`,
            }}
          >
            WEAPONS STASH
          </span>
        </div>
        {equipped && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              background: `${equipped.accentColor}18`,
              border: `1px solid ${equipped.accentColor}66`,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: equipped.accentColor,
                boxShadow: `0 0 4px ${equipped.accentColor}`,
              }}
            />
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: equipped.accentColor,
                letterSpacing: 1,
                fontFamily: "monospace",
              }}
            >
              {equipped.name}
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          scrollbarWidth: "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {MISSILE_CONFIGS.map((missile) => (
            <MissileCard
              key={missile.id}
              missile={missile}
              isEquipped={equippedMissileId === missile.id}
              qty={arsenalInventory[missile.id] ?? 0}
              onSelect={() => setSelectedMissile(missile)}
              onEquip={(e) => {
                e.stopPropagation();
                setEquippedMissile(missile.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Detail overlay */}
      {selectedMissile && (
        <MissileDetailView
          missile={selectedMissile}
          qty={arsenalInventory[selectedMissile.id] ?? 0}
          isEquipped={equippedMissileId === selectedMissile.id}
          onBack={() => setSelectedMissile(null)}
          onFire={() => handleFire(selectedMissile)}
          onPreview={() => handlePreview(selectedMissile)}
          onEquip={() => setEquippedMissile(selectedMissile.id)}
        />
      )}
    </div>
  );
}
