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
  const bgColor = darkMode ? "#000000" : "#E5E7EB";
  const labelColor = darkMode ? "#FFFFFF" : "#111827";

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
      className="flex flex-col items-center w-full h-full px-3 py-3 gap-2"
      style={{ backgroundColor: bgColor }}
    >
      {/* Start/Stop Button */}
      <button
        type="button"
        onClick={onToggleTimer}
        className="w-full py-3 font-bold text-xl rounded transition-all duration-150"
        style={{
          backgroundColor: isRunning ? "#DC2626" : "#16A34A",
          color: "#FFFFFF",
        }}
      >
        {isRunning ? "Stop" : "Start"}
      </button>

      {/* Timer Display with Adjust Arrows */}
      <div className="flex items-center gap-2 w-full justify-center">
        <button
          type="button"
          onClick={() => onAdjustTime(1000)}
          className="p-1 transition-colors"
          style={{ color: labelColor }}
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
          className="p-1 transition-colors"
          style={{ color: "#F87171" }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Reset Time */}
      <button
        type="button"
        onClick={onResetTime}
        className="w-full py-2 font-bold text-sm rounded transition-all"
        style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}
      >
        Reset time
      </button>

      {/* 60 Seconds */}
      <button
        type="button"
        onClick={onSet60Seconds}
        className="w-full py-2 font-bold text-sm rounded transition-all"
        style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
      >
        60 Seconds
      </button>

      {/* Reset Match */}
      <button
        type="button"
        onClick={onResetMatch}
        className="w-full py-2 font-bold text-sm rounded transition-all"
        style={{ backgroundColor: "#991B1B", color: "#FFFFFF" }}
      >
        Reset match
      </button>
    </div>
  );
}
