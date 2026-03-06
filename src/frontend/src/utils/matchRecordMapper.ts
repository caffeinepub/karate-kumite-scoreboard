import {
  FoulType,
  type RecordMatch,
  type RecordState,
  type Warning,
} from "../backend";

export interface PlayerState {
  name: string;
  score: number;
  ippon: number;
  wazaari: number;
  yuko: number;
  senshu: boolean;
  warnings: boolean[]; // [1C, 2C, 3C, HC, H]
  isWinner: boolean;
}

const WARNING_FOULS: FoulType[] = [
  FoulType.c1,
  FoulType.c2,
  FoulType.c3,
  FoulType.hansoku,
  FoulType.hansokumake,
];

function mapPlayerState(player: PlayerState): RecordState {
  const warnings: Warning[] = player.warnings
    .map((active, idx) =>
      active
        ? {
            foul: WARNING_FOULS[idx],
            issuedBy: BigInt(0),
            crowdReaction: BigInt(0),
          }
        : null,
    )
    .filter((w): w is Warning => w !== null);

  return {
    name: player.name,
    ippon: BigInt(player.ippon),
    wazaari: BigInt(player.wazaari),
    yuko: BigInt(player.yuko),
    senshu: player.senshu,
    isWinner: player.isWinner,
    warnings,
  };
}

export function buildRecordMatch(params: {
  ao: PlayerState;
  aka: PlayerState;
  category: string;
  tatamiNumber: string;
  totalTime: string;
  winner: string;
  matchNumber: number;
}): RecordMatch {
  return {
    ao: mapPlayerState(params.ao),
    aka: mapPlayerState(params.aka),
    category: params.category,
    tatamiNumber: params.tatamiNumber,
    totalTime: params.totalTime,
    winner: params.winner,
    timestamp: BigInt(Date.now()) * BigInt(1_000_000),
    matchNumber: BigInt(params.matchNumber),
  };
}
