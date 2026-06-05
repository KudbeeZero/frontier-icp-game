import { useActor } from "@caffeineai/core-infrastructure";
import { Shield, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createActor } from "../backend";
import type { GeneratorTierInfo } from "../backend";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const CYAN_DIM = "rgba(0,255,204,0.35)";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";
const GOLD = "#ffd700";

const BIOME_COLOR: Record<string, string> = {
  Forest: "#22c55e",
  Desert: "#f59e0b",
  Ocean: "#3b82f6",
  Arctic: "#a5f3fc",
  Grassland: "#84cc16",
  Volcanic: "#ef4444",
  Mountain: "#94a3b8",
  Toxic: "#a3e635",
};

const RARITY_CONFIG = {
  EPIC: { label: "EPIC", color: GOLD, priceICP: "30.0" },
  RARE: { label: "RARE", color: "#3b82f6", priceICP: "9.0" },
  COMMON: { label: "COMMON", color: "#94a3b8", priceICP: "2.5" },
};

function getPlotRarity(plotId: number): keyof typeof RARITY_CONFIG {
  const id = BigInt(plotId);
  const v = (id * 6364136223846793005n + 1442695040888963407n) & 0xffffffffn;
  const pct = Number(v) / 0xffffffff;
  if (pct > 0.95) return "EPIC";
  if (pct > 0.8) return "RARE";
  return "COMMON";
}

const GENERATOR_TIERS_LABEL: Record<number, string> = {
  0: "NONE",
  1: "GEN-I",
  2: "GEN-II",
  3: "GEN-III",
  4: "GEN-IV",
  5: "GEN-V",
  6: "GEN-VI",
};

// Fallback values used until backend tiers load
const FALLBACK_TIER_PRODUCTION: Record<number, number> = {
  0: 7,
  1: 15,
  2: 31,
  3: 63,
  4: 127,
  5: 255,
  6: 511,
};
const FALLBACK_UPGRADE_COSTS: Record<number, number> = {
  1: 500,
  2: 1500,
  3: 4000,
  4: 10000,
  5: 25000,
  6: 60000,
};

