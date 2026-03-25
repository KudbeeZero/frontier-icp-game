// ── Military Archetype Commander System ─────────────────────────────────────

export type MilitaryBranch =
  | "ARMY_INFANTRY"
  | "ARMY_RANGER"
  | "MARINE"
  | "MILITARY_POLICE"
  | "WARRANT_OFFICER"
  | "AIR_FORCE";

export interface RankTier {
  id: string;
  name: string; // e.g. "Staff Sergeant"
  abbreviation: string; // e.g. "SSG"
  payGrade: string; // e.g. "E-6"
  atk: number;
  def: number;
  image: string; // path to rank insignia image
  promotionCost: number; // FRNTR cost to reach this rank (0 for starting rank)
  hasWings?: boolean; // Air Force only
}

export interface CommanderArchetype {
  id: MilitaryBranch;
  name: string;
  description: string;
  startingICP: number;
  archetypeBonus: string;
  frntrBonusPct: number; // multiplier on FRNTR generation
  atkMultiplier: number; // applied on top of base stats
  defMultiplier: number;
  badgeImage: string;
  rankProgression: RankTier[];
  hasWings?: boolean; // true when highest unlocked rank has wings
}

// ── Base stats by pay grade ────────────────────────────────────────────────
function baseStats(payGrade: string): { atk: number; def: number } {
  if (payGrade.startsWith("E")) {
    const n = Number.parseInt(payGrade.split("-")[1]);
    if (n <= 4) {
      const t = (n - 1) / 3;
      return { atk: Math.round(10 + t * 10), def: Math.round(10 + t * 10) };
    }
    const t = (n - 5) / 4;
    return { atk: Math.round(25 + t * 20), def: Math.round(25 + t * 20) };
  }
  if (payGrade.startsWith("W")) {
    const n = Number.parseInt(payGrade.split("-")[1]);
    const t = (n - 1) / 4;
    return { atk: Math.round(25 + t * 20), def: Math.round(25 + t * 20) };
  }
  if (payGrade.startsWith("O")) {
    const n = Number.parseInt(payGrade.split("-")[1]);
    if (n <= 3) {
      const t = (n - 1) / 2;
      return { atk: Math.round(50 + t * 15), def: Math.round(50 + t * 15) };
    }
    if (n <= 6) {
      const t = (n - 4) / 2;
      return { atk: Math.round(70 + t * 15), def: Math.round(70 + t * 15) };
    }
    const t = (n - 7) / 3;
    return { atk: Math.round(90 + t * 10), def: Math.round(90 + t * 10) };
  }
  return { atk: 10, def: 10 };
}

// ── Promotion costs ────────────────────────────────────────────────────────
const ARMY_PROMO_COSTS = [
  0, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000, 7500,
  10000, 15000, 20000, 30000, 50000,
];
const WO_PROMO_COSTS = [0, 500, 1000, 2000, 5000];

function ri(name: string) {
  return `/assets/generated/${name}.dim_200x200.png`;
}

function armyRankImage(payGrade: string): string {
  if (payGrade.startsWith("E")) {
    const n = Number.parseInt(payGrade.split("-")[1]);
    return n <= 4 ? ri("rank-army-enlisted-lower") : ri("rank-army-nco");
  }
  if (payGrade.startsWith("O")) {
    const n = Number.parseInt(payGrade.split("-")[1]);
    if (n <= 3) return ri("rank-army-officer-junior");
    if (n <= 6) return ri("rank-army-officer-field");
    return ri("rank-army-general");
  }
  return ri("rank-army-enlisted-lower");
}

function afRankImage(payGrade: string, hasWings: boolean): string {
  if (hasWings) {
    if (payGrade.startsWith("O")) {
      const n = Number.parseInt(payGrade.split("-")[1]);
      if (n >= 6) return ri("rank-af-command-pilot");
    }
    return ri("rank-af-wings");
  }
  return ri("rank-af-enlisted");
}

