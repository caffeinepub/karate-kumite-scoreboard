export interface ScoreboardState {
  ao: {
    name: string;
    score: number;
    ippon: number;
    wazaari: number;
    yuko: number;
    senshu: boolean;
    warnings: boolean[];
  };
  aka: {
    name: string;
    score: number;
    ippon: number;
    wazaari: number;
    yuko: number;
    senshu: boolean;
    warnings: boolean[];
  };
  timerDisplay: string;
  timerMs: number;
  isRunning: boolean;
  tatamiNo: string;
  winner: { side: 'Ao' | 'Aka'; name: string } | null;
  mirrorExternal: boolean;
  category: string;
  darkMode: boolean;
}

export const STATE_KEY = 'kumite_scoreboard_state_v3';
const CHANNEL_NAME = 'kumite_scoreboard_bc_v3';

export function broadcastState(state: ScoreboardState): void {
  try {
    const payload = JSON.stringify({ state, ts: Date.now() });

    // 1. localStorage — triggers storage events in other windows + polling fallback
    localStorage.setItem(STATE_KEY, payload);

    // 2. BroadcastChannel — instant for same-origin cross-window communication
    //    Create a new channel per broadcast so listeners always receive fresh messages
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel(CHANNEL_NAME);
        ch.postMessage({ type: 'STATE_UPDATE', state });
        // Close after a short delay to allow message delivery
        setTimeout(() => ch.close(), 200);
      } catch (_) {
        // ignore
      }
    }
  } catch (_) {
    // silently fail
  }
}
