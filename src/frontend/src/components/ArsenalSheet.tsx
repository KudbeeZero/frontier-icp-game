import { ArrowLeft, Shield, Target, Zap } from "lucide-react";
import { useState } from "react";
import {
  ARTILLERY_CONFIGS,
  type ArtilleryConfig,
} from "../constants/artillery";
import {
  INTERCEPTOR_CONFIGS,
  type InterceptorConfig,
} from "../constants/interceptors";
import {
  CLASS_COLORS,
  MISSILE_CONFIGS,
  type MissileConfig,
} from "../constants/missiles";
import { useActor } from "../hooks/useActor";
import { useArsenalAudio } from "../hooks/useArsenalAudio";
import { useFireArtillery } from "../hooks/useFireArtillery";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLaunchMissile } from "../hooks/useLaunchMissile";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.5)";
const BORDER = "rgba(0,255,204,0.18)";
const BG = "rgba(4,12,24,0.97)";

type ArsenalTab = "MISSILES" | "ARTILLERY" | "INTERCEPTORS";

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

function ClassBadge({ cls, color }: { cls: string; color?: string }) {
  const c = color ?? CLASS_COLORS[cls] ?? CYAN;
  return (
    <span
      style={{
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: 1,
        padding: "2px 6px",
        borderRadius: 3,
        background: `${c}18`,
        border: `1px solid ${c}`,
        color: c,
        fontFamily: "monospace",
      }}
    >
      {cls}
    </span>
  );
}

function SmokeDot({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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

// ─── MISSILE CARD ────────────────────────────────────────────────────────────
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

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <ClassBadge cls={missile.class} />
        <LaunchBadge type={missile.launchType} />
      </div>

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

// ─── MISSILE DETAIL VIEW ────────────────────────────────────────────────────
function MissileDetailView({
  missile,
  qty,
  onBack,
  onFire,
  onPreview,
  isEquipped,
  onEquip,
  isLaunching,
  launchStatus,
  fireLabel,
}: {
  missile: MissileConfig | ArtilleryConfig;
  qty: number;
  onBack: () => void;
  onFire: () => void;
  onPreview: () => void;
  isEquipped: boolean;
  onEquip: () => void;
  isLaunching: boolean;
  launchStatus: { success: boolean; message: string } | null;
  fireLabel?: string;
}) {
  const accent = missile.accentColor;
  const canFire = qty > 0 && !isLaunching;
  const cls =
    (missile as MissileConfig).class ?? (missile as ArtilleryConfig).class;

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
        @keyframes launchingPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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
            <ClassBadge cls={cls} color={accent} />
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

        {launchStatus && (
          <div
            data-ocid="arsenal.launch_status"
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: launchStatus.success
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
              border: `1px solid ${
                launchStatus.success ? "#22c55e" : "#ef4444"
              }`,
              fontSize: 9,
              fontWeight: 700,
              color: launchStatus.success ? "#22c55e" : "#ef4444",
              letterSpacing: 1,
              fontFamily: "monospace",
              textAlign: "center",
            }}
          >
            {launchStatus.success ? "✓ " : "✗ "}
            {launchStatus.message}
          </div>
        )}
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
            animation: isLaunching
              ? "launchingPulse 0.5s ease-in-out infinite"
              : canFire
                ? "firePulse 2s ease-in-out infinite"
                : "none",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Zap size={16} />
          {isLaunching
            ? "LAUNCHING…"
            : qty > 0
              ? (fireLabel ?? "FIRE MISSILE")
              : "OUT OF AMMO"}
        </button>
        {qty <= 0 && !isLaunching && (
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

// ─── ARTILLERY CARD ──────────────────────────────────────────────────────────
function ArtilleryCard({
  artillery,
  qty,
  onSelect,
}: {
  artillery: ArtilleryConfig;
  qty: number;
  onSelect: () => void;
}) {
  const accent = artillery.accentColor;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: game card
    <div
      data-ocid={`arsenal.${artillery.id.toLowerCase()}.card`}
      onClick={onSelect}
      style={{
        background: "rgba(4,12,24,0.85)",
        border: `1px solid ${accent}44`,
        borderRadius: 8,
        padding: 10,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        transition: "all 0.2s",
        minHeight: 120,
        position: "relative",
        overflow: "hidden",
      }}
    >
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

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <ClassBadge cls={artillery.class} color={accent} />
        <LaunchBadge type={artillery.launchType} />
      </div>

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
        {artillery.name}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          fontSize: 8,
          color: CYAN_DIM,
          fontFamily: "monospace",
        }}
      >
        <span>📏 {artillery.range}</span>
        <span>⚡ {artillery.speed}</span>
      </div>

      <SmokeDot color={artillery.smokeColor} />
    </div>
  );
}

