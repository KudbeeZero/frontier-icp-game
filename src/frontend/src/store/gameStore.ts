import { create } from "zustand";
import {
  type MilitaryBranch,
  type OwnedCommander,
  commanderEffectiveAtk,
  commanderEffectiveDef,
  commanderFrntrBonus,
  getArchetype,
  getCommander,
  getCurrentRank,
} from "../constants/commanders";

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

export interface PlotData {
  id: number;
  lat: number;
  lng: number;
  biome: Biome;
  richness: number;
  owner: string | null;
  iron: number;
  fuel: number;
  crystal: number;
  defenses: { turrets: number; shields: number; walls: number };
}

export interface PlayerData {
  principal: string | null;
  iron: number;
  fuel: number;
  crystal: number;
  frntBalance: number;
  plotsOwned: number[];
  commanderType: string | null;
  commanderAtk: number;
  commanderDef: number;
  faction: string | null;
  weaponInventory: Record<string, number>;
  mockIcpBalance: number;
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
  const plots: PlotData[] = [];
  for (let i = 0; i < 200; i++) {
    plots.push({
      id: i,
      lat: Math.sin(i * 0.37) * 0.9 * 90,
      lng: ((i * 137.508) % 360) - 180,
      biome: randomBiome(i),
      richness: 1 + (i % 5),
      owner: i % 17 === 0 ? "NEXUS-7" : i % 13 === 0 ? "KRONOS" : null,
      iron: 0,
      fuel: 0,
      crystal: 0,
      defenses: {
        turrets: i % 17 === 0 ? 2 : 0,
        shields: i % 23 === 0 ? 1 : 0,
        walls: 0,
      },
    });
  }
  return plots;
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
    { rank: 5, name: "Player", plotsOwned: 0, frntEarned: 0, victories: 0 },
  ];
}

const ALL_PLOTS = generatePlots();

interface GameState {
  plots: PlotData[];
  player: PlayerData;
  selectedPlotId: number | null;
  targetPlotId: number | null;
  combatLog: CombatEntry[];
  leaderboard: LeaderEntry[];
  orbitalEvent: OrbitalEvent | null;
  subParcels: Record<number, SubParcel[]>;
  activeWeapon: string | null;
  hoveredPlotId: number | null;
  plotHoverCard: PlotHoverCard | null;
  commanderAssignments: Record<number, string>; // plotId -> instanceId
  plotPurchaseTimes: Record<number, number>;
  rankStats: RankStats;
  // New archetype system
  ownedCommanders: OwnedCommander[]; // replaces ownedCommanderIds
  ownedCommanderIds: string[]; // legacy compat: instanceIds
  commanderUpgrades: Record<string, number>; // legacy compat

  selectPlot: (id: number | null) => void;
  purchasePlot: (id: number) => void;
  claimResources: (id: number) => void;
  claimAllFrntr: (amount: number) => void;
  mintTestTokens: () => void;
  attack: (fromId: number, toId: number) => void;
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
  // New archetype actions
  purchaseArchetype: (archetypeId: MilitaryBranch) => boolean;
  promoteCommander: (instanceId: string) => boolean;
  // Legacy compat
  purchaseCommander: (commanderId: string) => boolean;
  upgradeCommander: (commanderId: string, frntrCost: number) => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  plots: ALL_PLOTS,
  player: {
    principal: null,
    iron: 0,
    fuel: 0,
    crystal: 0,
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
  },
  selectedPlotId: null,
  targetPlotId: null,
  combatLog: generateCombatLog(),
  leaderboard: generateLeaderboard(),
  orbitalEvent: {
    type: "Solar Flare",
    affectedBiomes: ["Desert", "Arctic"],
    expiresAt: Date.now() + 3600000,
  },
  subParcels: {},
  activeWeapon: null,
  hoveredPlotId: null,
  plotHoverCard: null,
  commanderAssignments: {},
  plotPurchaseTimes: {},
  rankStats: { missionsLaunched: 0, plotsOwned: 0, combatWins: 0 },
  ownedCommanders: [],
  ownedCommanderIds: [],
  commanderUpgrades: {},

  selectPlot: (id) => set({ selectedPlotId: id }),
  setActiveWeapon: (weapon) => set({ activeWeapon: weapon }),
  setTargetPlotId: (id) => set({ targetPlotId: id }),
  setPlotHoverCard: (card) => set({ plotHoverCard: card }),
  setHoveredPlotId: (id) => set({ hoveredPlotId: id }),
  setFaction: (faction) =>
    set((state) => ({ player: { ...state.player, faction } })),

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
    const state = get();
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) return;
    set((s) => ({
      player: {
        ...s.player,
        iron: s.player.iron + plot.iron,
        fuel: s.player.fuel + plot.fuel,
        crystal: s.player.crystal + plot.crystal,
      },
      plots: s.plots.map((p) =>
        p.id === id ? { ...p, iron: 0, fuel: 0, crystal: 0 } : p,
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
    const state = get();
    const from = state.plots.find((p) => p.id === fromId);
    const to = state.plots.find((p) => p.id === toId);
    if (!from || !to) return;

    const atkInstanceId = state.commanderAssignments[fromId];
    const defInstanceId = state.commanderAssignments[toId];
    const atkCmd = atkInstanceId ? getCommander(atkInstanceId) : null;
    const defCmd = defInstanceId ? getCommander(defInstanceId) : null;
    const atkBonus = atkCmd ? atkCmd.atk : 0;
    const defBonus = defCmd ? defCmd.def : 0;

    const atkPower = 10 + state.player.commanderAtk + atkBonus;
    const defPower =
      to.defenses.turrets * 3 +
      to.defenses.shields * 5 +
      to.defenses.walls * 2 +
      5 +
      defBonus;
    const success = atkPower * 10 > defPower * 7;

    const entry: CombatEntry = {
      id: Date.now(),
      timestamp: Date.now(),
      attacker: state.player.principal ?? "You",
      defender: to.owner ?? "Unclaimed",
      fromPlot: fromId,
      toPlot: toId,
      success,
    };

    set((s) => ({
      combatLog: [entry, ...s.combatLog.slice(0, 49)],
      plots: success
        ? s.plots.map((p) =>
            p.id === toId
              ? {
                  ...p,
                  owner: s.player.principal ?? "You",
                  defenses: { turrets: 0, shields: 0, walls: 0 },
                }
              : p,
          )
        : s.plots,
      player: success
        ? { ...s.player, plotsOwned: [...s.player.plotsOwned, toId] }
        : s.player,
      rankStats: {
        ...s.rankStats,
        missionsLaunched: s.rankStats.missionsLaunched + 1,
        combatWins: success
          ? s.rankStats.combatWins + 1
          : s.rankStats.combatWins,
      },
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

  // ── New archetype system ────────────────────────────────────────────────
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
    // Update instanceId to reflect new rank (for assignment lookup)
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

  // ── Legacy compat ───────────────────────────────────────────────────────
  purchaseCommander: (commanderId) =>
    get().purchaseArchetype(commanderId as MilitaryBranch),

  upgradeCommander: (commanderId, _frntrCost) =>
    get().promoteCommander(commanderId),

  setAuth: (principal) =>
    set((state) => ({ player: { ...state.player, principal } })),
}));