// ── 1. ARMY INFANTRY ──────────────────────────────────────────────────────
const ARMY_INFANTRY_RANKS: RankTier[] = [
  {
    id: "pvt",
    name: "Private",
    abbreviation: "PVT",
    payGrade: "E-1",
    ...baseStats("E-1"),
    image: armyRankImage("E-1"),
    promotionCost: ARMY_PROMO_COSTS[0],
  },
  {
    id: "pfc",
    name: "Private First Class",
    abbreviation: "PFC",
    payGrade: "E-2",
    ...baseStats("E-2"),
    image: armyRankImage("E-2"),
    promotionCost: ARMY_PROMO_COSTS[1],
  },
  {
    id: "spc",
    name: "Specialist",
    abbreviation: "SPC",
    payGrade: "E-3",
    ...baseStats("E-3"),
    image: armyRankImage("E-3"),
    promotionCost: ARMY_PROMO_COSTS[2],
  },
  {
    id: "cpl",
    name: "Corporal",
    abbreviation: "CPL",
    payGrade: "E-4",
    ...baseStats("E-4"),
    image: armyRankImage("E-4"),
    promotionCost: ARMY_PROMO_COSTS[3],
  },
  {
    id: "sgt",
    name: "Sergeant",
    abbreviation: "SGT",
    payGrade: "E-5",
    ...baseStats("E-5"),
    image: armyRankImage("E-5"),
    promotionCost: ARMY_PROMO_COSTS[4],
  },
  {
    id: "ssg",
    name: "Staff Sergeant",
    abbreviation: "SSG",
    payGrade: "E-6",
    ...baseStats("E-6"),
    image: armyRankImage("E-6"),
    promotionCost: ARMY_PROMO_COSTS[5],
  },
  {
    id: "sfc",
    name: "Sergeant First Class",
    abbreviation: "SFC",
    payGrade: "E-7",
    ...baseStats("E-7"),
    image: armyRankImage("E-7"),
    promotionCost: ARMY_PROMO_COSTS[6],
  },
  {
    id: "msg",
    name: "Master Sergeant",
    abbreviation: "MSG",
    payGrade: "E-8",
    ...baseStats("E-8"),
    image: armyRankImage("E-8"),
    promotionCost: ARMY_PROMO_COSTS[7],
  },
  {
    id: "sgm",
    name: "Sergeant Major",
    abbreviation: "SGM",
    payGrade: "E-9",
    ...baseStats("E-9"),
    image: armyRankImage("E-9"),
    promotionCost: ARMY_PROMO_COSTS[8],
  },
  {
    id: "2lt",
    name: "Second Lieutenant",
    abbreviation: "2LT",
    payGrade: "O-1",
    ...baseStats("O-1"),
    image: armyRankImage("O-1"),
    promotionCost: ARMY_PROMO_COSTS[9],
  },
  {
    id: "1lt",
    name: "First Lieutenant",
    abbreviation: "1LT",
    payGrade: "O-2",
    ...baseStats("O-2"),
    image: armyRankImage("O-2"),
    promotionCost: ARMY_PROMO_COSTS[10],
  },
  {
    id: "cpt",
    name: "Captain",
    abbreviation: "CPT",
    payGrade: "O-3",
    ...baseStats("O-3"),
    image: armyRankImage("O-3"),
    promotionCost: ARMY_PROMO_COSTS[11],
  },
  {
    id: "maj",
    name: "Major",
    abbreviation: "MAJ",
    payGrade: "O-4",
    ...baseStats("O-4"),
    image: armyRankImage("O-4"),
    promotionCost: ARMY_PROMO_COSTS[12],
  },
  {
    id: "ltc",
    name: "Lieutenant Colonel",
    abbreviation: "LTC",
    payGrade: "O-5",
    ...baseStats("O-5"),
    image: armyRankImage("O-5"),
    promotionCost: ARMY_PROMO_COSTS[13],
  },
  {
    id: "col",
    name: "Colonel",
    abbreviation: "COL",
    payGrade: "O-6",
    ...baseStats("O-6"),
    image: armyRankImage("O-6"),
    promotionCost: ARMY_PROMO_COSTS[14],
  },
  {
    id: "bg",
    name: "Brigadier General",
    abbreviation: "BG",
    payGrade: "O-7",
    ...baseStats("O-7"),
    image: armyRankImage("O-7"),
    promotionCost: ARMY_PROMO_COSTS[15],
  },
  {
    id: "mg",
    name: "Major General",
    abbreviation: "MG",
    payGrade: "O-8",
    ...baseStats("O-8"),
    image: armyRankImage("O-8"),
    promotionCost: ARMY_PROMO_COSTS[16],
  },
  {
    id: "ltg",
    name: "Lieutenant General",
    abbreviation: "LTG",
    payGrade: "O-9",
    ...baseStats("O-9"),
    image: armyRankImage("O-9"),
    promotionCost: ARMY_PROMO_COSTS[17],
  },
  {
    id: "gen",
    name: "General",
    abbreviation: "GEN",
    payGrade: "O-10",
    ...baseStats("O-10"),
    image: armyRankImage("O-10"),
    promotionCost: ARMY_PROMO_COSTS[18],
  },
];

