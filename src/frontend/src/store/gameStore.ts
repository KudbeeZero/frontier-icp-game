import { create } from "zustand";

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

function generatePlots(): PlotData[] {
  const plots: PlotData[] = [];
  for (let i = 0; i < 10000; i++) {
    const lat = (Math.asin((2 * i) / 9999 - 1) * 180) / Math.PI;
    const lng = ((i * 137.508) % 360) - 180;
    const biome = BIOME_MAP[i % 20];
    const richness = ((i * 7 + 13) % 10) + 1;
    let owner: string | null = null;
    if (i < 500) owner = "NEXUS-7";
    else if (i < 1000) owner = "KRONOS";
    else if (i < 1500) owner = "VANGUARD";
    else if (i < 2000) owner = "SPECTRE";

    plots.push({
      id: i,
      lat,
      lng,
      biome,
      richness,
      owner,
      iron: owner ? (i % 8) * richness : 0,
      fuel: owner ? (i % 5) * richness : 0,
      crystal: owner ? (i % 6) * richness : 0,
      defenses: owner
        ? {
            turrets: i % 4,
            shields: i % 3,
            walls: i % 5,
          }
        : { turrets: 0, shields: 0, walls: 0 },
    });
  }
  return plots;
}

const MOCK_NAMES = [
  "Commander_X",
  "StarlordZ",
  "NovaPrime",
  "VoidHunter",
  "IronClaw",
  "NebulaKing",
  "CryptoWar",
  "ZeroHour",
  "PhantomOps",
  "DarkMatter",
];

function generateLeaderboard(): LeaderEntry[] {
  return MOCK_NAMES.map((name, i) => ({
    rank: i + 1,
    name,
    plotsOwned: Math.floor(500 / (i + 1)) + Math.floor(Math.random() * 20),
    frntEarned: Math.floor(10000 / (i + 1)) + Math.floor(Math.random() * 500),
    victories: Math.floor(100 / (i + 1)) + Math.floor(Math.random() * 10),
  }));
}

const FACTION_NAMES = ["NEXUS-7", "KRONOS", "VANGUARD", "SPECTRE"];

function generateCombatLog(): CombatEntry[] {
  const entries: CombatEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    const factionA = FACTION_NAMES[i % 4];
    const factionB = FACTION_NAMES[(i + 2) % 4];
    entries.push({
      id: i,
      timestamp: now - i * 180000,
      attacker: factionA,
      defender: factionB,
      fromPlot: i * 17,
      toPlot: i * 17 + 5,
      success: i % 3 !== 0,
    });
  }
  return entries;
}

const ALL_PLOTS = generatePlots();

// Standalone backend call — uses window.__backendActor if available, falls back to mock
export async function launchMissileBackend(
  fromPlotId: number,
  toPlotId: number,
  weaponType: string,
): Promise<{ success: boolean; error?: string }> {
  const actor = (window as any).__backendActor;
  if (!actor) {
    // Mock success for local/draft mode
    return { success: true };
  }
  try {
    const normalizedWeapon = weaponType.replace(/ /g, "_").toUpperCase();
    const result = await actor.launchMissile(
      BigInt(fromPlotId),
      BigInt(toPlotId),
      normalizedWeapon,
    );
    if (result.__kind__ === "err") {
      return { success: false, error: result.err };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Unknown error" };
  }
}

interface GameState {
  plots: PlotData[];
  player: PlayerData;
  selectedPlotId: number | null;
  activeWeapon: string | null;
  targetPlotId: number | null;
  combatLog: CombatEntry[];
  leaderboard: LeaderEntry[];
  orbitalEvent: OrbitalEvent | null;

  selectPlot: (id: number | null) => void;
  setActiveWeapon: (weapon: string) => void;
  setTargetPlotId: (id: number | null) => void;
  purchasePlot: (id: number) => void;
  claimResources: (id: number) => void;
  attack: (fromId: number, toId: number) => void;
  setAuth: (principal: string | null) => void;
  launchMissile: (
    fromPlotId: number,
    toPlotId: number,
    weaponType: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useGameStore = create<GameState>((set, get) => ({
  plots: ALL_PLOTS,
  player: {
    principal: null,
    iron: 250,
    fuel: 180,
    crystal: 95,
    frntBalance: 1250,
    plotsOwned: [],
    commanderType: null,
    commanderAtk: 0,
    commanderDef: 0,
  },
  selectedPlotId: null,
  activeWeapon: null,
  targetPlotId: null,
  combatLog: generateCombatLog(),
  leaderboard: generateLeaderboard(),
  orbitalEvent: {
    type: "Solar Flare",
    affectedBiomes: ["Desert", "Arctic"],
    expiresAt: Date.now() + 3600000,
  },

  selectPlot: (id) => set({ selectedPlotId: id }),
  setActiveWeapon: (weapon) => set({ activeWeapon: weapon }),
  setTargetPlotId: (id) => set({ targetPlotId: id }),

  purchasePlot: (id) =>
    set((state) => {
      const plot = state.plots.find((p) => p.id === id);
      if (!plot || plot.owner !== null) return state;
      if (state.player.frntBalance < 100) return state;
      return {
        plots: state.plots.map((p) =>
          p.id === id ? { ...p, owner: state.player.principal ?? "You" } : p,
        ),
        player: {
          ...state.player,
          frntBalance: state.player.frntBalance - 100,
          plotsOwned: [...state.player.plotsOwned, id],
        },
      };
    }),

  claimResources: (id) =>
    set((state) => {
      const plot = state.plots.find((p) => p.id === id);
      if (!plot) return state;
      const pOwner = state.player.principal ?? "You";
      if (plot.owner !== pOwner && !state.player.plotsOwned.includes(id))
        return state;
      return {
        plots: state.plots.map((p) =>
          p.id === id ? { ...p, iron: 0, fuel: 0, crystal: 0 } : p,
        ),
        player: {
          ...state.player,
          iron: state.player.iron + plot.iron,
          fuel: state.player.fuel + plot.fuel,
          crystal: state.player.crystal + plot.crystal,
        },
      };
    }),

  attack: (fromId, toId) => {
    const state = get();
    const from = state.plots.find((p) => p.id === fromId);
    const to = state.plots.find((p) => p.id === toId);
    if (!from || !to) return;
    const atkPower = 10 + state.player.commanderAtk;
    const defPower =
      to.defenses.turrets * 3 +
      to.defenses.shields * 5 +
      to.defenses.walls * 2 +
      5;
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
        ? {
            ...s.player,
            plotsOwned: [...s.player.plotsOwned, toId],
          }
        : s.player,
    }));
  },

  setAuth: (principal) =>
    set((state) => ({
      player: { ...state.player, principal },
    })),

  launchMissile: async (fromPlotId, toPlotId, weaponType) => {
    const result = await launchMissileBackend(fromPlotId, toPlotId, weaponType);
    if (result.success) {
      const state = get();
      const to = state.plots.find((p) => p.id === toPlotId);
      const entry: CombatEntry = {
        id: Date.now(),
        timestamp: Date.now(),
        attacker: state.player.principal ?? "You",
        defender: to?.owner ?? "Unclaimed",
        fromPlot: fromPlotId,
        toPlot: toPlotId,
        success: true,
      };
      set((s) => ({ combatLog: [entry, ...s.combatLog.slice(0, 49)] }));
    }
    return result;
  },
}));
