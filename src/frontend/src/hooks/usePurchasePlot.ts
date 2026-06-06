import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";
import { createActor } from "../backend";
import { applyConfirmedFrntrBalance } from "../hooks/usePlayerSync";
import { useGameStore } from "../store/gameStore";

/**
 * Format a plot price in e8s as 'X.XXXX ICP (~$Y.YY)' or
 * 'X.XXXX ICP ($ unavailable)' when icpUsdPrice is null.
 */
export function formatPlotPrice(
  priceE8s: bigint,
  icpUsdPrice: number | null,
): string {
  const icp = Number(priceE8s) / 1e8;
  const icpStr = icp.toFixed(4);
  if (icpUsdPrice === null) return `${icpStr} ICP ($ unavailable)`;
  const usd = (icp * icpUsdPrice).toFixed(2);
  return `${icpStr} ICP (~${usd})`;
}

const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Minimal IDL for ICRC-2 approve on the ICP ledger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icrc2IdlFactory = ({ IDL }: { IDL: any }) => {
  const Principal = IDL.Principal;
  const ApproveArgs = IDL.Record({
    spender: IDL.Record({
      owner: Principal,
      subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
    amount: IDL.Nat,
    expires_at: IDL.Opt(IDL.Nat64),
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    expected_allowance: IDL.Opt(IDL.Nat),
  });
  const ApproveResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: IDL.Record({ message: IDL.Text }),
  });
  return IDL.Service({
    icrc2_approve: IDL.Func([ApproveArgs], [ApproveResult], []),
  });
};

type Icrc2Actor = {
  icrc2_approve: (args: {
    spender: { owner: unknown; subaccount: [] };
    amount: bigint;
    expires_at: [];
    fee: [];
    memo: [];
    from_subaccount: [];
    created_at_time: [];
    expected_allowance: [];
  }) => Promise<{ Ok: bigint } | { Err: { message: string } }>;
};

export interface PurchaseResult {
  success: boolean;
  message: string;
}

export function usePurchasePlot() {
  const { actor } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lastResult, setLastResult] = useState<PurchaseResult | null>(null);

  const purchasePlotLocal = useGameStore((s) => s.purchasePlot);

  async function purchasePlot(plotId: string): Promise<PurchaseResult> {
    setIsPurchasing(true);
    setLastResult(null);

    // Read icpUsdPrice for display in messages
    const icpUsdPrice = useGameStore.getState().icpUsdPrice;

    // Optimistic local update
    purchasePlotLocal(plotId);

    if (!identity || !actor) {
      // Offline / unauthenticated — keep local update, report offline
      await new Promise((r) => setTimeout(r, 500));
      setIsPurchasing(false);
      const result: PurchaseResult = {
        success: true,
        message: `[OFFLINE] PLOT ${plotId} ACQUIRED`,
      };
      setLastResult(result);
      return result;
    }

    try {
      // Step 1: Approve the game canister to spend ICP on behalf of the player.
      // Plot price is passed in e8s; add 10_000 as fee buffer.
      const gamePrincipalText = import.meta.env.VITE_CANISTER_ID_BACKEND as
        | string
        | undefined;

      // Hoisted price display (filled inside gamePrincipalText block when ICP approval runs)
      let priceDisplay: string | null = null;

      if (gamePrincipalText) {
        try {
          const { Principal } = await import("@dfinity/principal");
          const gameCanisterPrincipal = Principal.fromText(gamePrincipalText);

          const icpAgent = new HttpAgent({ identity });
          const icpLedger = Actor.createActor(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            icrc2IdlFactory as any,
            { agent: icpAgent, canisterId: ICP_LEDGER_CANISTER_ID },
          ) as Icrc2Actor;

          // Fetch actual plot price from getPlotPrice (Fix 1 — source of truth)
          let plotPriceE8s: bigint;
          try {
            plotPriceE8s = BigInt(
              await (
                actor as unknown as {
                  getPlotPrice: (id: string) => Promise<bigint>;
                }
              ).getPlotPrice(plotId),
            );
          } catch {
            plotPriceE8s = 200_000_000n; // fallback: 2 ICP
          }
          const approveAmount = plotPriceE8s + 10_000n;
          // Build human-readable price for confirmation (used below)
          priceDisplay = formatPlotPrice(plotPriceE8s, icpUsdPrice);

          const approveResult = await icpLedger.icrc2_approve({
            spender: { owner: gameCanisterPrincipal, subaccount: [] },
            amount: approveAmount,
            expires_at: [],
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            expected_allowance: [],
          });

          if ("Err" in approveResult) {
            // Rollback optimistic update
            useGameStore.setState((s) => ({
              player: {
                ...s.player,
                plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
              },
              plots: s.plots.map((p) =>
                String(p.id) === plotId
                  ? { ...p, owner: null, isOwnedByMe: false }
                  : p,
              ),
            }));
            const errMsg =
              "message" in approveResult.Err
                ? approveResult.Err.message
                : "ICP approval failed";
            const result: PurchaseResult = {
              success: false,
              message: `APPROVAL FAILED: ${errMsg}`,
            };
            setLastResult(result);
            setIsPurchasing(false);
            return result;
          }
        } catch {
          // If approval setup fails (e.g. no game principal env), proceed anyway —
          // the canister will validate on its end.
        }
      }

      // Step 2: Call purchasePlot on the game canister
      const res = await actor.purchasePlot(plotId);
      const success = "ok" in res;
      const message = success
        ? ((res as { ok: string }).ok ?? `PLOT ${plotId} ACQUIRED`)
        : ((res as { err: string }).err ?? `PLOT ${plotId} PURCHASE FAILED`);
      // Attach formatted price to success message when available
      const displayMessage =
        success && priceDisplay ? `${message} · ${priceDisplay}` : message;

      if (success) {
        // Record 4-hour sub-parcel cooldown for this plot
        const unlockTs = Date.now() + 4 * 60 * 60 * 1000;
        useGameStore.setState((s) => ({
          subParcelCooldowns: {
            ...(s.subParcelCooldowns ?? {}),
            [plotId]: unlockTs,
          },
        }));

        // Immediately sync ownership so globe highlights and inventory updates
        // without waiting for the next 10-second poll
        try {
          const [playerState, owners] = await Promise.all([
            actor.getPlayerState(),
            actor.getLivePlotOwners(),
          ]);
          if (playerState) {
            applyConfirmedFrntrBalance(BigInt(playerState.frntBalance));
          }
          const myPrincipal = useGameStore.getState().player.principal ?? "";
          useGameStore.getState().setLivePlotOwners(owners, myPrincipal);
        } catch {
          // Non-critical: next poll will catch up
        }
      } else {
        // Rollback: un-own the plot locally — do NOT touch frntBalance (ICP flow)
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
          },
          plots: s.plots.map((p) =>
            String(p.id) === plotId
              ? { ...p, owner: null, isOwnedByMe: false }
              : p,
          ),
        }));
      }

      const result: PurchaseResult = { success, message: displayMessage };
      setLastResult(result);
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "PURCHASE FAILED — NETWORK ERROR";

      // Rollback: only un-own plot — never touch frntBalance (ICP flow, no FRNTR deducted)
      useGameStore.setState((s) => ({
        player: {
          ...s.player,
          plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
        },
        plots: s.plots.map((p) =>
          String(p.id) === plotId
            ? { ...p, owner: null, isOwnedByMe: false }
            : p,
        ),
      }));

      const result: PurchaseResult = { success: false, message };
      setLastResult(result);
      return result;
    } finally {
      setIsPurchasing(false);
    }
  }

  return { purchasePlot, isPurchasing, lastResult };
}
