import React, { useEffect, useState, useCallback, useRef } from 'react';
import { type ScoreboardState, STATE_KEY } from '../utils/stateSync';

const CHANNEL_NAME = 'kumite_scoreboard_bc_v3';
const WARNING_LABELS = ['1C', '2C', '3C', 'HC', 'H'];

const defaultState: ScoreboardState = {
  ao: { name: '', score: 0, ippon: 0, wazaari: 0, yuko: 0, senshu: false, warnings: [false, false, false, false, false] },
  aka: { name: '', score: 0, ippon: 0, wazaari: 0, yuko: 0, senshu: false, warnings: [false, false, false, false, false] },
  timerDisplay: '00:00.000',
  timerMs: 0,
  isRunning: false,
  tatamiNo: '1',
  winner: null,
  mirrorExternal: false,
  category: '',
  darkMode: true,
};

function readStateFromStorage(): ScoreboardState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support both wrapped {state, ts} and plain state formats
      if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return parsed.state as ScoreboardState;
      }
      return parsed as ScoreboardState;
    }
  } catch (_) {}
  return null;
}

export default function ExternalDisplay() {
  const [state, setState] = useState<ScoreboardState>(() => readStateFromStorage() ?? defaultState);
  const [showWinner, setShowWinner] = useState(false);
  const lastTsRef = useRef<number>(0);

  const applyState = useCallback((newState: ScoreboardState) => {
    setState(newState);
    if (newState.winner) setShowWinner(true);
    else setShowWinner(false);
  }, []);

  useEffect(() => {
    // Method 1: BroadcastChannel — fastest, fires instantly
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e: MessageEvent) => {
          if (e.data?.type === 'STATE_UPDATE' && e.data.state) {
            applyState(e.data.state as ScoreboardState);
          }
        };
      } catch (_) {}
    }

    // Method 2: storage event — fires when ANOTHER window writes localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newState = parsed && 'state' in parsed ? parsed.state : parsed;
          if (newState) applyState(newState as ScoreboardState);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Method 3: Polling every 50ms as final fallback (checks timestamp to avoid unnecessary re-renders)
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const ts: number = parsed?.ts ?? 0;
        if (ts !== lastTsRef.current) {
          lastTsRef.current = ts;
          const newState = parsed && 'state' in parsed ? parsed.state : parsed;
          if (newState) applyState(newState as ScoreboardState);
        }
      } catch (_) {}
    }, 50);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(poll);
    };
  }, [applyState]);

  const leftSide = state.mirrorExternal ? state.aka : state.ao;
  const rightSide = state.mirrorExternal ? state.ao : state.aka;
  const leftLabel = state.mirrorExternal ? 'AKA' : 'AO';
  const rightLabel = state.mirrorExternal ? 'AO' : 'AKA';
  const leftBgColor = state.mirrorExternal ? '#B91C1C' : '#1D4ED8';
  const rightBgColor = state.mirrorExternal ? '#1D4ED8' : '#B91C1C';
  const leftBorderColor = state.mirrorExternal ? '#FCA5A5' : '#93C5FD';
  const rightBorderColor = state.mirrorExternal ? '#93C5FD' : '#FCA5A5';

  const bgColor = state.darkMode ? '#000000' : '#FFFFFF';
  const textColor = state.darkMode ? '#FFFFFF' : '#111827';
  const subTextColor = state.darkMode ? '#9CA3AF' : '#6B7280';
  const centerBg = state.darkMode ? '#111827' : '#F3F4F6';
  const centerBorder = state.darkMode ? '#4B5563' : '#D1D5DB';
  const timerColor = '#22C55E';

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 32px 16px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* TOP: Category (center, golden) + Logo (top-right) */}
      <div style={{ width: '100%', position: 'relative', flexShrink: 0, minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo top-right */}
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <img
            src="/assets/uploads/image-1-1.png"
            alt="Kumite Scoreboard Logo"
            style={{ width: 48, height: 48, objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span style={{ fontSize: 9, color: subTextColor, fontStyle: 'italic', textAlign: 'right' }}>
            Software designed by Fenil Dav
          </span>
        </div>
        {/* Category — top center, golden — always visible */}
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#F59E0B',
          letterSpacing: 5,
          textTransform: 'uppercase',
          textShadow: '0 0 20px rgba(245,158,11,0.75), 0 0 40px rgba(245,158,11,0.35)',
          paddingTop: 6,
          textAlign: 'center',
          minHeight: 42,
        }}>
          {state.category || ''}
        </div>
      </div>

      {/* MIDDLE: Score Panels + Tatami */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, width: '100%', flex: 1, minHeight: 0 }}>
        {/* Left Score Panel — Version 17 layout */}
        <div style={{
          flex: '0 0 35%',
          backgroundColor: leftBgColor,
          borderRadius: 10,
          border: `2px solid ${leftBorderColor}`,
          padding: '10px 12px',
          textAlign: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          {/* AO label */}
          <div style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 900, letterSpacing: 6, opacity: 0.95, lineHeight: 1 }}>{leftLabel}</div>
          {/* Player name */}
          {leftSide.name && (
            <div style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: 1, lineHeight: 1.1 }}>{leftSide.name}</div>
          )}
          {/* Score */}
          <div style={{ color: '#FFFFFF', fontSize: 140, fontWeight: 900, lineHeight: 0.85, letterSpacing: -6 }}>
            {leftSide.score}
          </div>
          {/* Senshu */}
          {leftSide.senshu && (
            <div style={{
              marginTop: 4,
              display: 'inline-block',
              padding: '4px 16px',
              backgroundColor: '#F59E0B',
              color: '#000',
              fontWeight: 800,
              fontSize: 20,
              borderRadius: 999,
              letterSpacing: 2,
              boxShadow: '0 0 16px rgba(245,158,11,0.85)',
            }}>
              SENSHU
            </div>
          )}
        </div>

        {/* Center: Tatami */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1 }}>
          <div style={{
            backgroundColor: centerBg,
            border: `1px solid ${centerBorder}`,
            borderRadius: 12,
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: subTextColor }}>Tatami</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: textColor }}>{state.tatamiNo}</div>
          </div>
        </div>

        {/* Right Score Panel — Version 17 layout */}
        <div style={{
          flex: '0 0 35%',
          backgroundColor: rightBgColor,
          borderRadius: 10,
          border: `2px solid ${rightBorderColor}`,
          padding: '10px 12px',
          textAlign: 'center',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          {/* AKA label */}
          <div style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 900, letterSpacing: 6, opacity: 0.95, lineHeight: 1 }}>{rightLabel}</div>
          {/* Player name */}
          {rightSide.name && (
            <div style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: 1, lineHeight: 1.1 }}>{rightSide.name}</div>
          )}
          {/* Score */}
          <div style={{ color: '#FFFFFF', fontSize: 140, fontWeight: 900, lineHeight: 0.85, letterSpacing: -6 }}>
            {rightSide.score}
          </div>
          {/* Senshu */}
          {rightSide.senshu && (
            <div style={{
              marginTop: 4,
              display: 'inline-block',
              padding: '4px 16px',
              backgroundColor: '#F59E0B',
              color: '#000',
              fontWeight: 800,
              fontSize: 20,
              borderRadius: 999,
              letterSpacing: 2,
              boxShadow: '0 0 16px rgba(245,158,11,0.85)',
            }}>
              SENSHU
            </div>
          )}
        </div>
      </div>

      {/* Warnings Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 12, paddingBottom: 8, flexShrink: 0 }}>
        {/* Left Warnings */}
        <div style={{ display: 'flex', gap: 10 }}>
          {WARNING_LABELS.map((label, idx) => {
            const active = leftSide.warnings[idx];
            const circleColor = state.mirrorExternal ? '#FCA5A5' : '#93C5FD';
            return (
              <div
                key={label}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  border: `2px solid ${active ? '#F59E0B' : circleColor}`,
                  backgroundColor: active ? '#F59E0B' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  color: active ? '#000' : circleColor,
                  boxShadow: active ? '0 0 10px rgba(245,158,11,0.6)' : 'none',
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Right Warnings */}
        <div style={{ display: 'flex', gap: 10 }}>
          {WARNING_LABELS.map((label, idx) => {
            const active = rightSide.warnings[idx];
            const circleColor = state.mirrorExternal ? '#93C5FD' : '#FCA5A5';
            return (
              <div
                key={label}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  border: `2px solid ${active ? '#F59E0B' : circleColor}`,
                  backgroundColor: active ? '#F59E0B' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  color: active ? '#000' : circleColor,
                  boxShadow: active ? '0 0 10px rgba(245,158,11,0.6)' : 'none',
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM: Timer — big and always glowing */}
      <div style={{
        flexShrink: 0,
        textAlign: 'center',
        paddingBottom: 8,
      }}>
        <div style={{
          color: timerColor,
          fontSize: 160,
          fontWeight: 900,
          letterSpacing: 4,
          textShadow: '0 0 30px rgba(34,197,94,0.9), 0 0 60px rgba(34,197,94,0.5), 0 0 100px rgba(34,197,94,0.3)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          animation: state.isRunning ? 'timerPulse 1s ease-in-out infinite' : 'none',
        }}>
          {state.timerDisplay}
        </div>
        <style>{`
          @keyframes timerPulse {
            0%, 100% { text-shadow: 0 0 30px rgba(34,197,94,0.9), 0 0 60px rgba(34,197,94,0.5), 0 0 100px rgba(34,197,94,0.3); }
            50% { text-shadow: 0 0 50px rgba(34,197,94,1), 0 0 100px rgba(34,197,94,0.7), 0 0 150px rgba(34,197,94,0.5); }
          }
        `}</style>
      </div>

      {/* Winner Popup */}
      {showWinner && state.winner && (
        <button
          type="button"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            cursor: 'pointer',
            width: '100%',
            border: 'none',
            padding: 0,
          }}
          onClick={() => setShowWinner(false)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowWinner(false); }}
        >
          <div style={{
            borderRadius: 16,
            padding: '48px 64px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            border: `4px solid ${state.winner.side === 'Ao' ? '#93C5FD' : '#FCA5A5'}`,
            backgroundColor: state.winner.side === 'Ao' ? '#1D4ED8' : '#B91C1C',
            maxWidth: 520,
            width: '90%',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 24, fontWeight: 600, marginBottom: 12, letterSpacing: 4, textTransform: 'uppercase' }}>
              Winner
            </div>
            <div style={{ color: '#FFFFFF', fontSize: 96, fontWeight: 900, lineHeight: 1, marginBottom: 16 }}>
              {state.winner.side}
            </div>
            {state.winner.name && (
              <div style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 700 }}>{state.winner.name}</div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
