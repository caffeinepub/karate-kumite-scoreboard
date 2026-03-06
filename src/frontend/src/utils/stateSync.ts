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
  winner: { side: "Ao" | "Aka"; name: string; score: number } | null;
  mirrorExternal: boolean;
  category: string;
  darkMode: boolean;
}

// Use a simple, stable key/channel name — no version suffix to avoid stale conflicts
export const STATE_KEY = "kumite_sb_state";
const CHANNEL_NAME = "kumite_sb_channel";

// Persistent sender channel — created once per page load
let _senderChannel: BroadcastChannel | null = null;

function ensureSenderChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_senderChannel) {
    try {
      _senderChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return _senderChannel;
}

export function broadcastState(state: ScoreboardState): void {
  const ts = Date.now();
  try {
    // Write to localStorage — triggers storage events in other windows
    localStorage.setItem(STATE_KEY, JSON.stringify({ state, ts }));
  } catch {
    // ignore
  }
  try {
    // Send via BroadcastChannel — instant same-origin cross-window delivery
    const ch = ensureSenderChannel();
    if (ch) {
      ch.postMessage({ type: "STATE_UPDATE", state, ts });
    }
  } catch {
    // If channel died, recreate it next time
    _senderChannel = null;
  }
}

export function getChannelName(): string {
  return CHANNEL_NAME;
}
