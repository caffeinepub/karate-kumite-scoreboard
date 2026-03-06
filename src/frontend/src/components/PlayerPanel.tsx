import type React from "react";

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
  side: "ao" | "aka";
  state: PlayerPanelState;
  otherHasSenshu: boolean;
  timerMs: number;
  onNameChange: (name: string) => void;
  onScore: (points: number) => void;
  onDecrementScore: () => void;
  onToggleSenshu: () => void;
  onToggleWarning: (index: number) => void;
}

const WARNING_LABELS = ["1C", "2C", "3C", "HC", "H"];

const AO_BG = "#1a3a8f"; // rich blue
const AKA_BG = "#8f1a1a"; // rich red
const GLASS_BG = "rgba(255,255,255,0.12)";
const GLASS_BORDER = "rgba(255,255,255,0.28)";
const GLASS_HOVER_BG = "rgba(255,255,255,0.22)";
const GOLDEN_BG = "#c8a000";
const GOLDEN_BORDER = "#c8a000";
const GOLDEN_SHADOW = "0 0 12px rgba(200,160,0,0.6)";

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
  const isAo = side === "ao";
  const title = isAo ? "Ao" : "Aka";
  const panelBg = isAo ? AO_BG : AKA_BG;

  const senshuDisabled = otherHasSenshu && !state.senshu;

  const glassStyle: React.CSSProperties = {
    background: GLASS_BG,
    border: `1px solid ${GLASS_BORDER}`,
    color: "#fff",
    cursor: "pointer",
  };

  return (
    <div
      className="flex flex-col items-center w-full h-full px-3 py-3"
      style={{ background: panelBg }}
    >
      {/* Title */}
      <h1 className="text-white font-scoreboard text-6xl font-black tracking-wide drop-shadow-lg mb-1">
        {title}
      </h1>

      {/* Player Name Input */}
      <input
        type="text"
        value={state.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Player Name"
        className="w-full max-w-xs text-center font-semibold text-sm py-2 px-3 rounded border-0 outline-none mb-3"
        style={{
          background: isAo ? "rgba(0,0,60,0.4)" : "rgba(60,0,0,0.4)",
          color: "#fff",
        }}
      />

      {/* Score Buttons */}
      <div className="flex flex-col gap-2 w-full max-w-xs mb-3">
        <button
          type="button"
          onClick={() => onScore(3)}
          className="w-full py-3 font-bold text-lg rounded shadow-md transition-all duration-100 active:scale-95"
          style={glassStyle}
        >
          <span className="block">Ippon</span>
          <span className="block text-xs font-normal" style={{ opacity: 0.7 }}>
            ×{state.ippon}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onScore(2)}
          className="w-full py-3 font-bold text-lg rounded shadow-md transition-all duration-100 active:scale-95"
          style={glassStyle}
        >
          <span className="block">Waza-ari</span>
          <span className="block text-xs font-normal" style={{ opacity: 0.7 }}>
            ×{state.wazaari}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onScore(1)}
          className="w-full py-3 font-bold text-lg rounded shadow-md transition-all duration-100 active:scale-95"
          style={glassStyle}
        >
          <span className="block">Yuko</span>
          <span className="block text-xs font-normal" style={{ opacity: 0.7 }}>
            ×{state.yuko}
          </span>
        </button>
      </div>

      {/* Senshu Button */}
      <button
        type="button"
        onClick={onToggleSenshu}
        disabled={senshuDisabled}
        className="w-full max-w-xs py-2 font-bold text-base rounded border-2 transition-all duration-150 mb-2"
        style={
          senshuDisabled
            ? {
                opacity: 0.4,
                cursor: "not-allowed",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.4)",
                border: "2px solid rgba(255,255,255,0.1)",
              }
            : state.senshu
              ? {
                  background: GOLDEN_BG,
                  color: "#000",
                  border: `2px solid ${GOLDEN_BORDER}`,
                  boxShadow: GOLDEN_SHADOW,
                  cursor: "pointer",
                }
              : {
                  ...glassStyle,
                  border: `2px solid ${GLASS_BORDER}`,
                }
        }
      >
        Senshu
      </button>

      {/* -1 Button */}
      <button
        type="button"
        onClick={onDecrementScore}
        className="w-full max-w-xs py-2 font-bold text-base rounded transition-all duration-100 mb-3 active:scale-95"
        style={glassStyle}
      >
        -1
      </button>

      {/* Total Score */}
      <div
        className="font-scoreboard text-8xl font-black leading-none mb-4 drop-shadow-xl"
        style={{ color: "#fff" }}
      >
        {state.score}
      </div>

      {/* Warning Circle Buttons */}
      <div className="flex gap-2 mt-auto">
        {WARNING_LABELS.map((label, idx) => (
          <button
            type="button"
            key={label}
            onClick={() => onToggleWarning(idx)}
            className="w-11 h-11 rounded-full font-bold text-xs transition-all duration-150"
            style={
              state.warnings[idx]
                ? {
                    background: GOLDEN_BG,
                    color: "#000",
                    border: `2px solid ${GOLDEN_BORDER}`,
                    boxShadow: GOLDEN_SHADOW,
                    cursor: "pointer",
                  }
                : {
                    ...glassStyle,
                    border: `2px solid ${GLASS_BORDER}`,
                  }
            }
            onMouseEnter={(e) => {
              if (!state.warnings[idx]) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  GLASS_HOVER_BG;
              }
            }}
            onMouseLeave={(e) => {
              if (!state.warnings[idx]) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  GLASS_BG;
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
