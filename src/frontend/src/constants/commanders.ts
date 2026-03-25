export type CommanderTier =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY";

export const TIER_COLORS: Record<CommanderTier, string> = {
  COMMON: "#6b7280",
  UNCOMMON: "#22c55e",
  RARE: "#3b82f6",
  EPIC: "#a855f7",
  LEGENDARY: "#f59e0b",
};

export const COMMANDERS = [
  // ── COMMON ────────────────────────────────────────────────────────
  {
    id: "private",
    name: "PRIVATE",
    atk: 18,
    def: 15,
    tier: "COMMON" as CommanderTier,
    rarityBonus: 0.02,
    icpPrice: 0.1,
    badge:
      "/assets/generated/commander-private-badge-transparent.dim_512x512.png",
    image:
      "/assets/generated/commander-private-badge-transparent.dim_512x512.png",
  },
  {
    id: "specialist",
    name: "SPECIALIST",
    atk: 22,
    def: 20,
    tier: "COMMON" as CommanderTier,
    rarityBonus: 0.03,
    icpPrice: 0.15,
    badge:
      "/assets/generated/commander-specialist-badge-transparent.dim_512x512.png",
    image:
      "/assets/generated/commander-specialist-badge-transparent.dim_512x512.png",
  },
  // ── UNCOMMON ──────────────────────────────────────────────────────
  {
    id: "corporal",
    name: "CORPORAL",
    atk: 32,
    def: 28,
    tier: "UNCOMMON" as CommanderTier,
    rarityBonus: 0.05,
    icpPrice: 0.3,
    badge:
      "/assets/generated/commander-corporal-badge-transparent.dim_512x512.png",
    image:
      "/assets/generated/commander-corporal-badge-transparent.dim_512x512.png",
  },
  {
    id: "sergeant",
    name: "SERGEANT",
    atk: 42,
    def: 38,
    tier: "UNCOMMON" as CommanderTier,
    rarityBonus: 0.07,
    icpPrice: 0.5,
    badge:
      "/assets/generated/commander-sergeant-badge-transparent.dim_512x512.png",
    image:
      "/assets/generated/commander-sergeant-badge-transparent.dim_512x512.png",
  },
  // ── RARE ──────────────────────────────────────────────────────────
  {
    id: "sfc",
    name: "SGT FIRST CLASS",
    atk: 55,
    def: 52,
    tier: "RARE" as CommanderTier,
    rarityBonus: 0.1,
    icpPrice: 0.75,
    badge: "/assets/generated/commander-sfc-badge-transparent.dim_512x512.png",
    image: "/assets/generated/commander-sfc-badge-transparent.dim_512x512.png",
  },
  // ── EPIC ──────────────────────────────────────────────────────────
  {
    id: "iron-claw",
    name: "IRON CLAW",
    atk: 70,
    def: 90,
    tier: "EPIC" as CommanderTier,
    rarityBonus: 0.15,
    icpPrice: 1.5,
    badge: "/assets/generated/commander-iron-claw-transparent.dim_300x300.png",
    image: "/assets/generated/commander-iron-claw-transparent.dim_300x300.png",
  },
  {
    id: "void-hunter",
    name: "VOID HUNTER",
    atk: 62,
    def: 81,
    tier: "EPIC" as CommanderTier,
    rarityBonus: 0.15,
    icpPrice: 1.5,
    badge:
      "/assets/generated/commander-void-hunter-transparent.dim_300x300.png",
    image:
      "/assets/generated/commander-void-hunter-transparent.dim_300x300.png",
  },
  // ── LEGENDARY ─────────────────────────────────────────────────────
  {
    id: "nova-prime",
    name: "NOVA PRIME",
    atk: 85,
    def: 72,
    tier: "LEGENDARY" as CommanderTier,
    rarityBonus: 0.2,
    icpPrice: 2.5,
    badge: "/assets/generated/commander-nova-prime-transparent.dim_300x300.png",
    image: "/assets/generated/commander-nova-prime-transparent.dim_300x300.png",
  },
  {
    id: "phantom-ops",
    name: "PHANTOM OPS",
    atk: 95,
    def: 55,
    tier: "LEGENDARY" as CommanderTier,
    rarityBonus: 0.2,
    icpPrice: 2.5,
    badge:
      "/assets/generated/commander-phantom-ops-transparent.dim_300x300.png",
    image:
      "/assets/generated/commander-phantom-ops-transparent.dim_300x300.png",
  },
];

/** Look up a commander by its lowercase-hyphenated id */
export function getCommander(id: string) {
  return COMMANDERS.find((c) => c.id === id) ?? null;
}

/** Legacy name-based lookup for backwards compat */
export function getCommanderByName(name: string) {
  return COMMANDERS.find((c) => c.name === name) ?? null;
}

// Keep legacy rarity alias so old code that reads c.rarity still compiles
export type CommanderRarity = CommanderTier;
