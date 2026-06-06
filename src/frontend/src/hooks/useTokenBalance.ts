import { TIER_DAILY_RATES } from "../constants/tiers";
import { useGameStore } from "../store/gameStore";

export { TIER_DAILY_RATES };

export interface TokenBalance {
  /** Total displayed balance = confirmedFrntBalance + accruedFrntSinceSync */
  balance: number;
  /** Sum of TIER_DAILY_RATES[tier] for each owned plot */
  dailyRate: number;
  /** dailyRate / 24 */
  hourlyRate: number;
  /** dailyRate / 86400 */
  perSecondRate: number;
  /** Individual per-plot rates for display */
  plotRates: Array<{ plotId: string; tier: number; dailyRate: number }>;
}

/**
 * Returns the accumulated FRNTR balance and generation rates from the game store.
 * The store tracks confirmed balance (from ledger) + accrued delta (from local ticker).
 * This hook never makes external ledger calls — it reads from the store's accumulation model.
 */
export function useTokenBalance(): TokenBalance {
  const confirmedFrntBalance = useGameStore((s) => s.confirmedFrntBalance);
  const accruedFrntSinceSync = useGameStore((s) => s.accruedFrntSinceSync);
  const plotsOwned = useGameStore((s) => s.player.plotsOwned);
  const generatorTiers = useGameStore((s) => s.generatorTiers);

  const plotRates = plotsOwned.map((plotId) => {
    const tier = (generatorTiers[plotId] ?? 0) as number;
    return { plotId, tier, dailyRate: TIER_DAILY_RATES[tier] ?? 7 };
  });

  const dailyRate = plotRates.reduce((sum, p) => sum + p.dailyRate, 0);
  const hourlyRate = dailyRate / 24;
  const perSecondRate = dailyRate / 86_400;

  return {
    balance: confirmedFrntBalance + accruedFrntSinceSync,
    dailyRate,
    hourlyRate,
    perSecondRate,
    plotRates,
  };
}
