import { useEffect } from "react";
import { TIER_DAILY_RATES } from "../hooks/useTokenBalance";
import { useGameStore } from "../store/gameStore";
import type { GeneratorTier } from "../store/gameStore";

/**
 * GameTicker — mounts once in App.tsx and drives per-second passive income.
 *
 * Accumulation model:
 *   - confirmedFrntBalance: last known value from the ICP ledger
 *   - accruedFrntSinceSync: per-second ticker additions since last ledger sync
 *   - displayed balance = confirmedFrntBalance + accruedFrntSinceSync
 *
 * Rate formula:
 *   TIER_DAILY_RATES[tier] / 86_400 = FRNTR added per second per plot
 *
 * TIER_DAILY_RATES: { 0: 7, 1: 9, 2: 12, 3: 17, 4: 25, 5: 37, 6: 55 } FRNTR/day
 */
export function GameTicker() {
  useEffect(() => {
    const id = setInterval(() => {
      const store = useGameStore.getState();
      const { plotsOwned } = store.player;

      if (plotsOwned.length === 0) return;

      // Sum per-second rate across all owned plots using correct tier rates
      let perSecondTotal = 0;
      for (const plotId of plotsOwned) {
        const tier = (store.generatorTiers[plotId] ?? 0) as GeneratorTier;
        const dailyRate =
          TIER_DAILY_RATES[tier as number] ?? TIER_DAILY_RATES[0];
        perSecondTotal += dailyRate / 86_400;
      }

      if (perSecondTotal === 0) return;

      store.tickPassiveIncome();
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return null;
}
