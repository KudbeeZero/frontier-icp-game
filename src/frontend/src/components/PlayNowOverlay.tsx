import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.55)";
const GOLD = "#ffd700";

const PHASES = [
  {
    version: "v1.0",
    label: "Land Ownership & FRNTR",
    desc: "Purchase land on Earth, accumulate FRNTR tokens, upgrade your generator",
    active: true,
  },
  {
    version: "v2.0",
    label: "Combat & Alliances",
    desc: "Missile systems, battle engine, faction alliances, and defensive structures",
    active: false,
  },
  {
    version: "v3.0",
    label: "Resource Economy",
    desc: "Iron, Fuel, Crystal, Rare Earth trading on DEX via ICRC-1 resource tokens",
    active: false,
  },
  {
    version: "v4.0",
    label: "Commander NFTs",
    desc: "Mint unique commander avatars that boost your plot's ATK/DEF stats on-chain",
    active: false,
  },
];

interface Props {
  onClose: () => void;
  onLogin: () => void;
}

export default function PlayNowOverlay({ onClose, onLogin }: Props) {
  const [icpExpanded, setIcpExpanded] = useState(false);
  const player = useGameStore((s) => s.player);
  const setAuth = useGameStore((s) => s.setAuth);
  const { login, isAuthenticated, identity } = useInternetIdentity();

  const isLoggedIn = isAuthenticated || !!player.principal;

  // When II login completes, sync principal and close overlay
  useEffect(() => {
    if (isAuthenticated && identity) {
      const principal = identity.getPrincipal().toText();
      setAuth(principal);
      useGameStore.setState((s) => ({
        player: { ...s.player, principal },
      }));
      onLogin();
    }
  }, [isAuthenticated, identity, setAuth, onLogin]);

  const handleLogin = () => {
    if (isAuthenticated) {
      onClose();
    } else {
      login();
    }
  };

  return (
    <div
      data-ocid="playnow.panel"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(1,5,12,0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        overflow: "auto",
        padding: "20px 16px 40px",
      }}
    >
      {/* Scanline */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,204,0.012) 2px, rgba(0,255,204,0.012) 4px)",
        }}
      />

      {/* Globe bg decoration */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: "1px solid rgba(0,255,204,0.06)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: "1px solid rgba(0,255,204,0.03)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 480,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 20,
            marginBottom: 14,
            border: `1px solid ${CYAN}44`,
            fontSize: 8,
            letterSpacing: 3,
            color: CYAN,
            background: "rgba(0,255,204,0.07)",
            textTransform: "uppercase" as const,
            textShadow: `0 0 8px ${CYAN}`,
          }}
        >
          v1.0 NOW LIVE ON ICP
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: CYAN,
            letterSpacing: 4,
            textTransform: "uppercase",
            textShadow: `0 0 30px ${CYAN}, 0 0 60px ${CYAN}44`,
            lineHeight: 1.1,
            marginBottom: 8,
          }}
        >
          FRONTIER:
          <br />
          <span style={{ color: TEXT }}>MISSILE HORIZON</span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 11,
            color: TEXT_DIM,
            marginBottom: 20,
            lineHeight: 1.7,
          }}
        >
          The first fully on-chain planetary warfare strategy game on the
          Internet Computer Protocol. Own land on Earth as an NFT plot,
          accumulate FRNTR tokens, and prepare for interstellar domination.
        </p>

        {/* Mission briefing */}
        <div
          style={{
            background: "rgba(0,20,40,0.55)",
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${CYAN}`,
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: CYAN,
              letterSpacing: 3,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            MISSION BRIEFING
          </div>
          <p
            style={{
              fontSize: 10,
              color: TEXT_DIM,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            The Internet Computer has mapped Earth into{" "}
            <span style={{ color: CYAN }}>5,882 hex plots</span>. Each plot is a
            sovereign NFT — yours to own, mine, upgrade, and defend. FRNTR is
            the lifeblood of Frontier:
            <span style={{ color: GOLD }}> 10 billion tokens</span>, 5B
            pre-minted and 5B mineable only by landowners over 3–5 years. No
            central server. No middleman. Fully on-chain, forever.
          </p>
        </div>

        {/* Phase roadmap */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 8,
              color: TEXT_DIM,
              letterSpacing: 2,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Phased Rollout
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PHASES.map((phase) => (
              <div
                key={phase.version}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: phase.active
                    ? "rgba(0,255,204,0.07)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${phase.active ? `${CYAN}44` : BORDER}`,
                }}
              >
                <div
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    background: phase.active
                      ? "rgba(0,255,204,0.2)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${phase.active ? CYAN : BORDER}`,
                    color: phase.active ? CYAN : TEXT_DIM,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {phase.version}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: phase.active ? TEXT : TEXT_DIM,
                      marginBottom: 2,
                    }}
                  >
                    {phase.label}
                    {phase.active && (
                      <span style={{ marginLeft: 6, fontSize: 7, color: CYAN }}>
                        ● LIVE
                      </span>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 8, color: TEXT_DIM, lineHeight: 1.5 }}
                  >
                    {phase.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {isLoggedIn ? (
          <button
            type="button"
            data-ocid="playnow.primary_button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(0,255,204,0.25), rgba(0,255,204,0.12))",
              border: `2px solid ${CYAN}`,
              color: CYAN,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              cursor: "pointer",
              marginBottom: 12,
              textTransform: "uppercase",
              boxShadow: `0 0 24px ${CYAN}44`,
              textShadow: `0 0 10px ${CYAN}`,
            }}
          >
            ENTER THE FRONTIER →
          </button>
        ) : (
          <button
            type="button"
            data-ocid="playnow.primary_button"
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              background:
                "linear-gradient(135deg, rgba(0,255,204,0.25), rgba(0,255,204,0.12))",
              border: `2px solid ${CYAN}`,
              color: CYAN,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              cursor: "pointer",
              marginBottom: 12,
              textTransform: "uppercase",
              boxShadow: `0 0 24px ${CYAN}44`,
              textShadow: `0 0 10px ${CYAN}`,
            }}
          >
            CONNECT WITH INTERNET IDENTITY
          </button>
        )}

        <button
          type="button"
          data-ocid="playnow.secondary_button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: TEXT_DIM,
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          Explore Globe First
        </button>

        {/* ICP Explainer */}
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            data-ocid="playnow.toggle"
            onClick={() => setIcpExpanded((v) => !v)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(0,20,40,0.4)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: CYAN,
                letterSpacing: 2,
              }}
            >
              WHAT IS ICP?
            </span>
            {icpExpanded ? (
              <ChevronUp size={14} color={CYAN} />
            ) : (
              <ChevronDown size={14} color={CYAN_DIM} />
            )}
          </button>
          {icpExpanded && (
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(0,10,20,0.5)",
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: TEXT_DIM,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                The{" "}
                <span style={{ color: CYAN }}>
                  Internet Computer Protocol (ICP)
                </span>{" "}
                is a decentralized blockchain that runs at web speed. Unlike
                traditional blockchains, ICP hosts entire applications on-chain
                — no AWS, no Google Cloud. Every smart contract (called a
                canister) is permanently on the network. Frontier uses ICP so
                that your land, your tokens, and your game data are owned by
                you, stored on the blockchain, and cannot be taken down by any
                company or government.
              </p>
              <a
                href="https://internetcomputer.org"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 10,
                  fontSize: 9,
                  color: CYAN,
                  textDecoration: "none",
                }}
              >
                LEARN MORE <ChevronRight size={10} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
