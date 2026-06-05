import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type PlotId = bigint;
export interface MineResult {
    efficiency: number;
    plotId: PlotId;
    resourceYields: Array<[ResourceType, number]>;
    frntRate: number;
}
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
    getAssignedInterceptor(plotId: bigint): Promise<string | null>;
    getCombatLog(limit: bigint): Promise<Array<CombatEvent>>;
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
     * / Returns the canonical ICP price (e8s) for a plot identified by its H3 index.
     */
    getPlotPrice(h3Index: string): Promise<bigint>;
    /**
     * / Returns the tokenomics snapshot for display in the UNIVERSE menu.
     */
    getTokenomics(): Promise<{
        totalSupply: bigint;
        maxPlots: bigint;
        dailyEmission: bigint;
        emissionScheduleYears: bigint;
        currentCirculating: bigint;
        mineableSupply: bigint;
        preMinted: bigint;
        plotCount: bigint;
        burnedTotal: bigint;
    }>;
    /**
     * / Query the current treasury canister principal.
     */
    getTreasuryPrincipal(): Promise<string>;
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
     * / Testnet faucet: grants 1000 FRNTR, once per principal per 24 hours.
     */
    testFaucet(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateAdminPrincipalAuth(newPrincipal: string): Promise<void>;
}
