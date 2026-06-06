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
export type Timestamp = bigint;
export type ResetResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface PlotUpgradesView {
    tierName: string;
    plotId: PlotId;
    installedAt?: Timestamp;
    bonusPerDay: number;
    nextTierCost?: bigint;
    generatorTier: GeneratorTier;
}
export type PlotId = string;
export interface GeneratorTierInfo {
    name: string;
    tierIndex: bigint;
    bonusPerDay: number;
    costFRNTR: bigint;
}
export type MissionRequirementKind = {
    __kind__: "purchasePlots";
    purchasePlots: bigint;
} | {
    __kind__: "upgradeToTier";
    upgradeToTier: bigint;
} | {
    __kind__: "holdFRNTR";
    holdFRNTR: bigint;
} | {
    __kind__: "reachLeaderboardTop";
    reachLeaderboardTop: bigint;
} | {
    __kind__: "surveyPlot";
    surveyPlot: null;
} | {
    __kind__: "claimTokens";
    claimTokens: bigint;
};
export interface ActionAuditEntry {
    action: string;
    decision: string;
    plotId?: string;
    tier?: string;
    timestamp: bigint;
    details: string;
    caller: Principal;
    amount?: bigint;
}
export interface EconomySnapshot {
    trigger: string;
    treasuryLiquidity: bigint;
    activePlayers: bigint;
    totalPlotsOwned: bigint;
    treasuryDev: bigint;
    totalFRNTRMined: bigint;
    totalFRNTRBurned: bigint;
    timestamp: bigint;
    globalDailyOutput: bigint;
    treasuryLeaderboard: bigint;
    totalUnclaimedFRNTR: bigint;
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
export interface PlotProductionRate {
    totalPerDay: number;
    plotId: string;
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
export interface Mission {
    id: string;
    title: string;
    description: string;
    rewardE8s: bigint;
    requirement: MissionRequirementKind;
}
export interface GlobalStats {
    circulatingSupply: bigint;
    activePlayers: bigint;
    totalPlotsOwned: bigint;
    dailyEmission: bigint;
    totalBurned: bigint;
}
export interface SurveyResult {
    resourcePercentage: bigint;
    bonusInfo?: string;
    biome: Biome;
}
export interface StressActionResult {
    ok: boolean;
    action: string;
    index: bigint;
    errorMsg?: string;
    durationMs: bigint;
}
export interface MineResult {
    efficiency: number;
    plotId: PlotId;
    resourceYields: Array<[ResourceType, number]>;
    frntRate: number;
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
export interface SurveyView {
    startTime: bigint;
    status: SurveyStatus;
    result?: SurveyResult;
    unlockCost: bigint;
    secondsRemaining: bigint;
    estimatedReward: bigint;
    plotId: PlotId;
    isCollectable: boolean;
    resourcePct: bigint;
    biome: string;
    remainingSeconds: bigint;
}
export interface FaucetClaimSummary {
    principal: string;
    lastClaim?: bigint;
    totalClaims: bigint;
}
export type Result = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface SubParcelInfo {
    resourceRate: number;
    slotIndex: bigint;
    isLocked: boolean;
    buildingType: string;
    cooldownSecondsRemaining: bigint;
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
     * / Claim accumulated FRNTR tokens for a specific plot.
     * / Accrual = (now - lastClaimTime) / 86400s * dailyRate.
     * / Mints fresh tokens via icrc1_transfer from game canister (minting account).
     */
    claimAccumulatedTokens(plotId: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Claim accumulated FRNTR tokens for ALL plots owned by the caller.
     * / Mints fresh tokens via icrc1_transfer from game canister (minting account).
     */
    claimAllPlots(): Promise<{
        __kind__: "ok";
        ok: {
            amount: bigint;
            plotsClaimed: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Thin wrapper around completeSurvey — returns the SurveyResult report alongside the
     * / token award so the frontend can display both in a single call.
     * / Returns #err if the survey timer is not yet complete or no survey exists.
     * / Thin wrapper around completeSurvey — returns the SurveyResult report alongside the
     * / token award so the frontend can display both in a single call.
     * / Returns #err if the survey timer is not yet complete or no survey exists.
     */
    claimSurveyReward(plotId: string): Promise<{
        __kind__: "ok";
        ok: {
            report: SurveyResult;
            rewardE8s: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Complete a mission. Verifies requirement, mints reward, marks done.
     */
    completeMission(missionId: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Complete a survey that has finished its timer and mint the token award to the caller.
     * / Returns #ok(awardE8s) on success or #err(message) on failure.
     */
    completeSurvey(plotId: string): Promise<Result>;
    /**
     * / Convert an ICP amount (in e8s) to micro-USD using the cached price.
     * / Result is micro-USD (divide by 1_000_000 to get USD).
     */
    convertICPToUSD(icpE8s: bigint): Promise<bigint>;
    getAdjacentPlots(plotId: string): Promise<Array<string>>;
    /**
     * / Returns current admin configuration for the frontend admin panel.
     * / Surfaces: admin principal, testnet mode flag, total plot count, cycle balance.
     */
    getAdminInfo(): Promise<{
        adminPrincipal: string;
        testnestMode: boolean;
        totalPlots: bigint;
        cyclesBalance: bigint;
    }>;
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
    /**
     * / Returns the total number of entries in the audit log. Public — no auth required.
     */
    getAuditLogCount(): Promise<bigint>;
    /**
     * / Returns all audit log entries for a given principal.
     * / Only the principal themselves or the admin may query this.
     */
    getAuditLogForPrincipal(principal: Principal): Promise<{
        __kind__: "ok";
        ok: Array<[bigint, ActionAuditEntry]>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Returns the current cycle balance of this canister. Admin only.
     * / Use this to monitor cycles before mainnet deployment.
     */
    getCanisterCycles(): Promise<bigint>;
    getCombatLog(limit: bigint): Promise<Array<CombatEvent>>;
    getCoreGeneratorTiers(): Promise<Array<GeneratorTierInfo>>;
    /**
     * / Return all stored economy snapshots (most recent last).
     */
    getEconomySnapshots(): Promise<Array<EconomySnapshot>>;
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
    /**
     * / Returns the full audit log. Admin only.
     */
    getFullAuditLog(): Promise<{
        __kind__: "ok";
        ok: Array<[bigint, ActionAuditEntry]>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getGameCanisterPrincipal(): Promise<string>;
    /**
     * / Live global game stats for the UNIVERSE panel (v2 — detailed fields).
     * / totalSupply = 10B hard cap (in e8s); remainingMineable = 5B mineable cap minus total burned.
     */
    getGameStats(): Promise<{
        totalPlayers: bigint;
        totalFrntrBurned: bigint;
        totalActionCount: bigint;
        totalSupply: bigint;
        totalBurned: bigint;
        totalPlots: bigint;
        emissionRatePerDay: bigint;
        totalDailyOutput: bigint;
        remainingMineable: bigint;
        globalUnclaimedTokens: bigint;
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
    /**
     * / Total global daily output in FRNTR (not e8s) across all owned plots.
     * / This is the canonical name expected by the frontend UNIVERSE panel.
     */
    getGlobalDailyOutput(): Promise<bigint>;
    getGlobalStats(): Promise<GlobalStats>;
    /**
     * / Total global unclaimed tokens in e8s sitting on all owned plots.
     */
    getGlobalUnclaimedTokens(): Promise<bigint>;
    /**
     * / Returns the cached ICP/USD price as micro-USD (e.g. 12_340_000 = $12.34).
     * / Updated every 15 minutes from the XRC canister; falls back to $10.00 on cold start.
     */
    getICPPrice(): Promise<bigint>;
    /**
     * / Returns the cached ICP/USD price as a Float (e.g. 12.34).
     */
    getICPPriceUSD(): Promise<number>;
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
     * / Return the timestamp (nanoseconds) of the last snapshot.
     */
    getLastSnapshotTime(): Promise<bigint>;
    /**
     * / Return only the most recent economy snapshot, if any.
     */
    getLatestEconomySnapshot(): Promise<EconomySnapshot | null>;
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
    /**
     * / Returns the full mission list.
     */
    getMissions(): Promise<Array<Mission>>;
    /**
     * / Returns the calling player's own audit log (most-recent-first, capped at 500 entries).
     * / No arguments required — identity is taken from the caller's principal.
     */
    getMyAuditLog(): Promise<Array<[bigint, ActionAuditEntry]>>;
    getPassiveIncome(plotId: string): Promise<number>;
    /**
     * / Returns each mission with the caller's completion status.
     */
    getPlayerMissions(): Promise<Array<{
        mission: Mission;
        completed: boolean;
    }>>;
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
     * / Get the current survey status for a plot.
     * / If the timer has expired the result is auto-computed and the survey is
     * / promoted to #Completed — the updated record is persisted.
     * / Returns enriched SurveyView with remainingSeconds, biome, resourcePct,
     * / estimatedReward, and isCollectable for frontend countdown display.
     */
    getSurveyStatus(plotId: string): Promise<{
        __kind__: "ok";
        ok: SurveyView;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTokenomics(): Promise<Tokenomics>;
    /**
     * / Returns the total amount of FRNTR burned across all game actions.
     */
    getTotalBurned(): Promise<bigint>;
    /**
     * / Total global daily output in e8s across all owned plots.
     */
    getTotalGlobalDailyOutput(): Promise<bigint>;
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
     * / Returns the caller's real ICP balance from the on-chain ICP ledger (ryjl3-tyaaa-aaaaa-aaaba-cai).
     * / Result is in raw e8s (divide by 100_000_000 for ICP display).
     * / Log a cancellation decision. Called by the frontend when the player clicks
     * / "Cancel" on a confirmation modal — BEFORE any canister call is made.
     * / Records the caller's wallet address, action type, and timestamp on-chain.
     */
    logCancelledAction(action: string, plotId: string | null, amount: bigint | null, details: string): Promise<void>;
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
    purgeTestPlayers(): Promise<Result>;
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
