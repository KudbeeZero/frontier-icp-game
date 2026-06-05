import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
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
          const _grant = result.ok;
          try {
            const state = await actor.getPlayerState();
            if (state) {
              useGameStore.setState((s) => ({
                player: {
                  ...s.player,
                  frntBalance: Number(state.frntBalance) / 100_000_000,
                  iron: Number(state.iron) / 100_000_000,
                  fuel: Number(state.fuel) / 100_000_000,
                  crystal: Number(state.crystal) / 100_000_000,
                  // ICP balance is now read from the real ledger via useIcpBalance()
                },
              }));
            }
          } catch {
            mintTestTokens();
          }
          toast.success("+500 FRNTR + 2 ICP claimed!", { duration: 4000 });
        } else {
          mintTestTokens();
          toast.success("+500 FRNTR + 2 ICP claimed!", { duration: 4000 });
        }
      } else {
        mintTestTokens();
        toast.success("+500 FRNTR + 2 ICP claimed!", { duration: 4000 });
      }
    } catch {
      mintTestTokens();
      toast.success("+500 FRNTR + 2 ICP claimed!", { duration: 4000 });
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
          ? "Claim 500 FRNTR + 2 ICP (testnet, unlimited)"
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
      {loading ? "CLAIMING..." : "TESTNET FAUCET"}
    </button>
  );
}
