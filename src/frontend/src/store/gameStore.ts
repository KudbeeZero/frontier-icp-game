import { create } from "zustand";
import { ARTILLERY_CONFIGS } from "../constants/artillery";
import {
  type MilitaryBranch,
  type OwnedCommander,
  getArchetype,
  getCommander,
} from "../constants/commanders";
import { INTERCEPTOR_CONFIGS } from "../constants/interceptors";
import { getMineralYield } from "../constants/minerals";
import { MISSILE_CONFIGS } from "../constants/missiles";
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

export const FACTION_COLORS: Record<string, string> = {
  "NEXUS-7": "#EF4444",
  KRONOS: "#8B5CF6",
  VANGUARD: "#22C3C9",
  SPECTRE: "#F59E0B",
};

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

export type BattleFormation =
  | "SWARM"
  | "PRECISION_STRIKE"
  | "SUPPRESSION"
  | "STEALTH";

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
  structuralDamage: number; // 0-100
  buildingsDisabled: boolean;
  isDestroyed: boolean;
}

export interface PlayerData {
  principal: string | null;
  iron: number;
  fuel: number;
  crystal: number;
  rareEarth: number;
  frntBalance: number;
  plotsOwned: number[];
  commanderType: string | null;
  commanderAtk: number;
  commanderDef: number;
  faction: string | null;
  weaponInventory: Record<string, number>;
  mockIcpBalance: number;
  resourceStorageCap: number;
}

export interface CombatEntry {
  id: number;
  timestamp: number;
  attacker: string;
  defender: string;
  fromPlot: number;
  toPlot: number;
  success: boolean;
  formationUsed?: BattleFormation;
  damageDealt?: number;
  intercepted?: boolean;
  interceptorType?: string;
}

export interface LeaderEntry {
  rank: number;
  name: string;
  plotsOwned: number;
  frntEarned: number;
  victories: number;
}

export interface OrbitalEvent {
  type: string;
  affectedBiomes: Biome[];
  expiresAt: number;
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

export type PlayerRank = "Lieutenant" | "Captain" | "Colonel" | "General";

export interface RankStats {
  missionsLaunched: number;
  plotsOwned: number;
  combatWins: number;
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

function randomBiome(seed: number): Biome {
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
    owner:
      i % 853 === 0
        ? "NEXUS-7"
        : i % 787 === 0
          ? "KRONOS"
          : i % 1021 === 0
            ? "VANGUARD"
            : i % 947 === 0
              ? "SPECTRE"
              : null,
    iron: 0,
    fuel: 0,
    crystal: 0,
    rareEarth: 0,
    defenses: { turrets: 0, shields: 0, walls: 0 },
    specialization: null,
    structuralDamage: 0,
    buildingsDisabled: false,
    isDestroyed: false,
  }));
}

function generateCombatLog(): CombatEntry[] {
  const factions = ["NEXUS-7", "KRONOS", "VANGUARD", "SPECTRE"];
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    timestamp: Date.now() - i * 1000 * 60 * 3,
    attacker: factions[i % 4],
    defender: factions[(i + 2) % 4],
    fromPlot: Math.floor(Math.random() * 200),
    toPlot: Math.floor(Math.random() * 200),
    success: i % 3 !== 0,
    formationUsed: (
      [
        "SWARM",
        "PRECISION_STRIKE",
        "SUPPRESSION",
        "STEALTH",
      ] as BattleFormation[]
    )[i % 4],
    damageDealt: Math.floor(Math.random() * 40) + 5,
    intercepted: i % 5 === 0,
  }));
}

function generateLeaderboard(): LeaderEntry[] {
  return [
    {
      rank: 1,
      name: "NEXUS-7",
      plotsOwned: 42,
      frntEarned: 18340,
      victories: 87,
    },
    {
      rank: 2,
      name: "KRONOS",
      plotsOwned: 35,
      frntEarned: 14200,
      victories: 71,
    },
    {
      rank: 3,
      name: "VANGUARD",
      plotsOwned: 28,
      frntEarned: 11800,
      victories: 55,
    },
    {
      rank: 4,
      name: "SPECTRE",
      plotsOwned: 21,
      frntEarned: 9100,
      victories: 43,
    },
    {
      rank: 5,
      name: "PHANTOM-9",
      plotsOwned: 15,
      frntEarned: 6400,
      victories: 29,
    },
  ];
}

