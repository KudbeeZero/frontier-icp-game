import {
  ChevronDown,
  Cpu,
  Crosshair,
  Gem,
  Hammer,
  Map as MapIcon,
  Package,
  Radio,
  Settings,
  ShoppingCart,
  Swords,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CombatLog from "../components/CombatLog";
import GlobeCanvas from "../components/GlobeCanvas";
import LeftSidebarHUD from "../components/LeftSidebarHUD";
import Navbar from "../components/Navbar";
import PlotInfoPanel from "../components/PlotInfoPanel";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const GOLD = "#ffd700";
const BG = "rgba(2,10,20,0.9)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const glass: React.CSSProperties = {
  background: BG,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: `1px solid ${BORDER}`,
};

const WEAPONS = [
  { name: "BALLISTIC ICBM", abbr: "B", qty: 8, color: "#ef4444" },
  { name: "CRUISE MISSILE", abbr: "C", qty: 12, color: "#f97316" },
  { name: "EMP WARHEAD", abbr: "E", qty: 3, color: "#3b82f6" },
  { name: "MIRV STRIKE", abbr: "M", qty: 2, color: "#a855f7" },
  { name: "INTERCEPTOR", abbr: "I", qty: 15, color: "#22c55e" },
  { name: "ORBITAL RAIL", abbr: "O", qty: 1, color: "#ffd700" },
];

const NAV_ITEMS = [
  { id: "resources", label: "RESOURCES", Icon: Gem },
  { id: "inventory", label: "INVENTORY", Icon: Package },
  { id: "build", label: "BUILD", Icon: Hammer },
  { id: "map", label: "MAP", Icon: MapIcon },
  { id: "combat", label: "COMBAT", Icon: Swords },
  { id: "shop", label: "SHOP", Icon: ShoppingCart },
  { id: "settings", label: "SETTINGS", Icon: Settings },
];

function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ~220px is the natural height of the LeftSidebarHUD
const SIDEBAR_HEIGHT = 220;

