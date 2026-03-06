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

// v8 — fresh keys
export const STATE_KEY = "kumite_sb_state_v8";
export const CHANNEL_NAME = "kumite_sb_ch_v8";
export const READY_KEY = "kumite_sb_ready_v8";
export const POSTMSG_TYPE = "KUMITE_STATE_V8";

// Track the popup window reference so we can postMessage directly
let _externalWindow: Window | null = null;

export function setExternalWindow(win: Window | null): void {
  _externalWindow = win;
}

export function broadcastState(state: ScoreboardState): void {
  const ts = Date.now();
  const payload = JSON.stringify({ state, ts });

  // 1. Write to localStorage — reliable polling fallback
  try {
    localStorage.setItem(STATE_KEY, payload);
  } catch {
    // ignore
  }

  // 2. Direct postMessage to the popup window (most reliable cross-window method)
  if (_externalWindow && !_externalWindow.closed) {
    try {
      _externalWindow.postMessage(
        { type: POSTMSG_TYPE, state, ts },
        window.location.origin,
      );
    } catch {
      // ignore
    }
  }

  // 3. BroadcastChannel as additional fallback
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: "STATE_UPDATE", state, ts });
      // Close after a short delay to ensure delivery
      setTimeout(() => {
        try {
          ch.close();
        } catch {
          // ignore
        }
      }, 500);
    }
  } catch {
    // ignore
  }
}
