import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export interface PlayerState {
    empTargets: Array<[bigint, bigint]>;
    commanderType?: string;
    fuel: bigint;
    iron: bigint;
    frntBalance: bigint;
    plotsOwned: bigint;
    satelliteExpiry: bigint;
    crystal: bigint;
    combatVictories: bigint;
    reconTargets: Array<[bigint, bigint]>;
    commanderAtk: bigint;
    commanderDef: bigint;
}
export interface backendInterface {
    assignInterceptor(plotId: bigint, interceptorType: string): Promise<void>;
    getAdjacentPlots(plotId: bigint): Promise<Array<bigint>>;
    getAssignedInterceptor(plotId: bigint): Promise<string | null>;
    getCombatLog(limit: bigint): Promise<Array<CombatEvent>>;
    getPlayerState(): Promise<PlayerState | null>;
    launchMissile(fromPlotId: bigint, toPlotId: bigint, missileType: string): Promise<{
        __kind__: "ok";
        ok: string;
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
}
