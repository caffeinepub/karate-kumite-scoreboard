import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

interface CenterPanelProps {
  timerDisplay: string;
  isRunning: boolean;
  darkMode?: boolean;
  onToggleTimer: () => void;
  onResetTime: () => void;
  onSet60Seconds: () => void;
  onResetMatch: () => void;
  onAdjustTime: (deltaMs: number) => void;
}

export default function CenterPanel({
  timerDisplay,
  isRunning,
  darkMode = true,
  onToggleTimer,
  onResetTime,
  onSet60Seconds,
  onResetMatch,
  onAdjustTime,
}: CenterPanelProps) {
  const labelColor = darkMode ? "#fff" : "#111";

  return (
    <div
      className="flex flex-col items-center w-full h-full px-3 py-3 gap-2"
      style={{ background: darkMode ? "#000" : "#e5e7eb" }}
    >
      {/* Start/Stop Button */}
      <button
        type="button"
        onClick={onToggleTimer}
        className="w-full py-3 font-bold text-xl rounded transition-all duration-150"
        style={{
          background: isRunning ? "#dc2626" : "#22c55e",
          color: isRunning ? "#fff" : "#000",
        }}
      >
        {isRunning ? "Stop" : "Start"}
      </button>

      {/* Timer Display with Adjust Arrows */}
      <div className="flex items-center gap-2 w-full justify-center">
        <button
          type="button"
          onClick={() => onAdjustTime(1000)}
          className="p-1 hover:text-timer-green transition-colors"
          style={{ color: labelColor }}
        >
          <ChevronUp size={14} />
        </button>
        <div
          className="font-scoreboard text-4xl font-black tracking-wider"
          style={{ color: "#4ade80" }}
        >
          {timerDisplay}
        </div>
        <button
          type="button"
          onClick={() => onAdjustTime(-1000)}
          className="p-1 text-red-400 hover:text-red-300 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Reset Time */}
      <button
        type="button"
        onClick={onResetTime}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded transition-all"
      >
        Reset time
      </button>

      {/* 60 Seconds */}
      <button
        type="button"
        onClick={onSet60Seconds}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded transition-all"
      >
        60 Seconds
      </button>

      {/* Reset Match */}
      <button
        type="button"
        onClick={onResetMatch}
        className="w-full py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded transition-all"
      >
        Reset match
      </button>
    </div>
  );
}
