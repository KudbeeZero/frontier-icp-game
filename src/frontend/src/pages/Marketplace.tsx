import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { BIOME_TIER } from "../constants/minerals";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.45)";
const BORDER = "rgba(0,255,204,0.15)";
const BG = "#020509";
const GOLD = "#ffd700";
const TEXT = "#e0f4ff";

const WEAPON_COSTS: Record<string, number> = {
  "BALLISTIC ICBM": 300,
  "CRUISE MISSILE": 150,
  "EMP WARHEAD": 200,
  "MIRV STRIKE": 500,
  INTERCEPTOR: 80,
  "ORBITAL RAIL": 800,
};

const WEAPON_LIST = [
  {
    name: "BALLISTIC ICBM",
    abbr: "B",
    color: "#ef4444",
    desc: "Long-range nuclear strike",
  },
  {
    name: "CRUISE MISSILE",
    abbr: "C",
    color: "#f97316",
    desc: "Precision guided munition",
  },
  {
    name: "EMP WARHEAD",
    abbr: "E",
    color: "#3b82f6",
    desc: "Disables enemy electronics",
  },
  {
    name: "MIRV STRIKE",
    abbr: "M",
    color: "#a855f7",
    desc: "Multiple re-entry vehicle",
  },
  {
    name: "INTERCEPTOR",
    abbr: "I",
    color: "#22c55e",
    desc: "Anti-ballistic defense",
  },
  {
    name: "ORBITAL RAIL",
    abbr: "O",
    color: "#ffd700",
    desc: "Kinetic orbital strike",
  },
];

const PLOT_BASE_PRICE = 100;

