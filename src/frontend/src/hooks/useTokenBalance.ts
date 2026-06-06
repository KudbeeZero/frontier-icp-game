import { useGameStore } from "../store/gameStore";

/**
 * Returns the accumulated FRNTR balance from the game store.
 * The store tracks confirmed balance (from ledger) + accrued delta (from local ticker).
 * This hook never makes external ledger calls — it reads from the store's accumulation model.
 */
export function useTokenBalance(): { frntrBalance: number } {
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);

  return {
    frntrBalance: confirmedFrntBalance + accruedFrntSinceSync,
  };
}
