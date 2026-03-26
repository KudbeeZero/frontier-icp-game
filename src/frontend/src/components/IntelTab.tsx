import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { CombatEntry } from "../store/gameStore";

const BG = "rgba(4,12,24,0.97)";
const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const AMBER = "#f59e0b";
const MONO: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
};

type Phase = "idle" | "launch" | "intercept" | "impact" | "result";

function getResultLabel(entry: CombatEntry): {
  text: string;
  color: string;
  glow?: boolean;
} {
  if (!entry.success || entry.intercepted)
    return { text: "MISSILE INTERCEPTED", color: AMBER };
  const d = entry.damageDealt ?? 0;
  if (d >= 100)
    return { text: "TOTAL DESTRUCTION", color: "#ff2222", glow: true };
  if (d >= 75) return { text: "PLOT DARK", color: "#ef4444" };
  if (d >= 50) return { text: "BUILDINGS DISABLED", color: "#f97316" };
  if (d >= 1) return { text: "OUTPUT REDUCED", color: "#eab308" };
  return { text: "ATTACK FAILED", color: "#6b7280" };
}

function RadarSweep() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    function draw() {
      ctx!.clearRect(0, 0, size, size);
      ctx!.strokeStyle = "rgba(0,255,100,0.18)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.stroke();
      for (const scale of [0.6, 0.35]) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(0,255,100,0.09)";
        ctx!.stroke();
      }
      ctx!.strokeStyle = "rgba(0,255,100,0.08)";
      ctx!.beginPath();
      ctx!.moveTo(cx, cy - r);
      ctx!.lineTo(cx, cy + r);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(cx - r, cy);
      ctx!.lineTo(cx + r, cy);
      ctx!.stroke();

      const a = angleRef.current;
      const sweepAngle = Math.PI / 3;
      const grad = ctx!.createLinearGradient(
        cx + r * Math.cos(a - sweepAngle),
        cy + r * Math.sin(a - sweepAngle),
        cx + r * Math.cos(a),
        cy + r * Math.sin(a),
      );
      grad.addColorStop(0, "rgba(0,255,100,0)");
      grad.addColorStop(1, "rgba(0,255,100,0.28)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.arc(cx, cy, r, a - sweepAngle, a);
      ctx!.closePath();
      ctx!.fill();

      ctx!.strokeStyle = "rgba(0,255,100,0.55)";
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx!.stroke();

      angleRef.current = a + 0.018;
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={220}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%,-55%)",
        opacity: 0.55,
        pointerEvents: "none",
      }}
    />
  );
}

function MissileIcon({
  x,
  y,
  angle = -30,
}: { x: number; y: number; angle?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%,-50%) rotate(${angle}deg)`,
        fontSize: 20,
        color: CYAN,
        textShadow: `0 0 8px ${CYAN}`,
        transition:
          "left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 10,
        ...MONO,
      }}
    >
      ▲
    </div>
  );
}

function BaseBlock({
  side,
  name,
  stat,
  label,
  biome,
}: {
  side: "left" | "right";
  name: string;
  stat: number;
  label: "ATK" | "DEF";
  biome?: string;
}) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isLeft ? "flex-start" : "flex-end",
        gap: 4,
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 8, color: CYAN, letterSpacing: 1, ...MONO }}>
        {isLeft ? "◀ ATTACKER" : "DEFENDER ▶"}
      </div>
      <div
        style={{
          width: 54,
          height: 54,
          background: isLeft ? "rgba(0,255,204,0.08)" : "rgba(239,68,68,0.08)",
          border: `1.5px solid ${isLeft ? BORDER : "rgba(239,68,68,0.35)"}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: isLeft
            ? "0 0 12px rgba(0,255,204,0.18)"
            : "0 0 12px rgba(239,68,68,0.18)",
        }}
      >
        {isLeft ? "🏠" : "🏰"}
      </div>
      <div
        style={{
          fontSize: 9,
          color: TEXT,
          ...MONO,
          maxWidth: 90,
          textAlign: isLeft ? "left" : "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
      {biome && (
        <div style={{ fontSize: 7, color: CYAN_DIM, ...MONO }}>
          {biome.toUpperCase()}
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: isLeft ? CYAN : "#ef4444",
          fontWeight: 700,
          ...MONO,
        }}
      >
        {label}: {stat}
      </div>
    </div>
  );
}

