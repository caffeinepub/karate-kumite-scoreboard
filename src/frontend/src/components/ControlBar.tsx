import React from "react";

interface ControlBarProps {
  category: string;
  winningScore: number;
  winByLead: boolean;
  leadAmount: number;
  mirrorInternal: boolean;
  mirrorExternal: boolean;
  darkMode: boolean;
  onCategoryChange: (val: string) => void;
  onWinningScoreChange: (val: number) => void;
  onWinByLeadChange: (val: boolean) => void;
  onLeadAmountChange: (val: number) => void;
  onMirrorInternalChange: (val: boolean) => void;
  onMirrorExternalChange: (val: boolean) => void;
  onShowHistory: () => void;
  onOpenExternalSB: () => void;
  onOpenFileMenu: () => void;
  onToggleDarkMode: () => void;
}

export default function ControlBar({
  category,
  winningScore,
  winByLead,
  leadAmount,
  mirrorInternal,
  mirrorExternal,
  darkMode,
  onCategoryChange,
  onWinningScoreChange,
  onWinByLeadChange,
  onLeadAmountChange,
  onMirrorInternalChange,
  onMirrorExternalChange,
  onShowHistory,
  onOpenExternalSB,
  onOpenFileMenu,
  onToggleDarkMode,
}: ControlBarProps) {
  return (
    <div className="bg-control-bar border-b border-gray-700 px-3 py-2">
      {/* Top row: History | Controls | External SB */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <button
          type="button"
          onClick={onShowHistory}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded border border-gray-500 whitespace-nowrap"
        >
          Show History
        </button>

        {/* Center controls */}
        <div className="flex flex-wrap items-center gap-3 justify-center flex-1">
          {/* Category */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="Category (e.g. Male -60kg)"
              className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm w-44 placeholder:text-gray-400"
            />
          </div>

          {/* Winning Score */}
          <div className="flex items-center gap-1">
            <span className="text-gray-300 text-xs whitespace-nowrap">
              Winning Score:
            </span>
            <input
              type="number"
              min={1}
              value={winningScore}
              onChange={(e) => onWinningScoreChange(Number(e.target.value))}
              disabled={winByLead}
              className="w-14 text-center bg-gray-800 text-white border border-gray-600 rounded py-1 text-sm disabled:opacity-40"
            />
          </div>

          {/* Win by Lead */}
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 cursor-pointer text-gray-300 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                checked={winByLead}
                onChange={(e) => onWinByLeadChange(e.target.checked)}
                className="accent-golden w-3 h-3"
              />
              Win by Lead:
            </label>
            <input
              type="number"
              min={1}
              value={leadAmount}
              onChange={(e) => onLeadAmountChange(Number(e.target.value))}
              className="w-14 text-center bg-gray-800 text-white border border-gray-600 rounded py-1 text-sm"
            />
          </div>

          {/* Mirror Internal */}
          <label className="flex items-center gap-1 cursor-pointer text-gray-300 text-xs whitespace-nowrap">
            <input
              type="checkbox"
              checked={mirrorInternal}
              onChange={(e) => onMirrorInternalChange(e.target.checked)}
              className="accent-golden w-3 h-3"
            />
            Mirror Internal
          </label>

          {/* Mirror External */}
          <label className="flex items-center gap-1 cursor-pointer text-gray-300 text-xs whitespace-nowrap">
            <input
              type="checkbox"
              checked={mirrorExternal}
              onChange={(e) => onMirrorExternalChange(e.target.checked)}
              className="accent-golden w-3 h-3"
            />
            Mirror External
          </label>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded border border-gray-500"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            type="button"
            onClick={onOpenFileMenu}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded border border-gray-500"
          >
            File ▼
          </button>
          <button
            type="button"
            onClick={onOpenExternalSB}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded border border-gray-400"
          >
            External SB
          </button>
        </div>
      </div>
    </div>
  );
}
