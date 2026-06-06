import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FaucetGrant {
    icpGranted: bigint;
    frntGranted: bigint;
}
export interface SurveyResult {
    resourcePercentage: bigint;
    bonusInfo?: string;
    biome: Biome;
}
export type Timestamp = bigint;
export interface StressActionResult {
    ok: boolean;
    action: string;
    index: bigint;
    errorMsg?: string;
    durationMs: bigint;
}
export type ResetResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface MineResult {
    efficiency: number;
    plotId: PlotId;
    resourceYields: Array<[ResourceType, number]>;
    frntRate: number;
}
export interface PlotUpgradesView {
    tierName: string;
    plotId: PlotId;
    installedAt?: Timestamp;
    bonusPerDay: number;
    nextTierCost?: bigint;
    generatorTier: GeneratorTier;
}
export interface SubParcel {
    subParcelId: string;
    cooldownEnds: bigint;
    plotId: string;
    building?: string;
    slotIndex: bigint;
    specialization: string;
}
export type StressTestResult = {
    __kind__: "ok";
    ok: Array<StressActionResult>;
} | {
    __kind__: "err";
    err: string;
};
export interface PrincipalDisplay {
    full: string;
    short: string;
    isAuthed: boolean;
}
export type PlotId = string;
export interface GeneratorTierInfo {
    name: string;
    tierIndex: bigint;
    bonusPerDay: number;
    costFRNTR: bigint;
}
export interface SurveyView {
    startTime: bigint;
    status: SurveyStatus;
    result?: SurveyResult;
    unlockCost: bigint;
    secondsRemaining: bigint;
    plotId: PlotId;
}
export interface FaucetClaimSummary {
    principal: string;
    lastClaim?: bigint;
    totalClaims: bigint;
}
export interface SubParcelInfo {
    resourceRate: number;
    slotIndex: bigint;
    isLocked: boolean;
    buildingType: string;
    cooldownSecondsRemaining: bigint;
}
export interface PlotProductionRate {
    totalPerDay: number;
    plotId: string;
    tierBonus: number;
    baseFRNTRPerDay: number;
    generatorTier: bigint;
    nexusBonus: number;
}
export type FaucetResult = {
    __kind__: "ok";
    ok: FaucetGrant;
} | {
    __kind__: "err";
    err: string;
};
export interface CombatEvent {
    attacker: Principal;
    intercepted: boolean;
    interceptorType?: string;
    toPlot: string;
    atkPower: bigint;
    timestamp: bigint;
    fromPlot: string;
    success: boolean;
    missileType?: string;
    defPower: bigint;
}
export interface Tokenomics {
    burnRate: bigint;
    emissionRate: bigint;
    circulatingSupply: bigint;
    daysUntilMilestone: bigint;
    totalBurned: bigint;
    maxSupply: bigint;
    remainingMineable: bigint;
}
export interface GlobalStats {
    circulatingSupply: bigint;
    activePlayers: bigint;
    totalPlotsOwned: bigint;
    dailyEmission: bigint;
    totalBurned: bigint;
}
export enum Biome {
    Tropical = "Tropical",
    AsteroidImpact = "AsteroidImpact",
    DeepOcean = "DeepOcean",
    Desert = "Desert",
    Volcanic = "Volcanic",
    Temperate = "Temperate",
    Ocean = "Ocean",
    Arctic = "Arctic"
}
export enum GeneratorTier {
    TierIII = "TierIII",
    None = "None",
    TierII = "TierII",
    TierIV = "TierIV",
    TierVI = "TierVI",
    TierI = "TierI",
    TierV = "TierV"
}
export enum ResourceType {
    RareEarth = "RareEarth",
    Fuel = "Fuel",
    Iron = "Iron",
    Crystal = "Crystal"
}
export enum SurveyStatus {
    Locked = "Locked",
    InProgress = "InProgress",
    Completed = "Completed"
}
export enum UpgradeError {
    SubParcelLocked = "SubParcelLocked",
    PlotNotFound = "PlotNotFound",
    InvalidTier = "InvalidTier",
    NotOwner = "NotOwner",
    AlreadyMaxTier = "AlreadyMaxTier",
    InsufficientFRNTR = "InsufficientFRNTR"
}
export interface backendInterface {
    assignInterceptor(plotId: string, interceptorType: string): Promise<void>;
    /**
     * / Compute how much FRNTR has accrued for the caller since their lastClaimTime,
     * / transfer it from the game canister to the caller's principal via ICRC-1,
     * / update lastClaimTime to now, and return the claimed amount (in e8s) or an error.
     */
    claimAccumulatedTokens(): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAdjacentPlots(plotId: string): Promise<Array<string>>;
    getAdminPrincipal(): Promise<string>;
    /**
     * / Returns all plots that have an owner as (plotId, ownerPrincipalText) pairs.
     */
    getAllPlotOwners(): Promise<Array<[string, string]>>;
    /**
     * / Returns the currently approved DEX canister principal for liquidity withdrawals.
     * / Set via setApprovedLiquidityCanister (admin only).
     */
    getApprovedLiquidityCanister(): Promise<string | null>;
    getAssignedInterceptor(plotId: string): Promise<string | null>;
    getCombatLog(limit: bigint): Promise<Array<CombatEvent>>;
    getCoreGeneratorTiers(): Promise<Array<GeneratorTierInfo>>;
    /**
     * / Returns total faucet claims for a principal (debug/analytics).
     */
    getFaucetClaims(principal: Principal): Promise<FaucetClaimSummary>;
    /**
     * / Returns the first plot ID with no owner, or null if all plots are owned.
     * / Used by the stress-test to find a purchasable plot without hardcoding an ID.
     */
    getFirstAvailablePlot(): Promise<string | null>;
    getFrntrLedger(): Promise<string>;
    getGameCanisterPrincipal(): Promise<string>;
    /**
     * / Live global game stats for the UNIVERSE panel (v2 — detailed fields).
     * / totalSupply = 10B hard cap (in e8s); remainingMineable = 5B mineable cap minus total burned.
     */
    getGameStats(): Promise<{
        totalPlayers: bigint;
        totalFrntrBurned: bigint;
        totalSupply: bigint;
        totalBurned: bigint;
        totalPlots: bigint;
        emissionRatePerDay: bigint;
        remainingMineable: bigint;
    }>;
    /**
     * / Returns the canonical generator tier catalog for all tiers.
     * / Frontend uses this so tier data is never hardcoded.
     */
    getGeneratorTierCatalog(): Promise<Array<{
        cost: bigint;
        tierIndex: bigint;
        bonusPerDay: number;
    }>>;
    getGlobalStats(): Promise<GlobalStats>;
    /**
     * / Returns the caller's real ICP balance from the on-chain ICP ledger (ryjl3-tyaaa-aaaaa-aaaba-cai).
     * / Result is in raw e8s (divide by 100_000_000 for ICP display).
     */
    getIcpBalance(principal: Principal): Promise<bigint>;
    /**
     * / ICP/USD price oracle — performs HTTP outcall to CoinGecko API with 60s cache.
     * / URL: https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd
     * / Returns the current ICP/USD price as a Float.
     */
    getIcpUsdPrice(): Promise<number>;
    /**
     * / Returns the cached ICP/USD price without an HTTP outcall.
     * / Returns 0.0 if the price has never been fetched.
     */
    getIcpUsdPriceCached(): Promise<number>;
    /**
     * / Returns true if the caller is the current admin principal.
     */
    getIsAdmin(): Promise<boolean>;
    /**
     * / Public leaderboard query: top players by FRNTR balance.
     */
    getLeaderboard(limit: bigint): Promise<Array<{
        principal: string;
        username?: string;
        rank: bigint;
        frntBalance: bigint;
        plotsOwned: bigint;
    }>>;
    /**
     * / Returns global leaderboard and economy stats.
     */
    getLeaderboardStats(): Promise<{
        leaderboardPrizePool: bigint;
        nextPayoutAt: bigint;
        activePlayers: bigint;
        totalPlotsOwned: bigint;
        totalFRNTRMined: bigint;
        totalFRNTRBurned: bigint;
    }>;
    /**
     * / Returns all owned plots as (plotId, ownerPrincipalText) pairs.
     * / Alias used by frontend for globe ownership sync.
     */
    getLivePlotOwners(): Promise<Array<[string, string]>>;
    getPassiveIncome(plotId: string): Promise<number>;
    getPlayerState(): Promise<{
        resourceBalances: Array<[ResourceType, number]>;
        username?: string;
        fuel: bigint;
        iron: bigint;
        icpBalance: bigint;
        frntBalance: bigint;
        totalFRNTRBurned: number;
        plotsOwned: bigint;
        plotIds: Array<string>;
        lastFaucetTime?: bigint;
        crystal: bigint;
        ownedPlots: Array<string>;
        combatVictories: bigint;
        generatorTiersMap: Array<[string, bigint]>;
        passiveIncomePerDay: number;
    }>;
    /**
     * / Query the full player state for a given principal.
     * / Returns a zeroed state if the principal has not played yet.
     * / Uses live ICRC-1 ledger balance when frntrLedger is configured.
     */
    getPlayerStateByPrincipal(principal: Principal): Promise<{
        resourceBalances: Array<[ResourceType, number]>;
        username?: string;
        fuel: bigint;
        iron: bigint;
        icpBalance: bigint;
        frntBalance: bigint;
        totalFRNTRBurned: number;
        plotsOwned: bigint;
        plotIds: Array<string>;
        lastFaucetTime?: bigint;
        crystal: bigint;
        ownedPlots: Array<string>;
        combatVictories: bigint;
        generatorTiersMap: Array<[string, bigint]>;
        passiveIncomePerDay: number;
    }>;
    /**
     * / Returns the total number of plots currently stored.
     */
    getPlotCount(): Promise<bigint>;
    /**
     * / Returns the canonical ICP price (e8s) for a plot identified by its H3 index.
     */
    getPlotPrice(h3Index: string): Promise<bigint>;
    /**
     * / Returns the ICP price in e8s for a plot identified by its H3 Text ID.
     * / Price tier is derived from biome richness stored in the plots map.
     */
    getPlotPriceById(plotId: string): Promise<bigint>;
    getPlotProductionRate(plotId: string): Promise<PlotProductionRate>;
    /**
     * / Returns all plot IDs owned by a given principal.
     */
    getPlotsByOwner(owner: Principal): Promise<Array<string>>;
    /**
     * / Returns the caller's principal display info for wallet/identity UI.
     */
    getPrincipal(): Promise<PrincipalDisplay>;
    /**
     * / Returns 7 SubParcelInfo entries (slots 0-6) for a plot.
     * / isLocked = true during the 4-hour post-purchase cooldown.
     * / cooldownSecondsRemaining = 0 when not locked.
     * / Sub-parcel ID = plotId # ":" # slotIndex.
     */
    getSubParcelStatus(plotId: string): Promise<Array<SubParcelInfo>>;
    /**
     * / Returns all 7 sub-parcels for a given plot ID.
     */
    getSubParcels(plotId: string): Promise<Array<SubParcel>>;
    /**
     * / Returns the survey cost (in FRNTR e8s) for a given plot.
     */
    getSurveyCost(plotId: string): Promise<bigint>;
    /**
     * / Get the completed survey result for a plot.
     * / Returns #err if the survey has not been started or the timer hasn't expired.
     */
    getSurveyResult(plotId: string): Promise<{
        __kind__: "ok";
        ok: SurveyResult;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Get the current survey status for a plot.
     * / If the timer has expired the result is auto-computed and the survey is
     * / promoted to #Completed — the updated record is persisted.
     */
    getSurveyStatus(plotId: string): Promise<{
        __kind__: "ok";
        ok: SurveyView;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTokenomics(): Promise<Tokenomics>;
    getTreasuryBalances(): Promise<{
        leaderboardPot: bigint;
        devPot: bigint;
        liquidityPot: bigint;
    }>;
    /**
     * / Query the current treasury canister principal.
     */
    getTreasuryPrincipal(): Promise<string>;
    /**
     * / Returns current balances of the three treasury pots in e8s.
     * / devPot: 25% of plot ICP; leaderboardPot: 25%; liquidityPot: 50%.
     * / getTreasuryState: alias for getTreasuryBalances, returns the 25/25/50 split balances.
     * / Shape: { developer: Nat; leaderboard: Nat; liquidity: Nat } (all in e8s).
     */
    getTreasuryState(): Promise<{
        leaderboard: bigint;
        liquidity: bigint;
        developer: bigint;
    }>;
    /**
     * / Seed plots from the frontend (admin only). Skips plots that already exist.
     * / Also creates 7 sub-parcels per plot (slot 0 = center Nexus, slots 1-6 = surrounding).
     */
    initPlots(plotData: Array<[string, string, number, number, bigint]>): Promise<void>;
    isSubParcelLocked(plotId: string): Promise<boolean>;
    launchMissile(fromPlotId: string, toPlotId: string, missileType: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Mine resources from an owned plot.
     * / DISABLED: returns an informative error until the mining system launches.
     */
    mineResources(_plotId: string): Promise<{
        __kind__: "ok";
        ok: MineResult;
    } | {
        __kind__: "err";
        err: string;
    }>;
    purchasePlot(plotId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: wipe all game state (plots, players, usernames, faucetClaims,
     * / generatorTiers, subParcels, statsState, plotSoldCount) back to empty.
     * / Used before migrating to mainnet for a clean slate.
     */
    resetAllData(): Promise<void>;
    /**
     * / Admin: clear all player state for a clean test run (TESTNET_MODE only).
     */
    resetTestState(): Promise<ResetResult>;
    /**
     * / Set a new admin principal. Guarded by current admin.
     */
    setAdminPrincipal(p: Principal): Promise<void>;
    setApprovedLiquidityCanister(dexCanister: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setFrntrLedger(canisterId: Principal): Promise<void>;
    setGameCanisterPrincipal(p: string): Promise<void>;
    setSelfPrincipal(): Promise<void>;
    /**
     * / Update the treasury canister principal (admin only).
     */
    setTreasuryPrincipal(p: Principal): Promise<void>;
    /**
     * / Set a unique username (3-16 alphanumeric + underscore).
     */
    setUsername(username: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Start a survey for a plot the caller owns.
     * / Deducts the survey cost in FRNTR (from local balance or ICRC-1 ledger) and
     * / records an in-progress survey record with startTime = now.
     * / Returns #err if the plot is not owned by the caller, if a survey is already
     * / in progress or completed, or if the caller has insufficient FRNTR.
     */
    startSurvey(plotId: string): Promise<{
        __kind__: "ok";
        ok: SurveyView;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Buy `count` plots in sequence (TESTNET_MODE only).
     */
    stressBuyPlots(count: bigint): Promise<StressTestResult>;
    /**
     * / Rapidly mint `count` unowned plots (TESTNET_MODE only).
     */
    stressMintPlots(count: bigint): Promise<StressTestResult>;
    /**
     * / Run `count` upgrade cycles across owned plots (TESTNET_MODE only).
     */
    stressUpgradePlots(count: bigint): Promise<StressTestResult>;
    /**
     * / Testnet faucet: grants exactly 500 FRNTR per click.
     * / No cooldown, no rate limit. ICP is real and not simulated.
     */
    testFaucet(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Testnet faucet: grants 5000 FRNTR (500_000_000_000 e8s) + 5 ICP (500_000_000 e8s) per click.
     * / Transfers FRNTR via ICRC-1 ledger (if set) and 5 ICP via ICP ledger.
     * / Auto-creates a player record if one doesn't exist.
     * / No cooldown. TESTNET_MODE=true only.
     */
    testFaucetV2(): Promise<FaucetResult>;
    updateAdminPrincipalAuth(newPrincipal: string): Promise<void>;
    /**
     * / Upgrade the generator tier for an owned plot.
     * / Deducts FRNTR cost from player balance, tracks burn, sends 0.075% liquidity tax to treasury.
     */
    upgradeGenerator(plotId: string): Promise<{
        __kind__: "ok";
        ok: PlotUpgradesView;
    } | {
        __kind__: "err";
        err: UpgradeError;
    }>;
    withdrawLiquidityPot(amountE8s: bigint, recipient: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
