import {
  ChevronDown,
  Grid2x2,
  Map as MapIcon,
  MoreHorizontal,
  Package,
  Radio,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CommandCenter from "../components/CommandCenter";
import CommandPanel from "../components/CommandPanel";
import CommanderStore from "../components/CommanderStore";
import CountdownOverlay from "../components/CountdownOverlay";
import GlobeCanvas from "../components/GlobeCanvas";
import LeftSidebarHUD from "../components/LeftSidebarHUD";
import MapBottomSheet from "../components/MapBottomSheet";
import Navbar from "../components/Navbar";
import PlotHoverCard from "../components/PlotHoverCard";
import SmokeTestPanel from "../components/SmokeTestPanel";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const _GOLD = "#ffd700";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const WEAPONS = [
  { name: "BALLISTIC ICBM", abbr: "B", qty: 8, color: "#ef4444" },
  { name: "CRUISE MISSILE", abbr: "C", qty: 12, color: "#f97316" },
  { name: "EMP WARHEAD", abbr: "E", qty: 3, color: "#3b82f6" },
  { name: "MIRV STRIKE", abbr: "M", qty: 2, color: "#a855f7" },
  { name: "INTERCEPTOR", abbr: "I", qty: 15, color: "#22c55e" },
  { name: "ORBITAL RAIL", abbr: "O", qty: 1, color: "#ffd700" },
];

const NAV_ITEMS = [
  { id: "map", label: "MAP", Icon: MapIcon },
  { id: "inventory", label: "INVENTORY", Icon: Package },
  { id: "intel", label: "INTEL", Icon: Radio },
  { id: "commander", label: "COMMANDER", Icon: Shield },
  { id: "more", label: "MORE", Icon: MoreHorizontal },
];

interface TopBarProps {
  onOpenCommandCenter?: () => void;
}

function TopBar({ onOpenCommandCenter }: TopBarProps) {
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
        {/* Command Center toggle button */}
        <button
          type="button"
          data-ocid="command_center.open_modal_button"
          onClick={onOpenCommandCenter}
          style={{
            width: 36,
            height: 36,
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          title="Command Center"
        >
          <Grid2x2 size={15} color={CYAN} />
        </button>
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
    </div>
  );
}

interface BottomNavProps {
  activeTab: string | null;
  onTabClick: (id: string) => void;
}

function BottomNavBar({ activeTab, onTabClick }: BottomNavProps) {
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  useEffect(() => {
    const handler = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  const isLandscape = windowHeight < 500;
  const navHeight = isLandscape ? 44 : 64;

  return (
    <div
      data-ocid="nav.panel"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: navHeight,
        display: "flex",
        background: "rgba(2,10,20,0.97)",
        borderTop: "1px solid rgba(0,255,204,0.3)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxSizing: "border-box",
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
              gap: isLandscape ? 0 : 2,
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
              size={isLandscape ? 16 : 18}
              color={isActive ? CYAN : CYAN_DIM}
              style={{
                filter: isActive ? `drop-shadow(0 0 4px ${CYAN})` : "none",
              }}
            />
            {!isLandscape && (
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
            )}
          </button>
        );
      })}
    </div>
  );
}

