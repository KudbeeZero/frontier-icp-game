import { create } from "zustand";
const LS_KEY = "frontier_player_state_v2";

function loadFromStorage() {
  try {
    // Try v2 key first (string-keyed)
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      return JSON.parse(raw) as {
        frntBalance: number;
        iron: number;
        fuel: number;
        crystal: number;
        rareEarth: number;
        plotsOwned: string[];
        resourceStorageCap: number;
        generatorTiers: Record<string, GeneratorTier>;
        plotPurchaseTimes: Record<string, number>;
        totalFRNTRBurned: number;
      };
    }
    // Migrate from v1 (numeric keys)
    const rawV1 = localStorage.getItem("frontier_player_state_v1");
    if (rawV1) {
      const v1 = JSON.parse(rawV1) as {
        frntBalance?: number;
        iron?: number;
        fuel?: number;
        crystal?: number;
        rareEarth?: number;
        plotsOwned?: (number | string)[];
        resourceStorageCap?: number;
        generatorTiers?: Record<string | number, GeneratorTier>;
        plotPurchaseTimes?: Record<string | number, number>;
        totalFRNTRBurned?: number;
      };
      const tiers: Record<string, GeneratorTier> = {};
      for (const [k, v] of Object.entries(v1.generatorTiers ?? {})) {
        tiers[String(k)] = v;
      }
      const times: Record<string, number> = {};
      for (const [k, v] of Object.entries(v1.plotPurchaseTimes ?? {})) {
        times[String(k)] = v;
      }
      return {
        frntBalance: v1.frntBalance ?? 0,
        iron: v1.iron ?? 0,
        fuel: v1.fuel ?? 0,
        crystal: v1.crystal ?? 0,
        rareEarth: v1.rareEarth ?? 0,
        plotsOwned: (v1.plotsOwned ?? []).map(String),
        resourceStorageCap: v1.resourceStorageCap ?? 200,
        generatorTiers: tiers,
        plotPurchaseTimes: times,
        totalFRNTRBurned: v1.totalFRNTRBurned ?? 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: GameState) {
  try {
    const { player, generatorTiers, plotPurchaseTimes, totalFRNTRBurned } =
      state;
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        frntBalance: player.frntBalance,
        iron: player.iron,
        fuel: player.fuel,
        crystal: player.crystal,
        rareEarth: player.rareEarth,
        plotsOwned: player.plotsOwned,
        resourceStorageCap: player.resourceStorageCap,
        generatorTiers,
        plotPurchaseTimes,
        totalFRNTRBurned,
      }),
    );
  } catch {
    // storage full or unavailable — ignore
  }
}
import { getMineralYield } from "../constants/minerals";
import { GEODESIC_TILES } from "../utils/geodesicGrid";

export type Biome =
  | "Arctic"
  | "Desert"
  | "Forest"
  | "Ocean"
  | "Mountain"
  | "Volcanic"
  | "Grassland"
  | "Toxic";

export const BIOME_COLORS: Record<Biome, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
};

export type PlotSpecialization =
  | "TRADING_DEPOT"
  | "ENERGY_TECH"
  | "ARMORY"
  | "RESOURCES";

const BIOME_MAP: Biome[] = [
  "Arctic",
  "Desert",
  "Desert",
  "Forest",
  "Forest",
  "Forest",
  "Forest",
  "Ocean",
  "Ocean",
  "Ocean",
  "Ocean",
  "Ocean",
  "Mountain",
  "Mountain",
  "Mountain",
  "Volcanic",
  "Grassland",
  "Grassland",
  "Grassland",
  "Toxic",
];

export type GeneratorTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PlotData {
  id: number;
  lat: number;
  lng: number;
  biome: Biome;
  efficiency: number; // 78-98, randomized per plot; depletes with mining
  mineCount: number; // total times mined
  regenActiveUntil: number; // timestamp ms, 0 = inactive
  owner: string | null;
  isOwnedByMe: boolean; // true when this plot belongs to the authenticated user
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number; // accumulated rare earth
  defenses: { turrets: number; shields: number; walls: number };
  specialization: PlotSpecialization | null;
  generatorTier: GeneratorTier;
  subParcels?: Array<{
    subParcelId: number;
    plotId: number;
    slotIndex: number;
    specialization: string;
    building: string | null;
    cooldownEnds: number;
  }>;
}