function TopBar() {
  return (
    <div
      data-ocid="topbar.panel"
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-2"
      style={{
        height: 48,
        background: "rgba(2,10,20,0.88)",
        borderBottom: `1px solid ${BORDER}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          style={{
            width: 40,
            height: 40,
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${CYAN_DIM}`,
              position: "absolute",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 1,
              height: 22,
              background: CYAN_DIM,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 22,
              height: 1,
              background: CYAN_DIM,
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: CYAN,
              boxShadow: `0 0 6px ${CYAN}`,
              position: "absolute",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 8,
            color: CYAN_DIM,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          TACMAP
        </span>
      </div>

      <div
        style={{
          color: CYAN,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 12px ${CYAN}`,
        }}
      >
        FRONTIER: MISSILE HORIZON
      </div>

      <div className="flex items-center gap-1">
        <span style={{ fontSize: 7, color: GOLD, letterSpacing: 1 }}>
          QUICK INV
        </span>
        {["B", "C", "I"].map((l) => (
          <div
            key={l}
            style={{
              width: 22,
              height: 22,
              background: "rgba(0,255,204,0.08)",
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: CYAN,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

interface WeaponPanelProps {
  selected: string;
  onSelect: (name: string) => void;
  topOffset: number;
}

function LeftWeaponPanel({ selected, onSelect, topOffset }: WeaponPanelProps) {
  return (
    <div
      data-ocid="weapon_panel.panel"
      className="fixed left-0 z-20 overflow-y-auto"
      style={{
        top: topOffset,
        bottom: 80,
        width: 152,
        ...glass,
        borderRight: `1px solid ${BORDER}`,
        borderTop: "none",
        borderBottom: "none",
        borderLeft: "none",
        scrollbarWidth: "none",
      }}
    >
      <div className="p-1.5 flex flex-col gap-1">
        <div
          style={{
            fontSize: 7,
            color: CYAN_DIM,
            letterSpacing: 2,
            padding: "4px 4px 6px",
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 2,
          }}
        >
          WEAPON SELECT
        </div>
        {WEAPONS.map((w) => (
          <button
            type="button"
            key={w.name}
            data-ocid={`weapon_panel.${w.abbr.toLowerCase()}.button`}
            onClick={() => onSelect(w.name)}
            style={{
              width: "100%",
              padding: "6px 6px",
              background:
                selected === w.name
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(0,255,204,0.04)",
              border:
                selected === w.name
                  ? `1px solid ${CYAN}`
                  : `1px solid ${BORDER}`,
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "left",
              boxShadow:
                selected === w.name ? "0 0 12px rgba(0,255,204,0.2)" : "none",
            }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div
                style={{
                  width: 22,
                  height: 22,
                  background: `${w.color}22`,
                  border: `1px solid ${w.color}66`,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: w.color,
                }}
              >
                {w.abbr}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: CYAN,
                  background: "rgba(0,255,204,0.1)",
                  padding: "1px 5px",
                  borderRadius: 2,
                  border: `1px solid ${BORDER}`,
                }}
              >
                ×{w.qty}
              </span>
            </div>
            <div
              style={{
                fontSize: 7.5,
                color: selected === w.name ? TEXT : CYAN_DIM,
                letterSpacing: 0.8,
                margin: "3px 0",
              }}
            >
              {w.name}
            </div>
            <button
              type="button"
              style={{
                width: "100%",
                fontSize: 7,
                letterSpacing: 1,
                padding: "2px 0",
                background:
                  selected === w.name
                    ? "rgba(0,255,204,0.2)"
                    : "rgba(0,255,204,0.06)",
                border: `1px solid ${BORDER}`,
                borderRadius: 2,
                color: CYAN,
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(w.name);
              }}
            >
              EQUIP
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

function RightInventoryPanel() {
  const SLOTS = [
    "B",
    "C",
    "E",
    "M",
    "I",
    "B",
    "C",
    "I",
    "M",
    "O",
    "I",
    "B",
    "C",
    "E",
    "I",
  ];
  return (
    <div
      data-ocid="inventory_panel.panel"
      className="fixed right-0 z-20"
      style={{
        top: 48,
        bottom: 80,
        width: 56,
        ...glass,
        borderLeft: `1px solid ${BORDER}`,
        borderTop: "none",
        borderBottom: "none",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 6,
        gap: 3,
      }}
    >
      <div
        style={{
          fontSize: 6,
          color: CYAN_DIM,
          letterSpacing: 1.5,
          marginBottom: 4,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        LOADOUT
      </div>
      {SLOTS.map((s, i) => (
        <div
          key={s}
          data-ocid={`inventory_panel.item.${i + 1}`}
          style={{
            width: 40,
            height: 40,
            background: "rgba(0,255,204,0.05)",
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: CYAN,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

interface FireButtonProps {
  onFire: () => void;
  active: boolean;
}

function CentralFireButton({ onFire, active }: FireButtonProps) {
  return (
    <div
      className="fixed z-30"
      style={{
        left: "50%",
        bottom: 110,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 8,
          color: CYAN,
          letterSpacing: 2,
          textShadow: `0 0 8px ${CYAN}`,
          pointerEvents: "none",
        }}
      >
        TARGET IN FORMATION
      </div>
      <button
        type="button"
        data-ocid="combat.fire.button"
        onClick={onFire}
        disabled={active}
        style={{
          pointerEvents: "auto",
          width: 88,
          height: 88,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 40% 35%, #ff4400, #cc0000, #880000)",
          border: active ? "3px solid #ff8800" : "3px solid #ff6600",
          boxShadow: active
            ? "0 0 30px #ff4400cc, 0 0 60px #ff220044"
            : "0 0 18px #ff440088",
          cursor: active ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 1,
          transition: "all 0.2s",
        }}
      >
        <Zap size={18} color="white" />
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "white",
            letterSpacing: 3,
            textShadow: "0 0 10px white",
          }}
        >
          FIRE
        </span>
      </button>
      <div
        style={{
          fontSize: 8,
          color: GOLD,
          letterSpacing: 2,
          textShadow: `0 0 8px ${GOLD}`,
          pointerEvents: "none",
        }}
      >
        LOCK
      </div>
    </div>
  );
}

interface JoystickProps {
  controlsRef: React.MutableRefObject<any>;
}

function VirtualJoystick({ controlsRef }: JoystickProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const tracking = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentDelta = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const applyCamera = useCallback(() => {
    const c = controlsRef.current;
    if (!c) return;
    const dx = currentDelta.current.x * 0.0015;
    const dy = currentDelta.current.y * 0.0015;
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      (c as any).rotateLeft?.(dx);
      (c as any).rotateUp?.(dy);
      c.update?.();
    }
    if (tracking.current) rafRef.current = requestAnimationFrame(applyCamera);
  }, [controlsRef]);

  const onPointerDown = (e: React.PointerEvent) => {
    tracking.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    currentDelta.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    rafRef.current = requestAnimationFrame(applyCamera);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!tracking.current) return;
    const maxD = 26;
    let dx = e.clientX - startPos.current.x;
    let dy = e.clientY - startPos.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxD) {
      dx = (dx / dist) * maxD;
      dy = (dy / dist) * maxD;
    }
    currentDelta.current = { x: dx, y: dy };
    if (dotRef.current)
      dotRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const onPointerUp = () => {
    tracking.current = false;
    currentDelta.current = { x: 0, y: 0 };
    if (dotRef.current)
      dotRef.current.style.transform = "translate(-50%, -50%)";
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  return (
    <div
      data-ocid="combat.joystick.canvas_target"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "fixed",
        left: 16,
        bottom: 96,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: "rgba(0,255,204,0.06)",
        border: "1px solid rgba(0,255,204,0.4)",
        touchAction: "none",
        userSelect: "none",
        zIndex: 30,
        cursor: "crosshair",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 50,
          height: 50,
          borderRadius: "50%",
          border: "1px solid rgba(0,255,204,0.2)",
          pointerEvents: "none",
        }}
      />
      <div
        ref={dotRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(0,255,204,0.6)",
          boxShadow: `0 0 10px ${CYAN}`,
          pointerEvents: "none",
          transition: "transform 0.15s ease-out",
        }}
      />
    </div>
  );
}

function RightControlButtons() {
  const buttons = [
    { id: "scope", label: "SCOPE", Icon: Crosshair },
    { id: "radar", label: "RADAR", Icon: Radio },
    { id: "devices", label: "DEVICES", Icon: Cpu },
  ];
  return (
    <div
      className="fixed z-30 flex flex-col gap-2"
      style={{ right: 68, bottom: 96 }}
    >
      {buttons.map(({ id, label, Icon }) => (
        <div key={id} className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            data-ocid={`combat.${id}.button`}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(2,10,20,0.85)",
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon size={16} color={CYAN} />
          </button>
          <span style={{ fontSize: 6, color: CYAN_DIM, letterSpacing: 1 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface BottomNavProps {
  activeTab: string | null;
  onTabClick: (id: string) => void;
}

function BottomNavBar({ activeTab, onTabClick }: BottomNavProps) {
  return (
    <div
      data-ocid="nav.panel"
      className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        height: 64,
        background: "rgba(2,10,20,0.97)",
        borderTop: "1px solid rgba(0,255,204,0.3)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            type="button"
            key={id}
            data-ocid={`nav.${id}.tab`}
            onClick={() => onTabClick(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: isActive ? "rgba(0,255,204,0.07)" : "transparent",
              border: "none",
              borderTop: isActive
                ? `2px solid ${CYAN}`
                : "2px solid transparent",
              cursor: "pointer",
              position: "relative",
              paddingTop: 2,
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 2,
                  background: CYAN,
                  boxShadow: `0 0 8px ${CYAN}`,
                  borderRadius: 1,
                }}
              />
            )}
            <Icon
              size={18}
              color={isActive ? CYAN : CYAN_DIM}
              style={{
                filter: isActive ? `drop-shadow(0 0 4px ${CYAN})` : "none",
              }}
            />
            <span
              style={{
                fontSize: 7.5,
                letterSpacing: 0.5,
                color: isActive ? CYAN : CYAN_DIM,
                fontWeight: isActive ? 700 : 400,
                textShadow: isActive ? `0 0 8px ${CYAN}` : "none",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SheetContent({ tab }: { tab: string }) {
  const player = useGameStore((s) => s.player);
  const combatLog = useGameStore((s) => s.combatLog);
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const selectedPlot = selectedPlotId !== null ? plots[selectedPlotId] : null;

  const statCard = (label: string, value: number | string, color = CYAN) => (
    <div
      style={{
        background: "rgba(0,255,204,0.05)",
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "10px 12px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 7,
          color: CYAN_DIM,
          letterSpacing: 1.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );

  if (tab === "resources") {
    return (
      <div style={{ padding: 12 }}>
        <div className="flex gap-2 mb-3">
          {statCard("IRON", player.iron, "#94a3b8")}
          {statCard("FUEL", player.fuel, "#f97316")}
        </div>
        <div className="flex gap-2">
          {statCard("CRYSTAL", player.crystal, "#3b82f6")}
          {statCard("FRNTR", player.frntBalance, GOLD)}
        </div>
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <div style={{ padding: 12 }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {WEAPONS.map((w) => (
            <div
              key={w.name}
              data-ocid={`inventory.${w.abbr.toLowerCase()}.card`}
              style={{
                background: "rgba(0,255,204,0.05)",
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: `${w.color}22`,
                  border: `1px solid ${w.color}66`,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: w.color,
                  flexShrink: 0,
                }}
              >
                {w.abbr}
              </div>
              <div>
                <div style={{ fontSize: 8, color: TEXT, letterSpacing: 0.5 }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: CYAN }}>
                  ×{w.qty}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "build") {
    const items = [
      { name: "MISSILE SILO", cost: 500, icon: "🚀" },
      { name: "AIR BASE", cost: 800, icon: "✈️" },
      { name: "SAM BATTERY", cost: 300, icon: "🛡️" },
      { name: "NEXUS NODE", cost: 1200, icon: "⚡" },
    ];
    return (
      <div style={{ padding: 12 }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {items.map((item) => (
            <div
              key={item.name}
              data-ocid={`build.${item.name.toLowerCase().replace(/ /g, "_")}.card`}
              style={{
                background: "rgba(0,255,204,0.05)",
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <div style={{ fontSize: 9, color: TEXT, letterSpacing: 0.5 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: GOLD }}>{item.cost} FRNTR</div>
              <button
                type="button"
                data-ocid={`build.${item.name.toLowerCase().replace(/ /g, "_")}.button`}
                style={{
                  padding: "4px",
                  background: "rgba(0,255,204,0.12)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  color: CYAN,
                  fontSize: 8,
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                BUILD
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "map") {
    return (
      <div style={{ padding: 16 }}>
        {selectedPlot ? (
          <div>
            <div
              style={{
                fontSize: 11,
                color: CYAN,
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              PLOT #{selectedPlot.id} — {selectedPlot.biome.toUpperCase()}
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              {statCard("IRON", selectedPlot.iron)}
              {statCard("FUEL", selectedPlot.fuel, "#f97316")}
              {statCard("CRYSTAL", selectedPlot.crystal, "#3b82f6")}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: CYAN_DIM }}>
              OWNER: {selectedPlot.owner ?? "UNCLAIMED"}
            </div>
            <div style={{ fontSize: 9, color: CYAN_DIM }}>
              RICHNESS: {selectedPlot.richness}/10
            </div>
          </div>
        ) : (
          <div
            data-ocid="map.empty_state"
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: CYAN_DIM,
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            SELECT A HEX ON THE GLOBE
            <br />
            TO VIEW PLOT DETAILS
          </div>
        )}
      </div>
    );
  }

  if (tab === "combat") {
    return (
      <div
        style={{
          padding: 12,
          overflowY: "auto",
          maxHeight: "calc(55vh - 60px)",
        }}
      >
        {combatLog.slice(0, 10).map((entry, i) => (
          <div
            key={entry.id}
            data-ocid={`combat.item.${i + 1}`}
            style={{
              padding: "6px 8px",
              marginBottom: 4,
              background: "rgba(0,255,204,0.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: entry.success ? "#22c55e" : "#ef4444",
                }}
              >
                {entry.success ? "✓ HIT" : "✗ MISS"}
              </div>
              <div style={{ fontSize: 8, color: CYAN_DIM }}>
                {entry.attacker} → {entry.defender}
              </div>
              <div style={{ fontSize: 7, color: "rgba(0,255,204,0.25)" }}>
                Plot {entry.fromPlot} → {entry.toPlot}
              </div>
            </div>
            <div style={{ fontSize: 7, color: CYAN_DIM }}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "shop") {
    const upgrades = [
      { name: "ADVANCED WARHEAD", cost: 400, desc: "+50% blast radius" },
      { name: "STEALTH COATING", cost: 600, desc: "Evade 30% intercepts" },
      { name: "HYPERSONIC BOOST", cost: 350, desc: "3× missile speed" },
    ];
    return (
      <div style={{ padding: 12 }}>
        {upgrades.map((u, i) => (
          <div
            key={u.name}
            data-ocid={`shop.item.${i + 1}`}
            style={{
              padding: "10px 12px",
              marginBottom: 6,
              background: "rgba(0,255,204,0.05)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: TEXT, letterSpacing: 0.5 }}>
                {u.name}
              </div>
              <div style={{ fontSize: 8, color: CYAN_DIM }}>{u.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 9, color: GOLD }}>{u.cost}</span>
              <button
                type="button"
                data-ocid={`shop.item.${i + 1}.button`}
                style={{
                  padding: "4px 10px",
                  background: "rgba(255,215,0,0.1)",
                  border: "1px solid rgba(255,215,0,0.4)",
                  borderRadius: 3,
                  color: GOLD,
                  fontSize: 8,
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                BUY
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "settings") {
    const toggles = [
      { label: "AUTO-ROTATE GLOBE", id: "autorotate", def: true },
      { label: "SOUND EFFECTS", id: "sound", def: false },
      { label: "NOTIFICATIONS", id: "notify", def: true },
    ];
    return (
      <div style={{ padding: 16 }}>
        {toggles.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <span style={{ fontSize: 10, color: TEXT, letterSpacing: 0.5 }}>
              {t.label}
            </span>
            <div
              data-ocid={`settings.${t.id}.switch`}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: t.def
                  ? "rgba(0,255,204,0.3)"
                  : "rgba(0,255,204,0.08)",
                border: `1px solid ${t.def ? CYAN : BORDER}`,
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: t.def ? 18 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: t.def ? CYAN : CYAN_DIM,
                  transition: "left 0.2s",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

interface BottomSheetProps {
  activeTab: string | null;
  onClose: () => void;
}

function BottomSheet({ activeTab, onClose }: BottomSheetProps) {
  const isOpen = activeTab !== null;
  const tabLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? "";

  return (
    <>
      {isOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: fullscreen overlay backdrop
        <div
          data-ocid="sheet.backdrop"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 45,
          }}
        />
      )}
      <div
        data-ocid="nav.sheet"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55vh",
          zIndex: 50,
          background: "rgba(4,12,24,0.97)",
          borderTop: `1px solid ${BORDER}`,
          borderRadius: "16px 16px 0 0",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: drag handle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0 0",
            cursor: "pointer",
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: 36,
              height: 3,
              borderRadius: 2,
              background: BORDER,
              marginBottom: 6,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 14px 8px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
              textShadow: `0 0 10px ${CYAN}`,
            }}
          >
            {tabLabel}
          </span>
          <button
            type="button"
            data-ocid="nav.sheet.close_button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: CYAN_DIM,
              padding: 2,
            }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {activeTab && <SheetContent tab={activeTab} />}
        </div>
      </div>
    </>
  );
}

export default function Play() {
  const controlsRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState("BALLISTIC ICBM");
  const [missileActive, setMissileActive] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  // On desktop, push weapon panel below the sidebar (~220px height)
  const weaponPanelTop = isMobile ? 48 : 48 + SIDEBAR_HEIGHT;

  const handleTabClick = (id: string) =>
    setActiveTab((prev) => (prev === id ? null : id));
  const handleFire = () => {
    if (!missileActive) setMissileActive(true);
  };
  const handleMissileComplete = () => setMissileActive(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#020509",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <GlobeCanvas
          controlsRef={controlsRef}
          missileActive={missileActive}
          onMissileComplete={handleMissileComplete}
        />
      </div>

      <Navbar />
      <TopBar />
      <LeftSidebarHUD />
      <PlotInfoPanel />
      <LeftWeaponPanel
        selected={selectedWeapon}
        onSelect={setSelectedWeapon}
        topOffset={weaponPanelTop}
      />
      <RightInventoryPanel />
      <CentralFireButton onFire={handleFire} active={missileActive} />
      <VirtualJoystick controlsRef={controlsRef} />
      <RightControlButtons />
      <BottomNavBar activeTab={activeTab} onTabClick={handleTabClick} />
      <CombatLog />
      <BottomSheet activeTab={activeTab} onClose={() => setActiveTab(null)} />

      <div
        style={{
          position: "fixed",
          bottom: 68,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 7,
          color: "rgba(0,255,204,0.2)",
          letterSpacing: 1,
          pointerEvents: "none",
          zIndex: 20,
          whiteSpace: "nowrap",
        }}
      >
        © {new Date().getFullYear()} · BUILT WITH{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          style={{ color: "rgba(0,255,204,0.35)", pointerEvents: "auto" }}
          target="_blank"
          rel="noreferrer"
        >
          CAFFEINE.AI
        </a>
      </div>
    </div>
  );
}