// ──────────────────────────────────────────────
// Battle engine helpers
// ──────────────────────────────────────────────
const BIOME_STATS: Record<Biome, { atk: number; def: number }> = {
  Volcanic: { atk: 18, def: 5 },
  Desert: { atk: 15, def: 8 },
  Mountain: { atk: 10, def: 18 },
  Arctic: { atk: 8, def: 14 },
  Forest: { atk: 10, def: 10 },
  Grassland: { atk: 10, def: 10 },
  Ocean: { atk: 9, def: 11 },
  Toxic: { atk: 14, def: 7 },
};

function computePlotATK(
  plot: PlotData,
  subParcels: SubParcel[],
  commanderAtk: number,
): number {
  let atk = BIOME_STATS[plot.biome].atk + commanderAtk;
  let mult = 1.0;
  for (const sp of subParcels) {
    if (!sp.buildingType) continue;
    const bt = sp.buildingType.toUpperCase();
    if (bt.includes("MISSILE_SILO") || bt.includes("SILO")) atk += 12;
    if (bt.includes("CYCLES_REACTOR") || bt.includes("REACTOR")) mult += 0.1;
  }
  return atk * mult;
}

function computePlotDEF(
  plot: PlotData,
  subParcels: SubParcel[],
  commanderDef: number,
): number {
  let def = BIOME_STATS[plot.biome].def + commanderDef;
  let mult = 1.0;
  for (const sp of subParcels) {
    if (!sp.buildingType) continue;
    const bt = sp.buildingType.toUpperCase();
    if (bt.includes("DEFENSE_TOWER") || bt.includes("TOWER")) def += 15;
    if (bt.includes("SHIELD_GENERATOR") || bt.includes("SHIELD")) def += 10;
    if (bt.includes("CYCLES_REACTOR") || bt.includes("REACTOR")) mult += 0.1;
    if (bt.includes("RADAR_STATION") || bt.includes("RADAR")) mult -= 0.15;
  }
  return def * mult;
}

export function getPlotCombatStats(
  plot: PlotData,
  subParcels: SubParcel[],
  commanderAtk = 0,
  commanderDef = 0,
): { atk: number; def: number } {
  return {
    atk: computePlotATK(plot, subParcels, commanderAtk),
    def: computePlotDEF(plot, subParcels, commanderDef),
  };
}

const ALL_PLOTS = generatePlots();

const INITIAL_ARSENAL_INVENTORY: Record<string, number> = Object.fromEntries(
  MISSILE_CONFIGS.map((m) => [m.id, m.qty]),
);
const INITIAL_ARTILLERY_INVENTORY: Record<string, number> = Object.fromEntries(
  ARTILLERY_CONFIGS.map((a) => [a.id, a.qty]),
);
const INITIAL_INTERCEPTOR_INVENTORY: Record<string, number> =
  Object.fromEntries(INTERCEPTOR_CONFIGS.map((i) => [i.id, i.qty]));

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

interface GameState {
  plots: PlotData[];
  player: PlayerData;
  selectedPlotId: number | null;
  selectedWorldPoint: [number, number, number] | null;
  targetPlotId: number | null;
  combatLog: CombatEntry[];
  leaderboard: LeaderEntry[];
  orbitalEvent: OrbitalEvent | null;
  subParcels: Record<number, SubParcel[]>;
  activeWeapon: string | null;
  hoveredPlotId: number | null;
  plotHoverCard: PlotHoverCard | null;
  commanderAssignments: Record<number, string>;
  plotPurchaseTimes: Record<number, number>;
  rankStats: RankStats;
  equippedMissileId: string | null;
  arsenalInventory: Record<string, number>;
  artilleryInventory: Record<string, number>;
  interceptorInventory: Record<string, number>;
  assignedInterceptors: Record<number, string>;
  ownedCommanders: OwnedCommander[];
  ownedCommanderIds: string[];
  commanderUpgrades: Record<string, number>;
  compareModeActive: boolean;
  comparePlotId: number | null;