export default function TacticalCommandPanel() {
  const selectedPlotId = useGameStore((s) => s.selectedPlotId);
  const plots = useGameStore((s) => s.plots);
  const player = useGameStore((s) => s.player);
  const generatorTiers = useGameStore((s) => s.generatorTiers);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const purchasePlot = useGameStore((s) => s.purchasePlot);
  const upgradeGenerator = useGameStore((s) => s.upgradeGenerator);
  const mineResources = useGameStore((s) => s.mineResources);
  const { actor } = useActor(createActor);
  const [backendTiers, setBackendTiers] = useState<GeneratorTierInfo[] | null>(
    null,
  );

  useEffect(() => {
    if (!actor) return;
    actor
      .getCoreGeneratorTiers()
      .then(setBackendTiers)
      .catch(() => {});
  }, [actor]);

  const tierProduction = useMemo(() => {
    if (!backendTiers) return FALLBACK_TIER_PRODUCTION;
    const map: Record<number, number> = { 0: 7 };
    for (const t of backendTiers) {
      map[Number(t.tierIndex)] = t.bonusPerDay;
    }
    return map;
  }, [backendTiers]);

  const upgradeCosts = useMemo(() => {
    if (!backendTiers) return FALLBACK_UPGRADE_COSTS;
    const map: Record<number, number> = {};
    for (const t of backendTiers) {
      map[Number(t.tierIndex)] = Number(t.costFRNTR);
    }
    return map;
  }, [backendTiers]);

  const plot = useMemo(
    () =>
      selectedPlotId !== null
        ? (plots.find((p) => p.id === selectedPlotId) ?? null)
        : null,
    [selectedPlotId, plots],
  );

  if (!plot) return null;

  const isOwned = player.plotsOwned.includes(plot.id);
  const isOwnedByPlayer = isOwned;
  const biomeColor = BIOME_COLOR[plot.biome] ?? "#3b82f6";
  const rarity = getPlotRarity(plot.id);
  const rarityCfg = RARITY_CONFIG[rarity];
  const genTier = generatorTiers[plot.id] ?? 0;
  const production = tierProduction[genTier] ?? 7;
  const nextTierCost = genTier < 6 ? (upgradeCosts[genTier + 1] ?? null) : null;
  const canUpgrade =
    nextTierCost !== null && player.frntBalance >= nextTierCost;
  const effPct = Math.max(0, Math.min(100, plot.efficiency));
  const effColor =
    effPct >= 70 ? "#22c55e" : effPct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      data-ocid="tactical.panel"
      style={{
        position: "fixed",
        bottom: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        width: "min(420px, calc(100vw - 32px))",
        background: "rgba(2,10,22,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow:
          "0 4px 32px rgba(0,255,204,0.08), inset 0 1px 0 rgba(0,255,204,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: biomeColor,
              boxShadow: `0 0 8px ${biomeColor}`,
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 2,
            }}
          >
            TACTICAL COMMAND
          </span>
        </div>
        <button
          type="button"
          data-ocid="tactical.close_button"
          onClick={() => selectPlot(null)}
          style={{
            background: "none",
            border: "none",
            color: CYAN_DIM,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Plot identity row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 1.5,
            background: `${rarityCfg.color}22`,
            border: `1px solid ${rarityCfg.color}66`,
            color: rarityCfg.color,
          }}
        >
          {rarityCfg.label}
        </div>
        <span
          style={{
            fontSize: 10,
            color: TEXT,
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        >
          PLOT #{plot.id}
        </span>
        <span style={{ fontSize: 8, color: TEXT_DIM }}>
          · {plot.biome.toUpperCase()}
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 8, color: TEXT_DIM }}>OWNER:</span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: isOwnedByPlayer ? CYAN : TEXT_DIM,
            }}
          >
            {isOwnedByPlayer
              ? "YOU"
              : plot.owner
                ? `${plot.owner.slice(0, 8)}…`
                : "UNCLAIMED"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {/* Efficiency */}
        <div
          style={{
            background: "rgba(0,10,20,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: TEXT_DIM,
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          >
            EFFICIENCY
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: effColor,
              fontFamily: "monospace",
            }}
          >
            {effPct}%
          </div>
          <div
            style={{
              height: 3,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              marginTop: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${effPct}%`,
                background: effColor,
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* Generator */}
        <div
          style={{
            background: "rgba(0,10,20,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: TEXT_DIM,
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          >
            GENERATOR
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: CYAN,
              fontFamily: "monospace",
            }}
          >
            {GENERATOR_TIERS_LABEL[genTier]}
          </div>
          <div style={{ fontSize: 8, color: CYAN_DIM, marginTop: 2 }}>
            {production} F/DAY
          </div>
        </div>

        {/* Defense */}
        <div
          style={{
            background: "rgba(0,10,20,0.5)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: TEXT_DIM,
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          >
            DEFENSE
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 2,
            }}
          >
            <Shield size={10} color="#22c55e" />
            <span
              style={{ fontSize: 9, color: "#22c55e", fontFamily: "monospace" }}
            >
              {plot.defenses.shields}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Zap size={10} color="#ef4444" />
            <span
              style={{ fontSize: 9, color: "#ef4444", fontFamily: "monospace" }}
            >
              {plot.defenses.turrets}
            </span>
          </div>
        </div>
      </div>

      {/* Purchase price for unowned */}
      {!isOwnedByPlayer && (
        <div
          style={{
            background: `${rarityCfg.color}12`,
            border: `1px solid ${rarityCfg.color}44`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 7,
                color: TEXT_DIM,
                letterSpacing: 1.5,
                marginBottom: 2,
              }}
            >
              PURCHASE PRICE
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: rarityCfg.color,
                fontFamily: "monospace",
              }}
            >
              {rarityCfg.priceICP} ICP
            </div>
          </div>
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 8,
              background: `${rarityCfg.color}22`,
              border: `1px solid ${rarityCfg.color}66`,
              color: rarityCfg.color,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {rarityCfg.label}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {!isOwnedByPlayer ? (
          <button
            type="button"
            data-ocid="tactical.colonize_button"
            onClick={() => purchasePlot(plot.id)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              background:
                "linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,255,204,0.08))",
              border: `2px solid ${CYAN}`,
              color: CYAN,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2,
              cursor: "pointer",
              boxShadow: `0 0 16px ${CYAN}33`,
            }}
          >
            ⊕ PURCHASE PLOT
          </button>
        ) : (
          <>
            <button
              type="button"
              data-ocid="tactical.mine_button"
              onClick={() => mineResources(plot.id)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                background: "rgba(0,255,204,0.08)",
                border: `1px solid ${BORDER}`,
                color: CYAN,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
              }}
            >
              ⛏ MINE
            </button>
            {genTier < 6 && nextTierCost && (
              <button
                type="button"
                data-ocid="tactical.upgrade_button"
                onClick={() => upgradeGenerator(plot.id)}
                disabled={!canUpgrade}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  background: canUpgrade
                    ? `${GOLD}18`
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${canUpgrade ? `${GOLD}66` : BORDER}`,
                  color: canUpgrade ? GOLD : TEXT_DIM,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  cursor: canUpgrade ? "pointer" : "not-allowed",
                  opacity: canUpgrade ? 1 : 0.5,
                }}
              >
                ↑ UPGRADE
                <div
                  style={{
                    fontSize: 7,
                    color: canUpgrade ? GOLD : TEXT_DIM,
                    marginTop: 2,
                  }}
                >
                  {nextTierCost.toLocaleString()} F
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