// ── 2. ARMY RANGER (same rank ladder + Ranger tab overlay) ────────────────
const ARMY_RANGER_RANKS: RankTier[] = ARMY_INFANTRY_RANKS.map((r) => ({
  ...r,
  id: `ranger-${r.id}`,
  atk: Math.round(r.atk * 1.25),
}));

// ── 3. MARINE CORPS ───────────────────────────────────────────────────────
const MARINE_RANK_NAMES: Array<{
  name: string;
  abbr: string;
  payGrade: string;
}> = [
  { name: "Private", abbr: "PVT", payGrade: "E-1" },
  { name: "Private First Class", abbr: "PFC", payGrade: "E-2" },
  { name: "Lance Corporal", abbr: "LCpl", payGrade: "E-3" },
  { name: "Corporal", abbr: "Cpl", payGrade: "E-4" },
  { name: "Sergeant", abbr: "Sgt", payGrade: "E-5" },
  { name: "Staff Sergeant", abbr: "SSgt", payGrade: "E-6" },
  { name: "Gunnery Sergeant", abbr: "GySgt", payGrade: "E-7" },
  { name: "Master Sergeant", abbr: "MSgt", payGrade: "E-8" },
  { name: "Sergeant Major", abbr: "SgtMaj", payGrade: "E-9" },
  { name: "Second Lieutenant", abbr: "2ndLt", payGrade: "O-1" },
  { name: "First Lieutenant", abbr: "1stLt", payGrade: "O-2" },
  { name: "Captain", abbr: "Capt", payGrade: "O-3" },
  { name: "Major", abbr: "Maj", payGrade: "O-4" },
  { name: "Lieutenant Colonel", abbr: "LtCol", payGrade: "O-5" },
  { name: "Colonel", abbr: "Col", payGrade: "O-6" },
  { name: "Brigadier General", abbr: "BGen", payGrade: "O-7" },
  { name: "Major General", abbr: "MajGen", payGrade: "O-8" },
  { name: "Lieutenant General", abbr: "LtGen", payGrade: "O-9" },
  { name: "General", abbr: "Gen", payGrade: "O-10" },
];

const MARINE_RANKS: RankTier[] = MARINE_RANK_NAMES.map((r, i) => {
  const base = baseStats(r.payGrade);
  return {
    id: `marine-${r.abbr.toLowerCase()}`,
    name: r.name,
    abbreviation: r.abbr,
    payGrade: r.payGrade,
    atk: base.atk,
    def: Math.round(base.def * 1.3),
    image: ri("rank-marine"),
    promotionCost: r.payGrade.startsWith("E")
      ? ARMY_PROMO_COSTS[i]
      : ARMY_PROMO_COSTS[i],
  };
});