  selectPlot: (id: number | null) => void;
  setSelectedWorldPoint: (p: [number, number, number] | null) => void;
  purchasePlot: (id: number) => void;
  claimResources: (id: number) => void;
  mineResources: (id: number) => {
    iron: number;
    fuel: number;
    crystal: number;
    rareEarth: number;
  } | null;
  activateRegenBoost: (id: number) => void;
  claimAllFrntr: (amount: number) => void;
  mintTestTokens: () => void;
  attack: (fromId: number, toId: number) => void;
  resolveBattle: (
    fromId: number,
    toId: number,
    formation: BattleFormation,
    missileId: string,
  ) => void;
  repairPlot: (plotId: number) => void;
  setAuth: (principal: string | null) => void;
  getSubParcels: (plotId: number) => SubParcel[];
  buildStructure: (
    plotId: number,
    subId: number,
    buildingType: string,
    cost: number,
  ) => void;
  setActiveWeapon: (weapon: string | null) => void;
  setTargetPlotId: (id: number | null) => void;
  setPlotHoverCard: (card: PlotHoverCard | null) => void;
  setHoveredPlotId: (id: number | null) => void;
  setFaction: (faction: string | null) => void;
  buyWeapon: (weaponName: string) => void;
  selectCommander: (id: string, atk: number, def: number) => void;
  assignCommanderToPlot: (plotId: number, instanceId: string) => void;
  removeCommanderFromPlot: (plotId: number) => void;
  setEquippedMissile: (id: string) => void;
  fireArsenalMissile: (missileId: string) => void;
  fireArtillery: (artilleryId: string) => void;
  assignInterceptorToPlot: (plotId: number, interceptorId: string) => void;
  purchaseArchetype: (archetypeId: MilitaryBranch) => boolean;
  promoteCommander: (instanceId: string) => boolean;
  purchaseCommander: (commanderId: string) => boolean;
  upgradeCommander: (commanderId: string, frntrCost: number) => boolean;
  setPlotSpecialization: (plotId: number, spec: PlotSpecialization) => void;
  upgradeStorage: (plotId: number) => void;
  getNetworkBonus: () => boolean;
  setComparePlotId: (id: number | null) => void;
  setCompareModeActive: (active: boolean) => void;
  upgradeElectricity: (plotId: number) => void;
  tickPassiveIncome: () => void;
  tickMineralDrip: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  plots: ALL_PLOTS,
  player: {
    principal: null,
    iron: 0,
    fuel: 0,
    crystal: 0,
    rareEarth: 0,
    frntBalance: 0,
    plotsOwned: [],
    commanderType: null,
    commanderAtk: 0,
    commanderDef: 0,
    faction: null,
    weaponInventory: {
      "BALLISTIC ICBM": 8,
      "CRUISE MISSILE": 12,
      "EMP WARHEAD": 3,
      "MIRV STRIKE": 2,
      INTERCEPTOR: 15,
      "ORBITAL RAIL": 1,
    },
    mockIcpBalance: 5.0,
    resourceStorageCap: 200,
  },
  selectedPlotId: null,
  selectedWorldPoint: null,
  targetPlotId: null,
  combatLog: generateCombatLog(),
  leaderboard: generateLeaderboard(),
  orbitalEvent: {
    type: "Solar Flare",
    affectedBiomes: ["Desert", "Volcanic"] as Biome[],
    expiresAt: Date.now() + 1000 * 60 * 30,
  },
  subParcels: {},
  activeWeapon: null,
  hoveredPlotId: null,
  plotHoverCard: null,
  commanderAssignments: {},
  plotPurchaseTimes: {},
  rankStats: { missionsLaunched: 0, plotsOwned: 0, combatWins: 0 },
  equippedMissileId: MISSILE_CONFIGS[0]?.id ?? null,
  arsenalInventory: INITIAL_ARSENAL_INVENTORY,
  artilleryInventory: INITIAL_ARTILLERY_INVENTORY,
  interceptorInventory: INITIAL_INTERCEPTOR_INVENTORY,
  assignedInterceptors: {},
  ownedCommanders: [],
  ownedCommanderIds: [],
  commanderUpgrades: {},
  compareModeActive: false,
  comparePlotId: null,

