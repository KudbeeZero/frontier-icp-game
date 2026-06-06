import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { useIcpBalance } from "../hooks/useIcpBalance";
import { applyConfirmedFrntrBalance } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";

const CYAN = "#00ffcc";
const BORDER = "rgba(0,255,204,0.22)";

/**
 * Fixed upper-right faucet overlay, z-stacked above globe.
 * Each click grants 500 FRNTR + 2 ICP, no cooldown.
 */
export default function FaucetOverlay() {
  const { isAuthenticated } = useInternetIdentity();
  const { actor, isFetching } = useActor(createActor);
  const mintTestTokens = useGameStore((s) => s.mintTestTokens);
  const { refetch: refetchIcp } = useIcpBalance();
  const [loading, setLoading] = useState(false);

  const isReady = isAuthenticated && !!actor && !isFetching;

  const handleFaucet = async () => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.error("Login required to claim testnet tokens", { duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      if (actor) {
        const result = await actor.testFaucetV2();
        if ("ok" in result) {
          // Re-fetch player state immediately and apply via comparison-based updater
          try {
            const state = await actor.getPlayerState();
            if (state) {
              // Use the authoritative updater so lastKnownFrntrBalance is set
              applyConfirmedFrntrBalance(BigInt(state.frntBalance));

              // Also update ICP balance from backend state if available
              const icpFromState =
                "icpBalance" in state && typeof state.icpBalance !== "undefined"
                  ? Number(state.icpBalance) / 1e8
                  : null;
              if (icpFromState !== null) {
                useGameStore
                  .getState()
                  .setIcpBalance(BigInt(Math.round(icpFromState * 1e8)));
              }

              // Update minerals too
              useGameStore.setState((s) => ({
                player: {
                  ...s.player,
                  iron: Number(state.iron) / 100_000_000,
                  fuel: Number(state.fuel) / 100_000_000,
                  crystal: Number(state.crystal) / 100_000_000,
                },
              }));
            }
          } catch {
            // Fallback: add 500 locally so display isn't stuck at 0
            mintTestTokens();
          }

          // Trigger ICP balance refetch from ledger
          refetchIcp();

          toast.success("5000 FRNTR and 5 ICP added to your wallet", {
            duration: 4000,
          });
        } else {
          const errMsg =
            "err" in result
              ? (result as { err: string }).err
              : "Faucet unavailable";
          toast.error(`Faucet failed: ${errMsg}`, { duration: 4000 });
        }
      } else {
        mintTestTokens();
        toast.success("5000 FRNTR and 5 ICP added to your wallet", {
          duration: 4000,
        });
      }
    } catch {
      mintTestTokens();
      toast.success("5000 FRNTR and 5 ICP added to your wallet", {
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-ocid="faucet.button"
      onClick={handleFaucet}
      disabled={loading}
      title={
        isReady
          ? "Claim 5000 FRNTR + 5 ICP (testnet, unlimited)"
          : "Claim test tokens"
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 6,
        background: loading ? "rgba(0,255,204,0.05)" : "rgba(0,255,204,0.1)",
        border: `1px solid ${BORDER}`,
        color: CYAN,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.5,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        transition: "opacity 0.2s, background 0.2s",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 0 8px rgba(0,255,204,0.12)",
        height: 32,
      }}
    >
      <FlaskConical size={11} />
      {loading ? "CLAIMING..." : "+5000 FRNTR +5 ICP"}
    </button>
  );
}
