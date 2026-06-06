const LORE_ENTRIES = [
  {
    id: 1,
    timestamp: "2047-03-15T04:22:00Z",
    category: "TRANSMISSION",
    content:
      "Welcome to Frontier: Missile Horizon. The war for Earth's remaining resources has begun. Secure your territory before others do.",
  },
  {
    id: 2,
    timestamp: "2047-03-16T09:14:00Z",
    category: "INTEL",
    content:
      "The FRNTR token is the lifeblood of the Frontier economy. Landowners generate FRNTR passively — those who upgrade their generators gain decisive advantages.",
  },
  {
    id: 3,
    timestamp: "2047-03-17T18:05:00Z",
    category: "DIRECTIVE",
    content:
      "10,242 hex plots divide the surface of Earth. Each plot is an NFT on the Internet Computer — fully on-chain, fully yours. No central server. No middleman.",
  },
  {
    id: 4,
    timestamp: "2047-03-18T22:31:00Z",
    category: "FIELD REPORT",
    content:
      "Asteroid Impact zones carry exotic particles from an ancient orbital collision. These regions are rare — fewer than 10% of all plots. Their resource potential remains classified.",
  },
  {
    id: 5,
    timestamp: "2047-03-19T07:48:00Z",
    category: "TREASURY BRIEF",
    content:
      "Every ICP spent on land is split automatically: 25% funds the developer team, 25% builds the leaderboard prize pool, and 50% seeds the FRNTR/ICP liquidity pool on ICPSwap.",
  },
  {
    id: 6,
    timestamp: "2047-03-20T13:00:00Z",
    category: "TRANSMISSION",
    content:
      "Survey your plots to unlock strategic intelligence. Detailed resource data and efficiency ratings are available after a paid survey unlock. Knowledge is power.",
  },
  {
    id: 7,
    timestamp: "2047-03-21T02:17:00Z",
    category: "SYSTEM ALERT",
    content:
      "Phase I of the Frontier rollout is live: land acquisition, token generation, and plot upgrades. Phase II — sub-plot specialization, factions, and advanced combat — is in development.",
  },
];

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";

const CATEGORY_COLORS: Record<string, string> = {
  TRANSMISSION: "#00ffcc",
  INTEL: "#38bdf8",
  DIRECTIVE: "#f59e0b",
  "FIELD REPORT": "#a78bfa",
  "TREASURY BRIEF": "#34d399",
  "SYSTEM ALERT": "#f87171",
};

export default function GameLoreWindow() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 180,
        background: "rgba(5,10,22,0.85)",
        border: `1px solid ${BORDER}`,
        borderTop: `2px solid ${CYAN}`,
        borderRadius: 8,
        boxShadow:
          "0 0 18px rgba(0,255,204,0.08), inset 0 0 40px rgba(0,0,0,0.4)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scanline overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(0,255,204,0.04)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          zIndex: 2,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: CYAN,
            boxShadow: `0 0 8px ${CYAN}`,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--font-mono, monospace)",
            color: CYAN,
            letterSpacing: 3,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          FRONTIER LORE FEED
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 7,
            color: "rgba(0,255,204,0.4)",
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: 1,
          }}
        >
          LIVE · ICP MAINNET
        </span>
      </div>

      {/* Scrollable feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 2,
          position: "relative",
        }}
      >
        {LORE_ENTRIES.map((entry) => {
          const catColor = CATEGORY_COLORS[entry.category] ?? CYAN;
          const dateStr = new Date(entry.timestamp).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric", year: "2-digit" },
          );
          return (
            <div
              key={entry.id}
              data-ocid={`lore.item.${entry.id}`}
              style={{
                background: "rgba(0,255,204,0.02)",
                border: "1px solid rgba(0,255,204,0.1)",
                borderLeft: `2px solid ${catColor}`,
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 7,
                    fontFamily: "var(--font-mono, monospace)",
                    color: catColor,
                    letterSpacing: 2,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {entry.category}
                </span>
                <span style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 7,
                    color: "rgba(224,244,255,0.3)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {dateStr}
                </span>
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "rgba(224,244,255,0.75)",
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {entry.content}
              </p>
            </div>
          );
        })}

        {/* Placeholder for future video content */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px dashed rgba(0,255,204,0.15)",
            borderRadius: 6,
            padding: "14px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "rgba(0,255,204,0.3)",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: 2,
            }}
          >
            VIDEO DISPATCHES · COMING SOON
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(224,244,255,0.2)",
              marginTop: 4,
            }}
          >
            Player-generated field reports will appear here
          </div>
        </div>
      </div>
    </div>
  );
}