  selectPlot: (id) => set({ selectedPlotId: id }),
  setSelectedWorldPoint: (p) => set({ selectedWorldPoint: p }),

  setComparePlotId: (id) => set({ comparePlotId: id }),
  setCompareModeActive: (active) =>
    set({ compareModeActive: active, comparePlotId: active ? null : null }),

  setTargetPlotId: (id) => set({ targetPlotId: id }),
  setPlotHoverCard: (card) => set({ plotHoverCard: card }),
  setHoveredPlotId: (id) => set({ hoveredPlotId: id }),
  setFaction: (faction) =>
    set((state) => ({ player: { ...state.player, faction } })),
  setActiveWeapon: (weapon) => set({ activeWeapon: weapon }),
  setEquippedMissile: (id) => set({ equippedMissileId: id }),

  fireArsenalMissile: (missileId) =>
    set((s) => ({
      arsenalInventory: {
        ...s.arsenalInventory,
        [missileId]: Math.max(0, (s.arsenalInventory[missileId] ?? 0) - 1),
      },
      rankStats: {
        ...s.rankStats,
        missionsLaunched: s.rankStats.missionsLaunched + 1,
      },
    })),

  fireArtillery: (artilleryId) =>
    set((s) => ({
      artilleryInventory: {
        ...s.artilleryInventory,
        [artilleryId]: Math.max(
          0,
          (s.artilleryInventory[artilleryId] ?? 0) - 1,
        ),
      },
      rankStats: {
        ...s.rankStats,
        missionsLaunched: s.rankStats.missionsLaunched + 1,
      },
    })),

  assignInterceptorToPlot: (plotId, interceptorId) =>
    set((s) => ({
      assignedInterceptors: {
        ...s.assignedInterceptors,
        [plotId]: interceptorId,
      },
      interceptorInventory: {
        ...s.interceptorInventory,
        [interceptorId]: Math.max(
          0,
          (s.interceptorInventory[interceptorId] ?? 0) - 1,
        ),
      },
    })),

  selectCommander: (id, atk, def) =>
    set((state) => ({
      player: {
        ...state.player,
        commanderType: id,
        commanderAtk: atk,
        commanderDef: def,
      },
    })),

  purchasePlot: (id) => {
    const state = get();
    if (state.player.plotsOwned.includes(id)) return;
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return;
    const cost = 100;
    if (state.player.frntBalance < cost) return;
    const subParcels = generateSubParcels(id);
    set((s) => ({
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
      rankStats: { ...s.rankStats, plotsOwned: s.rankStats.plotsOwned + 1 },
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
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance + amount },
    })),

  mintTestTokens: () =>
    set((s) => ({
      player: {
        ...s.player,
        frntBalance: s.player.frntBalance + 500,
        mockIcpBalance: s.player.mockIcpBalance + 2,
      },
    })),

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

  buyWeapon: (weaponName) => {
    const costs: Record<string, number> = {
      "BALLISTIC ICBM": 80,
      "CRUISE MISSILE": 40,
      "EMP WARHEAD": 120,
      "MIRV STRIKE": 200,
      INTERCEPTOR: 30,
      "ORBITAL RAIL": 500,
    };
    const cost = costs[weaponName] ?? 100;
    const state = get();
    if (state.player.frntBalance < cost) return;
    set((s) => ({
      player: {
        ...s.player,
        frntBalance: s.player.frntBalance - cost,
        weaponInventory: {
          ...s.player.weaponInventory,
          [weaponName]: (s.player.weaponInventory[weaponName] ?? 0) + 1,
        },
      },
    }));
  },

  attack: (fromId, toId) => {
    get().resolveBattle(fromId, toId, "PRECISION_STRIKE", "");
  },

