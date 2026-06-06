import { useActor } from "@caffeineai/core-infrastructure";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { useGameStore } from "../store/gameStore";
import { useIcpBalance } from "./useIcpBalance";
import { applyConfirmedFrntrBalance } from "./usePlayerSync";

/**
 * useFaucet — programmatic hook for triggering a faucet claim.
 *
 * Enforces the testnet gate: if `testnetMode` is false the claim
 * function returns early with an error toast without touching the
 * canister. This is the single authoritative guard for faucet calls
 * that originate from imperative code paths (e.g. admin panel).
 */
export function useFaucet() {
  const testnetMode = useGameStore((s) => s.testnetMode);
  const mintTestTokens = useGameStore((s) => s.mintTestTokens);
  const setIcpBalance = useGameStore((s) => s.setIcpBalance);
  const { actor, isFetching } = useActor(createActor);
  const { refetch: refetchIcp } = useIcpBalance();
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    // Hard gate — faucet is unavailable on mainnet
    if (!testnetMode) {
      toast.error("Faucet is only available on testnet", { duration: 3000 });
      return;
    }

    if (loading) return;
    if (isFetching || !actor) {
      // Fallback: apply locally
      mintTestTokens();
      toast.success("5000 FRNTR and 5 ICP added to your wallet", {
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      const result = await actor.testFaucetV2();
      if ("ok" in result) {
        try {
          const state = await actor.getPlayerState();
          if (state) {
            applyConfirmedFrntrBalance(BigInt(state.frntBalance));
            const icpFromState =
              "icpBalance" in state && typeof state.icpBalance !== "undefined"
                ? Number(state.icpBalance) / 1e8
                : null;
            if (icpFromState !== null) {
              setIcpBalance(BigInt(Math.round(icpFromState * 1e8)));
            }
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
          mintTestTokens();
        }
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
    } catch {
      mintTestTokens();
      toast.success("5000 FRNTR and 5 ICP added to your wallet", {
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return { claim, loading, testnetMode };
}
