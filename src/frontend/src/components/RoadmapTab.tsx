import type React from "react";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const GOLD = "#ffd700";

const CURRENT_YEAR = new Date().getFullYear();

type PhaseStatus = "live" | "in-progress" | "coming-soon" | "future";

interface Phase {
  id: string;
  label: string;
  title: string;
  status: PhaseStatus;
  eta: string;
  items: string[];
}

const PHASES: Phase[] = [
  {
    id: "phase1",
    label: "PHASE 1",
    title: "Land Rush",
    status: "live",
    eta: `${CURRENT_YEAR} — LIVE NOW`,
    items: [
      "10,242 hex plot grid — geodesic frequency 32",
      "Plot purchase with real ICP via Internet Identity",
      "FRNTR passive generation (7–55 FRNTR/day)",
      "6-tier generator upgrade system",
      "Paid survey reports with time-based unlock",
      "Global leaderboard (top FRNTR holders)",
      "25/25/50 treasury split (dev/leaderboard/liquidity)",
      "ICRC-1 FRNTR token on Internet Computer",
    ],
  },
  {
    id: "phase2",
    label: "PHASE 2",
    title: "Sub-Parcels & Resources",
    status: "in-progress",
    eta: `${CURRENT_YEAR + 1} Q1`,
    items: [
      "7 sub-parcel system per hex plot",
      "Resource mining — Iron, Fuel, Crystal, Rare Earth",
      "Asteroid Impact zones with exotic particle drops",
      "Resource ICRC-1 tokens tradeable on ICPSwap",
      "Per-sub-parcel cooldown and building placement",
      "Live resource accumulation counters",
    ],
  },
  {
    id: "phase3",
    label: "PHASE 3",
    title: "Commander NFTs & Factions",
    status: "coming-soon",
    eta: `${CURRENT_YEAR + 1} Q2`,
    items: [
      "Commander NFTs — ICRC-7 standard",
      "Faction system — 4 global factions",
      "Commander stat boosts per plot tier",
      "Faction territories and diplomacy events",
      "Faction treasury and shared resource pools",
    ],
  },
  {
    id: "phase4",
    label: "PHASE 4",
    title: "Weapons & Combat",
    status: "future",
    eta: `${CURRENT_YEAR + 1} Q3–Q4`,
    items: [
      "Missile and defense weapon systems",
      "Plot-to-plot attack and defense mechanics",
      "Battle outcomes recorded fully on-chain",
      "Territory conquest and resource raiding",
      "Combat leaderboard with ICP prize pools",
    ],
  },
  {
    id: "phase5",
    label: "PHASE 5",
    title: "Marketplace & DEX",
    status: "future",
    eta: `${CURRENT_YEAR + 2}`,
    items: [
      "Peer-to-peer plot marketplace",
      "FRNTR/ICP pool seeded on ICPSwap",
      "Commander NFT trading",
      "Resource token trading pairs",
      "Cross-canister atomic swaps",
    ],
  },
];

const MAINNET_CHECKLIST = [
  { item: "Internet Identity authentication", done: true },
  { item: "Plot purchase with real ICP", done: true },
  { item: "FRNTR ICRC-1 token deployed", done: true },
  { item: "Stable memory — data survives upgrades", done: true },
  { item: "Treasury 25/25/50 split wired", done: true },
  { item: "Live ICP/USD price feed", done: true },
  { item: "Globe with biome-accurate hex tiles", done: true },
  { item: "6-tier generator upgrade system", done: true },
  { item: "Leaderboard (on-chain, username-gated)", done: true },
  { item: "Admin panel with mint/reset controls", done: true },
  { item: "Paid survey reports with timer unlock", done: false },
  { item: "Real admin principal set for mainnet", done: false },
  { item: "ICPSwap FRNTR/ICP pool seeded", done: false },
  { item: "Full mobile optimization", done: false },
  { item: "Security audit completed", done: false },
];

const STATUS_CONFIG: Record<
  PhaseStatus,
  { label: string; color: string; bg: string }
