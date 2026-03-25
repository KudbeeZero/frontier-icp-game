import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const balanceIdlFactory = ({ IDL }: { IDL: any }) => {
  const AccountType = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([AccountType], [IDL.Nat], ["query"]),
  });
};

export function useTokenBalance(): string {
  const { identity } = useInternetIdentity();
  const [balance, setBalance] = useState<string>("\u2013");

  useEffect(() => {
    if (!identity) {
      setBalance("\u2013");
      return;
    }

    const canisterId = import.meta.env.VITE_TOKEN_CANISTER_ID as
      | string
      | undefined;
    if (!canisterId) {
      setBalance("\u2013");
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const agent = new HttpAgent({ identity });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actor = Actor.createActor(balanceIdlFactory as any, {
          agent,
          canisterId,
        }) as {
          icrc1_balance_of: (account: {
            owner: unknown;
            subaccount: [];
          }) => Promise<bigint>;
        };
        const principal = identity.getPrincipal();
        const raw = await actor.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        });
        if (!cancelled) {
          const formatted = Math.floor(Number(raw) / 1e8).toLocaleString();
          setBalance(formatted);
        }
      } catch {
        if (!cancelled) setBalance("\u2013");
      }
    };

    void fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  return balance;
}
