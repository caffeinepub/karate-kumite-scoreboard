import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RecordMatch {
    ao: RecordState;
    aka: RecordState;
    matchNumber: bigint;
    winner: string;
    totalTime: string;
    timestamp: Time;
    category: string;
    tatamiNumber: string;
}
export type Time = bigint;
export interface Warning {
    foul: FoulType;
    crowdReaction: bigint;
    issuedBy: bigint;
}
export interface RecordState {
    name: string;
    yuko: bigint;
    senshu: boolean;
    warnings: Array<Warning>;
    wazaari: bigint;
    isWinner: boolean;
    ippon: bigint;
}
export enum FoulType {
    c1 = "c1",
    c2 = "c2",
    c3 = "c3",
    hansokumake = "hansokumake",
    hansoku = "hansoku"
}
export interface backendInterface {
    getAllMatches(): Promise<Array<RecordMatch>>;
    getDefaultSettings(): Promise<{
        minutes: bigint;
        seconds: bigint;
        tatamiNumber: string;
    }>;
    getMatch(matchId: bigint): Promise<RecordMatch>;
    newMatch(params: {
        akaName: string;
        category: string;
        aoName: string;
        tatamiNumber: string;
    }): Promise<RecordMatch>;
    saveMatch(newMatch: RecordMatch): Promise<void>;
    updateSettings(newTatami: string | null, newMinutes: bigint | null, newSeconds: bigint | null): Promise<void>;
}
