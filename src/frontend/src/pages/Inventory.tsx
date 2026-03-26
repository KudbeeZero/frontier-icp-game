import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  ChevronRight,
  Package,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { ARTILLERY_CONFIGS } from "../constants/artillery";
import { INTERCEPTOR_CONFIGS } from "../constants/interceptors";
import { MISSILE_CONFIGS } from "../constants/missiles";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const PURPLE = "#a855f7";
// const GREEN = "#22c55e"; // reserved
const RED = "#ef4444";
const BORDER = "rgba(0,255,204,0.18)";
const PANEL = "rgba(0,20,40,0.70)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

// FRNTR costs per missile type (fire cost)
const MISSILE_COSTS: Record<string, number> = {
  ICBM_PHANTOM: 200,
  TOMAHAWK: 80,
  HELLFIRE: 40,
  JAVELIN: 35,
  SENTINEL: 90,
  VIPER120: 55,
};

type WeaponTab = "MISSILES" | "ARTILLERY" | "INTERCEPTORS";

// ── tiny helper ──
function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1.5,
        padding: "2px 6px",
        borderRadius: 4,
        border: `1px solid ${color}44`,
        color,
        background: `${color}14`,
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </span>
  );
}

// ── Active Loadout card ──
function ActiveLoadout() {
  const activeWeapon = useGameStore((s) => s.activeWeapon);
  const arsenalInventory = useGameStore((s) => s.arsenalInventory);
  const artilleryInventory = useGameStore((s) => s.artilleryInventory);

  const weapon = useMemo(() => {
    if (!activeWeapon) return null;
    const m = MISSILE_CONFIGS.find((x) => x.id === activeWeapon);
    if (m)
      return {
        name: m.name,
        class: m.class,
        range: m.range,
        speed: m.speed,
        warhead: m.warhead,
        count: arsenalInventory[m.id] ?? 0,
        accent: m.accentColor,
        category: "MISSILE",
        cost: MISSILE_COSTS[m.id] ?? 60,
      };
    const a = ARTILLERY_CONFIGS.find((x) => x.id === activeWeapon);
    if (a)
      return {
        name: a.name,
        class: a.class,
        range: a.range,
        speed: a.speed,
        warhead: a.warhead,
        count: artilleryInventory[a.id] ?? 0,
        accent: a.accentColor,
        category: "ARTILLERY",
        cost: 75,
      };
    return null;
  }, [activeWeapon, arsenalInventory, artilleryInventory]);

  return (
    <div
      data-ocid="inventory.panel"
      style={{
        background: PANEL,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 3,
          color: CYAN,
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Target size={12} style={{ color: CYAN }} />
        ACTIVE LOADOUT
      </div>

      {!weapon ? (
        <div
          data-ocid="inventory.empty_state"
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: TEXT_DIM,
            fontSize: 11,
            letterSpacing: 1.5,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
          NO WEAPON EQUIPPED
          <div style={{ fontSize: 9, marginTop: 4, color: TEXT_DIM }}>
            SELECT A WEAPON FROM THE ARSENAL BELOW
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Weapon icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: `${weapon.accent}18`,
              border: `2px solid ${weapon.accent}66`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
              boxShadow: `0 0 14px ${weapon.accent}22`,
            }}
          >
            🚀
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: TEXT,
                  letterSpacing: 1,
                  fontFamily: "monospace",
                }}
              >
                {weapon.name}
              </span>
              {/* EQUIPPED badge */}
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: 2,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(0,255,204,0.18)",
                  border: `1px solid ${CYAN}`,
                  color: CYAN,
                  textTransform: "uppercase",
                }}
              >
                ✓ EQUIPPED
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginBottom: 4,
              }}
            >
              <Badge label={weapon.category} color={weapon.accent} />
              <Badge label={weapon.class} color={GOLD} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginTop: 4,
              }}
            >
              {[
                { label: "RANGE", val: weapon.range },
                { label: "SPEED", val: weapon.speed },
                { label: "FRNTR/FIRE", val: weapon.cost },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontSize: 7,
                      color: TEXT_DIM,
                      letterSpacing: 1,
                      marginBottom: 1,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: TEXT,
                    }}
                  >
                    {s.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Count */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "monospace",
                color: weapon.count > 0 ? GOLD : RED,
                lineHeight: 1,
              }}
            >
              {weapon.count}
            </div>
            <div style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
              IN STOCK
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weapon row card ──
function WeaponRow({
  name,
  category,
  classLabel,
  range,
  speed,
  count,
  accent,
  cost,
  selected,
  onSelect,
  isInterceptor,
  onAssign,
}: {
  name: string;
  category: string;
  classLabel: string;
  range: string;
  speed: string;
  count: number;
  accent: string;
  cost: number;
  selected: boolean;
  onSelect: () => void;
  isInterceptor?: boolean;
  onAssign?: () => void;
}) {
  return (
    <motion.div
      layout
      style={{
        background: selected ? "rgba(0,255,204,0.08)" : "rgba(0,10,20,0.4)",
        border: `1px solid ${selected ? CYAN : "rgba(0,255,204,0.12)"}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 6,
        transition: "border-color 0.2s, background 0.2s",
        boxShadow: selected ? "inset 2px 0 0 rgba(0,255,204,0.7)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: `${accent}14`,
            border: `1px solid ${accent}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {isInterceptor ? "🛡️" : "🚀"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: selected ? CYAN : TEXT,
                fontFamily: "monospace",
                letterSpacing: 0.5,
              }}
            >
              {name}
            </span>
            {selected && (
              <CheckCircle size={11} style={{ color: CYAN, flexShrink: 0 }} />
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <Badge label={category} color={accent} />
            <Badge label={classLabel} color={GOLD} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { l: "RNG", v: range },
              { l: "SPD", v: speed },
              { l: isInterceptor ? "FRNTR/HIT" : "FRNTR", v: cost },
            ].map((s) => (
              <span
                key={s.l}
                style={{
                  fontSize: 9,
                  color: TEXT_DIM,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ color: TEXT_DIM }}>{s.l}: </span>
                <span style={{ color: TEXT }}>{s.v}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Count + actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: "monospace",
              color: count > 0 ? GOLD : RED,
              lineHeight: 1,
            }}
          >
            {count}
            <span
              style={{
                fontSize: 8,
                color: TEXT_DIM,
                fontWeight: 400,
                marginLeft: 2,
              }}
            >
              ×
            </span>
          </div>
          {isInterceptor ? (
            <button
              type="button"
              data-ocid="inventory.secondary_button"
              onClick={onAssign}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "5px 10px",
                borderRadius: 5,
                border: `1px solid ${PURPLE}66`,
                color: PURPLE,
                background: `${PURPLE}14`,
                cursor: "pointer",
                textTransform: "uppercase",
                minHeight: 28,
              }}
            >
              ASSIGN
            </button>
          ) : (
            <button
              type="button"
              data-ocid="inventory.primary_button"
              onClick={onSelect}
              disabled={count === 0}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.5,
                padding: "5px 10px",
                borderRadius: 5,
                border: `1px solid ${selected ? CYAN : BORDER}`,
                color: selected ? CYAN : TEXT_DIM,
                background: selected
                  ? "rgba(0,255,204,0.12)"
                  : "rgba(0,255,204,0.04)",
                cursor: count === 0 ? "not-allowed" : "pointer",
                opacity: count === 0 ? 0.4 : 1,
                textTransform: "uppercase",
                minHeight: 28,
              }}
            >
              {selected ? "✓ SELECTED" : "SELECT"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Interceptor assign modal ──
function AssignInterceptorModal({
  interceptorId,
  open,
  onClose,
}: {
  interceptorId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const player = useGameStore((s) => s.player);
  const plots = useGameStore((s) => s.plots);
  const assignedInterceptors = useGameStore((s) => s.assignedInterceptors);
  const assignInterceptorToPlot = useGameStore(
    (s) => s.assignInterceptorToPlot,
  );

  const cfg = INTERCEPTOR_CONFIGS.find((i) => i.id === interceptorId);
  const ownedPlots = useMemo(
    () => plots.filter((p) => player.plotsOwned.includes(p.id)).slice(0, 20),
    [plots, player.plotsOwned],
  );

  const handleAssign = (plotId: number) => {
    if (!interceptorId) return;
    assignInterceptorToPlot(plotId, interceptorId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="inventory.dialog"
        style={{
          background: "rgba(4,12,24,0.97)",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          backdropFilter: "blur(24px)",
          maxWidth: 380,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 3,
              color: CYAN,
              textTransform: "uppercase",
            }}
          >
            ASSIGN {cfg?.name ?? interceptorId}
          </DialogTitle>
        </DialogHeader>

        <div
          style={{
            fontSize: 9,
            color: TEXT_DIM,
            letterSpacing: 1.5,
            marginBottom: 10,
          }}
        >
          SELECT A SILO PLOT TO ASSIGN THIS INTERCEPTOR. AUTO-ACTIVATES WHEN
          ASSIGNED.
        </div>

        {ownedPlots.length === 0 ? (
          <div
            data-ocid="inventory.empty_state"
            style={{
              padding: "20px 0",
              textAlign: "center",
              color: TEXT_DIM,
              fontSize: 11,
            }}
          >
            NO PLOTS OWNED. ACQUIRE TERRITORY FIRST.
          </div>
        ) : (
          <ScrollArea className="max-h-56">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ownedPlots.map((plot, idx) => {
                const assigned = assignedInterceptors[plot.id];
                const isMine = assigned === interceptorId;
                return (
                  <button
                    key={plot.id}
                    type="button"
                    data-ocid={`inventory.item.${idx + 1}`}
                    onClick={() => handleAssign(plot.id)}
                    style={{
                      background: isMine
                        ? "rgba(0,255,204,0.1)"
                        : "rgba(0,20,40,0.5)",
                      border: `1px solid ${isMine ? CYAN : BORDER}`,
                      borderRadius: 7,
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: isMine ? CYAN : TEXT,
                        }}
                      >
                        PLOT #{plot.id}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: TEXT_DIM,
                          marginTop: 2,
                        }}
                      >
                        {plot.biome} &middot; {plot.efficiency}% EFF
                      </div>
                    </div>
                    {isMine ? (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: CYAN,
                          border: `1px solid ${CYAN}`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          letterSpacing: 1,
                        }}
                      >
                        ASSIGNED
                      </span>
                    ) : assigned ? (
                      <span
                        style={{
                          fontSize: 8,
                          color: TEXT_DIM,
                          letterSpacing: 1,
                        }}
                      >
                        {assigned}
                      </span>
                    ) : (
                      <ChevronRight size={14} style={{ color: TEXT_DIM }} />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <button
          type="button"
          data-ocid="inventory.cancel_button"
          onClick={onClose}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: 7,
            color: TEXT_DIM,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          CANCEL
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ── Resource Stockpiles bar ──
function ResourceStockpiles() {
  const player = useGameStore((s) => s.player);
  const storageCap = player.resourceStorageCap ?? 200;

  const resources = [
    {
      label: "IRON",
      val: player.iron,
      color: "#94a3b8",
      icon: "⚙️",
    },
    {
      label: "FUEL",
      val: player.fuel,
      color: AMBER,
      icon: "⛽",
    },
    {
      label: "CRYSTAL",
      val: player.crystal,
      color: CYAN,
      icon: "💎",
    },
    {
      label: "RARE EARTH",
      val: player.rareEarth,
      color: PURPLE,
      icon: "🔮",
    },
  ];

  return (
    <div
      style={{
        background: PANEL,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 3,
          color: CYAN,
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Package size={12} style={{ color: CYAN }} />
        RESOURCE STOCKPILES
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {resources.map((r) => {
          const pct = Math.min(100, (r.val / storageCap) * 100);
          return (
            <div key={r.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11 }}>{r.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: r.color,
                    }}
                  >
                    {r.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "monospace",
                    color: TEXT_DIM,
                  }}
                >
                  <span style={{ color: r.color, fontWeight: 700 }}>
                    {r.val.toFixed(8)}
                  </span>{" "}
                  / {storageCap}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: r.color,
                    borderRadius: 3,
                    transition: "width 0.6s ease",
                    boxShadow: `0 0 6px ${r.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Inventory/Loadout page ──
export default function Inventory() {
  const activeWeapon = useGameStore((s) => s.activeWeapon);
  const setActiveWeapon = useGameStore((s) => s.setActiveWeapon);
  const arsenalInventory = useGameStore((s) => s.arsenalInventory);
  const artilleryInventory = useGameStore((s) => s.artilleryInventory);
  const interceptorInventory = useGameStore((s) => s.interceptorInventory);

  const [weaponTab, setWeaponTab] = useState<WeaponTab>("MISSILES");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningInterceptorId, setAssigningInterceptorId] = useState<
    string | null
  >(null);

  const handleSelectWeapon = (id: string) => {
    setActiveWeapon(activeWeapon === id ? null : id);
  };

  const handleOpenAssign = (interceptorId: string) => {
    setAssigningInterceptorId(interceptorId);
    setAssignModalOpen(true);
  };

  const weaponTabs: WeaponTab[] = ["MISSILES", "ARTILLERY", "INTERCEPTORS"];
  const tabIcons: Record<WeaponTab, React.ReactNode> = {
    MISSILES: <Zap size={12} />,
    ARTILLERY: <Target size={12} />,
    INTERCEPTORS: <Shield size={12} />,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #0a1628 0%, #04070d 70%)",
        fontFamily: "'General Sans', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <Navbar />

      <div className="pt-20 pb-28 px-4 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-5"
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: "rgba(0,255,204,0.1)",
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={18} style={{ color: CYAN }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 4,
                color: TEXT,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              LOADOUT MANAGER
            </h1>
            <p
              style={{
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: 2,
                marginTop: 2,
              }}
            >
              WEAPONS &middot; INTERCEPTORS &middot; STOCKPILES
            </p>
          </div>
        </motion.div>

        {/* Section 1: Active Loadout */}
        <ActiveLoadout />

        {/* Section 2: Weapons Arsenal */}
        <div
          style={{
            background: PANEL,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: "12px 16px 8px",
              borderBottom: `1px solid ${BORDER}`,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 3,
              color: CYAN,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Zap size={12} style={{ color: CYAN }} />
            WEAPONS ARSENAL
          </div>

          {/* Sub-tabs */}
          <div
            data-ocid="inventory.tab"
            style={{
              display: "flex",
              borderBottom: `1px solid ${BORDER}`,
              background: "rgba(0,255,204,0.02)",
            }}
          >
            {weaponTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                data-ocid="inventory.tab"
                onClick={() => setWeaponTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: weaponTab === tab ? CYAN : TEXT_DIM,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${
                    weaponTab === tab ? CYAN : "transparent"
                  }`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  minHeight: 44,
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {tabIcons[tab]}
                {tab}
              </button>
            ))}
          </div>

          {/* Weapon list */}
          <div style={{ padding: "10px 12px" }}>
            <AnimatePresence mode="wait">
              {weaponTab === "MISSILES" && (
                <motion.div
                  key="missiles"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  {MISSILE_CONFIGS.map((m) => (
                    <WeaponRow
                      key={m.id}
                      name={m.name}
                      category="MISSILE"
                      classLabel={m.class}
                      range={m.range}
                      speed={m.speed}
                      count={arsenalInventory[m.id] ?? 0}
                      accent={m.accentColor}
                      cost={MISSILE_COSTS[m.id] ?? 60}
                      selected={activeWeapon === m.id}
                      onSelect={() => handleSelectWeapon(m.id)}
                    />
                  ))}
                </motion.div>
              )}

              {weaponTab === "ARTILLERY" && (
                <motion.div
                  key="artillery"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  {ARTILLERY_CONFIGS.map((a) => (
                    <WeaponRow
                      key={a.id}
                      name={a.name}
                      category="ARTILLERY"
                      classLabel={a.class}
                      range={a.range}
                      speed={a.speed}
                      count={artilleryInventory[a.id] ?? 0}
                      accent={a.accentColor}
                      cost={75}
                      selected={activeWeapon === a.id}
                      onSelect={() => handleSelectWeapon(a.id)}
                    />
                  ))}
                </motion.div>
              )}

              {weaponTab === "INTERCEPTORS" && (
                <motion.div
                  key="interceptors"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: TEXT_DIM,
                      letterSpacing: 1.5,
                      marginBottom: 8,
                      padding: "6px 8px",
                      background: "rgba(168,85,247,0.07)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      borderRadius: 6,
                    }}
                  >
                    🛡️ PASSIVE/AUTO — Intercepts incoming threats when assigned
                    to a silo plot. FRNTR consumed per successful intercept.
                  </div>
                  {INTERCEPTOR_CONFIGS.map((ic) => (
                    <WeaponRow
                      key={ic.id}
                      name={ic.name}
                      category="INTERCEPTOR"
                      classLabel={`${Math.round(ic.interceptChance * 100)}% INTERCEPT`}
                      range={ic.range}
                      speed={ic.speed}
                      count={interceptorInventory[ic.id] ?? 0}
                      accent={ic.accentColor}
                      cost={ic.frntrPerIntercept}
                      selected={false}
                      onSelect={() => {}}
                      isInterceptor
                      onAssign={() => handleOpenAssign(ic.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Section 3: Resource Stockpiles */}
        <ResourceStockpiles />
      </div>

      {/* Assign interceptor modal */}
      <AssignInterceptorModal
        interceptorId={assigningInterceptorId}
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
      />
    </div>
  );
}
