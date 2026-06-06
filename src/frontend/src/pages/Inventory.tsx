import { useState } from "react";
import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier } from "../store/gameStore";

const CYAN = "#00ffcc";
const GOLD = "#ffd700";
const AMBER = "#f59e0b";
const PURPLE = "#a855f7";
const BORDER = "rgba(0,255,204,0.18)";
const PANEL = "rgba(0,20,40,0.70)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

// Daily production by generator tier
const TIER_DAILY: Record<GeneratorTier, number> = {
  0: 7,
  1: 10,
  2: 15,
  3: 22,
  4: 32,
  5: 45,
  6: 45, // tier 6 same cap as 5 for display
};

const TIER_LABELS: Record<GeneratorTier, string> = {
  0: "NONE",
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
};

const BIOME_DOT: Record<string, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

const BIOME_DRIP: Record<string, [number, number, number, number]> = {
  Desert: [0.0008, 0.0025, 0.0003, 0.0001],
  Arctic: [0.0005, 0.0003, 0.0022, 0.0008],
  Ocean: [0.001, 0.001, 0.0008, 0.0004],
  Mountain: [0.0025, 0.0005, 0.0008, 0.0003],
  Volcanic: [0.001, 0.0015, 0.0005, 0.0017],
  Forest: [0.0015, 0.0012, 0.001, 0.0003],
  Grassland: [0.0018, 0.0015, 0.0005, 0.0003],
  Toxic: [0.0005, 0.0008, 0.0008, 0.002],
  Jungle: [0.0025, 0.0008, 0.0005, 0.0002],
};

function shortH3(plotId: number | string): string {
  return String(plotId).padStart(8, "0").toUpperCase();
}

function effColor(eff: number): string {
  if (eff >= 85) return "#22c55e";
  if (eff >= 70) return AMBER;
  return "#ef4444";
}

// Live FRNTR counter
function FRNTRCounter() {
  const player = useGameStore((s) => s.player);
  const frntrBalance = useGameStore(
    (s) => s.confirmedFrntBalance + s.accruedFrntSinceSync,
  );
  const plotCount = player.plotsOwned.length;
  const fmtFrntr = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    });

  return (
    <div
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
          marginBottom: 8,
        }}
      >
        TOTAL FRNTR EARNED
      </div>
      <div
        data-ocid="inventory.frntr_counter"
        style={{
          fontSize: 26,
          fontWeight: 900,
          fontFamily: "monospace",
          color: GOLD,
          textShadow: `0 0 16px ${GOLD}44`,
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        {fmtFrntr(frntrBalance)}
      </div>
      <div style={{ fontSize: 8, color: TEXT_DIM, marginTop: 3 }}>
        FRNTR &nbsp;&middot;&nbsp; {plotCount} PLOT{plotCount !== 1 ? "S" : ""}{" "}
        ACTIVE
      </div>
    </div>
  );
}

// Resource stockpiles
function ResourceStockpiles() {
  const player = useGameStore((s) => s.player);
  const storageCap = player.resourceStorageCap ?? 200;
  const resources = [
    { label: "IRON", val: player.iron, color: "#94a3b8", icon: "⚙️" },
    { label: "FUEL", val: player.fuel, color: AMBER, icon: "⛽" },
    { label: "CRYSTAL", val: player.crystal, color: CYAN, icon: "💎" },
    { label: "RARE EARTH", val: player.rareEarth, color: PURPLE, icon: "🔮" },
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
        }}
      >
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
                  /{storageCap}
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