// ─── INTERCEPTOR CARD ────────────────────────────────────────────────────────
function InterceptorCard({
  interceptor,
  qty,
  assignedToCurrentPlot,
  onAssign,
  assignStatus,
}: {
  interceptor: InterceptorConfig;
  qty: number;
  assignedToCurrentPlot: boolean;
  onAssign: () => void;
  assignStatus: { success: boolean; message: string } | null;
}) {
  const accent = interceptor.accentColor;
  const pct = Math.round(interceptor.interceptChance * 100);

  return (
    <div
      data-ocid={`arsenal.${interceptor.id.toLowerCase()}.card`}
      style={{
        background: assignedToCurrentPlot
          ? `${accent}0f`
          : "rgba(4,12,24,0.85)",
        border: `1px solid ${assignedToCurrentPlot ? accent : `${accent}44`}`,
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 9,
        boxShadow: assignedToCurrentPlot ? `0 0 14px ${accent}30` : "none",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      {/* Active badge */}
      {assignedToCurrentPlot && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: `${accent}33`,
            border: `1px solid ${accent}`,
            borderRadius: 4,
            padding: "2px 7px",
            fontSize: 8,
            fontWeight: 700,
            color: accent,
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        >
          ACTIVE
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          paddingRight: assignedToCurrentPlot ? 60 : 0,
        }}
      >
        <ClassBadge cls="SAM" color={accent} />
        <LaunchBadge type={interceptor.launchType} />
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
          color: accent,
          letterSpacing: 1,
          fontFamily: "'Courier New', monospace",
          textShadow: `0 0 8px ${accent}80`,
        }}
      >
        {interceptor.name}
      </div>

      {/* Intercept rate bar */}
      <div>
        <div
          style={{
            fontSize: 8,
            color: CYAN_DIM,
            letterSpacing: 1,
            fontFamily: "monospace",
            marginBottom: 4,
          }}
        >
          INTERCEPT RATE: {pct}%
        </div>
        <div
          style={{
            height: 5,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${accent}88, ${accent})`,
              borderRadius: 3,
              boxShadow: `0 0 6px ${accent}`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          fontSize: 8,
          color: CYAN_DIM,
          fontFamily: "monospace",
        }}
      >
        <span>📏 {interceptor.range}</span>
        <span>⚡ {interceptor.speed}</span>
        <span
          style={{
            marginLeft: "auto",
            color: qty > 0 ? accent : "#666",
            border: `1px solid ${qty > 0 ? `${accent}66` : "#444"}`,
            borderRadius: 3,
            padding: "1px 5px",
            fontWeight: 700,
          }}
        >
          ×{qty}
        </span>
      </div>

      <div
        style={{
          fontSize: 9,
          color: "rgba(224,244,255,0.5)",
          lineHeight: 1.5,
          fontFamily: "monospace",
        }}
      >
        {interceptor.description}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          fontSize: 8,
          color: CYAN_DIM,
          fontFamily: "monospace",
        }}
      >
        <span>{interceptor.frntrPerIntercept} FRNTR / intercept</span>
        <SmokeDot color={interceptor.smokeColor} />
      </div>

      <button
        type="button"
        data-ocid={`arsenal.${interceptor.id.toLowerCase()}.primary_button`}
        onClick={onAssign}
        disabled={qty <= 0 && !assignedToCurrentPlot}
        style={{
          width: "100%",
          padding: "10px 0",
          background: assignedToCurrentPlot
            ? `${accent}22`
            : qty > 0
              ? "rgba(0,0,0,0.4)"
              : "rgba(100,100,100,0.1)",
          border: `1px solid ${
            assignedToCurrentPlot ? accent : qty > 0 ? `${accent}88` : "#444"
          }`,
          borderRadius: 6,
          color: assignedToCurrentPlot
            ? accent
            : qty > 0
              ? `${accent}cc`
              : "#555",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          cursor: qty > 0 || assignedToCurrentPlot ? "pointer" : "not-allowed",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Shield size={12} />
        {assignedToCurrentPlot ? "✓ ASSIGNED TO SILO" : "ASSIGN TO SILO"}
      </button>

      {assignStatus && (
        <div
          data-ocid={`arsenal.${interceptor.id.toLowerCase()}.success_state`}
          style={{
            padding: "5px 10px",
            borderRadius: 5,
            background: assignStatus.success
              ? "rgba(34,197,94,0.1)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${assignStatus.success ? "#22c55e" : "#ef4444"}`,
            fontSize: 8,
            fontWeight: 700,
            color: assignStatus.success ? "#22c55e" : "#ef4444",
            letterSpacing: 1,
            fontFamily: "monospace",
            textAlign: "center" as const,
          }}
        >
          {assignStatus.success ? "✓ " : "✗ "}
          {assignStatus.message}
        </div>
      )}
    </div>
  );
}

