/**
 * Single source of truth for all tier-related constants.
 * Every component that displays rates, costs, or names must import from here.
 *
 * Backend context:
 *   getCoreGeneratorTiers() returns bonusPerDay (bonus ABOVE the base 7 FRNTR/day).
 *   To get the TOTAL daily rate: totalRate = BASE_RATE + bonusPerDay
 */

/** Base generation rate for tier 0 (no upgrades). */
export const BASE_RATE = 7;

/**
 * Total FRNTR generated per day by tier (base included).
 * Tier 0 = 7, Tier 1 = 9, …, Tier 6 = 55
 */
export const TIER_DAILY_RATES: Record<number, number> = {
  0: 7,
  1: 9,
  2: 12,
  3: 17,
  4: 25,
  5: 37,
  6: 55,
};

/**
 * FRNTR cost to upgrade FROM the current tier TO the next tier.
 * Key = destination tier (tier you are upgrading TO).
 * e.g. UPGRADE_COSTS[1] = 500 means upgrading to Tier 1 costs 500 FRNTR.
 */
export const UPGRADE_COSTS: Record<number, number> = {
  1: 500,
  2: 1_500,
  3: 4_000,
  4: 10_000,
  5: 25_000,
  6: 60_000,
};

/** Human-readable name for each generator tier. */
export const TIER_NAMES: Record<number, string> = {
  0: "Outpost",
  1: "Generator",
  2: "Ion Capacitor",
  3: "Fusion Core",
  4: "Quantum Relay",
  5: "Neural Matrix",
  6: "Apex Nexus",
};

/**
 * Dot/badge colour for each biome.
 * Used in plot cards and the globe legend.
 */
export const BIOME_DOT: Record<string, string> = {
  Arctic: "#a8d8ea",
  Desert: "#e8c97a",
  Forest: "#4a9b5f",
  Ocean: "#1a6b9e",
  Mountain: "#7a6b5a",
  Volcanic: "#c0392b",
  Grassland: "#5aab4a",
  Toxic: "#7dba3a",
  Temperate: "#6ab04c",
  Tropical: "#27ae60",
  DeepOcean: "#0d3b6e",
  AsteroidImpact: "#8e44ad",
};
