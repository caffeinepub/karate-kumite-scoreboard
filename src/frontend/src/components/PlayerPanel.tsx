import React from 'react';

export interface PlayerPanelState {
  name: string;
  score: number;
  ippon: number;
  wazaari: number;
  yuko: number;
  senshu: boolean;
  warnings: boolean[]; // [1C, 2C, 3C, HC, H]
}

interface PlayerPanelProps {
  side: 'ao' | 'aka';
  state: PlayerPanelState;
  otherHasSenshu: boolean;
  timerMs: number;
  onNameChange: (name: string) => void;
  onScore: (points: number) => void;
  onDecrementScore: () => void;
  onToggleSenshu: () => void;
  onToggleWarning: (index: number) => void;
}

const WARNING_LABELS = ['1C', '2C', '3C', 'HC', 'H'];

// Glass button base — shared for score, -1, senshu (inactive)
const glassBtn =
  'bg-white/10 backdrop-blur-sm border border-white/25 text-white hover:bg-white/20 active:scale-95 transition-all duration-100';

export default function PlayerPanel({
  side,
  state,
  otherHasSenshu,
  onNameChange,
  onScore,
  onDecrementScore,
  onToggleSenshu,
  onToggleWarning,
}: PlayerPanelProps) {
  const isAo = side === 'ao';
  const title = isAo ? 'Ao' : 'Aka';

  const senshuDisabled = otherHasSenshu && !state.senshu;

  return (
    <div
      className={`flex flex-col items-center w-full h-full px-3 py-3 ${
        isAo ? 'bg-ao-blue' : 'bg-aka-red'
      }`}
    >
      {/* Title */}
      <h1 className="text-white font-scoreboard text-6xl font-black tracking-wide drop-shadow-lg mb-1">
        {title}
      </h1>

      {/* Logo badge */}
      <div className="text-white/30 text-xs font-bold tracking-widest mb-1">KKS</div>

      {/* Player Name Input */}
      <input
        type="text"
        value={state.name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Player Name"
        className={`w-full max-w-xs text-center text-white placeholder:text-white/60 font-semibold text-sm py-2 px-3 rounded border-0 outline-none mb-3`}
        style={{ background: isAo ? 'rgba(0,0,80,0.35)' : 'rgba(80,0,0,0.35)' }}
      />

      {/* Score Buttons */}
      <div className="flex flex-col gap-2 w-full max-w-xs mb-3">
        <button
          type="button"
          onClick={() => onScore(3)}
          className={`w-full py-3 font-bold text-lg rounded shadow-md ${glassBtn}`}
        >
          <span className="block">Ippon</span>
          <span className="block text-xs font-normal opacity-70">×{state.ippon}</span>
        </button>
        <button
          type="button"
          onClick={() => onScore(2)}
          className={`w-full py-3 font-bold text-lg rounded shadow-md ${glassBtn}`}
        >
          <span className="block">Waza-ari</span>
          <span className="block text-xs font-normal opacity-70">×{state.wazaari}</span>
        </button>
        <button
          type="button"
          onClick={() => onScore(1)}
          className={`w-full py-3 font-bold text-lg rounded shadow-md ${glassBtn}`}
        >
          <span className="block">Yuko</span>
          <span className="block text-xs font-normal opacity-70">×{state.yuko}</span>
        </button>
      </div>

      {/* Senshu Button */}
      <button
        type="button"
        onClick={onToggleSenshu}
        disabled={senshuDisabled}
        className={`w-full max-w-xs py-2 font-bold text-base rounded border-2 transition-all duration-150 mb-2 ${
          senshuDisabled
            ? 'opacity-50 cursor-not-allowed bg-white/5 text-white/40 border-white/10'
            : state.senshu
            ? 'bg-golden text-black border-golden shadow-golden-glow'
            : `${glassBtn} border-white/25`
        }`}
      >
        Senshu
      </button>

      {/* -1 Button */}
      <button
        type="button"
        onClick={onDecrementScore}
        className={`w-full max-w-xs py-2 font-bold text-base rounded transition-all duration-100 mb-3 ${glassBtn}`}
      >
        -1
      </button>

      {/* Total Score */}
      <div className="text-white font-scoreboard text-8xl font-black leading-none mb-4 drop-shadow-xl">
        {state.score}
      </div>

      {/* Warning Circle Buttons */}
      <div className="flex gap-2 mt-auto">
        {WARNING_LABELS.map((label, idx) => (
          <button
            type="button"
            key={label}
            onClick={() => onToggleWarning(idx)}
            className={`w-11 h-11 rounded-full border-2 font-bold text-xs transition-all duration-150 ${
              state.warnings[idx]
                ? 'bg-golden text-black border-golden shadow-golden-glow'
                : `${glassBtn} rounded-full border-white/25`
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