  resolveBattle: (fromId, toId, formation, _missileId) => {
    const state = get();
    const from = state.plots.find((p) => p.id === fromId);
    const to = state.plots.find((p) => p.id === toId);
    if (!from || !to) return;

    const fromParcels = state.subParcels[fromId] ?? generateSubParcels(fromId);
    const toParcels = state.subParcels[toId] ?? generateSubParcels(toId);

    // Layer 3 commanders
    const atkCmdId = state.commanderAssignments[fromId];
    const defCmdId = state.commanderAssignments[toId];
    const atkCmd = atkCmdId ? getCommander(atkCmdId) : null;
    const defCmd = defCmdId ? getCommander(defCmdId) : null;
    const atkCmdBonus = atkCmd ? atkCmd.atk : 0;
    const defCmdBonus = defCmd ? defCmd.def : 0;

    // Compute base ATK / DEF
    const atkPower = computePlotATK(from, fromParcels, atkCmdBonus);
    const defPower = computePlotDEF(to, toParcels, defCmdBonus);

    // Check radar debuff on attacker hit chance
    let hasRadar = false;
    for (const sp of toParcels) {
      if (
        sp.buildingType &&
        (sp.buildingType.toUpperCase().includes("RADAR") ||
          sp.buildingType.toUpperCase().includes("RADAR_STATION"))
      ) {
        hasRadar = true;
        break;
      }
    }

    // Layer 4 interceptors
    const interceptorChances: Record<string, number> = {
      IRON_DOME: 0.7,
      THAAD: 0.85,
      AEGIS: 0.9,
    };
    let intercepted = false;
    let interceptorType: string | undefined;

    if (!to.buildingsDisabled) {
      // Check sub-parcel buildings first
      for (const sp of toParcels) {
        if (!sp.buildingType) continue;
        const bt = sp.buildingType.toUpperCase();
        let chance = 0;
        let label = "";
        if (bt.includes("IRON_DOME") || bt.includes("IRON DOME")) {
          chance = interceptorChances.IRON_DOME;
          label = "IRON DOME-F";
        } else if (bt.includes("THAAD")) {
          chance = interceptorChances.THAAD;
          label = "THAAD-X";
        } else if (bt.includes("AEGIS")) {
          chance = interceptorChances.AEGIS;
          label = "AEGIS-S";
        }

        if (chance > 0) {
          const effectiveChance =
            formation === "STEALTH" ? chance * 0.5 : chance;
          if (Math.random() < effectiveChance) {
            intercepted = true;
            interceptorType = label;
            break;
          }
        }
      }

      // Also check assignedInterceptors map (from inventory assignment)
      if (!intercepted) {
        const assignedId = state.assignedInterceptors[toId];
        if (assignedId) {
          const id = assignedId.toUpperCase();
          let chance = 0;
          let label = "";
          if (
            id.includes("IRON_DOME") ||
            id.includes("IRON DOME") ||
            id.includes("IRON-DOME")
          ) {
            chance = 0.7;
            label = "IRON DOME-F";
          } else if (id.includes("THAAD")) {
            chance = 0.85;
            label = "THAAD-X";
          } else if (id.includes("AEGIS")) {
            chance = 0.9;
            label = "AEGIS-S";
          }
          if (chance > 0) {
            const effectiveChance =
              formation === "STEALTH" ? chance * 0.5 : chance;
            if (Math.random() < effectiveChance) {
              intercepted = true;
              interceptorType = label;
            }
          }
        }
      }
    }

    // Formation modifiers
    let hitChance = 1.0;
    let damageMult = 1.0;
    let defBypass = 0;
    switch (formation) {
      case "SWARM":
        hitChance = 1.2;
        damageMult = 0.7;
        break;
      case "PRECISION_STRIKE":
        hitChance = 0.9;
        damageMult = 1.5;
        break;
      case "SUPPRESSION":
        hitChance = 1.05;
        damageMult = 1.0;
        defBypass = 0.5;
        break;
      case "STEALTH":
        hitChance = 1.0;
        damageMult = 1.0;
        break;
    }

    if (hasRadar) hitChance *= 0.85;

    const effectiveDef = defPower * (1 - defBypass);
    const success = !intercepted && atkPower * hitChance > effectiveDef * 0.8;

    // Calculate damage
    let damageDealt = 0;
    if (success) {
      const baseRange = formation === "PRECISION_STRIKE" ? 30 : 20;
      damageDealt = Math.floor(baseRange + Math.random() * 10) * damageMult;
    }

    const entry: CombatEntry = {
      id: Date.now(),
      timestamp: Date.now(),
      attacker: state.player.principal ?? "You",
      defender: to.owner ?? "Unclaimed",
      fromPlot: fromId,
      toPlot: toId,
      success,
      formationUsed: formation,
      damageDealt: Math.round(damageDealt),
      intercepted,
      interceptorType,
    };

    set((s) => {
      const updatedPlots = s.plots.map((p) => {
        if (p.id !== toId) return p;
        const newDamage = Math.min(100, p.structuralDamage + damageDealt);
        const disabled = newDamage >= 50;
        const destroyed = newDamage >= 100;
        return {
          ...p,
          structuralDamage: newDamage,
          buildingsDisabled: disabled,
          isDestroyed: destroyed,
        };
      });

      // Clear sub-parcels on destruction
      let updatedSubParcels = s.subParcels;
      if (success) {
        const tPlot = updatedPlots.find((p) => p.id === toId);
        if (tPlot?.isDestroyed && s.subParcels[toId]) {
          updatedSubParcels = {
            ...s.subParcels,
            [toId]: s.subParcels[toId].map((sp) => ({
              ...sp,
              buildingType: null,
            })),
          };
        }
      }

      return {
        combatLog: [entry, ...s.combatLog.slice(0, 49)],
        plots: updatedPlots,
        subParcels: updatedSubParcels,
        rankStats: {
          ...s.rankStats,
          missionsLaunched: s.rankStats.missionsLaunched + 1,
          combatWins: success
            ? s.rankStats.combatWins + 1
            : s.rankStats.combatWins,
        },
      };
    });
  },