export interface PlayerData {
  principal: string | null;
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number;
  frntBalance: number;
  icpBalance: number;
  plotsOwned: string[];
  resourceStorageCap: number;
  isAdmin: boolean;
  victories?: number;
  weaponInventory?: Record<string, number>;
}

export interface CombatEntry {
  id: number;
  timestamp: number;
  attacker: string;
  defender: string;
  fromPlot: string;
  toPlot: string;
  success: boolean;
}

export interface LeaderEntry {
  rank: number;
  name: string;
  principal?: string;
  plotsOwned: number;
  frntEarned: number;
  victories?: number;
}

export interface PurchaseDebugStep {
  step: string;
  status: "pending" | "success" | "error";
  detail: string;
  ts: Date;
}

export interface PurchaseDebugLog {
  id: string;
  timestamp: Date;
  plotId: string;
  steps: PurchaseDebugStep[];
}

export interface SubParcel {
  subId: number;
  plotId: number;
  unlocked: boolean;
  purchaseTime: number;
  buildingType: string | null;
  durability: number;
}

export interface PlotHoverCard {
  plotId: number;
  owner: string;
  action: string;
  nextStep: string;
}

function generateSubParcels(plotId: number | string): SubParcel[] {
  const numericId =
    typeof plotId === "string" ? Number.parseInt(plotId, 10) || 0 : plotId;
  return [
    {
      subId: 0,
      plotId: numericId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 100,
    },
    {
      subId: 1,
      plotId: numericId,
      unlocked: false,
      purchaseTime: Date.now() - 1000 * 60 * 30,
      buildingType: null,
      durability: 0,
    },
    {
      subId: 2,
      plotId: numericId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 3,
      plotId: numericId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 4,
      plotId: numericId,
      unlocked: false,
      purchaseTime: Date.now() - 1000 * 60 * 10,
      buildingType: null,
      durability: 0,
    },
    {
      subId: 5,
      plotId: numericId,
      unlocked: false,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 6,
      plotId: numericId,
      unlocked: false,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
  ];
}

export function randomBiome(seed: number): Biome {
  return BIOME_MAP[seed % BIOME_MAP.length];
}

function generatePlots(): PlotData[] {
  return GEODESIC_TILES.map((tile, i) => ({
    id: i,
    lat: tile.lat,
    lng: tile.lng,
    biome: randomBiome(i),
    efficiency: Math.floor(78 + (((i * 2654435761) >>> 0) % 21)),
    mineCount: 0,
    regenActiveUntil: 0,
    owner: null,
    isOwnedByMe: false,
    iron: 0,
    fuel: 0,
    crystal: 0,
    rareEarth: 0,
    defenses: { turrets: 0, shields: 0, walls: 0 },
    specialization: null,
    generatorTier: 0,
  }));
}

function generateCombatLog(): CombatEntry[] {
  return []; // v1.0: no combat log
}

function generateLeaderboard(): LeaderEntry[] {
  return [];
}

const ALL_PLOTS = generatePlots();
const _cached = loadFromStorage();

// Biome drip rates per second: [iron, fuel, crystal, rareEarth]
// ~1/3600 of per-mine yield so 1 hour of drip ≈ one MINE click
const BIOME_DRIP: Record<string, [number, number, number, number]> = {
  Desert: [0.0008, 0.0025, 0.0003, 0.0001],
  Jungle: [0.0025, 0.0008, 0.0005, 0.0002],
  Arctic: [0.0005, 0.0003, 0.0022, 0.0008],
  Ocean: [0.001, 0.001, 0.0008, 0.0004],
  Mountain: [0.0025, 0.0005, 0.0008, 0.0003],
  Volcanic: [0.001, 0.0015, 0.0005, 0.0017],
  Forest: [0.0015, 0.0012, 0.001, 0.0003],
  Grassland: [0.0018, 0.0015, 0.0005, 0.0003],
  Toxic: [0.0005, 0.0008, 0.0008, 0.002],
};

export interface GlobalStats {
  totalPlotsOwned: number;
  totalFRNTRInCirculation: number;
  totalFRNTRBurned: number;
  totalFRNTRMined: number;
  activePlayerCount: number;
  currentDailyEmissionRate: number;
  leaderboardPrizePool: number;
  nextPayoutAt: number;
  totalSupply: number;
  preMinted: number;
  mineableSupply: number;
  maxSupply?: number;
  remainingMineable?: number;
  daysUntilMilestone?: number;
  burnRate?: number;
  emissionRate?: number;
  // Live treasury pot balances from canister (in ICP)
  devPotICP: number;
  leaderboardPotICP: number;
  liquidityPotICP: number;
  // On-chain action count
  totalActionCount?: number;
}

export interface TreasuryState {
  developer: bigint;
  leaderboard: bigint;
  liquidity: bigint;
  totalPlayers?: number;
  totalPlotsSold?: number;
}

interface GameState {
  plots: PlotData[];
  player: PlayerData;
  selectedPlotId: number | null;
  selectedWorldPoint: [number, number, number] | null;
  targetPlotId: number | null;
  combatLog: CombatEntry[];
  leaderboard: LeaderEntry[];
  subParcels: Record<string, SubParcel[]>;
  hoveredPlotId: number | null;
  plotHoverCard: PlotHoverCard | null;
  plotPurchaseTimes: Record<string, number>;
  generatorTiers: Record<string, GeneratorTier>;
  serverPassiveIncomePerDay: number;
  totalFRNTRBurned: number;
  purchaseDebugLogs: PurchaseDebugLog[];
  firstAvailablePlotId: string | null;

  globalStats: GlobalStats | null;
  treasuryState: TreasuryState;
  icpUsdPrice: number | null;

  // Accumulation model: confirmed = last known from canister; accrued = per-second ticker since last sync
  confirmedFrntBalance: number;
  accruedFrntSinceSync: number;
  confirmedIcpBalance: number;
  accruedIcpSinceSync: number;

  // Claim tracking
  claimCount: number;
  lastBalanceBoostTime: number;

  // Global token economy stats
  totalGlobalDailyOutput: number;
  globalUnclaimedTokens: number;

  activeBattleEntry?: unknown;
  assignedInterceptors?: Record<string, string>;

  setGlobalStats: (stats: GlobalStats) => void;
  setFrntrBalance: (e8s: bigint) => void;
  spendFrntr: (amount: number) => void;
  setIcpBalance: (e8s: bigint) => void;
  setTreasuryState: (state: TreasuryState) => void;
  setIcpUsdPrice: (price: number | null) => void;
  incrementClaimCount: () => void;
  setTotalGlobalDailyOutput: (n: number) => void;
  setGlobalUnclaimedTokens: (n: number) => void;
  selectPlot: (id: number | null) => void;
  setSelectedWorldPoint: (p: [number, number, number] | null) => void;
  purchasePlot: (id: string) => void;
  transferPlot: (plotId: string, recipient: string) => void;
  claimResources: (id: number) => void;
  mineResources: (id: number) => {
    iron: number;
    fuel: number;
    crystal: number;
    rareEarth: number;
  } | null;
  activateRegenBoost: (id: number) => void;
  claimAllFrntr: (amount: number) => void;
  addFrntr: (amount: number) => void;
  mintTestTokens: () => void;
  setAuth: (principal: string | null) => void;
  getSubParcels: (plotId: string) => SubParcel[];
  buildStructure: (
    plotId: string,
    subId: number,
    buildingType: string,
    cost: number,
  ) => void;
  setTargetPlotId: (id: number | null) => void;
  setPlotHoverCard: (card: PlotHoverCard | null) => void;
  setHoveredPlotId: (id: number | null) => void;
  setPlotSpecialization: (plotId: number, spec: PlotSpecialization) => void;
  upgradeStorage: (plotId: string) => void;
  upgradeGenerator: (plotId: string) => void;
  tickPassiveIncome: () => void;
  tickMineralDrip: () => void;
  setServerPassiveIncome: (rate: number) => void;
  setTotalFRNTRBurned: (amount: number) => void;
  addPurchaseDebugLog: (log: PurchaseDebugLog) => void;
  clearPurchaseDebugLogs: () => void;
  setPlots: (plots: PlotData[]) => void;
  setPlotOwnership: (
    owners: Array<[string, string]>,
    myPrincipal: string,
  ) => void;
  setLivePlotOwners: (owners: [string, string][], myPrincipal: string) => void;
  fetchSubParcels: (plotId: string) => Promise<void>;

  // v1.0 phased rollout stubs (hidden features)
  compareModeActive?: boolean;
  setComparePlotId?: (id: number | null) => void;
  getNetworkBonus?: () => number;
  attack?: (targetId: number) => void;
  arsenalInventory?: Record<string, number>;
  fireArsenalMissile?: () => void;
  artilleryInventory?: Record<string, number>;
  fireArtillery?: () => void;
  rankStats?: unknown;
  subParcelCooldowns?: Record<string, number>;
  activeWeapon?: string | null;
  setActiveWeapon?: (w: string | null) => void;
  interceptorInventory?: Record<string, number>;
  assignInterceptorToPlot?: (plotId: string, interceptorId: string) => void;
  buyWeapon?: (weaponId: string) => void;
  weaponInventory?: Record<string, number>;
  setFaction?: (f: string) => void;
  faction?: string | null;
}

export const useGameStore = create<GameState>((set, get) => ({
  plots: ALL_PLOTS,
  player: {
    principal: null,
    iron: _cached?.iron ?? 0,
    fuel: _cached?.fuel ?? 0,
    crystal: _cached?.crystal ?? 0,
    rareEarth: _cached?.rareEarth ?? 0,
    frntBalance: _cached?.frntBalance ?? 0,
    icpBalance: 0,
    plotsOwned: (_cached?.plotsOwned ?? []).map(String),
    resourceStorageCap: _cached?.resourceStorageCap ?? 200,
    isAdmin: false,
  },
  selectedPlotId: null,
  selectedWorldPoint: null,
  targetPlotId: null,
  combatLog: generateCombatLog(),
  leaderboard: generateLeaderboard(),
  subParcels: {},
  hoveredPlotId: null,
  plotHoverCard: null,
  plotPurchaseTimes: _cached?.plotPurchaseTimes ?? {},
  generatorTiers: _cached?.generatorTiers ?? {},
  serverPassiveIncomePerDay: 0,
  totalFRNTRBurned: _cached?.totalFRNTRBurned ?? 0,
  purchaseDebugLogs: [],
  firstAvailablePlotId: null,
  globalStats: null,
  treasuryState: { developer: 0n, leaderboard: 0n, liquidity: 0n },
  icpUsdPrice: null,

  // Accumulation model
  confirmedFrntBalance: _cached?.frntBalance ?? 0,
  accruedFrntSinceSync: 0,
  confirmedIcpBalance: 0,
  accruedIcpSinceSync: 0,

  // Claim tracking
  claimCount: 0,
  lastBalanceBoostTime: 0,

  // Global token economy stats
  totalGlobalDailyOutput: 0,
  globalUnclaimedTokens: 0,

  setFrntrBalance: (e8s) =>
    set((s) => {
      const confirmed = Number(e8s) / 100_000_000;
      // Only update confirmedFrntBalance if the new canister value is HIGHER.
      // A downward sync means a stale poll — ignore it to prevent flicker.
      // Balance only goes down via spendFrntr (explicit user action).
      if (confirmed < s.confirmedFrntBalance) {
        // Ignore downward canister syncs — do not update state
        return {};
      }
      // New balance is >= confirmed: absorb any difference smoothly.
      // Keep the accrued ticker running from where it was.
      const prevDisplay = s.confirmedFrntBalance + s.accruedFrntSinceSync;
      const newAccrued = Math.max(0, prevDisplay - confirmed);
      const next = {
        ...s,
        confirmedFrntBalance: confirmed,
        accruedFrntSinceSync: newAccrued,
        player: { ...s.player, frntBalance: confirmed + newAccrued },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: confirmed,
        accruedFrntSinceSync: newAccrued,
        player: next.player,
      };
    }),

  // Explicit spend action — this is the ONLY way the balance goes down
  spendFrntr: (amount) =>
    set((s) => {
      const displayBal = s.confirmedFrntBalance + s.accruedFrntSinceSync;
      const nextDisplay = Math.max(0, displayBal - amount);
      // Reduce confirmed first, then accrued if needed
      const nextConfirmed = Math.max(0, s.confirmedFrntBalance - amount);
      const nextAccrued =
        nextConfirmed === 0 ? Math.max(0, nextDisplay) : s.accruedFrntSinceSync;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        accruedFrntSinceSync: nextAccrued,
        player: { ...s.player, frntBalance: nextConfirmed + nextAccrued },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        accruedFrntSinceSync: nextAccrued,
        player: next.player,
      };
    }),

  setIcpBalance: (e8s) =>
    set((s) => {
      const confirmed = Number(e8s) / 100_000_000;
      const next = {
        ...s,
        confirmedIcpBalance: confirmed,
        accruedIcpSinceSync: 0,
        player: { ...s.player, icpBalance: confirmed },
      };
      saveToStorage(next as GameState);
      return {
        confirmedIcpBalance: confirmed,
        accruedIcpSinceSync: 0,
        player: next.player,
      };
    }),

  setGlobalStats: (stats) => set({ globalStats: stats }),
  setTreasuryState: (state) => set({ treasuryState: state }),
  setIcpUsdPrice: (price) => set({ icpUsdPrice: price }),
  incrementClaimCount: () => set((s) => ({ claimCount: s.claimCount + 1 })),
  setTotalGlobalDailyOutput: (n) => set({ totalGlobalDailyOutput: n }),
  setGlobalUnclaimedTokens: (n) => set({ globalUnclaimedTokens: n }),

  setPlots: (plots) => set({ plots }),

  setPlotOwnership: (owners, myPrincipal) => {
    const ownerMap = new Map<string, string>();
    for (const [id, principal] of owners) {
      ownerMap.set(String(id), principal);
    }
    set((s) => ({
      plots: s.plots.map((p) => {
        const owner = ownerMap.get(String(p.id));
        if (owner !== undefined) {
          return {
            ...p,
            owner,
            isOwnedByMe: !!myPrincipal && owner === myPrincipal,
          };
        }
        return { ...p, owner: null, isOwnedByMe: false };
      }),
      player: {
        ...s.player,
        plotsOwned: myPrincipal
          ? Array.from(ownerMap.entries())
              .filter(([, principal]) => principal === myPrincipal)
              .map(([id]) => id)
          : s.player.plotsOwned,
      },
    }));
  },

  setLivePlotOwners: (owners, myPrincipal) => {
    const ownerMap = new Map<string, string>();
    for (const [plotId, principal] of owners) {
      ownerMap.set(plotId, principal);
    }
    set((s) => ({
      plots: s.plots.map((p) => {
        const owner = ownerMap.get(String(p.id));
        if (owner !== undefined) {
          return {
            ...p,
            owner,
            isOwnedByMe: !!myPrincipal && owner === myPrincipal,
          };
        }
        return { ...p, owner: null, isOwnedByMe: false };
      }),
      player: {
        ...s.player,
        plotsOwned: myPrincipal
          ? Array.from(ownerMap.entries())
              .filter(([, principal]) => principal === myPrincipal)
              .map(([id]) => id)
          : s.player.plotsOwned,
      },
    }));
  },

  fetchSubParcels: async (_plotId) => {},

  selectPlot: (id) => set({ selectedPlotId: id }),
  setSelectedWorldPoint: (p) => set({ selectedWorldPoint: p }),

  setTargetPlotId: (id) => set({ targetPlotId: id }),
  setPlotHoverCard: (card) => set({ plotHoverCard: card }),
  setHoveredPlotId: (id) => set({ hoveredPlotId: id }),

  purchasePlot: (id: string) => {
    const state = get();
    if (state.player.plotsOwned.includes(id)) return;
    const plot = state.plots.find((p) => String(p.id) === id);
    if (!plot) return;
    const subParcels = generateSubParcels(id);
    set((s) => {
      const next = {
        ...s,
        player: {
          ...s.player,
          plotsOwned: [...s.player.plotsOwned, id],
        },
        plots: s.plots.map((p) =>
          String(p.id) === id
            ? { ...p, owner: s.player.principal ?? "You", isOwnedByMe: true }
            : p,
        ),
        subParcels: { ...s.subParcels, [id]: subParcels },
        plotPurchaseTimes: { ...s.plotPurchaseTimes, [id]: Date.now() },
      };
      saveToStorage(next as GameState);
      return {
        player: next.player,
        plots: next.plots,
        subParcels: next.subParcels,
        plotPurchaseTimes: next.plotPurchaseTimes,
      };
    });
  },

  transferPlot: (plotId: string, recipient: string) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    set((s) => ({
      player: {
        ...s.player,
        plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
      },
      plots: s.plots.map((p) =>
        String(p.id) === plotId ? { ...p, owner: recipient } : p,
      ),
    }));
  },

  claimResources: (id) => {
    get().mineResources(id);
  },

  mineResources: (id) => {
    const state = get();
    if (!state.player.plotsOwned.includes(String(id))) return null;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return null;
    const regenActive = Date.now() < plot.regenActiveUntil;
    const yld = getMineralYield(plot.biome, plot.efficiency, regenActive);
    const resourcesMult = plot.specialization === "RESOURCES" ? 1.15 : 1.0;
    const storageCap = state.player.resourceStorageCap;
    const boostFactor = 0.1;
    const scaledYield = {
      iron: yld.iron * resourcesMult * boostFactor,
      fuel: yld.fuel * resourcesMult * boostFactor,
      crystal: yld.crystal * resourcesMult * boostFactor,
      rareEarth: yld.rareEarth * resourcesMult * boostFactor,
    };
    const newMineCount = plot.mineCount + 1;
    const newEfficiency =
      newMineCount % 2 === 0
        ? Math.max(0, plot.efficiency - 1)
        : plot.efficiency;
    set((s) => ({
      player: {
        ...s.player,
        iron: Math.min(storageCap, s.player.iron + scaledYield.iron),
        fuel: Math.min(storageCap, s.player.fuel + scaledYield.fuel),
        crystal: Math.min(storageCap, s.player.crystal + scaledYield.crystal),
        rareEarth: Math.min(
          storageCap,
          s.player.rareEarth + scaledYield.rareEarth,
        ),
      },
      plots: s.plots.map((p) =>
        p.id === id
          ? { ...p, mineCount: newMineCount, efficiency: newEfficiency }
          : p,
      ),
    }));
    return scaledYield;
  },

  activateRegenBoost: (id) => {
    const state = get();
    if (!state.player.plotsOwned.includes(String(id))) return;
    const cost = 50;
    const displayBal = state.confirmedFrntBalance + state.accruedFrntSinceSync;
    if (displayBal < cost) return;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return;
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance - cost;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
        plots: s.plots.map((p) =>
          p.id === id
            ? {
                ...p,
                regenActiveUntil: Date.now() + 4 * 60 * 60 * 1000,
                efficiency: Math.min(98, p.efficiency + 20),
              }
            : p,
        ),
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        player: next.player,
        plots: next.plots,
      };
    });
  },

  claimAllFrntr: (amount) =>
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance + amount;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        player: next.player,
        lastBalanceBoostTime: Date.now(),
      };
    }),

  addFrntr: (amount) =>
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance + amount;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        player: next.player,
        lastBalanceBoostTime: Date.now(),
      };
    }),

  mintTestTokens: () =>
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance + 500;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
      };
      saveToStorage(next as GameState);
      return { confirmedFrntBalance: nextConfirmed, player: next.player };
    }),

  upgradeGenerator: (plotId: string) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    const currentTier = state.generatorTiers[plotId] ?? 0;
    if (currentTier >= 6) return;
    const COSTS: Record<number, number> = {
      1: 500,
      2: 1500,
      3: 4000,
      4: 10000,
      5: 25000,
      6: 60000,
    };
    const cost = COSTS[currentTier + 1];
    if (!cost) return;
    const displayBal = state.confirmedFrntBalance + state.accruedFrntSinceSync;
    if (displayBal < cost) return;
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance - cost;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
        generatorTiers: {
          ...s.generatorTiers,
          [plotId]: (currentTier + 1) as GeneratorTier,
        },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        player: next.player,
        generatorTiers: next.generatorTiers,
      };
    });
  },

  getSubParcels: (plotId: string) => {
    const state = get();
    if (state.subParcels[plotId]) return state.subParcels[plotId];
    return generateSubParcels(plotId);
  },

  buildStructure: (plotId: string, subId, buildingType, cost) => {
    const state = get();
    const displayBal = state.confirmedFrntBalance + state.accruedFrntSinceSync;
    if (displayBal < cost) return;
    const existing = state.subParcels[plotId] ?? generateSubParcels(plotId);
    const updated = existing.map((sp) =>
      sp.subId === subId ? { ...sp, buildingType, durability: 100 } : sp,
    );
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance - cost;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
        },
        subParcels: { ...s.subParcels, [plotId]: updated },
      };
      saveToStorage(next as GameState);
      return {
        confirmedFrntBalance: nextConfirmed,
        player: next.player,
        subParcels: next.subParcels,
      };
    });
  },

  setPlotSpecialization: (plotId, spec) =>
    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId ? { ...p, specialization: spec } : p,
      ),
    })),

  upgradeStorage: (plotId: string) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    const displayBal = state.confirmedFrntBalance + state.accruedFrntSinceSync;
    if (displayBal < 150) return;
    if (state.player.resourceStorageCap >= 500) return;
    set((s) => {
      const nextConfirmed = s.confirmedFrntBalance - 150;
      const next = {
        ...s,
        confirmedFrntBalance: nextConfirmed,
        player: {
          ...s.player,
          frntBalance: nextConfirmed + s.accruedFrntSinceSync,
          resourceStorageCap: Math.min(500, s.player.resourceStorageCap + 50),
        },
      };
      saveToStorage(next as GameState);
      return { confirmedFrntBalance: nextConfirmed, player: next.player };
    });
  },

  getNetworkBonus: () => {
    const state = get();
    const ownedSpecs = new Set(
      state.plots
        .filter(
          (p) =>
            state.player.plotsOwned.includes(String(p.id)) && p.specialization,
        )
        .map((p) => p.specialization),
    );
    return ownedSpecs.size >= 4 ? 0.15 : 0;
  },

  setAuth: (principal) =>
    set((state) => ({ player: { ...state.player, principal } })),

  setServerPassiveIncome: (rate) => set({ serverPassiveIncomePerDay: rate }),

  setTotalFRNTRBurned: (amount) => set({ totalFRNTRBurned: amount }),

  addPurchaseDebugLog: (log) =>
    set((s) => ({
      purchaseDebugLogs: [log, ...s.purchaseDebugLogs].slice(0, 10),
    })),

  clearPurchaseDebugLogs: () => set({ purchaseDebugLogs: [] }),

  tickPassiveIncome: () => {
    const state = get();
    if (state.player.plotsOwned.length === 0) return;
    const serverRate = state.serverPassiveIncomePerDay;
    // Correct tier daily rates: tier 0=7, I=9, II=12, III=17, IV=25, V=37, VI=55
    const TIER_RATES: Record<number, number> = {
      0: 7,
      1: 9,
      2: 12,
      3: 17,
      4: 25,
      5: 37,
      6: 55,
    };
    let totalFrntr = 0;
    if (serverRate > 0) {
      totalFrntr = serverRate / 86400;
    } else {
      for (const plotId of state.player.plotsOwned) {
        const tier = (state.generatorTiers[plotId] ?? 0) as GeneratorTier;
        totalFrntr += (TIER_RATES[tier] ?? 7) / 86400;
      }
    }
    if (totalFrntr === 0) return;
    set((s) => {
      const nextAccrued = s.accruedFrntSinceSync + totalFrntr;
      return {
        accruedFrntSinceSync: nextAccrued,
        player: {
          ...s.player,
          frntBalance: s.confirmedFrntBalance + nextAccrued,
        },
      };
    });
  },

  tickMineralDrip: () => {
    const state = get();
    if (state.player.plotsOwned.length === 0) return;
    set((s) => {
      let dIron = 0;
      let dFuel = 0;
      let dXtal = 0;
      let dRare = 0;
      for (const plotId of s.player.plotsOwned) {
        const plot = s.plots.find((p) => String(p.id) === plotId);
        if (!plot) continue;
        const rates = BIOME_DRIP[plot.biome] ?? [0.001, 0.001, 0.001, 0.001];
        const eff = (plot.efficiency ?? 90) / 100;
        const regenMult = Date.now() < plot.regenActiveUntil ? 1.2 : 1.0;
        dIron += rates[0] * eff * regenMult;
        dFuel += rates[1] * eff * regenMult;
        dXtal += rates[2] * eff * regenMult;
        dRare += rates[3] * eff * regenMult;
      }
      const storageCap = s.player.resourceStorageCap;
      return {
        player: {
          ...s.player,
          iron: Math.min(storageCap, s.player.iron + dIron),
          fuel: Math.min(storageCap, s.player.fuel + dFuel),
          crystal: Math.min(storageCap, s.player.crystal + dXtal),
          rareEarth: Math.min(storageCap, s.player.rareEarth + dRare),
        },
      };
    });
  },

  compareModeActive: false,
  setComparePlotId: () => {},
  attack: () => {},
  arsenalInventory: {},
  fireArsenalMissile: () => {},
  artilleryInventory: {},
  fireArtillery: () => {},
  rankStats: null,
  subParcelCooldowns: {},
  activeWeapon: null,
  setActiveWeapon: () => {},
  interceptorInventory: {},
  assignInterceptorToPlot: () => {},
  buyWeapon: () => {},
  weaponInventory: {},
  setFaction: () => {},
  faction: null,
}));

export type BattleFormation = "swarm" | "precision" | "suppression" | "stealth";
export const getPlotCombatStats = () => [];