// Plot card
function PlotCard({ plotId, index }: { plotId: string; index: number }) {
  const plot = useGameStore((s) =>
    s.plots.find((p) => String(p.id) === plotId),
  );
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const upgradeGenerator = useGameStore((s) => s.upgradeGenerator);
  const mineResources = useGameStore((s) => s.mineResources);
  const player = useGameStore((s) => s.player);
  const [mineFlash, setMineFlash] = useState<string | null>(null);

  if (!plot) return null;

  const tier = (generatorTiers[plotId] ?? 0) as GeneratorTier;
  const tierLabel = TIER_LABELS[tier];
  const dailyRate = TIER_DAILY[tier];
  const biomeColor = BIOME_DOT[plot.biome] ?? CYAN;
  const h3Short = shortH3(String(plotId));
  const drip = BIOME_DRIP[plot.biome] ?? [0.001, 0.001, 0.001, 0.001];
  const effFactor = plot.efficiency / 100;
  const ironPerDay = (drip[0] * 86400 * effFactor).toFixed(2);
  const fuelPerDay = (drip[1] * 86400 * effFactor).toFixed(2);
  const crystalPerDay = (drip[2] * 86400 * effFactor).toFixed(2);
  const rarePerDay = (drip[3] * 86400 * effFactor).toFixed(2);
  const upgradeCosts = [500, 1500, 4000, 8000, 15000];
  const upgradeCost = tier < 5 ? upgradeCosts[tier] : null;
  const canUpgrade = upgradeCost !== null && player.frntBalance >= upgradeCost;
  const isLoggedIn = !!player.principal;
  const eff = plot.efficiency;

  const handleMine = () => {
    const yields = mineResources(Number(plotId));
    if (yields) {
      const total = Object.values(yields).reduce((a, b) => a + b, 0);
      setMineFlash(`+${total.toFixed(4)}`);
      setTimeout(() => setMineFlash(null), 1800);
    }
  };

  return (
    <div
      data-ocid={`inventory.item.${index}`}
      style={{
        background: "rgba(0,20,40,0.55)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "12px 14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {tier > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${(tier / 6) * 100}%`,
            height: 2,
            background: `linear-gradient(90deg, ${CYAN}, ${GOLD})`,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: biomeColor,
            flexShrink: 0,
            boxShadow: `0 0 5px ${biomeColor}88`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TEXT,
              fontFamily: "monospace",
              letterSpacing: 0.5,
            }}
          >
            {h3Short}
          </div>
          <div style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 0.5 }}>
            {plot.biome}
          </div>
        </div>
        <div
          style={{
            padding: "3px 8px",
            background:
              tier > 0 ? "rgba(0,255,204,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${tier > 0 ? BORDER : "rgba(255,255,255,0.08)"}`,
            borderRadius: 4,
            fontSize: 8,
            fontWeight: 700,
            color: tier > 0 ? CYAN : TEXT_DIM,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          GEN {tierLabel}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 3,
          }}
        >
          <span style={{ fontSize: 8, color: TEXT_DIM, letterSpacing: 1 }}>
            EFFICIENCY
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: effColor(eff),
              fontFamily: "monospace",
            }}
          >
            {eff}%
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${eff}%`,
              background: effColor(eff),
              borderRadius: 2,
              transition: "width 0.4s ease",
              boxShadow: `0 0 4px ${effColor(eff)}88`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginBottom: 10,
          padding: "8px 10px",
          background: "rgba(0,255,204,0.03)",
          border: "1px solid rgba(0,255,204,0.07)",
          borderRadius: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 8, color: TEXT_DIM }}>FRNTR/DAY</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: GOLD,
              fontFamily: "monospace",
            }}
          >
            {dailyRate.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: TEXT_DIM }}>IRON/DAY</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              fontFamily: "monospace",
            }}
          >
            {ironPerDay}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: TEXT_DIM }}>FUEL/DAY</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: AMBER,
              fontFamily: "monospace",
            }}
          >
            {fuelPerDay}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: TEXT_DIM }}>CRYSTAL/DAY</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: CYAN,
              fontFamily: "monospace",
            }}
          >
            {crystalPerDay}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: TEXT_DIM }}>RARE/DAY</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: PURPLE,
              fontFamily: "monospace",
            }}
          >
            {rarePerDay}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          data-ocid={`inventory.mine_button.${index}`}
          onClick={handleMine}
          disabled={!isLoggedIn}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "rgba(0,255,204,0.08)",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: isLoggedIn ? CYAN : TEXT_DIM,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: isLoggedIn ? "pointer" : "not-allowed",
            opacity: isLoggedIn ? 1 : 0.45,
            textTransform: "uppercase",
          }}
        >
          {mineFlash ? (
            <span style={{ color: GOLD, fontSize: 9 }}>{mineFlash}</span>
          ) : (
            "MINE"
          )}
        </button>
        {upgradeCost !== null && (
          <button
            type="button"
            data-ocid={`inventory.upgrade_button.${index}`}
            onClick={() => upgradeGenerator(String(plotId))}
            disabled={!isLoggedIn || !canUpgrade}
            style={{
              flex: 1,
              padding: "8px 0",
              background:
                canUpgrade && isLoggedIn
                  ? "rgba(255,215,0,0.08)"
                  : "rgba(255,255,255,0.03)",
              border: `1px solid ${canUpgrade && isLoggedIn ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 6,
              color: canUpgrade && isLoggedIn ? GOLD : TEXT_DIM,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: canUpgrade && isLoggedIn ? "pointer" : "not-allowed",
              opacity: canUpgrade && isLoggedIn ? 1 : 0.45,
              textTransform: "uppercase",
            }}
          >
            UPGRADE
            <br />
            <span style={{ fontSize: 7, fontWeight: 400 }}>
              {upgradeCost.toLocaleString()} FRNTR
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Inventory() {
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);

  return (
    <div
      data-ocid="inventory.page"
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "12px 12px 4px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <FRNTRCounter />
      <ResourceStockpiles />
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
          justifyContent: "space-between",
        }}
      >
        <span>OWNED PLOTS</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: TEXT,
            fontFamily: "monospace",
          }}
        >
          {plotsOwned.length}
        </span>
      </div>
      {plotsOwned.length === 0 ? (
        <div
          data-ocid="inventory.empty_state"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            textAlign: "center",
            color: TEXT_DIM,
            gap: 10,
          }}
        >
          <div style={{ fontSize: 32 }}>🌍</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: 1.5,
            }}
          >
            NO PLOTS OWNED YET
          </div>
          <div
            style={{
              fontSize: 9,
              color: TEXT_DIM,
              lineHeight: 1.6,
              maxWidth: 260,
            }}
          >
            Purchase your first plot on the globe to start earning FRNTR tokens
            and resources passively.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingBottom: 12,
          }}
        >
          {plotsOwned.map((plotId, idx) => (
            <PlotCard key={plotId} plotId={plotId} index={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