// ── 4. MILITARY POLICE ────────────────────────────────────────────────────
const MILITARY_POLICE_RANKS: RankTier[] = ARMY_INFANTRY_RANKS.map((r) => ({
  ...r,
  id: `mp-${r.id}`,
  name: `${r.name} (MP)`,
  image: ri("rank-mp"),
}));

// ── 5. WARRANT OFFICER ────────────────────────────────────────────────────
const WARRANT_OFFICER_RANKS: RankTier[] = [
  {
    id: "wo1",
    name: "Warrant Officer 1",
    abbreviation: "WO1",
    payGrade: "W-1",
    ...baseStats("W-1"),
    image: ri("rank-warrant-officer"),
    promotionCost: WO_PROMO_COSTS[0],
  },
  {
    id: "cw2",
    name: "Chief Warrant Officer 2",
    abbreviation: "CW2",
    payGrade: "W-2",
    ...baseStats("W-2"),
    image: ri("rank-warrant-officer"),
    promotionCost: WO_PROMO_COSTS[1],
  },
  {
    id: "cw3",
    name: "Chief Warrant Officer 3",
    abbreviation: "CW3",
    payGrade: "W-3",
    ...baseStats("W-3"),
    image: ri("rank-warrant-officer"),
    promotionCost: WO_PROMO_COSTS[2],
  },
  {
    id: "cw4",
    name: "Chief Warrant Officer 4",
    abbreviation: "CW4",
    payGrade: "W-4",
    ...baseStats("W-4"),
    image: ri("rank-warrant-officer"),
    promotionCost: WO_PROMO_COSTS[3],
  },
  {
    id: "cw5",
    name: "Chief Warrant Officer 5",
    abbreviation: "CW5",
    payGrade: "W-5",
    ...baseStats("W-5"),
    image: ri("rank-warrant-officer"),
    promotionCost: WO_PROMO_COSTS[4],
  },
];

// ── 6. AIR FORCE ──────────────────────────────────────────────────────────
const AF_RANK_DEFS: Array<{
  name: string;
  abbr: string;
  payGrade: string;
  wingsEarned?: boolean;
}> = [
  { name: "Airman Basic", abbr: "AB", payGrade: "E-1" },
  { name: "Airman", abbr: "Amn", payGrade: "E-2" },
  { name: "Airman First Class", abbr: "A1C", payGrade: "E-3" },
  { name: "Senior Airman", abbr: "SrA", payGrade: "E-4" },
  { name: "Staff Sergeant", abbr: "SSgt", payGrade: "E-5" },
  {
    name: "Technical Sergeant",
    abbr: "TSgt",
    payGrade: "E-6",
    wingsEarned: true,
  },
  { name: "Master Sergeant", abbr: "MSgt", payGrade: "E-7", wingsEarned: true },
  {
    name: "Senior Master Sgt",
    abbr: "SMSgt",
    payGrade: "E-8",
    wingsEarned: true,
  },
  {
    name: "Chief Master Sgt",
    abbr: "CMSgt",
    payGrade: "E-9",
    wingsEarned: true,
  },
  {
    name: "Second Lieutenant",
    abbr: "2Lt",
    payGrade: "O-1",
    wingsEarned: true,
  },
  { name: "First Lieutenant", abbr: "1Lt", payGrade: "O-2", wingsEarned: true },
  { name: "Captain", abbr: "Capt", payGrade: "O-3", wingsEarned: true },
  { name: "Major", abbr: "Maj", payGrade: "O-4", wingsEarned: true },
  {
    name: "Lieutenant Colonel",
    abbr: "LtCol",
    payGrade: "O-5",
    wingsEarned: true,
  },
  { name: "Colonel", abbr: "Col", payGrade: "O-6", wingsEarned: true },
  {
    name: "Brigadier General",
    abbr: "BGen",
    payGrade: "O-7",
    wingsEarned: true,
  },
  { name: "Major General", abbr: "MajGen", payGrade: "O-8", wingsEarned: true },
  {
    name: "Lieutenant General",
    abbr: "LtGen",
    payGrade: "O-9",
    wingsEarned: true,
  },
  {
    name: "General of the AF",
    abbr: "GAF",
    payGrade: "O-10",
    wingsEarned: true,
  },
];

