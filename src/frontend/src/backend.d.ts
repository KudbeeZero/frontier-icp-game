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
export type PlotId = bigint;
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
export interface GeneratorTierInfo {
    name: string;
    tierIndex: bigint;
    bonusPerDay: number;
    costFRNTR: bigint;
}
export interface FaucetClaimSummary {
    principal: string;
    lastClaim?: bigint;
    totalClaims: bigint;
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
    toPlot: bigint;
    atkPower: bigint;
    timestamp: bigint;
    fromPlot: bigint;
    success: boolean;
    missileType?: string;
    defPower: bigint;
}
export interface PlotProductionRate {
    totalPerDay: number;
    plotId: bigint;
    tierBonus: number;
    baseFRNTRPerDay: number;
    generatorTier: bigint;
    nexusBonus: number;
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
export enum ResourceType {
    RareEarth = "RareEarth",
    Fuel = "Fuel",
    Iron = "Iron",
    Crystal = "Crystal"
}
export interface backendInterface {
    assignInterceptor(plotId: bigint, interceptorType: string): Promise<void>;
    getAdjacentPlots(plotId: bigint): Promise<Array<bigint>>;
    getAdminPrincipal(): Promise<string>;
    /**
     * / Returns all plots that have an owner as (plotId, ownerPrincipalText) pairs.
     */
    getAllPlotOwners(): Promise<Array<[bigint, string]>>;
    getAssignedInterceptor(plotId: bigint): Promise<string | null>;
    getCombatLog(limit: bigint): Promise<Array<CombatEvent>>;
    getCoreGeneratorTiers(): Promise<Array<GeneratorTierInfo>>;
    /**
     * / Returns total faucet claims for a principal (debug/analytics).
     */
    getFaucetClaims(principal: Principal): Promise<FaucetClaimSummary>;
    getGlobalStats(): Promise<GlobalStats>;
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
    getPassiveIncome(plotId: bigint): Promise<number>;
    getPlayerState(): Promise<{
        resourceBalances: Array<[ResourceType, number]>;
        username?: string;
        fuel: bigint;
        iron: bigint;
        frntBalance: bigint;
        totalFRNTRBurned: number;
        plotsOwned: bigint;
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
     */
    getPlayerStateByPrincipal(principal: Principal): Promise<{
        resourceBalances: Array<[ResourceType, number]>;
        username?: string;
        fuel: bigint;
        iron: bigint;
        frntBalance: bigint;
        totalFRNTRBurned: number;
        plotsOwned: bigint;
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
    getPlotProductionRate(plotId: bigint): Promise<PlotProductionRate>;
    /**
     * / Returns the caller's principal display info for wallet/identity UI.
     */
    getPrincipal(): Promise<PrincipalDisplay>;
    getTokenomics(): Promise<Tokenomics>;
    /**
     * / Query the current treasury canister principal.
     */
    getTreasuryPrincipal(): Promise<string>;
    /**
     * / Seed plots from the frontend (admin only). Skips plots that already exist.
     */
    initPlots(plotData: Array<[bigint, string, number, number, bigint]>): Promise<void>;
    isSubParcelLocked(plotId: bigint): Promise<boolean>;
    launchMissile(fromPlotId: bigint, toPlotId: bigint, missileType: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Mine resources from an owned plot.
     */
    mineResources(plotId: bigint): Promise<{
        __kind__: "ok";
        ok: MineResult;
    } | {
        __kind__: "err";
        err: string;
    }>;
    purchasePlot(plotId: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: clear all player state for a clean test run (TESTNET_MODE only).
     */
    resetTestState(): Promise<ResetResult>;
    /**
     * / Set a new admin principal. Guarded by current admin.
     */
    setAdminPrincipal(p: Principal): Promise<void>;
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
     * / Testnet faucet: grants exactly 500 FRNTR + 2 ICP (200_000_000 e8s simulated) per click.
     * / No cooldown, no rate limit.
     */
    testFaucet(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Testnet faucet: grants 500 FRNTR + 2 ICP (simulated) per click.
     * / No cooldown, no auth check beyond TESTNET_MODE=true.
     */
    testFaucetV2(): Promise<FaucetResult>;
    updateAdminPrincipalAuth(newPrincipal: string): Promise<void>;
}
