import {
  Activity,
  Globe,
  Lock,
  Radio,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SubParcelIntelView from "./SubParcelIntelView";

// ── Types ────────────────────────────────────────────────────────────────────
type EventKind = "purchase" | "join" | "upgrade" | "burn";
type IntelSubTab = "war_feed" | "sub_parcels";

interface FeedEvent {
  id: number;
  kind: EventKind;
  message: string;
  detail: string;
  timestamp: string;
  region: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const REGIONS = [
  "N.AMERICA",
  "EUROPE",
  "ASIA-PAC",
  "MIDEAST",
  "AFRICA",
  "S.AMERICA",
  "ARCTIC",
];
const PLOT_NAMES = [
  "H3:8928308280fffff",
  "H3:892831a8a2bffff",
  "H3:89283470803ffff",
  "H3:8928347083bffff",
  "H3:892834708c3ffff",
  "H3:89283470803ffff",
  "H3:8928340c7cbffff",
];
const PRINCIPALS = [
  "xk3mz-7qabc",
  "py9nt-5rlop",
  "ab2wx-9dfgh",
  "lm4vq-1ryze",
  "tz8kw-2mnop",
  "qr5sj-8pabc",
  "cn7lx-4dfgh",
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent(id: number): FeedEvent {
  const kind: EventKind = randItem(["purchase", "join", "upgrade", "burn"]);
  const principal = randItem(PRINCIPALS);
  const region = randItem(REGIONS);
  const plot = randItem(PLOT_NAMES);
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}Z`;

  const configs: Record<EventKind, { message: string; detail: string }> = {
    purchase: {
      message: "TERRITORY ACQUIRED",
      detail: `${principal} secured ${plot} — ${(Math.random() * 2 + 1).toFixed(2)} ICP`,
    },
    join: {
      message: "NEW COMMANDER DEPLOYED",
      detail: `${principal} entered the grid — Region ${region}`,
    },
    upgrade: {
      message: "GENERATOR UPGRADE",
      detail: `${principal} upgraded plot ${plot} — Gen Tier ${Math.floor(Math.random() * 6) + 1}`,
    },
    burn: {
      message: "FRNTR BURNED",
      detail: `${(Math.random() * 5000 + 100).toFixed(2)} FRNTR removed from circulation`,
    },
  };

  return { id, kind, region, timestamp: ts, ...configs[kind] };
}

const EVENT_COLORS: Record<EventKind, string> = {
  purchase: "#00ffcc",
  join: "#00bbff",
  upgrade: "#ffcc00",
  burn: "#ff4444",
};

const EVENT_ICONS: Record<EventKind, React.ReactNode> = {
  purchase: <Globe size={12} />,
  join: <Users size={12} />,
  upgrade: <TrendingUp size={12} />,
  burn: <Zap size={12} />,
};

// ── Radar sweep SVG ───────────────────────────────────────────────────────────
function RadarSweep() {
  return (
    <div className="relative w-48 h-48 mx-auto" aria-hidden="true">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        role="img"
        aria-label="Radar sweep"
      >
        <title>Radar sweep</title>
        {/* Grid circles */}
        {[80, 60, 40, 20].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="rgba(0,255,204,0.12)"
            strokeWidth="1"
          />
        ))}
        {/* Cross hairs */}
        <line
          x1="100"
          y1="20"
          x2="100"
          y2="180"
          stroke="rgba(0,255,204,0.1)"
          strokeWidth="0.5"
        />
        <line
          x1="20"
          y1="100"
          x2="180"
          y2="100"
          stroke="rgba(0,255,204,0.1)"
          strokeWidth="0.5"
        />
        {/* Sweep arm */}
        <g
          style={{
            transformOrigin: "100px 100px",
            animation: "orbit 4s linear infinite",
          }}
        >
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="20"
            stroke="#00ffcc"
            strokeWidth="1.5"
            strokeOpacity="0.9"
          />
          <circle cx="100" cy="20" r="2" fill="#00ffcc" fillOpacity="0.9" />
          {/* Sweep fill */}
          <path
            d="M100,100 L100,20 A80,80,0,0,1,180,100 Z"
            fill="rgba(0,255,204,0.04)"
          />
        </g>
        {/* Center dot */}
        <circle cx="100" cy="100" r="4" fill="#00ffcc" fillOpacity="0.7" />
        {/* Blip dots */}
        <circle
          cx="65"
          cy="72"
          r="2.5"
          fill="#00ffcc"
          fillOpacity="0.6"
          style={{ animation: "twinkle 2.3s ease-in-out infinite" }}
        />
        <circle
          cx="138"
          cy="115"
          r="2"
          fill="#00ffcc"
          fillOpacity="0.5"
          style={{ animation: "twinkle 3.1s ease-in-out infinite" }}
        />
        <circle
          cx="120"
          cy="58"
          r="1.5"
          fill="#00ffcc"
          fillOpacity="0.4"
          style={{ animation: "twinkle 1.8s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntelTab() {
  const [events, setEvents] = useState<FeedEvent[]>(() =>
    Array.from({ length: 8 }, (_, i) => generateEvent(i)),
  );
  const [subTab, setSubTab] = useState<IntelSubTab>("war_feed");
  const idRef = useRef(100);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = generateEvent(idRef.current++);
      setEvents((prev) => [newEvent, ...prev].slice(0, 40));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      data-ocid="intel.panel"
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "rgba(180,220,220,0.85)" }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,255,204,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Radio size={14} style={{ color: "#00ffcc" }} />
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#00ffcc" }}
          >
            INTEL FEED
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#00ffcc",
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "rgba(0,255,204,0.6)" }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* ── Sub-tab switcher ───────────────────────────────────── */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid rgba(0,255,204,0.12)" }}
      >
        {[
          { id: "war_feed" as IntelSubTab, label: "WAR FEED" },
          { id: "sub_parcels" as IntelSubTab, label: "SUB-PARCELS" },
        ].map(({ id, label }) => {
          const isActive = subTab === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={`intel.subtab.${id}`}
              onClick={() => setSubTab(id)}
              className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all"
              style={{
                color: isActive ? "#00ffcc" : "rgba(0,255,204,0.35)",
                background: isActive ? "rgba(0,255,204,0.06)" : "transparent",
                borderBottom: isActive
                  ? "2px solid #00ffcc"
                  : "2px solid transparent",
                boxShadow: isActive ? "0 2px 12px rgba(0,255,204,0.1)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── SUB-PARCELS view ───────────────────────────────────── */}
      {subTab === "sub_parcels" && (
        <div className="flex-1 overflow-y-auto pt-3">
          <SubParcelIntelView />
        </div>
      )}

      {/* ── WAR FEED view ─────────────────────────────────────── */}
      {subTab === "war_feed" && (
        <>
          {/* ── V2 Classified Banner ────────────────────────────────── */}
          <div
            data-ocid="intel.classified_banner"
            className="mx-3 mt-3 rounded-lg p-3 shrink-0"
            style={{
              background: "rgba(255,68,68,0.06)",
              border: "1px solid rgba(255,68,68,0.25)",
            }}
          >
            <div className="flex items-start gap-2">
              <Lock
                size={14}
                style={{ color: "#ff4444", marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "#ff4444" }}
                  >
                    CLASSIFIED — CLEARANCE LEVEL OMEGA
                  </span>
                </div>
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "rgba(180,220,220,0.55)" }}
                >
                  COMBAT SYSTEMS, WEAPON STRIKE PACKAGES &amp; BATTLE RESOLUTION
                  INTELLIGENCE RESTRICTED PENDING OPERATIONAL LAUNCH.
                </p>
                <div
                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(255,68,68,0.12)",
                    border: "1px solid rgba(255,68,68,0.3)",
                  }}
                >
                  <Shield size={9} style={{ color: "#ff4444" }} />
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "#ff4444" }}
                  >
                    UNLOCKS IN V2.0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Radar + stats row ───────────────────────────────────── */}
          <div className="flex items-center gap-4 px-3 py-3 shrink-0">
            <div
              className="rounded-xl p-2 flex-shrink-0"
              style={{
                background: "rgba(0,255,204,0.04)",
                border: "1px solid rgba(0,255,204,0.12)",
              }}
            >
              <RadarSweep />
              <p
                className="text-center text-[9px] uppercase tracking-widest mt-1"
                style={{ color: "rgba(0,255,204,0.45)" }}
              >
                GLOBAL SCAN ACTIVE
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {[
                {
                  label: "ACTIVE COMMANDERS",
                  value: "147",
                  icon: <Users size={10} />,
                },
                {
                  label: "PLOTS MINTED",
                  value: "312 / 5,882",
                  icon: <Globe size={10} />,
                },
                {
                  label: "FRNTR BURNED",
                  value: "48,291.0000",
                  icon: <Zap size={10} />,
                },
                {
                  label: "EVENTS TODAY",
                  value: String(events.length),
                  icon: <Activity size={10} />,
                },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="rounded-lg px-2.5 py-1.5"
                  style={{
                    background: "rgba(0,255,204,0.04)",
                    border: "1px solid rgba(0,255,204,0.1)",
                  }}
                >
                  <div
                    className="flex items-center gap-1 mb-0.5"
                    style={{ color: "rgba(0,255,204,0.5)" }}
                  >
                    {icon}
                    <span className="text-[9px] uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#00ffcc" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Feed label ──────────────────────────────────────────── */}
          <div
            className="px-4 py-1.5 flex items-center gap-2 shrink-0"
            style={{
              borderTop: "1px solid rgba(0,255,204,0.1)",
              borderBottom: "1px solid rgba(0,255,204,0.1)",
            }}
          >
            <Activity size={11} style={{ color: "rgba(0,255,204,0.5)" }} />
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(0,255,204,0.5)" }}
            >
              GLOBAL WAR FEED
            </span>
          </div>

          {/* ── Scrollable event list ────────────────────────────────── */}
          <div
            ref={scrollRef}
            data-ocid="intel.feed_list"
            className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
          >
            {events.map((evt, idx) => (
              <div
                key={evt.id}
                data-ocid={`intel.feed.item.${idx + 1}`}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-all"
                style={{
                  background:
                    idx === 0
                      ? `${EVENT_COLORS[evt.kind]}0d`
                      : "rgba(0,255,204,0.03)",
                  border:
                    idx === 0
                      ? `1px solid ${EVENT_COLORS[evt.kind]}33`
                      : "1px solid rgba(0,255,204,0.07)",
                }}
              >
                {/* Kind icon */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: `${EVENT_COLORS[evt.kind]}18`,
                    color: EVENT_COLORS[evt.kind],
                  }}
                >
                  {EVENT_ICONS[evt.kind]}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider truncate"
                      style={{ color: EVENT_COLORS[evt.kind] }}
                    >
                      {evt.message}
                    </span>
                    <span
                      className="text-[9px] flex-shrink-0"
                      style={{ color: "rgba(180,220,220,0.35)" }}
                    >
                      {evt.timestamp}
                    </span>
                  </div>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "rgba(180,220,220,0.55)" }}
                  >
                    {evt.detail}
                  </p>
                  <span
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: "rgba(0,255,204,0.3)" }}
                  >
                    {evt.region}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
