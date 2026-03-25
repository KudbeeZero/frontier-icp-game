import { Building2, FlaskConical, MessageSquare, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BG = "rgba(2,10,20,0.9)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";

const glass: React.CSSProperties = {
  background: BG,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: `1px solid ${BORDER}`,
};

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

const RESOURCES = [
  {
    label: "IRON",
    key: "iron" as const,
    color: "#94a3b8",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        role="img"
      >
        <title>Iron</title>
        <rect
          x="2"
          y="2"
          width="8"
          height="8"
          rx="1"
          fill="#94a3b8"
          opacity="0.8"
        />
        <rect x="4" y="4" width="4" height="4" rx="0.5" fill="#94a3b8" />
      </svg>
    ),
  },
  {
    label: "FUEL",
    key: "fuel" as const,
    color: "#f97316",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        role="img"
      >
        <title>Fuel</title>
        <path
          d="M6 1 C6 1 3 4 3 7 C3 8.66 4.34 10 6 10 C7.66 10 9 8.66 9 7 C9 4 6 1 6 1Z"
          fill="#f97316"
          opacity="0.85"
        />
      </svg>
    ),
  },
  {
    label: "CRYSTAL",
    key: "crystal" as const,
    color: "#3b82f6",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        role="img"
      >
        <title>Crystal</title>
        <polygon points="6,1 10,5 6,11 2,5" fill="#3b82f6" opacity="0.85" />
      </svg>
    ),
  },
];

const QUICK_LINKS = [
  { label: "FLEETS", Icon: Rocket, id: "fleets" },
  { label: "RESEARCH", Icon: FlaskConical, id: "research" },
  { label: "BUILDINGS", Icon: Building2, id: "buildings" },
  { label: "CHAT", Icon: MessageSquare, id: "chat" },
];

export default function LeftSidebarHUD() {
  const player = useGameStore((s) => s.player);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isMobile = windowWidth < 768;
  const sidebarWidth = isMobile ? 200 : 180;
  const sidebarPad = isMobile ? 12 : 10;

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
  const rankNum =
    ownedCount > 0 ? Math.min(Math.floor(ownedCount / 10) + 1, 10) : 1;
  const xpPct = `${((ownedCount % 10) / 10) * 100}%`;
  const initials = player.principal
    ? player.principal.slice(0, 2).toUpperCase()
    : "CM";
  const commanderName = `Commander ${player.principal ? player.principal.slice(0, 6) : "Axion"}`;

  const sectionHeader = (label: string) => (
    <div
      style={{
        fontSize: 7,
        color: CYAN_DIM,
        letterSpacing: 3,
        textTransform: "uppercase" as const,
        paddingBottom: 5,
        borderBottom: "1px solid rgba(0,255,204,0.22)",
        marginBottom: 5,
      }}
    >
      {label}
    </div>
  );

  // Desktop: always visible, no toggle
  // Mobile: hidden by default, slide in on open
  const sidebarTransform = isMobile
    ? mobileOpen
      ? "translateX(0)"
      : "translateX(-100%)"
    : "translateX(0)";

  return (
    <>
      {/* Backdrop (mobile only, when open) */}
      {isMobile && mobileOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: fullscreen overlay backdrop
        <div
          data-ocid="sidebar.backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 29,
          }}
        />
      )}

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        data-ocid="sidebar.panel"
        style={{
          position: "fixed",
          top: 48,
          left: 0,
          width: sidebarWidth,
          zIndex: isMobile ? (mobileOpen ? 30 : 25) : 25,
          ...glass,
          borderLeft: "none",
          borderTop: "none",
          borderBottom: "none",
          borderRight: "1px solid rgba(0,255,204,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          boxShadow: "2px 0 16px rgba(0,255,204,0.06)",
          transform: sidebarTransform,
          transition: isMobile
            ? "transform 0.28s cubic-bezier(0.4,0,0.2,1)"
            : "none",
          willChange: "transform",
        }}
      >
        {/* PLAYER INFO */}
        <div style={{ padding: `10px ${sidebarPad}px 8px` }}>
          {sectionHeader("Player Info")}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Avatar */}
            <div
              data-ocid="sidebar.avatar.card"
              style={{
                width: isMobile ? 40 : 36,
                height: isMobile ? 40 : 36,
                flexShrink: 0,
                background:
                  "linear-gradient(135deg, rgba(0,255,204,0.12) 0%, rgba(2,10,20,0.9) 100%)",
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? 13 : 12,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 0.5,
                boxShadow: "inset 0 0 8px rgba(0,255,204,0.1)",
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: isMobile ? 9.5 : 8.5,
                  fontWeight: 700,
                  color: TEXT,
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {commanderName}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 8 : 7,
                  color: CYAN_DIM,
                  letterSpacing: 1,
                  marginTop: 1,
                }}
              >
                {rank.toUpperCase()} LV.{rankNum}
              </div>
            </div>
          </div>
          {/* XP Bar */}
          <div style={{ marginTop: 7 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 6, color: CYAN_DIM, letterSpacing: 1 }}>
                XP
              </span>
              <span style={{ fontSize: 6, color: CYAN_DIM, letterSpacing: 1 }}>
                {ownedCount % 10}/10
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(0,255,204,0.1)",
                borderRadius: 2,
                overflow: "hidden",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: xpPct,
                  background: `linear-gradient(90deg, ${CYAN}, rgba(0,255,204,0.7))`,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${CYAN}`,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{ height: 1, background: BORDER, margin: `0 ${sidebarPad}px` }}
        />

        {/* RESOURCES */}
        <div style={{ padding: `8px ${sidebarPad}px` }}>
          {sectionHeader("Resources")}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 7 : 5,
            }}
          >
            {RESOURCES.map(({ label, key, color, icon }) => (
              <div
                key={key}
                data-ocid={`sidebar.${key}.row`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <span
                    style={{
                      fontSize: isMobile ? 9 : 8,
                      color: "rgba(224,244,255,0.6)",
                      letterSpacing: 1,
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: isMobile ? 10 : 9,
                    fontWeight: 700,
                    color,
                    letterSpacing: 0.5,
                    textShadow: `0 0 6px ${color}88`,
                  }}
                >
                  {fmt(player[key])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{ height: 1, background: BORDER, margin: `0 ${sidebarPad}px` }}
        />

        {/* QUICK LINKS */}
        <div style={{ padding: `8px ${sidebarPad}px ${isMobile ? 14 : 10}px` }}>
          {sectionHeader("Quick Links")}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {QUICK_LINKS.map(({ label, Icon, id }) => (
              <button
                type="button"
                key={id}
                data-ocid={`sidebar.${id}.link`}
                onClick={() => {
                  console.log("nav:", label);
                  if (isMobile) setMobileOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: isMobile ? "7px 8px" : "5px 6px",
                  background: "transparent",
                  border: "1px solid transparent",
                  borderRadius: 3,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                  textAlign: "left" as const,
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(0,255,204,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    BORDER;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "transparent";
                }}
              >
                <Icon size={isMobile ? 13 : 11} color={CYAN_DIM} />
                <span
                  style={{
                    fontSize: isMobile ? 9.5 : 8,
                    color: TEXT,
                    letterSpacing: 1.2,
                    textTransform: "uppercase" as const,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