const AF_RANKS: RankTier[] = AF_RANK_DEFS.map((r, i) => {
  const base = baseStats(r.payGrade);
  const hasWings = r.wingsEarned ?? false;
  const atk = hasWings ? Math.round(base.atk * 1.15) : base.atk;
  return {
    id: `af-${r.abbr.toLowerCase()}`,
    name: r.name,
    abbreviation: r.abbr,
    payGrade: r.payGrade,
    atk,
    def: base.def,
    image: afRankImage(r.payGrade, hasWings),
    promotionCost: ARMY_PROMO_COSTS[Math.min(i, ARMY_PROMO_COSTS.length - 1)],
    hasWings,
  };
});

// ── Archetype definitions ──────────────────────────────────────────────────
export const COMMANDER_ARCHETYPES: CommanderArchetype[] = [
  {
    id: "ARMY_INFANTRY",
    name: "Army Infantry",
    description:
      "Balanced ground forces commander. Reliable in all combat roles with strong FRNTR generation bonuses.",
    startingICP: 0.1,
    archetypeBonus: "+10% FRNTR generation per owned plot",
    frntrBonusPct: 0.1,
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    badgeImage: ri("rank-army-enlisted-lower"),
    rankProgression: ARMY_INFANTRY_RANKS,
  },
  {
    id: "ARMY_RANGER",
    name: "Army Ranger",
    description:
      "Elite strike specialist. Unlocks Ranger Strike ability and excels at offensive operations.",
    startingICP: 0.3,
    archetypeBonus: "+25% missile damage, unlocks Ranger Strike",
    frntrBonusPct: 0.05,
    atkMultiplier: 1.25,
    defMultiplier: 1.0,
    badgeImage: ri("rank-ranger-tab"),
    rankProgression: ARMY_RANGER_RANKS,
  },
  {
    id: "MARINE",
    name: "Marine Corps",
    description:
      "Defensive specialist. Superior plot fortification and amphibious assault capabilities.",
    startingICP: 0.3,
    archetypeBonus: "+30% plot defense, amphibious assault bonus",
    frntrBonusPct: 0.05,
    atkMultiplier: 1.0,
    defMultiplier: 1.3,
    badgeImage: ri("rank-marine"),
    rankProgression: MARINE_RANKS,
  },
  {
    id: "MILITARY_POLICE",
    name: "Military Police",
    description:
      "Territory control specialist. Can lock down enemy plots and protect mineral resources.",
    startingICP: 0.25,
    archetypeBonus: "Flag enemy plots for 1hr lockout, +15% mineral protection",
    frntrBonusPct: 0.07,
    atkMultiplier: 1.0,
    defMultiplier: 1.0,
    badgeImage: ri("rank-mp"),
    rankProgression: MILITARY_POLICE_RANKS,
  },
  {
    id: "WARRANT_OFFICER",
    name: "Warrant Officer",
    description:
      "Technical specialist. Maximizes building efficiency and mineral extraction rates.",
    startingICP: 0.4,
    archetypeBonus: "+20% building efficiency, +15% mineral drip rate",
    frntrBonusPct: 0.08,
    atkMultiplier: 1.2,
    defMultiplier: 1.2,
    badgeImage: ri("rank-warrant-officer"),
    rankProgression: WARRANT_OFFICER_RANKS,
  },
  {
    id: "AIR_FORCE",
    name: "Air Force Pilot",
    description:
      "Air superiority commander. Earns wings at TSgt, unlocking fighter plane assignment on plots with an Airbase.",
    startingICP: 0.5,
    archetypeBonus:
      "Earns wings at TSgt+ — unlocks F-16 assignment on Airbase plots",
    frntrBonusPct: 0.06,
    atkMultiplier: 1.15,
    defMultiplier: 1.0,
    badgeImage: ri("rank-af-enlisted"),
    rankProgression: AF_RANKS,
    hasWings: false,
  },
];

