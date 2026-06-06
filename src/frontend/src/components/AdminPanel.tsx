import { useActor } from "@caffeineai/core-infrastructure";
import { RefreshCw, RotateCcw, Shield, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { setLastFaucetClaim } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";
import { GEODESIC_TILES, assignBiome } from "../utils/geodesicGrid";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";
const TEXT = "#e0f4ff";
const TEXT_DIM = "rgba(224,244,255,0.45)";

function AdminButton({
  label,
  icon: Icon,
  onClick,
  loading,
  danger,
}: {
  label: string;
  icon: React.ElementType<{
    size?: number;
    color?: string;
    style?: React.CSSProperties;
    className?: string;
  }>;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "11px 14px",
        borderRadius: 8,
        background: danger ? "rgba(255,68,68,0.10)" : "rgba(0,255,204,0.08)",
        border: `1px solid ${
          danger ? "rgba(255,68,68,0.35)" : "rgba(0,255,204,0.3)"
        }`,
        color: danger ? "#ff6666" : CYAN,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: "uppercase" as const,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <Icon size={14} style={{}} />
      {loading ? "WORKING..." : label}
    </button>
  );
}

export default function AdminPanel() {
  const player = useGameStore((s) => s.player);
  const { actor } = useActor(createActor);

  const [mintLoading, setMintLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [reseedLoading, setReseedLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!player.isAdmin) return null;

  async function handleMintToSelf() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setMintLoading(true);
    try {
      const result = await actor.testFaucetV2();
      if ("ok" in result) {
        const grant = (
          result as { ok: { frntGranted: bigint; icpGranted: bigint } }
        ).ok;
        const frntr = Number(grant.frntGranted) / 1e8;
        const icp = Number(grant.icpGranted) / 1e8;
        setLastFaucetClaim();
        toast.success(
          `+${frntr.toFixed(4)} FRNTR & +${icp.toFixed(4)} ICP minted`,
          {
            duration: 4000,
          },
        );
        // Trigger player sync after 3 seconds
        setTimeout(() => {
          useGameStore.setState((s) => ({
            player: {
              ...s.player,
              frntBalance: s.player.frntBalance + frntr,
            },
          }));
        }, 3000);
      } else {
        toast.error(`Faucet failed: ${result.err}`);
      }
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setMintLoading(false);
    }
  }

  async function handleResetAll() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setResetLoading(true);
    setShowConfirm(false);
    try {
      await actor.resetAllData();
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          frntBalance: 0,
          plotsOwned: [],
          iron: 0,
          fuel: 0,
          crystal: 0,
          rareEarth: 0,
        },
        leaderboard: [],
        totalFRNTRBurned: 0,
      }));
      toast.success("All state reset", { duration: 4000 });
    } catch (e) {
      toast.error(`Reset failed: ${String(e)}`);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleReseedPlots() {
    if (!actor) {
      toast.error("Actor not ready");
      return;
    }
    setReseedLoading(true);
    try {
      const count = await actor.getPlotCount();
      if (count >= 100n) {
        toast(`Plots already seeded — canister has ${count} plots`, {
          duration: 3000,
        });
        setReseedLoading(false);
        return;
      }
      const tiles = GEODESIC_TILES.slice(0, 500);
      const plotData: [string, string, number, number, bigint][] = tiles.map(
        (tile, i) => [
          String(i),
          assignBiome(tile.lat, tile.lng),
          tile.lat,
          tile.lng,
          BigInt(Math.floor(78 + (((i * 2654435761) >>> 0) % 21))),
        ],
      );
      await actor.initPlots(plotData);
      toast.success(`Seeded ${tiles.length} plots`, { duration: 4000 });
    } catch (e) {
      toast.error(`Reseed failed: ${String(e)}`);
    } finally {
      setReseedLoading(false);
    }
  }

  return (
    <div
      data-ocid="admin.panel"
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shield
          size={18}
          color={CYAN}
          style={{ filter: `drop-shadow(0 0 6px ${CYAN})` }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: CYAN,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
            textShadow: `0 0 10px ${CYAN}`,
          }}
        >
          ADMIN CONTROL
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 10,
            background: "rgba(0,255,204,0.12)",
            border: `1px solid ${CYAN}55`,
            fontSize: 7,
            fontWeight: 700,
            color: CYAN,
            letterSpacing: 2,
          }}
        >
          ADMIN
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: BORDER }} />

      {/* Principal display */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(0,255,204,0.04)",
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            fontSize: 7,
            color: TEXT_DIM,
            letterSpacing: 1.5,
            marginBottom: 3,
          }}
        >
          ADMIN PRINCIPAL
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 9, color: TEXT, wordBreak: "break-all" }}
        >
          {player.principal ?? "—"}
        </div>
      </div>

      {/* Action section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 8,
            color: TEXT_DIM,
            letterSpacing: 2,
            marginBottom: 2,
          }}
        >
          ACTIONS
        </div>

        <div data-ocid="admin.mint_button">
          <AdminButton
            label="Mint to Self (Faucet)"
            icon={Zap}
            onClick={handleMintToSelf}
            loading={mintLoading}
          />
        </div>

        <AdminButton
          label="Reseed Plots"
          icon={RefreshCw}
          onClick={handleReseedPlots}
          loading={reseedLoading}
        />

        {!showConfirm ? (
          <AdminButton
            label="Reset All State"
            icon={RotateCcw}
            onClick={() => setShowConfirm(true)}
            danger
          />
        ) : (
          <div
            style={{
              borderRadius: 8,
              border: "1px solid rgba(255,68,68,0.4)",
              background: "rgba(255,68,68,0.07)",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#ff6666",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              This wipes ALL player data and plots. Confirm?
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                data-ocid="admin.confirm_button"
                onClick={handleResetAll}
                disabled={resetLoading}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 6,
                  background: "rgba(255,68,68,0.2)",
                  border: "1px solid rgba(255,68,68,0.5)",
                  color: "#ff6666",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: resetLoading ? "not-allowed" : "pointer",
                  letterSpacing: 1,
                }}
              >
                {resetLoading ? "RESETTING..." : "CONFIRM"}
              </button>
              <button
                type="button"
                data-ocid="admin.cancel_button"
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 6,
                  background: "rgba(0,255,204,0.06)",
                  border: `1px solid ${BORDER}`,
                  color: CYAN,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(0,10,20,0.4)",
          border: `1px solid ${BORDER}`,
          fontSize: 8,
          color: TEXT_DIM,
          lineHeight: 1.7,
          letterSpacing: 0.3,
        }}
      >
        ⚡ Admin panel is only visible to the registered admin principal. Reset
        All State is irreversible — use before mainnet migration only.
      </div>
    </div>
  );
}
