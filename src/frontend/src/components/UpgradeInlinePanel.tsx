import { AnimatePresence, motion } from "motion/react";
import {
  TIER_DAILY_RATES,
  TIER_NAMES,
  UPGRADE_COSTS,
} from "../constants/tiers";
import type { GeneratorTier } from "../store/gameStore";

interface UpgradeInlinePanelProps {
  isOpen: boolean;
  index: number;
  tier: GeneratorTier;
  upgrading: boolean;
  onCancel: () => void;
  onConfirmUpgrade: () => void;
}

export default function UpgradeInlinePanel({
  isOpen,
  index,
  tier,
  upgrading,
  onCancel,
  onConfirmUpgrade,
}: UpgradeInlinePanelProps) {
  const nextTier = Math.min(6, tier + 1) as GeneratorTier;
  const upgradeCost = tier < 6 ? (UPGRADE_COSTS[nextTier] ?? null) : null;
  const nextDailyRate = tier < 6 ? TIER_DAILY_RATES[nextTier] : null;
  const currentDailyRate = TIER_DAILY_RATES[tier];
  const rateIncrease =
    nextDailyRate !== null ? nextDailyRate - currentDailyRate : 0;

  if (tier >= 6) return null;

  return (
    <AnimatePresence>
      {isOpen && upgradeCost !== null && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            width: 200,
            background: "rgba(0,8,18,0.98)",
            border: "1px solid rgba(255,215,0,0.32)",
            borderRadius: 10,
            boxShadow:
              "0 0 36px rgba(255,215,0,0.14), 0 8px 28px rgba(0,0,0,0.65)",
            padding: "12px 14px",
            zIndex: 55,
            overflow: "hidden",
          }}
        >
          {/* top accent */}
          <div
            style={{
              height: 2,
              marginBottom: 10,
              background:
                "linear-gradient(90deg,transparent,#ffd700 40%,#ff6b35 70%,transparent)",
            }}
          />

          {/* scan lines */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,215,0,0.012) 2px,rgba(255,215,0,0.012) 3px)",
              pointerEvents: "none",
              borderRadius: "inherit",
            }}
          />

          <div
            style={{
              fontSize: 8,
              color: "rgba(255,215,0,0.65)",
              letterSpacing: "0.18em",
              marginBottom: 8,
              fontWeight: 700,
              position: "relative",
            }}
          >
            ⚡ UPGRADE GENERATOR
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 8px",
              marginBottom: 10,
              position: "relative",
            }}
          >
            {[
              { l: "FROM", v: TIER_NAMES[tier], c: "rgba(224,244,255,0.6)" },
              {
                l: "TO",
                v: TIER_NAMES[nextTier],
                c: "#ffd700",
              },
              {
                l: "NEW DAILY",
                v: `${nextDailyRate} FRNTR`,
                c: "#00ffcc",
              },
              {
                l: "GAIN",
                v: `+${rateIncrease} FRNTR/day`,
                c: "#4ade80",
              },
            ].map(({ l, v, c }) => (
              <div key={l}>
                <div
                  style={{
                    fontSize: 7,
                    color: "rgba(224,244,255,0.32)",
                    letterSpacing: "0.1em",
                    marginBottom: 1,
                  }}
                >
                  {l}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: c,
                    fontFamily: "monospace",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* cost row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 6,
              marginBottom: 8,
              position: "relative",
            }}
          >
            <span
              style={{
                fontSize: 7.5,
                color: "rgba(224,244,255,0.4)",
                letterSpacing: "0.1em",
              }}
            >
              COST
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "#ffd700",
                fontFamily: "monospace",
                textShadow: "0 0 10px rgba(255,215,0,0.45)",
              }}
            >
              {upgradeCost.toLocaleString()} FRNTR
            </span>
          </div>

          <div
            style={{
              fontSize: 7.5,
              color: "rgba(224,244,255,0.3)",
              marginBottom: 10,
              lineHeight: 1.4,
              position: "relative",
            }}
          >
            Burns FRNTR permanently from supply. Cannot be undone.
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              position: "relative",
            }}
          >
            <button
              type="button"
              data-ocid={`inventory.upgrade_cancel.${index}`}
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(224,244,255,0.4)",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              data-ocid={`inventory.upgrade_confirm.${index}`}
              onClick={onConfirmUpgrade}
              disabled={upgrading}
              style={{
                flex: 1.5,
                padding: "6px 0",
                borderRadius: 6,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.12em",
                cursor: upgrading ? "not-allowed" : "pointer",
                background: upgrading
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,215,0,0.14)",
                border: `1px solid ${upgrading ? "rgba(255,255,255,0.08)" : "rgba(255,215,0,0.42)"}`,
                color: upgrading ? "rgba(224,244,255,0.3)" : "#ffd700",
                boxShadow: upgrading ? "none" : "0 0 10px rgba(255,215,0,0.18)",
                transition: "all 0.15s",
              }}
            >
              {upgrading ? "UPGRADING…" : "UPGRADE ↑"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
