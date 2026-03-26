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
  rareEarth: "Advanced weapons, high-tier NFT minting, orbital systems",
};

export const BIOME_MINERAL_RATES: Record<
  string,
  { iron: number; fuel: number; crystal: number; rareEarth: number }
> = {
  Arctic: { iron: 2, fuel: 1, crystal: 8, rareEarth: 4 },
  Tundra: { iron: 3, fuel: 2, crystal: 6, rareEarth: 3 },
  Wasteland: { iron: 5, fuel: 3, crystal: 2, rareEarth: 2 },
  Desert: { iron: 3, fuel: 9, crystal: 1, rareEarth: 2 },
  Forest: { iron: 6, fuel: 4, crystal: 3, rareEarth: 1 },
  Grassland: { iron: 7, fuel: 5, crystal: 2, rareEarth: 1 },
  Coastal: { iron: 5, fuel: 7, crystal: 4, rareEarth: 3 },
  Volcanic: { iron: 8, fuel: 6, crystal: 3, rareEarth: 6 },
  Equatorial: { iron: 6, fuel: 8, crystal: 5, rareEarth: 2 },
  Ocean: { iron: 2, fuel: 5, crystal: 7, rareEarth: 5 },
  Mountain: { iron: 9, fuel: 3, crystal: 6, rareEarth: 4 },
  Toxic: { iron: 4, fuel: 2, crystal: 9, rareEarth: 7 },
};

export function getMineralYield(
  biome: string,
  efficiency: number,
  regenActive: boolean,
): { iron: number; fuel: number; crystal: number; rareEarth: number } {
  const base = BIOME_MINERAL_RATES[biome] ?? BIOME_MINERAL_RATES.Grassland;
  const mult = (efficiency / 100) * (regenActive ? 1.2 : 1.0);
  return {
    iron: Math.floor(base.iron * mult),
    fuel: Math.floor(base.fuel * mult),
    crystal: Math.floor(base.crystal * mult),
    rareEarth: Math.floor(base.rareEarth * mult),
  };
}

export function projectedMonthlyYield(
  biome: string,
  efficiency: number,
): { iron: number; fuel: number; crystal: number; rareEarth: number } {
  // Assume 10 mines per day × 30 days = 300 mines/month
  const single = getMineralYield(biome, efficiency, false);
  return {
    iron: single.iron * 300,
    fuel: single.fuel * 300,
    crystal: single.crystal * 300,
    rareEarth: single.rareEarth * 300,
  };
}