// ─── SUB-TAB BAR ─────────────────────────────────────────────────────────────
function SubTabBar({
  active,
  onChange,
}: {
  active: ArsenalTab;
  onChange: (t: ArsenalTab) => void;
}) {
  const tabs: ArsenalTab[] = ["MISSILES", "ARTILLERY", "INTERCEPTORS"];
  return (
    <div
      style={{
        display: "flex",
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const isActive = t === active;
        const colors: Record<ArsenalTab, string> = {
          MISSILES: "#00bfff",
          ARTILLERY: "#f97316",
          INTERCEPTORS: "#8b5cf6",
        };
        const c = colors[t];
        return (
          <button
            key={t}
            type="button"
            data-ocid={`arsenal.${t.toLowerCase()}.tab`}
            onClick={() => onChange(t)}
            style={{
              flex: 1,
              height: 30,
              background: isActive ? `${c}12` : "transparent",
              border: "none",
              borderBottom: isActive
                ? `2px solid ${c}`
                : "2px solid transparent",
              color: isActive ? c : "rgba(255,255,255,0.35)",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "all 0.15s",
              textShadow: isActive ? `0 0 8px ${c}80` : "none",
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
interface ArsenalSheetProps {
  onFireMissile: (missile: MissileConfig) => void;
}

export default function ArsenalSheet({ onFireMissile }: ArsenalSheetProps) {
  const [activeTab, setActiveTab] = useState<ArsenalTab>("MISSILES");
  const [selectedMissile, setSelectedMissile] = useState<MissileConfig | null>(
    null,
  );
  const [selectedArtillery, setSelectedArtillery] =
    useState<ArtilleryConfig | null>(null);
  const [interceptorStatuses, setInterceptorStatuses] = useState<
    Record<string, { success: boolean; message: string } | null>
  >({});

  const equippedMissileId = useGameStore((s) => s.equippedMissileId);
  const arsenalInventory = useGameStore((s) => s.arsenalInventory);
  const artilleryInventory = useGameStore((s) => s.artilleryInventory);
  const interceptorInventory = useGameStore((s) => s.interceptorInventory);
  const assignedInterceptors = useGameStore((s) => s.assignedInterceptors);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const setEquippedMissile = useGameStore((s) => s.setEquippedMissile);
  const assignInterceptorToPlot = useGameStore(
    (s) => s.assignInterceptorToPlot,
  );

  const { playMissileAudio } = useArsenalAudio();
  const { launchMissile, isLaunching, lastResult } = useLaunchMissile();
  const {
    fireArtilleryWeapon,
    isFiring: isArtilleryFiring,
    lastResult: artilleryResult,
  } = useFireArtillery();
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  async function handleFire(missile: MissileConfig) {
    if ((arsenalInventory[missile.id] ?? 0) <= 0) return;
    playMissileAudio(missile.id, "launch");
    onFireMissile(missile);
    await launchMissile(missile);
  }

  async function handleFireArtillery(artillery: ArtilleryConfig) {
    if ((artilleryInventory[artillery.id] ?? 0) <= 0) return;
    await fireArtilleryWeapon(artillery);
  }

  function handlePreview(missile: MissileConfig) {
    playMissileAudio(missile.id, "launch");
  }

  async function handleAssignInterceptor(interceptor: InterceptorConfig) {
    if (selectedPlotId === null) {
      setInterceptorStatuses((prev) => ({
        ...prev,
        [interceptor.id]: { success: false, message: "SELECT A PLOT FIRST" },
      }));
      return;
    }
    if ((interceptorInventory[interceptor.id] ?? 0) <= 0) {
      setInterceptorStatuses((prev) => ({
        ...prev,
        [interceptor.id]: { success: false, message: "OUT OF STOCK" },
      }));
      return;
    }

    assignInterceptorToPlot(selectedPlotId, interceptor.id);

    if (identity && actor) {
      try {
        await actor.assignInterceptor(BigInt(selectedPlotId), interceptor.id);
        setInterceptorStatuses((prev) => ({
          ...prev,
          [interceptor.id]: {
            success: true,
            message: `ASSIGNED TO PLOT #${selectedPlotId}`,
          },
        }));
      } catch {
        setInterceptorStatuses((prev) => ({
          ...prev,
          [interceptor.id]: { success: false, message: "CHAIN CALL FAILED" },
        }));
      }
    } else {
      setInterceptorStatuses((prev) => ({
        ...prev,
        [interceptor.id]: {
          success: true,
          message: `[OFFLINE] ASSIGNED TO PLOT #${selectedPlotId}`,
        },
      }));
    }
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
        {equipped && activeTab === "MISSILES" && (
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

      {/* Sub-tab navigation */}
      <SubTabBar active={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          scrollbarWidth: "none",
        }}
      >
        {/* MISSILES TAB */}
        {activeTab === "MISSILES" && (
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
        )}

        {/* ARTILLERY TAB */}
        {activeTab === "ARTILLERY" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {ARTILLERY_CONFIGS.map((artillery) => (
              <ArtilleryCard
                key={artillery.id}
                artillery={artillery}
                qty={artilleryInventory[artillery.id] ?? 0}
                onSelect={() => setSelectedArtillery(artillery)}
              />
            ))}
          </div>
        )}

        {/* INTERCEPTORS TAB */}
        {activeTab === "INTERCEPTORS" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {INTERCEPTOR_CONFIGS.map((interceptor) => (
              <InterceptorCard
                key={interceptor.id}
                interceptor={interceptor}
                qty={interceptorInventory[interceptor.id] ?? 0}
                assignedToCurrentPlot={
                  selectedPlotId !== null &&
                  assignedInterceptors[selectedPlotId] === interceptor.id
                }
                onAssign={() => handleAssignInterceptor(interceptor)}
                assignStatus={interceptorStatuses[interceptor.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>

      {/* MISSILE Detail overlay */}
      {selectedMissile && activeTab === "MISSILES" && (
        <MissileDetailView
          missile={selectedMissile}
          qty={arsenalInventory[selectedMissile.id] ?? 0}
          isEquipped={equippedMissileId === selectedMissile.id}
          isLaunching={isLaunching}
          launchStatus={lastResult}
          onBack={() => setSelectedMissile(null)}
          onFire={() => handleFire(selectedMissile)}
          onPreview={() => handlePreview(selectedMissile)}
          onEquip={() => setEquippedMissile(selectedMissile.id)}
          fireLabel="FIRE MISSILE"
        />
      )}

      {/* ARTILLERY Detail overlay */}
      {selectedArtillery && activeTab === "ARTILLERY" && (
        <MissileDetailView
          missile={selectedArtillery}
          qty={artilleryInventory[selectedArtillery.id] ?? 0}
          isEquipped={false}
          isLaunching={isArtilleryFiring}
          launchStatus={artilleryResult}
          onBack={() => setSelectedArtillery(null)}
          onFire={() => handleFireArtillery(selectedArtillery)}
          onPreview={() => {}}
          onEquip={() => {}}
          fireLabel="FIRE ARTILLERY"
        />
      )}
    </div>
  );
}
