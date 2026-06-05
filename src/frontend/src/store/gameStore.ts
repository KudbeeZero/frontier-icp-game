import { create } from "zustand";
const LS_KEY = "frontier_player_state_v1";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      frntBalance: number;
      iron: number;
      fuel: number;
      crystal: number;
      rareEarth: number;
      plotsOwned: number[];
      mockIcpBalance: number;
      resourceStorageCap: number;
      generatorTiers: Record<number, GeneratorTier>;
      plotPurchaseTimes: Record<number, number>;
      totalFRNTRBurned: number;
    };
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
        mockIcpBalance: player.mockIcpBalance,
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
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number; // accumulated rare earth
  defenses: { turrets: number; shields: number; walls: number };
  specialization: PlotSpecialization | null;
  generatorTier: GeneratorTier;
}

export interface PlayerData {
  principal: string | null;
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number;
  frntBalance: number;
  plotsOwned: number[];
  mockIcpBalance: number;
  resourceStorageCap: number;
  commanderType?: string;
  commanderAtk?: number;
  commanderDef?: number;
  victories?: number;
  weaponInventory?: Record<string, number>;
}

export interface CombatEntry {
  id: number;
  timestamp: number;
  attacker: string;
  defender: string;
  fromPlot: number;
  toPlot: number;
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

function generateSubParcels(plotId: number): SubParcel[] {
  return [
    {
      subId: 0,
      plotId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 100,
    },
    {
      subId: 1,
      plotId,
      unlocked: false,
      purchaseTime: Date.now() - 1000 * 60 * 30,
      buildingType: null,
      durability: 0,
    },
    {
      subId: 2,
      plotId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 3,
      plotId,
      unlocked: true,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 4,
      plotId,
      unlocked: false,
      purchaseTime: Date.now() - 1000 * 60 * 10,
      buildingType: null,
      durability: 0,
    },
    {
      subId: 5,
      plotId,
      unlocked: false,
      purchaseTime: Date.now(),
      buildingType: null,
      durability: 0,
    },
    {
      subId: 6,
      plotId,
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
}

interface GameState {
  plots: PlotData[];
  player: PlayerData;
  selectedPlotId: number | null;
  selectedWorldPoint: [number, number, number] | null;
  targetPlotId: number | null;
  combatLog: CombatEntry[];
  leaderboard: LeaderEntry[];
  subParcels: Record<number, SubParcel[]>;
  hoveredPlotId: number | null;
  plotHoverCard: PlotHoverCard | null;
  plotPurchaseTimes: Record<number, number>;
  generatorTiers: Record<number, GeneratorTier>;
  serverPassiveIncomePerDay: number;
  totalFRNTRBurned: number;
  purchaseDebugLogs: PurchaseDebugLog[];

  globalStats: GlobalStats | null;

  activeBattleEntry?: any;
  assignedInterceptors?: Record<number, string>;

  setGlobalStats: (stats: GlobalStats) => void;
  selectPlot: (id: number | null) => void;
  setSelectedWorldPoint: (p: [number, number, number] | null) => void;
  purchasePlot: (id: number) => void;
  transferPlot: (plotId: number, recipient: string) => void;
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
  getSubParcels: (plotId: number) => SubParcel[];
  buildStructure: (
    plotId: number,
    subId: number,
    buildingType: string,
    cost: number,
  ) => void;
  setTargetPlotId: (id: number | null) => void;
  setPlotHoverCard: (card: PlotHoverCard | null) => void;
  setHoveredPlotId: (id: number | null) => void;
  setPlotSpecialization: (plotId: number, spec: PlotSpecialization) => void;
  upgradeStorage: (plotId: number) => void;
  upgradeGenerator: (plotId: number) => void;
  tickPassiveIncome: () => void;
  tickMineralDrip: () => void;
  setServerPassiveIncome: (rate: number) => void;
  setTotalFRNTRBurned: (amount: number) => void;
  addPurchaseDebugLog: (log: PurchaseDebugLog) => void;
  clearPurchaseDebugLogs: () => void;

  // v1.0 phased rollout stubs (hidden features)
  compareModeActive?: boolean;
  setComparePlotId?: (id: number | null) => void;
  commanderAssignments?: Record<number, string>;
  ownedCommanders?: any[];
  getNetworkBonus?: () => number;
  attack?: (targetId: number) => void;
  arsenalInventory?: Record<string, number>;
  fireArsenalMissile?: () => void;
  artilleryInventory?: Record<string, number>;
  fireArtillery?: () => void;
  rankStats?: any;
  subParcelCooldowns?: Record<number, number>;
  activeWeapon?: string | null;
  setActiveWeapon?: (w: string | null) => void;
  interceptorInventory?: Record<string, number>;
  assignInterceptorToPlot?: (plotId: number, interceptorId: string) => void;
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
    plotsOwned: _cached?.plotsOwned ?? [],
    mockIcpBalance: _cached?.mockIcpBalance ?? 5.0,
    resourceStorageCap: _cached?.resourceStorageCap ?? 200,
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
  globalStats: null,

  setGlobalStats: (stats) => set({ globalStats: stats }),

  selectPlot: (id) => set({ selectedPlotId: id }),
  setSelectedWorldPoint: (p) => set({ selectedWorldPoint: p }),

  setTargetPlotId: (id) => set({ targetPlotId: id }),
  setPlotHoverCard: (card) => set({ plotHoverCard: card }),
  setHoveredPlotId: (id) => set({ hoveredPlotId: id }),

  purchasePlot: (id) => {
    const state = get();
    if (state.player.plotsOwned.includes(id)) return;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return;
    const cost = 100;
    if (state.player.frntBalance < cost) return;
    const subParcels = generateSubParcels(id);
    set((s) => {
      const next = {
        ...s,
        player: {
          ...s.player,
          frntBalance: s.player.frntBalance - cost,
          plotsOwned: [...s.player.plotsOwned, id],
        },
        plots: s.plots.map((p) =>
          p.id === id ? { ...p, owner: s.player.principal ?? "You" } : p,
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

  transferPlot: (plotId, recipient) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    set((s) => ({
      player: {
        ...s.player,
        plotsOwned: s.player.plotsOwned.filter((id) => id !== plotId),
      },
      plots: s.plots.map((p) =>
        p.id === plotId ? { ...p, owner: recipient } : p,
      ),
    }));
  },

  claimResources: (id) => {
    get().mineResources(id);
  },

  mineResources: (id) => {
    const state = get();
    if (!state.player.plotsOwned.includes(id)) return null;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return null;
    const regenActive = Date.now() < plot.regenActiveUntil;
    const yld = getMineralYield(plot.biome, plot.efficiency, regenActive);
    const resourcesMult = plot.specialization === "RESOURCES" ? 1.15 : 1.0;
    const storageCap = state.player.resourceStorageCap;
    // MINE is now a small boost (10% of normal yield), not a full lump sum
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
    if (!state.player.plotsOwned.includes(id)) return;
    const cost = 50;
    if (state.player.frntBalance < cost) return;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      plots: s.plots.map((p) =>
        p.id === id
          ? {
              ...p,
              regenActiveUntil: Date.now() + 4 * 60 * 60 * 1000,
              efficiency: Math.min(98, p.efficiency + 20),
            }
          : p,
      ),
    }));
  },

  claimAllFrntr: (amount) =>
    set((s) => {
      const next = {
        ...s,
        player: { ...s.player, frntBalance: s.player.frntBalance + amount },
      };
      saveToStorage(next as GameState);
      return { player: next.player };
    }),

  addFrntr: (amount) =>
    set((s) => {
      const next = {
        ...s,
        player: { ...s.player, frntBalance: s.player.frntBalance + amount },
      };
      saveToStorage(next as GameState);
      return { player: next.player };
    }),

  mintTestTokens: () =>
    set((s) => {
      const next = {
        ...s,
        player: {
          ...s.player,
          frntBalance: s.player.frntBalance + 500,
          mockIcpBalance: s.player.mockIcpBalance + 2,
        },
      };
      saveToStorage(next as GameState);
      return { player: next.player };
    }),

  upgradeGenerator: (plotId) => {
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
    if (!cost || state.player.frntBalance < cost) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      generatorTiers: {
        ...s.generatorTiers,
        [plotId]: (currentTier + 1) as GeneratorTier,
      },
    }));
  },

  getSubParcels: (plotId) => {
    const state = get();
    if (state.subParcels[plotId]) return state.subParcels[plotId];
    return generateSubParcels(plotId);
  },

  buildStructure: (plotId, subId, buildingType, cost) => {
    const state = get();
    if (state.player.frntBalance < cost) return;
    const existing = state.subParcels[plotId] ?? generateSubParcels(plotId);
    const updated = existing.map((sp) =>
      sp.subId === subId ? { ...sp, buildingType, durability: 100 } : sp,
    );
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      subParcels: { ...s.subParcels, [plotId]: updated },
    }));
  },

  setPlotSpecialization: (plotId, spec) =>
    set((s) => ({
      plots: s.plots.map((p) =>
        p.id === plotId ? { ...p, specialization: spec } : p,
      ),
    })),

  upgradeStorage: (plotId) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    if (state.player.frntBalance < 150) return;
    if (state.player.resourceStorageCap >= 500) return;
    set((s) => ({
      player: {
        ...s.player,
        frntBalance: s.player.frntBalance - 150,
        resourceStorageCap: Math.min(500, s.player.resourceStorageCap + 50),
      },
    }));
  },

  getNetworkBonus: () => {
    const state = get();
    const ownedSpecs = new Set(
      state.plots
        .filter(
          (p) => state.player.plotsOwned.includes(p.id) && p.specialization,
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

  // Passive FRNTR drip: uses server-synced rate if available, else local calculation
  tickPassiveIncome: () => {
    const state = get();
    if (state.player.plotsOwned.length === 0) return;
    const plotCount = state.player.plotsOwned.length;
    // Use server-synced rate if available (divided by 86400 per second per plot)
    const serverRate = state.serverPassiveIncomePerDay;
    const TIER_BONUS: Record<number, number> = {
      1: 8 / 86400,
      2: 24 / 86400,
      3: 48 / 86400,
      4: 96 / 86400,
      5: 192 / 86400,
      6: 384 / 86400,
    };
    let totalFrntr = 0;
    if (serverRate > 0 && plotCount > 0) {
      // Server rate is total per day; convert to per-second tick
      totalFrntr = serverRate / 86400;
    } else {
      const BASE_PER_PLOT_PER_SEC = 7 / 86400; // 7 FRNTR/day fallback
      for (const plotId of state.player.plotsOwned) {
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot) continue;
        totalFrntr += BASE_PER_PLOT_PER_SEC;
        const tier = state.generatorTiers[plotId] ?? 0;
        if (tier > 0) totalFrntr += TIER_BONUS[tier] ?? 0;
      }
    }
    if (totalFrntr === 0) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance + totalFrntr },
    }));
  },

  // Gradual mineral drip: biome-based per-second accumulation
  tickMineralDrip: () => {
    const state = get();
    if (state.player.plotsOwned.length === 0) return;
    set((s) => {
      let dIron = 0;
      let dFuel = 0;
      let dXtal = 0;
      let dRare = 0;
      for (const plotId of s.player.plotsOwned) {
        const plot = s.plots.find((p) => p.id === plotId);
        if (!plot) continue;
        const rates = BIOME_DRIP[plot.biome] ?? [0.001, 0.001, 0.001, 0.001];
        const eff = (plot.efficiency ?? 90) / 100;
        const regenMult = Date.now() < plot.regenActiveUntil ? 1.2 : 1.0;
        const specMult = 1.0;
        dIron += rates[0] * eff * regenMult * specMult;
        dFuel += rates[1] * eff * regenMult * specMult;
        dXtal += rates[2] * eff * regenMult * specMult;
        dRare += rates[3] * eff * regenMult * specMult;
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

  // v1.0 phased rollout stubs (hidden features)
  compareModeActive: false,
  setComparePlotId: () => {},
  commanderAssignments: {},
  ownedCommanders: [] as any[],
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