// ── Owned Commander instance ───────────────────────────────────────────────
export interface OwnedCommander {
  instanceId: string; // unique per purchase
  archetypeId: MilitaryBranch;
  currentRankIndex: number; // index into rankProgression
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function getArchetype(
  id: MilitaryBranch,
): CommanderArchetype | undefined {
  return COMMANDER_ARCHETYPES.find((a) => a.id === id);
}

export function getCurrentRank(
  commander: OwnedCommander,
): RankTier | undefined {
  const arch = getArchetype(commander.archetypeId);
  return arch?.rankProgression[commander.currentRankIndex];
}

export function getNextRank(commander: OwnedCommander): RankTier | undefined {
  const arch = getArchetype(commander.archetypeId);
  if (!arch) return undefined;
  return arch.rankProgression[commander.currentRankIndex + 1];
}

export function commanderHasWings(commander: OwnedCommander): boolean {
  const rank = getCurrentRank(commander);
  return rank?.hasWings ?? false;
}

export function commanderEffectiveAtk(commander: OwnedCommander): number {
  const arch = getArchetype(commander.archetypeId);
  const rank = getCurrentRank(commander);
  if (!arch || !rank) return 0;
  return Math.round(rank.atk * arch.atkMultiplier);
}

export function commanderEffectiveDef(commander: OwnedCommander): number {
  const arch = getArchetype(commander.archetypeId);
  const rank = getCurrentRank(commander);
  if (!arch || !rank) return 0;
  return Math.round(rank.def * arch.defMultiplier);
}

export function commanderFrntrBonus(commander: OwnedCommander): number {
  const arch = getArchetype(commander.archetypeId);
  return arch?.frntrBonusPct ?? 0;
}

// ── Legacy compatibility shim (for PlotHoverCard) ─────────────────────────
export interface LegacyCommander {
  id: string;
  name: string;
  atk: number;
  def: number;
  tier: string;
  rarityBonus: number;
  icpPrice: number;
  badge: string;
  image: string;
}

export const TIER_COLORS: Record<string, string> = {
  COMMON: "#6b7280",
  UNCOMMON: "#22c55e",
  RARE: "#3b82f6",
  EPIC: "#a855f7",
  LEGENDARY: "#f59e0b",
  ARMY_INFANTRY: "#22c55e",
  ARMY_RANGER: "#ef4444",
  MARINE: "#3b82f6",
  MILITARY_POLICE: "#f59e0b",
  WARRANT_OFFICER: "#a855f7",
  AIR_FORCE: "#00ffcc",
};

export function getCommander(instanceId: string): LegacyCommander | undefined {
  // instanceId format: "<archetypeId>:<index>"  e.g. "ARMY_INFANTRY:0"
  const parts = instanceId.split(":");
  if (parts.length < 2) return undefined;
  const archetypeId = parts[0] as MilitaryBranch;
  const rankIndex = Number.parseInt(parts[1] ?? "0", 10);
  const arch = getArchetype(archetypeId);
  if (!arch) return undefined;
  const rank = arch.rankProgression[rankIndex];
  if (!rank) return undefined;
  const owned: OwnedCommander = {
    instanceId,
    archetypeId,
    currentRankIndex: rankIndex,
  };
  return {
    id: instanceId,
    name: `${rank.abbreviation} — ${arch.name}`,
    atk: commanderEffectiveAtk(owned),
    def: commanderEffectiveDef(owned),
    tier: archetypeId,
    rarityBonus: arch.frntrBonusPct,
    icpPrice: arch.startingICP,
    badge: rank.image,
    image: rank.image,
  };
}

// ── COMMANDERS export for backward-compat (empty — replaced by archetypes) ─
export const COMMANDERS: LegacyCommander[] = [];
