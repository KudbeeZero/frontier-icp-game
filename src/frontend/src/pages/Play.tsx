import {
  Check,
  ChevronDown,
  ChevronRight,
  Grid2x2,
  Map as MapIcon,
  Package,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FaucetButton from "../components/FaucetButton";
import GlobeCanvas from "../components/GlobeCanvas";
import LeftSidebarHUD from "../components/LeftSidebarHUD";
import MapBottomSheet from "../components/MapBottomSheet";
import Navbar from "../components/Navbar";
import PlayNowOverlay from "../components/PlayNowOverlay";
import PlotHoverCard from "../components/PlotHoverCard";
import UniversePanel from "../components/UniversePanel";
import { usePlayerSync } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const _GOLD = "#ffd700";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const NAV_ITEMS = [
  { id: "land", label: "LAND", Icon: MapIcon },
  { id: "leaderboard", label: "LEADERBOARD", Icon: Trophy },
  { id: "inventory", label: "INVENTORY", Icon: Package },
];

interface TopBarProps {
  onUniverseClick: () => void;
  onPlayNowClick: () => void;
}

function TopBar({ onUniverseClick, onPlayNowClick }: TopBarProps) {
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

      {/* Center title */}
      <div
        style={{
          color: CYAN,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 12px ${CYAN}`,
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        FRONTIER: MISSILE HORIZON
      </div>

      {/* Right controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: "auto",
        }}
      >
        <FaucetButton />
        <button
          type="button"
          data-ocid="playnow.primary_button"
          onClick={onPlayNowClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            background: "rgba(0,255,204,0.18)",
            border: "1px solid rgba(0,255,204,0.6)",
            borderRadius: 6,
            cursor: "pointer",
            color: "#00ffcc",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            height: 32,
            whiteSpace: "nowrap",
            boxShadow: "0 0 10px rgba(0,255,204,0.25)",
          }}
        >
          PLAY NOW
        </button>
        <button
          type="button"
          data-ocid="universe.open_modal_button"
          onClick={onUniverseClick}
          aria-label="Open Universe panel"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            background: "rgba(0,255,204,0.07)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            cursor: "pointer",
            color: CYAN,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            height: 32,
            whiteSpace: "nowrap",
          }}
        >
          UNIVERSE
        </button>
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
  const player = useGameStore((s) => s.player);
  const purchaseDebugLogs = useGameStore((s) => s.purchaseDebugLogs);
  const clearPurchaseDebugLogs = useGameStore((s) => s.clearPurchaseDebugLogs);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const [debugExpanded, setDebugExpanded] = useState(false);

  if (tab === "land") {
    return <MapBottomSheet onClose={onClose} controlsRef={controlsRef} />;
  }

  if (tab === "leaderboard") {
    const entries = leaderboard.slice(0, 10);
    return (
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 2,
            marginBottom: 12,
            textShadow: `0 0 8px ${CYAN}`,
          }}
        >
          GLOBAL LEADERBOARD
        </div>
        {entries.length === 0 ? (
          <div
            data-ocid="leaderboard.empty_state"
            style={{
              padding: 24,
              textAlign: "center",
              color: CYAN_DIM,
              fontSize: 10,
              letterSpacing: 0.5,
            }}
          >
            NO PLAYERS YET
            <br />
            <span style={{ fontSize: 8 }}>BE THE FIRST TO REGISTER!</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.map((e) => (
              <div
                key={e.rank}
                data-ocid={`leaderboard.item.${e.rank}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background:
                    e.rank === 1
                      ? "rgba(0,255,204,0.08)"
                      : "rgba(0,255,204,0.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      e.rank === 1
                        ? "rgba(255,215,0,0.2)"
                        : e.rank === 2
                          ? "rgba(192,192,192,0.2)"
                          : e.rank === 3
                            ? "rgba(205,127,50,0.2)"
                            : "transparent",
                    border: `1px solid ${e.rank <= 3 ? CYAN : BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: e.rank <= 3 ? CYAN : CYAN_DIM,
                    flexShrink: 0,
                  }}
                >
                  {e.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      letterSpacing: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.name}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: CYAN_DIM,
                      letterSpacing: 0.5,
                    }}
                  >
                    {e.plotsOwned} PLOTS
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: CYAN,
                    fontFamily: "monospace",
                    letterSpacing: 0.5,
                  }}
                >
                  {e.frntEarned.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  FRNTR
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            padding: "10px",
            background: "rgba(0,255,204,0.03)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: CYAN_DIM,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            YOUR RANK
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: CYAN,
              textAlign: "center",
              fontFamily: "monospace",
              textShadow: `0 0 12px ${CYAN}`,
              marginTop: 4,
            }}
          >
            #{player.plotsOwned.length > 0 ? "—" : "—"}
          </div>
          <div
            style={{
              fontSize: 9,
              color: CYAN_DIM,
              textAlign: "center",
              marginTop: 2,
            }}
          >
            {player.plotsOwned.length} PLOTS OWNED
          </div>
        </div>

        {/* PURCHASE DEBUG LOG */}
        <div
          style={{
            marginTop: 12,
            background: "rgba(4,12,24,0.85)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            data-ocid="purchase_debug.toggle_button"
            onClick={() => setDebugExpanded((p) => !p)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: CYAN,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            <span>PURCHASE DEBUG LOG</span>
            <ChevronRight
              size={14}
              style={{
                transform: debugExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
          {debugExpanded && (
            <div style={{ padding: "0 12px 12px" }}>
              {purchaseDebugLogs.length === 0 ? (
                <div
                  data-ocid="purchase_debug.empty_state"
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: CYAN_DIM,
                    fontSize: 9,
                    letterSpacing: 0.5,
                  }}
                >
                  NO PURCHASE ATTEMPTS YET
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {purchaseDebugLogs.map((log) => (
                    <div
                      key={log.id}
                      data-ocid={`purchase_debug.item.${log.plotId}`}
                      style={{
                        background: "rgba(0,255,204,0.03)",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 6,
                        padding: "8px 10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: TEXT,
                            letterSpacing: 0.5,
                          }}
                        >
                          PLOT #{log.plotId}
                        </span>
                        <span
                          style={{
                            fontSize: 7,
                            color: CYAN_DIM,
                            fontFamily: "monospace",
                          }}
                        >
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {log.steps.map((step, stepIdx) => (
                          <div
                            key={`${log.id}-${step.step}-${stepIdx}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {step.status === "success" ? (
                              <Check size={10} color="#00ffcc" />
                            ) : step.status === "error" ? (
                              <X size={10} color="#ff4444" />
                            ) : (
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "rgba(0,255,204,0.25)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: 8,
                                color:
                                  step.status === "error"
                                    ? "#ff6666"
                                    : step.status === "success"
                                      ? "#00ffcc"
                                      : CYAN_DIM,
                                letterSpacing: 0.5,
                              }}
                            >
                              {step.step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {purchaseDebugLogs.length > 0 && (
                <button
                  type="button"
                  data-ocid="purchase_debug.clear_button"
                  onClick={clearPurchaseDebugLogs}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "6px 0",
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.3)",
                    borderRadius: 4,
                    color: "#ff6666",
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: 1,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  CLEAR LOG
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 2,
            marginBottom: 12,
            textShadow: `0 0 8px ${CYAN}`,
          }}
        >
          OWNED PLOTS
        </div>
        {player.plotsOwned.length === 0 ? (
          <div
            data-ocid="inventory.empty_state"
            style={{
              padding: 24,
              textAlign: "center",
              color: CYAN_DIM,
              fontSize: 10,
              letterSpacing: 0.5,
            }}
          >
            NO PLOTS OWNED
            <br />
            <span style={{ fontSize: 8 }}>
              TAP A HEX ON THE GLOBE TO PURCHASE
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {player.plotsOwned.map((plotId, idx) => (
              <div
                key={plotId}
                data-ocid={`inventory.item.${idx + 1}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(0,255,204,0.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(0,255,204,0.08)",
                    border: `1px solid ${CYAN}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: CYAN,
                    flexShrink: 0,
                  }}
                >
                  #{plotId}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      letterSpacing: 0.5,
                    }}
                  >
                    PLOT #{plotId}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: CYAN_DIM,
                      letterSpacing: 0.5,
                    }}
                  >
                    GENERATOR I · 7 FRNTR/DAY
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`inventory.transfer_button.${idx + 1}`}
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: CYAN,
                    background: "rgba(0,255,204,0.08)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 4,
                    padding: "4px 8px",
                    cursor: "pointer",
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  TRANSFER
                </button>
              </div>
            ))}
          </div>
        )}
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
  const isLandTab = activeTab === "land";
  const sheetHeight = isLandTab ? "75vh" : "55vh";

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
  const sheetBottom = isLandTab && isMobile ? navHeight + 64 : navHeight;

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
            overflowY: isLandTab ? "hidden" : "auto",
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
  usePlayerSync();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showUniverse, setShowUniverse] = useState(false);
  const [showPlayNow, setShowPlayNow] = useState(false);
  const player = useGameStore((s) => s.player);
  const _totalFRNTRBurned = useGameStore((s) => s.totalFRNTRBurned);

  const plotHoverCard = useGameStore((s) => s.plotHoverCard);
  const setPlotHoverCard = useGameStore((s) => s.setPlotHoverCard);
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

  useEffect(() => {
    const currentLen = player.plotsOwned.length;
    if (currentLen > prevPlotsOwnedLen.current) {
      const newPlotId = player.plotsOwned[currentLen - 1];
      setPurchaseToast({ plotId: newPlotId, rate: 7 });
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
        <GlobeCanvas controlsRef={controlsRef} />
      </div>

      <Navbar />
      <TopBar
        onUniverseClick={() => setShowUniverse(true)}
        onPlayNowClick={() => setShowPlayNow(true)}
      />
      <LeftSidebarHUD />
      <BottomNavBar activeTab={activeTab} onTabClick={handleTabClick} />
      <BottomSheet
        activeTab={activeTab}
        onClose={() => setActiveTab(null)}
        controlsRef={controlsRef}
      />

      {plotHoverCard && (
        <PlotHoverCard
          plotId={plotHoverCard.plotId}
          owner={plotHoverCard.owner}
          action={plotHoverCard.action}
          nextStep={plotHoverCard.nextStep}
          onDismiss={() => setPlotHoverCard(null)}
        />
      )}

      {showUniverse && <UniversePanel onClose={() => setShowUniverse(false)} />}

      {showPlayNow && !player.principal && (
        <PlayNowOverlay
          onLogin={() => setShowPlayNow(false)}
          onClose={() => setShowPlayNow(false)}
        />
      )}

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
    </div>
  );
}