> = {
  live: { label: "LIVE", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "in-progress": { label: "IN DEV", color: GOLD, bg: "rgba(255,215,0,0.10)" },
  "coming-soon": {
    label: "COMING SOON",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.10)",
  },
  future: { label: "PLANNED", color: TEXT_DIM, bg: "rgba(255,255,255,0.04)" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 3,
        color: CYAN,
        textTransform: "uppercase",
        marginBottom: 12,
        textShadow: `0 0 8px ${CYAN}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{ width: 2, height: 12, background: CYAN, borderRadius: 1 }}
      />
      {children}
    </div>
  );
}

export default function RoadmapTab() {
  return (
    <div
      data-ocid="roadmap.panel"
      style={{
        padding: "14px 14px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── WHAT IS THIS? ── */}
      <div
        style={{
          background: "rgba(0,20,40,0.65)",
          border: `1px solid ${BORDER}`,
          borderTop: `2px solid ${CYAN}`,
          borderRadius: 10,
          padding: "14px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* scanlines */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 3,
              color: CYAN,
              marginBottom: 8,
              textShadow: `0 0 8px ${CYAN}`,
            }}
          >
            MISSION BRIEF
          </div>
          <p
            style={{
              fontSize: 11,
              color: TEXT,
              lineHeight: 1.75,
              margin: 0,
              fontWeight: 600,
            }}
          >
            Frontier: Missile Horizon is a fully decentralized planetary warfare
            strategy game built on the{" "}
            <span style={{ color: CYAN }}>
              Internet Computer Protocol (ICP)
            </span>
            .
          </p>
          <p
            style={{
              fontSize: 10,
              color: TEXT_DIM,
              lineHeight: 1.7,
              margin: "10px 0 0",
            }}
          >
            Own land as an NFT plot. Earn FRNTR tokens passively. Upgrade your
            generators. Every action is fully on-chain — no servers, no
            databases, no middlemen. Your plots are ICRC-7 NFTs tied to your
            Internet Identity. No one can take them.
          </p>
        </div>
      </div>

      {/* ── SECURITY ── */}
      <section>
        <SectionTitle>Security Architecture</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              icon: "🔐",
              title: "Internet Identity",
              desc: "Login via cryptographic key pairs — no passwords, no emails. Your principal ID is your identity.",
            },
            {
              icon: "⛓️",
              title: "Fully On-Chain",
              desc: "All game logic, token balances, plot ownership, and treasury math execute inside Motoko canisters on ICP. Zero off-chain servers.",
            },
            {
              icon: "🏛️",
              title: "Atomic Transactions",
              desc: "Plot purchases verify ICP transfer before assigning ownership. If any step fails, nothing changes. No partial states.",
            },
            {
              icon: "🔒",
              title: "Locked Liquidity",
              desc: "The liquidity pot can only release to a pre-approved ICPSwap canister. Admin cannot redirect funds elsewhere.",
            },
            {
              icon: "📦",
              title: "Stable Memory",
              desc: "All player data, plot ownership, and token balances survive canister upgrades. Builds deploy without wiping state.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "rgba(0,255,204,0.03)",
                border: `1px solid ${BORDER}`,
                borderLeft: `2px solid ${CYAN}`,
                borderRadius: 6,
                padding: "10px 12px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                {item.icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: TEXT,
                    marginBottom: 3,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── GETTING STARTED ── */}
      <section>
        <SectionTitle>Getting Started</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              step: "1",
              color: CYAN,
              title: "Connect Wallet",
              desc: "Click CONNECT WALLET and authenticate with Internet Identity. Your principal ID is your game account.",
            },
            {
              step: "2",
              color: GOLD,
              title: "Get Test Tokens",
              desc: "Use the TESTNET FAUCET button (upper right) to claim 5,000 FRNTR + 5 ICP. Free, unlimited on testnet.",
            },
            {
              step: "3",
              color: "#22c55e",
              title: "Buy a Plot",
              desc: "Tap any hex on the globe. Click PURCHASE. Common plots start at 2–3 ICP. Rare plots: 6–12 ICP. Epic: 20–40 ICP.",
            },
            {
              step: "4",
              color: "#a78bfa",
              title: "Upgrade & Earn",
              desc: "Open the MAP tab, select your plot, and upgrade your generator. Higher tiers generate more FRNTR/day. Claim in CMD.",
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: "rgba(0,10,20,0.5)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: `${item.color}18`,
                  border: `1px solid ${item.color}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.step}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: TEXT,
                    marginBottom: 3,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TREASURY MECHANICS ── */}
      <section>
        <SectionTitle>How the Treasury Works</SectionTitle>
        <div
          style={{
            background: "rgba(0,20,40,0.55)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "14px",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: TEXT_DIM,
              lineHeight: 1.7,
              margin: "0 0 12px",
            }}
          >
            Every ICP spent purchasing a plot is automatically split into three
            pots via the Treasury Canister:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                pct: "25%",
                label: "Developer Treasury",
                color: "rgba(255,200,100,0.8)",
                desc: "Funds ongoing game development, server costs, and team operations.",
              },
              {
                pct: "25%",
                label: "Leaderboard Prize Pool",
                color: "rgba(100,220,230,0.8)",
                desc: "Paid out to top FRNTR holders every 1,500 plot mints. Automated, on-chain.",
              },
              {
                pct: "50%",
                label: "Liquidity Reserve",
                color: CYAN,
                desc: "Seeds the FRNTR/ICP trading pool on ICPSwap. Locked — can only release to the pre-approved DEX canister.",
              },
            ].map((pot) => (
              <div
                key={pot.label}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: `${pot.color}18`,
                    border: `2px solid ${pot.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 900,
                    color: pot.color,
                    flexShrink: 0,
                    fontFamily: "monospace",
                  }}
                >
                  {pot.pct}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT,
                      marginBottom: 2,
                    }}
                  >
                    {pot.label}
                  </div>
                  <div
                    style={{ fontSize: 9, color: TEXT_DIM, lineHeight: 1.5 }}
                  >
                    {pot.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAINNET CHECKLIST ── */}
      <section>
        <SectionTitle>Mainnet Launch Status</SectionTitle>
        <div
          style={{
            background: "rgba(0,10,20,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MAINNET_CHECKLIST.map((item, idx) => (
              <div
                key={item.item}
                data-ocid={`roadmap.checklist.${idx + 1}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 5,
                  background: item.done
                    ? "rgba(34,197,94,0.05)"
                    : "transparent",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: item.done
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(255,255,255,0.06)",
                    border: `1px solid ${item.done ? "#22c55e" : "rgba(255,255,255,0.15)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 7,
                    color: item.done ? "#22c55e" : "transparent",
                  }}
                >
                  ✓
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: item.done ? TEXT : TEXT_DIM,
                    letterSpacing: 0.3,
                    textDecoration: item.done ? "none" : "none",
                    fontWeight: item.done ? 600 : 400,
                  }}
                >
                  {item.item}
                </span>
                {!item.done && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 7,
                      color: "rgba(245,158,11,0.7)",
                      letterSpacing: 1,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    PENDING
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 8, color: TEXT_DIM }}>
              {MAINNET_CHECKLIST.filter((c) => c.done).length} of{" "}
              {MAINNET_CHECKLIST.length} complete
            </span>
            <div
              style={{
                height: 6,
                width: 120,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(MAINNET_CHECKLIST.filter((c) => c.done).length / MAINNET_CHECKLIST.length) * 100}%`,
                  background: `linear-gradient(90deg, ${CYAN}, #22c55e)`,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section>
        <SectionTitle>Development Roadmap</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PHASES.map((phase) => {
            const cfg = STATUS_CONFIG[phase.status];
            return (
              <div
                key={phase.id}
                data-ocid={`roadmap.phase.${phase.id}`}
                style={{
                  background: "rgba(0,10,20,0.5)",
                  border: `1px solid ${BORDER}`,
                  borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: 8,
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: 2,
                      color: CYAN,
                      fontFamily: "monospace",
                    }}
                  >
                    {phase.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: TEXT,
                      letterSpacing: 0.5,
                    }}
                  >
                    {phase.title}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: cfg.color,
                      background: cfg.bg,
                      border: `1px solid ${cfg.color}44`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontFamily: "monospace",
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(224,244,255,0.3)",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                    fontFamily: "monospace",
                  }}
                >
                  {phase.eta}
                </div>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {phase.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        fontSize: 9,
                        color: phase.status === "live" ? TEXT : TEXT_DIM,
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          color:
                            phase.status === "live" ? "#22c55e" : cfg.color,
                          flexShrink: 0,
                          marginTop: 2,
                          fontSize: 8,
                        }}
                      >
                        {phase.status === "live" ? "✓" : "◦"}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── EXPANSION HORIZON ── */}
      <section>
        <SectionTitle>Expansion Horizon</SectionTitle>
        <div
          style={{
            background: "rgba(0,20,40,0.55)",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "14px",
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: TEXT_DIM,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Long-term, Frontier: Missile Horizon is designed to expand into a
            full civilization-layer on ICP. Planned features beyond Phase 5:
          </p>
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {[
              "Nation-state governance",
              "Cross-canister economies",
              "Player-run factions with DAOs",
              "Orbital satellite plots",
              "Seasonal war events",
              "On-chain player content",
              "Mobile companion app",
              "ICP subnet scaling",
            ].map((item) => (
              <div
                key={item}
                style={{
                  background: "rgba(0,255,204,0.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 5,
                  padding: "6px 8px",
                  fontSize: 9,
                  color: TEXT_DIM,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ color: "rgba(0,255,204,0.3)", fontSize: 7 }}>
                  ◆
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div
        style={{
          textAlign: "center",
          fontSize: 8,
          color: "rgba(0,255,204,0.25)",
          letterSpacing: 1,
          paddingTop: 4,
        }}
      >
        FRONTIER: MISSILE HORIZON · BUILT ON ICP · CAFFEINE.AI
      </div>
    </div>
  );
}