function plotPrice(tier: number) {
  return PLOT_BASE_PRICE + tier * 50;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"plots" | "weapons">("plots");

  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const purchasePlot = useGameStore((s) => s.purchasePlot);
  const buyWeapon = useGameStore((s) => s.buyWeapon);

  const unownedPlots = plots.filter((p) => p.owner === null).slice(0, 20);
  const playerPrincipal = player.principal ?? "You";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG,
        color: TEXT,
        fontFamily: "monospace",
        overflowY: "auto",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "rgba(2,5,9,0.95)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          data-ocid="marketplace.back_button"
          onClick={() => navigate({ to: "/" })}
          style={{
            background: "rgba(0,255,204,0.07)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: CYAN,
            cursor: "pointer",
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 4,
            textShadow: `0 0 14px ${CYAN}`,
          }}
        >
          MARKETPLACE
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShoppingCart size={13} style={{ color: GOLD }} />
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>
            {player.frntBalance.toFixed(2)} FRNTR
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 16px",
          background: "rgba(2,5,9,0.8)",
        }}
      >
        {(["plots", "weapons"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid={`marketplace.${tab}.tab`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${CYAN}`
                  : "2px solid transparent",
              color: activeTab === tab ? CYAN : CYAN_DIM,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: "pointer",
              fontFamily: "monospace",
              transition: "color 0.2s",
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
        {activeTab === "plots" && (
          <>
            <p
              style={{
                fontSize: 9,
                color: CYAN_DIM,
                letterSpacing: 1,
                marginBottom: 16,
                lineHeight: 1.7,
              }}
            >
              {unownedPlots.length} unclaimed plots available. Purchase to start
              generating FRNTR and extracting minerals.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unownedPlots.map((plot, i) => {
                const tier = BIOME_TIER[plot.biome] ?? 1;
                const price = plotPrice(tier);
                const canAfford = player.frntBalance >= price;
                const isOwned =
                  plot.owner === playerPrincipal ||
                  player.plotsOwned.includes(plot.id);

                return (
                  <div
                    key={plot.id}
                    data-ocid={`marketplace.plots.item.${i + 1}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      background: "rgba(0,255,204,0.03)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{ fontSize: 11, fontWeight: 700, color: CYAN }}
                        >
                          PLOT #{plot.id}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "rgba(0,255,204,0.08)",
                            border: `1px solid ${BORDER}`,
                            color: CYAN_DIM,
                            letterSpacing: 0.5,
                          }}
                        >
                          {plot.biome.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "rgba(255,215,0,0.08)",
                            border: "1px solid rgba(255,215,0,0.3)",
                            color: GOLD,
                            letterSpacing: 0.5,
                          }}
                        >
                          T{tier}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 8,
                          color: "rgba(160,200,220,0.4)",
                          letterSpacing: 0.5,
                        }}
                      >
                        {plot.lat.toFixed(1)}°N · {plot.lng.toFixed(1)}°E
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}
                      >
                        {price} FRNTR
                      </span>
                      {isOwned ? (
                        <span
                          data-ocid={`marketplace.plots.purchased.${i + 1}`}
                          style={{
                            fontSize: 8,
                            padding: "4px 10px",
                            borderRadius: 4,
                            background: "rgba(34,197,94,0.1)",
                            border: "1px solid rgba(34,197,94,0.4)",
                            color: "#22c55e",
                            letterSpacing: 1,
                          }}
                        >
                          PURCHASED
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-ocid={`marketplace.plots.buy_button.${i + 1}`}
                          onClick={() => purchasePlot(plot.id)}
                          disabled={!canAfford}
                          style={{
                            padding: "4px 12px",
                            background: canAfford
                              ? "rgba(0,255,204,0.1)"
                              : "rgba(50,60,70,0.3)",
                            border: `1px solid ${canAfford ? "rgba(0,255,204,0.4)" : "rgba(80,100,120,0.3)"}`,
                            borderRadius: 4,
                            color: canAfford ? CYAN : "rgba(80,100,120,0.5)",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: 1,
                            cursor: canAfford ? "pointer" : "not-allowed",
                            fontFamily: "monospace",
                          }}
                        >
                          BUY
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "weapons" && (
          <>
            <p
              style={{
                fontSize: 9,
                color: CYAN_DIM,
                letterSpacing: 1,
                marginBottom: 16,
                lineHeight: 1.7,
              }}
            >
              Stock your arsenal. Weapons are consumed on launch. Interceptors
              defend your plots automatically.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {WEAPON_LIST.map((weapon, i) => {
                const cost = WEAPON_COSTS[weapon.name] ?? 0;
                const canAfford = player.frntBalance >= cost;
                const qty = player.weaponInventory?.[weapon.name] ?? 0;

                return (
                  <div
                    key={weapon.name}
                    data-ocid={`marketplace.weapons.item.${i + 1}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      background: `rgba(${weapon.color === "#ef4444" ? "239,68,68" : weapon.color === "#f97316" ? "249,115,22" : weapon.color === "#3b82f6" ? "59,130,246" : weapon.color === "#a855f7" ? "168,85,247" : weapon.color === "#22c55e" ? "34,197,94" : "255,215,0"},0.04)`,
                      border: `1px solid ${weapon.color}22`,
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: `${weapon.color}18`,
                        border: `1px solid ${weapon.color}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: weapon.color,
                        flexShrink: 0,
                      }}
                    >
                      {weapon.abbr}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: TEXT,
                          marginBottom: 2,
                        }}
                      >
                        {weapon.name}
                      </div>
                      <div
                        style={{ fontSize: 8, color: "rgba(160,200,220,0.5)" }}
                      >
                        {weapon.desc}
                      </div>
                      <div
                        style={{ fontSize: 8, color: CYAN_DIM, marginTop: 2 }}
                      >
                        IN STOCK:{" "}
                        <span style={{ color: CYAN, fontWeight: 700 }}>
                          {qty}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}
                      >
                        {cost} FRNTR
                      </span>
                      <button
                        type="button"
                        data-ocid={`marketplace.weapons.buy_button.${i + 1}`}
                        onClick={() => buyWeapon(weapon.name)}
                        disabled={!canAfford}
                        style={{
                          padding: "4px 12px",
                          background: canAfford
                            ? `${weapon.color}18`
                            : "rgba(50,60,70,0.3)",
                          border: `1px solid ${canAfford ? `${weapon.color}55` : "rgba(80,100,120,0.3)"}`,
                          borderRadius: 4,
                          color: canAfford
                            ? weapon.color
                            : "rgba(80,100,120,0.5)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 1,
                          cursor: canAfford ? "pointer" : "not-allowed",
                          fontFamily: "monospace",
                        }}
                      >
                        BUY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
