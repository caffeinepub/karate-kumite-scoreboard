import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

interface CenterPanelProps {
  timerDisplay: string;
  timerMs: number;
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
  timerMs,
  isRunning,
  darkMode = true,
  onToggleTimer,
  onResetTime,
  onSet60Seconds,
  onResetMatch,
  onAdjustTime,
}: CenterPanelProps) {
  const bgClass = darkMode ? "bg-black" : "bg-gray-200";
  const labelClass = darkMode ? "text-white" : "text-gray-900";

  // Timer color: yellow when running, red when running & last 15s, white when stopped
  const timerColor = !isRunning
    ? "#FFFFFF"
    : timerMs <= 15000
      ? "#EF4444"
      : "#FACC15";

  const timerGlow = !isRunning
    ? "none"
    : timerMs <= 15000
      ? "0 0 16px rgba(239,68,68,0.9), 0 0 32px rgba(239,68,68,0.5)"
      : "0 0 16px rgba(250,204,21,0.9), 0 0 32px rgba(250,204,21,0.5)";

  return (
    <div
      className={`flex flex-col items-center ${bgClass} w-full h-full px-3 py-3 gap-2`}
    >
      {/* Start/Stop Button */}
      <button
        type="button"
        onClick={onToggleTimer}
        className={`w-full py-3 font-bold text-xl rounded transition-all duration-150 ${
          isRunning
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-timer-green hover:bg-green-500 text-black"
        }`}
      >
        {isRunning ? "Stop" : "Start"}
      </button>

      {/* Timer Display with Adjust Arrows */}
      <div className="flex items-center gap-2 w-full justify-center">
        <button
          type="button"
          onClick={() => onAdjustTime(1000)}
          className={`p-1 hover:text-timer-green transition-colors ${labelClass}`}
        >
          <ChevronUp size={14} />
        </button>
        <div
          className="font-scoreboard text-4xl font-black tracking-wider"
          style={{
            color: timerColor,
            textShadow: timerGlow,
            transition: "color 0.3s, text-shadow 0.3s",
          }}
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