  repairPlot: (plotId) => {
    const state = get();
    if (!state.player.plotsOwned.includes(plotId)) return;
    const cost = 100;
    if (state.player.frntBalance < cost) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      plots: s.plots.map((p) => {
        if (p.id !== plotId) return p;
        const newDamage = Math.max(0, p.structuralDamage - 25);
        return {
          ...p,
          structuralDamage: newDamage,
          buildingsDisabled: newDamage >= 50 ? p.buildingsDisabled : false,
          isDestroyed: newDamage > 0 ? p.isDestroyed : false,
        };
      }),
    }));
  },

  assignCommanderToPlot: (plotId, instanceId) =>
    set((state) => {
      if (!state.player.plotsOwned.includes(plotId)) return state;
      return {
        commanderAssignments: {
          ...state.commanderAssignments,
          [plotId]: instanceId,
        },
      };
    }),

  removeCommanderFromPlot: (plotId) =>
    set((state) => {
      const next = { ...state.commanderAssignments };
      delete next[plotId];
      return { commanderAssignments: next };
    }),

  purchaseArchetype: (archetypeId) => {
    const state = get();
    const arch = getArchetype(archetypeId);
    if (!arch) return false;
    if (state.player.mockIcpBalance < arch.startingICP) return false;
    const instanceId = `${archetypeId}:0:${Date.now()}`;
    const newCommander: OwnedCommander = {
      instanceId,
      archetypeId,
      currentRankIndex: 0,
    };
    set((s) => ({
      player: {
        ...s.player,
        mockIcpBalance:
          Math.round((s.player.mockIcpBalance - arch.startingICP) * 1000) /
          1000,
      },
      ownedCommanders: [...s.ownedCommanders, newCommander],
      ownedCommanderIds: [...s.ownedCommanderIds, instanceId],
    }));
    return true;
  },

  promoteCommander: (instanceId) => {
    const state = get();
    const idx = state.ownedCommanders.findIndex(
      (c) => c.instanceId === instanceId,
    );
    if (idx === -1) return false;
    const commander = state.ownedCommanders[idx];
    const arch = getArchetype(commander.archetypeId);
    if (!arch) return false;
    const nextRankIndex = commander.currentRankIndex + 1;
    if (nextRankIndex >= arch.rankProgression.length) return false;
    const nextRank = arch.rankProgression[nextRankIndex];
    const cost = nextRank.promotionCost;
    if (state.player.frntBalance < cost) return false;
    const updatedCommander: OwnedCommander = {
      ...commander,
      currentRankIndex: nextRankIndex,
    };
    const newInstanceId = `${commander.archetypeId}:${nextRankIndex}:${instanceId.split(":")[2] ?? Date.now()}`;
    updatedCommander.instanceId = newInstanceId;
    const updatedAssignments = { ...state.commanderAssignments };
    for (const [pid, cid] of Object.entries(updatedAssignments)) {
      if (cid === instanceId)
        updatedAssignments[Number.parseInt(pid)] = newInstanceId;
    }
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      ownedCommanders: s.ownedCommanders.map((c, i) =>
        i === idx ? updatedCommander : c,
      ),
      ownedCommanderIds: s.ownedCommanderIds.map((id) =>
        id === instanceId ? newInstanceId : id,
      ),
      commanderAssignments: updatedAssignments,
    }));
    return true;
  },

  purchaseCommander: (commanderId) =>
    get().purchaseArchetype(commanderId as MilitaryBranch),
  upgradeCommander: (commanderId, _frntrCost) =>
    get().promoteCommander(commanderId),
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
    return ownedSpecs.size >= 4;
  },

  setAuth: (principal) =>
    set((state) => ({ player: { ...state.player, principal } })),

  // Passive FRNTR drip: 7 FRNTR/day per plot + Electricity upgrade bonus
  tickPassiveIncome: () => {
    const state = get();
    if (state.player.plotsOwned.length === 0) return;
    const BASE_PER_PLOT_PER_SEC = 7 / 86400; // 7 FRNTR/day
    const ELEC_BONUS: Record<number, number> = {
      1: 8 / 86400,
      2: 24 / 86400,
      3: 48 / 86400,
    };
    let totalFrntr = 0;
    for (const plotId of state.player.plotsOwned) {
      const plot = state.plots.find((p) => p.id === plotId);
      if (!plot || plot.isDestroyed) continue;
      totalFrntr += BASE_PER_PLOT_PER_SEC;
      // Electricity upgrade bonus from center sub-parcel (index 0)
      const parcels = state.subParcels[plotId] ?? [];
      const centerParcel = parcels[0];
      if (centerParcel?.buildingType?.toUpperCase().includes("ELECTRICITY")) {
        const level = (state.commanderUpgrades[`electricity_${plotId}`] ??
          0) as number;
        if (level > 0) totalFrntr += ELEC_BONUS[level] ?? 0;
      }
    }
    if (totalFrntr === 0) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance + totalFrntr },
    }));
  },

  upgradeElectricity: (plotId: number) => {
    const COSTS: Record<number, number> = { 1: 500, 2: 1500, 3: 4000 };
    const state = get();
    const key = `electricity_${plotId}`;
    const currentLevel = (state.commanderUpgrades[key] ?? 0) as number;
    if (currentLevel >= 3) return;
    const cost = COSTS[currentLevel + 1];
    if (!cost || state.player.frntBalance < cost) return;
    set((s) => ({
      player: { ...s.player, frntBalance: s.player.frntBalance - cost },
      commanderUpgrades: { ...s.commanderUpgrades, [key]: currentLevel + 1 },
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
        if (!plot || plot.isDestroyed) continue;
        const rates = BIOME_DRIP[plot.biome] ?? [0.001, 0.001, 0.001, 0.001];
        const eff = (plot.efficiency ?? 90) / 100;
        const regenMult = Date.now() < plot.regenActiveUntil ? 1.2 : 1.0;
        const specMult = plot.specialization === "RESOURCES" ? 1.15 : 1.0;
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
}));
