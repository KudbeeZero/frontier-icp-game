import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useEffect, useState } from "react";

const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const POLL_INTERVAL_MS = 30_000;

// Minimal IDL factory for the ICP ledger ICRC-1 interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icpLedgerIdlFactory = ({ IDL }: { IDL: any }) => {
  const AccountType = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([AccountType], [IDL.Nat], ["query"]),
  });
};

type IcpLedgerActor = {
  icrc1_balance_of: (account: {
    owner: unknown;
    subaccount: [];
  }) => Promise<bigint>;
};

export interface IcpBalanceResult {
  /** Raw balance in e8s (1 ICP = 100_000_000 e8s) */
  icpBalance: bigint;
  /** Human-readable ICP amount (e8s / 1e8) */
  icpBalanceFormatted: number;
  /** Manually trigger a refetch */
  refetch: () => void;
}

/**
 * Queries the ICP ledger canister for the authenticated user's real wallet balance.
 * Polls every 30 seconds while authenticated.
 */
export function useIcpBalance(): IcpBalanceResult {
  const { identity, isAuthenticated } = useInternetIdentity();
  const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [_tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!identity || !isAuthenticated) {
      setIcpBalance(0n);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const agent = new HttpAgent({ identity });
        const actor = Actor.createActor(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          icpLedgerIdlFactory as any,
          { agent, canisterId: ICP_LEDGER_CANISTER_ID },
        ) as IcpLedgerActor;

        const principal = identity.getPrincipal();
        const raw = await actor.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        });

        if (!cancelled) {
          setIcpBalance(raw);
        }
      } catch {
        // Silently keep the last known balance on transient errors
      }
    };

    void fetchBalance();

    const interval = setInterval(() => void fetchBalance(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [identity, isAuthenticated]);

  const icpBalanceFormatted = Number(icpBalance) / 1e8;

  return { icpBalance, icpBalanceFormatted, refetch };
}