function SheetContent({
  tab,
  onClose,
  controlsRef,
}: {
  tab: string;
  onClose: () => void;
  controlsRef: React.RefObject<any>;
}) {
  const combatLog = useGameStore((s) => s.combatLog);

  if (tab === "map") {
    return <MapBottomSheet onClose={onClose} controlsRef={controlsRef} />;
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

  // INTEL = combat log
  if (tab === "intel") {
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
            data-ocid={`intel.item.${i + 1}`}
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

  if (tab === "commander") {
    return <CommanderStore />;
  }

  // MORE = settings
  if (tab === "more") {
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
  controlsRef: React.RefObject<any>;
}

function BottomSheet({ activeTab, onClose, controlsRef }: BottomSheetProps) {
  const isOpen = activeTab !== null;
  const tabLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? "";
  const isMapTab = activeTab === "map";
  const sheetHeight = isMapTab ? "75vh" : "55vh";

  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  useEffect(() => {
    const handler = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);
  const isMobile = windowWidth < 768;
  const isLandscape = windowHeight < 500;
  const navHeight = isLandscape ? 44 : 64;
  // On mobile MAP tab, offset sheet above the 60px collapsed CommandPanel + navHeight
  const sheetBottom = isMapTab && isMobile ? navHeight + 64 : navHeight;

  return (
    <>
      {isOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: fullscreen overlay backdrop
        <div
          data-ocid="sheet.backdrop"
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: navHeight,
            background: "rgba(0,0,0,0.4)",
            zIndex: 45,
          }}
        />
      )}
      <div
        data-ocid="nav.sheet"
        style={{
          position: "fixed",
          bottom: sheetBottom,
          left: "50%",
          transform: isOpen ? "translate(-50%, 0)" : "translate(-50%, 100%)",
          width: "min(100%, 480px)",
          height: sheetHeight,
          zIndex: 50,
          background: "rgba(4,12,24,0.97)",
          borderTop: `1px solid ${BORDER}`,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderRadius: "16px 16px 0 0",
          transition:
            "transform 0.3s ease-out, height 0.3s ease-out, bottom 0.2s ease-out",
          display: "flex",
          flexDirection: "column",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
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
        <div
          style={{
            overflowY: isMapTab ? "hidden" : "auto",
            flex: 1,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab && (
            <SheetContent
              tab={activeTab}
              onClose={onClose}
              controlsRef={controlsRef}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function Play() {
  const controlsRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [missileActive, setMissileActive] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showStrikeBanner, setShowStrikeBanner] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plotHoverCard = useGameStore((s) => s.plotHoverCard);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);
  const player = useGameStore((s) => s.player);
  const [purchaseToast, setPurchaseToast] = useState<{
    plotId: number;
    rate: number;
  } | null>(null);
  const purchaseToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevPlotsOwnedLen = useRef(player.plotsOwned.length);

  const handleTabClick = (id: string) =>
    setActiveTab((prev) => (prev === id ? null : id));

  const handleFire = () => {
    if (!missileActive && !showCountdown) setShowCountdown(true);
  };

  const handleLaunchReady = useCallback(() => {
    setShowCountdown(false);
    setMissileActive(true);
  }, []);

  const handleMissileComplete = useCallback(() => {
    setMissileActive(false);
    setShowStrikeBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setShowStrikeBanner(false), 2500);
  }, []);

  useEffect(() => {
    const currentLen = player.plotsOwned.length;
    if (currentLen > prevPlotsOwnedLen.current) {
      const newPlotId = player.plotsOwned[currentLen - 1];
      setPurchaseToast({ plotId: newPlotId, rate: 50 });
      if (purchaseToastTimerRef.current)
        clearTimeout(purchaseToastTimerRef.current);
      purchaseToastTimerRef.current = setTimeout(
        () => setPurchaseToast(null),
        3000,
      );
    }
    prevPlotsOwnedLen.current = currentLen;
  }, [player.plotsOwned]);

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
      <TopBar onOpenCommandCenter={() => setCommandCenterOpen(true)} />
      <LeftSidebarHUD />
      <CommandPanel
        onFire={handleFire}
        fireDisabled={missileActive || showCountdown || selectedPlotId === null}
        onOpenTab={(tab) => setActiveTab(tab)}
        onToggleCombatLog={() => {}}
      />
      <BottomNavBar activeTab={activeTab} onTabClick={handleTabClick} />
      <BottomSheet
        activeTab={activeTab}
        onClose={() => setActiveTab(null)}
        controlsRef={controlsRef}
      />

      <CommandCenter
        open={commandCenterOpen}
        onClose={() => setCommandCenterOpen(false)}
      />

      {showCountdown && <CountdownOverlay onLaunchReady={handleLaunchReady} />}

      {showStrikeBanner && (
        <div
          data-ocid="missile.success_state"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(2,10,20,0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(0,255,204,0.3)",
              borderRadius: 8,
              padding: "24px 48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              animation: "strikeFadeIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 4,
                color: "rgba(0,255,204,0.6)",
                fontFamily: "'Courier New', monospace",
              }}
            >
              BALLISTIC ICBM
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: 6,
                color: "#00ffcc",
                textShadow: "0 0 24px #00ffcc, 0 0 48px #00ffcc44",
                fontFamily: "'Courier New', monospace",
              }}
            >
              STRIKE SUCCESSFUL
            </div>
            <div
              style={{
                width: 160,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(0,255,204,0.6), transparent)",
              }}
            />
            <div
              style={{
                fontSize: 8,
                letterSpacing: 2,
                color: "rgba(255,100,0,0.7)",
                fontFamily: "'Courier New', monospace",
              }}
            >
              TARGET NEUTRALISED
            </div>
          </div>
          <style>{`
            @keyframes strikeFadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {plotHoverCard && (
        <PlotHoverCard
          plotId={plotHoverCard.plotId}
          owner={plotHoverCard.owner}
          action={plotHoverCard.action}
          nextStep={plotHoverCard.nextStep}
          onDismiss={() => setPlotHoverCard(null)}
        />
      )}

      {/* Purchase success toast */}
      {purchaseToast && (
        <div
          data-ocid="map.success_state"
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            background: "rgba(4,12,24,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0,255,204,0.45)",
            borderTop: "2px solid #00ffcc",
            borderRadius: 8,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 24px rgba(0,255,204,0.18)",
            animation: "slideUpFadeIn 0.3s ease",
          }}
        >
          <span style={{ color: "#00ffcc", fontSize: 13, fontWeight: 700 }}>
            ✓
          </span>
          <span
            style={{
              color: "#00ffcc",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              fontFamily: "monospace",
            }}
          >
            PLOT #{purchaseToast.plotId} ACQUIRED
          </span>
          <span style={{ color: "rgba(0,255,204,0.45)", fontSize: 9 }}>·</span>
          <span
            style={{
              color: "#ffd700",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              fontFamily: "monospace",
            }}
          >
            +{purchaseToast.rate} FRNTR/DAY
          </span>
        </div>
      )}

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
      <SmokeTestPanel />
    </div>
  );
}
