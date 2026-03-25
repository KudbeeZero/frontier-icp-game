export const BIOME_TIER: Record<string, number> = {
  Arctic: 1,
  Tundra: 1,
  Wasteland: 1,
  Desert: 2,
  Forest: 2,
  Grassland: 2,
  Coastal: 3,
  Volcanic: 3,
  Equatorial: 4,
  Ocean: 4,
  Mountain: 4,
  Toxic: 1,
};

export interface MineralRate {
  iron: number;
  fuel: number;
  crystal: number;
  tickRate: number;
  label: string;
}

export const TIER_MINERALS: Record<number, MineralRate> = {
  1: { iron: 8, fuel: 2, crystal: 1, tickRate: 1, label: "Slow" },
  2: { iron: 6, fuel: 4, crystal: 3, tickRate: 2, label: "Medium" },
  3: { iron: 8, fuel: 5, crystal: 5, tickRate: 3, label: "Fast" },
  4: { iron: 8, fuel: 9, crystal: 8, tickRate: 5, label: "Very Fast" },
  5: { iron: 12, fuel: 12, crystal: 12, tickRate: 10, label: "Maximum" },
};

export const MINERAL_USES = {
  iron: "Physical structures (Silo, Airbase, Boundary Node)",
  fuel: "Powers units (F-16, drones, satellites)",
  crystal: "Cyber/tech (MCP Node, Chain Fusion, NNS Hub)",
};