function BattleView({ entry, phase }: { entry: CombatEntry; phase: Phase }) {
  const missileX = phase === "launch" ? 50 : phase === "intercept" ? 62 : 78;
  const missileY = phase === "launch" ? 55 : 48;
  const showMissile =
    phase === "launch" || (phase === "intercept" && !entry.intercepted);
  const showExplosion = phase === "impact" && !entry.intercepted;
  const showIntercept =
    (phase === "intercept" || phase === "impact") && entry.intercepted;
  const result = getResultLabel(entry);
  const atkStat = 40 + Math.floor((entry.damageDealt ?? 0) / 2);
  const defStat = 100 - atkStat;

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        background: "rgba(2,8,18,0.85)",
      }}
    >
      {/* Terrain grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(0,255,100,0.03) 29px), repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(0,255,100,0.03) 29px)",
          pointerEvents: "none",
        }}
      />

      {/* Phase label */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          letterSpacing: 2,
          fontWeight: 700,
          ...MONO,
          color:
            (phase === "intercept" || phase === "impact") && entry.intercepted
              ? AMBER
              : CYAN,
          textShadow: "0 0 8px currentColor",
          opacity: phase !== "idle" ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        {phase === "launch" && "[ LAUNCH ]"}
        {phase === "intercept" &&
          (entry.intercepted
            ? "[ INTERCEPT DETECTED ]"
            : "[ DEFENSE BYPASSED ]")}
        {phase === "impact" &&
          (entry.intercepted
            ? `[ INTERCEPTED — ${entry.interceptorType ?? "INTERCEPTOR"} ]`
            : "[ IMPACT ]")}
        {phase === "result" && "[ RESOLUTION ]"}
      </div>

      {/* Battle field */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "32px 14px 12px",
        }}
      >
        <BaseBlock
          side="left"
          name={entry.attacker}
          stat={atkStat}
          label="ATK"
        />
        <div style={{ flex: 1, position: "relative", height: "100%" }}>
          {showMissile && <MissileIcon x={missileX} y={missileY} />}

          {phase === "launch" && (
            <div
              style={{
                position: "absolute",
                left: "30%",
                top: "57%",
                display: "flex",
                gap: 3,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: `rgba(0,255,204,${0.5 - i * 0.15})`,
                    animation: "pulse 0.4s infinite alternate",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {showIntercept && (
            <div
              style={{
                position: "absolute",
                left: "62%",
                top: phase === "intercept" ? "30%" : "15%",
                fontSize: 16,
                color: AMBER,
                textShadow: `0 0 10px ${AMBER}`,
                transform: "rotate(180deg)",
                transition: "top 0.7s ease-out",
                ...MONO,
              }}
            >
              ▲
            </div>
          )}

          {phase === "intercept" && entry.intercepted && (
            <div
              style={{
                position: "absolute",
                left: "62%",
                top: "35%",
                width: 28,
                height: 28,
                border: `2px solid ${AMBER}`,
                borderRadius: "50%",
                transform: "translate(-50%,-50%)",
                boxShadow: `0 0 16px ${AMBER}`,
                animation: "pulse 0.5s infinite alternate",
              }}
            />
          )}

          {showExplosion && (
            <div
              style={{
                position: "absolute",
                left: "75%",
                top: "42%",
                width: 40,
                height: 40,
                transform: "translate(-50%,-50%)",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,80,0,0.9) 0%, rgba(255,200,0,0.5) 40%, transparent 70%)",
                boxShadow: "0 0 30px rgba(255,100,0,0.8)",
                animation: "explode 0.6s ease-out forwards",
              }}
            />
          )}

          {phase === "impact" && entry.intercepted && (
            <div
              style={{
                position: "absolute",
                left: "62%",
                top: "25%",
                width: 36,
                height: 36,
                transform: "translate(-50%,-50%)",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${AMBER} 0%, rgba(245,158,11,0.4) 50%, transparent 70%)`,
                boxShadow: `0 0 24px ${AMBER}`,
              }}
            />
          )}
        </div>
        <BaseBlock
          side="right"
          name={entry.defender}
          stat={defStat}
          label="DEF"
        />
      </div>

      {/* Result overlay */}
      {phase === "result" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2,8,18,0.82)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 3,
              ...MONO,
              color: result.color,
              textShadow: result.glow
                ? `0 0 20px ${result.color}, 0 0 40px ${result.color}`
                : `0 0 10px ${result.color}`,
            }}
          >
            {result.text}
          </div>
          <div
            style={{
              width: "80%",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, fontSize: 8, color: CYAN, ...MONO }}>
                ATK
              </div>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "rgba(0,255,204,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(atkStat, 100)}%`,
                    height: "100%",
                    background: CYAN,
                    borderRadius: 4,
                    transition: "width 0.8s ease-out",
                  }}
                />
              </div>
              <div
                style={{
                  width: 24,
                  fontSize: 8,
                  color: CYAN,
                  ...MONO,
                  textAlign: "right",
                }}
              >
                {atkStat}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{ width: 28, fontSize: 8, color: "#ef4444", ...MONO }}
              >
                DEF
              </div>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "rgba(239,68,68,0.1)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(defStat, 100)}%`,
                    height: "100%",
                    background: "#ef4444",
                    borderRadius: 4,
                    transition: "width 0.8s ease-out",
                  }}
                />
              </div>
              <div
                style={{
                  width: 24,
                  fontSize: 8,
                  color: "#ef4444",
                  ...MONO,
                  textAlign: "right",
                }}
              >
                {defStat}
              </div>
            </div>
          </div>
          {entry.formationUsed && (
            <div
              style={{
                fontSize: 8,
                color: CYAN_DIM,
                letterSpacing: 1.5,
                ...MONO,
              }}
            >
              FORMATION: {entry.formationUsed.replace("_", " ")}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { from { opacity: 0.5; transform: scale(0.9); } to { opacity: 1; transform: scale(1.1); } }
        @keyframes explode { 0% { transform: translate(-50%,-50%) scale(0.2); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; } }
      `}</style>
    </div>
  );
}

function LogEntry({
  entry,
  onReplay,
  index,
}: { entry: CombatEntry; onReplay: (e: CombatEntry) => void; index: number }) {
  const result = getResultLabel(entry);
  return (
    <button
      type="button"
      data-ocid={`intel.item.${index + 1}`}
      onClick={() => onReplay(entry)}
      style={{
        padding: "5px 8px",
        marginBottom: 3,
        background: "rgba(0,255,204,0.03)",
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        transition: "background 0.15s",
        width: "100%",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            fontSize: 8,
            color: result.color,
            fontWeight: 700,
            ...MONO,
            minWidth: 38,
          }}
        >
          {entry.success && !entry.intercepted
            ? "● HIT"
            : entry.intercepted
              ? "◆ INT"
              : "○ MISS"}
        </div>
        <div style={{ fontSize: 8, color: TEXT, ...MONO }}>
          {entry.attacker} <span style={{ color: CYAN_DIM }}>→</span>{" "}
          {entry.defender}
        </div>
        {entry.formationUsed && (
          <div style={{ fontSize: 7, color: CYAN_DIM, ...MONO }}>
            [{entry.formationUsed.replace("_", " ")}]
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 7, color: result.color, ...MONO }}>
          {result.text.split(" ")[0]}
        </div>
        <div style={{ fontSize: 7, color: "rgba(0,255,204,0.25)", ...MONO }}>
          {new Date(entry.timestamp).toLocaleTimeString()}
        </div>
        <div style={{ fontSize: 8, color: CYAN_DIM }}>↺</div>
      </div>
    </button>
  );
}

export function IntelTab() {
  const combatLog = useGameStore((s) => s.combatLog);
  const [activeEntry, setActiveEntry] = useState<CombatEntry | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [logExpanded, setLogExpanded] = useState(false);
  const prevLogId = useRef<number | null>(null);
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    phaseTimers.current.forEach(clearTimeout);
    phaseTimers.current = [];
  }, []);

  const triggerBattle = useCallback(
    (entry: CombatEntry) => {
      clearTimers();
      setActiveEntry(entry);
      setPhase("launch");
      const t1 = setTimeout(() => setPhase("intercept"), 1000);
      const t2 = setTimeout(() => setPhase("impact"), 2000);
      const t3 = setTimeout(() => setPhase("result"), 2800);
      const t4 = setTimeout(() => {
        setPhase("idle");
        setActiveEntry(null);
      }, 5000);
      phaseTimers.current = [t1, t2, t3, t4];
    },
    [clearTimers],
  );

  useEffect(() => {
    const latest = combatLog[0];
    if (latest && latest.id !== prevLogId.current) {
      prevLogId.current = latest.id;
      triggerBattle(latest);
    }
  }, [combatLog, triggerBattle]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const isIdle = phase === "idle";

  return (
    <div
      data-ocid="intel.panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(75vh - 100px)",
        background: BG,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        overflow: "hidden",
        position: "relative",
        ...MONO,
      }}
    >
      {isIdle ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <RadarSweep />

          <div
            style={{
              padding: "10px 14px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${BORDER}`,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  animation: "pulse 1.2s infinite alternate",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: CYAN,
                  letterSpacing: 2,
                }}
              >
                GLOBAL WAR FEED
              </span>
            </div>
            <span style={{ fontSize: 8, color: CYAN_DIM }}>
              {combatLog.length} EVENTS
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 12px",
              position: "relative",
              zIndex: 2,
            }}
          >
            {combatLog.length === 0 ? (
              <div
                data-ocid="intel.empty_state"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 10,
                  paddingTop: 40,
                }}
              >
                <div style={{ fontSize: 28, opacity: 0.3 }}>📡</div>
                <div
                  style={{ fontSize: 10, color: CYAN_DIM, letterSpacing: 2 }}
                >
                  AWAITING COMBAT DATA
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(0,255,204,0.18)",
                    letterSpacing: 1,
                  }}
                >
                  NO EVENTS RECORDED
                </div>
              </div>
            ) : (
              combatLog
                .slice(0, 10)
                .map((entry, i) => (
                  <LogEntry
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onReplay={triggerBattle}
                  />
                ))
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "8px 12px 4px",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {activeEntry && <BattleView entry={activeEntry} phase={phase} />}
          </div>

          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${BORDER}`,
              background: "rgba(2,8,18,0.9)",
              transition: "height 0.3s ease",
              height: logExpanded ? 160 : 28,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              data-ocid="intel.toggle"
              onClick={() => setLogExpanded((v) => !v)}
              style={{
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
                cursor: "pointer",
                userSelect: "none",
                width: "100%",
                background: "none",
                border: "none",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{ fontSize: 9, color: CYAN_DIM, letterSpacing: 1.5 }}
              >
                {logExpanded ? "▼" : "▲"} COMBAT LOG ({combatLog.length})
              </span>
              <span style={{ fontSize: 7, color: "rgba(0,255,204,0.2)" }}>
                {logExpanded ? "COLLAPSE" : "EXPAND"}
              </span>
            </button>
            {logExpanded && (
              <div
                style={{
                  overflowY: "auto",
                  height: 132,
                  padding: "0 12px 8px",
                }}
              >
                {combatLog.slice(0, 10).map((entry, i) => (
                  <LogEntry
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onReplay={(e) => {
                      setLogExpanded(false);
                      triggerBattle(e);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
