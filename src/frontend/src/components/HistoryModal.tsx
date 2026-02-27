import React from 'react';
import { X, Download, RefreshCw, Trash2 } from 'lucide-react';
import { useLocalHistory } from '../hooks/useQueries';
import { exportHistoryToPDF } from '../utils/pdfExport';
import { clearHistoryLocal } from '../utils/localHistory';
import type { RecordMatch } from '../backend';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  if (ms === 0) return 'N/A';
  return new Date(ms).toLocaleString();
}

function foulLabel(foul: string): string {
  const map: Record<string, string> = { c1: '1C', c2: '2C', c3: '3C', hansoku: 'HC', hansokumake: 'H' };
  return map[foul] ?? foul;
}

function MatchRow({ match, index }: { match: RecordMatch; index: number }) {
  const aoScore = Number(match.ao.ippon) * 3 + Number(match.ao.wazaari) * 2 + Number(match.ao.yuko);
  const akaScore = Number(match.aka.ippon) * 3 + Number(match.aka.wazaari) * 2 + Number(match.aka.yuko);

  return (
    <div className="bg-gray-800 rounded-lg p-3 mb-2 text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs">#{index + 1} · {formatTimestamp(match.timestamp)}</span>
        <div className="flex gap-2">
          <span className="text-gray-300 text-xs">Category: <span className="text-white">{match.category || 'N/A'}</span></span>
          <span className="text-gray-300 text-xs">Tatami: <span className="text-white">{match.tatamiNumber}</span></span>
          <span className="text-gray-300 text-xs">Time: <span className="text-white">{match.totalTime}</span></span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* AO */}
        <div className="bg-ao-blue/30 rounded p-2 border border-ao-blue/50">
          <div className="text-blue-300 font-bold text-base mb-1">AO — {match.ao.name || 'N/A'}</div>
          <div className="text-white text-xl font-black">{aoScore}</div>
          <div className="text-gray-300 text-xs">I:{String(match.ao.ippon)} W:{String(match.ao.wazaari)} Y:{String(match.ao.yuko)}</div>
          <div className="text-xs mt-1">
            {match.ao.senshu && <span className="text-golden font-bold mr-2">Senshu</span>}
            {match.ao.warnings.length > 0 && (
              <span className="text-orange-400">{match.ao.warnings.map(w => foulLabel(String(w.foul))).join(' ')}</span>
            )}
          </div>
        </div>
        {/* AKA */}
        <div className="bg-aka-red/30 rounded p-2 border border-aka-red/50">
          <div className="text-red-300 font-bold text-base mb-1">AKA — {match.aka.name || 'N/A'}</div>
          <div className="text-white text-xl font-black">{akaScore}</div>
          <div className="text-gray-300 text-xs">I:{String(match.aka.ippon)} W:{String(match.aka.wazaari)} Y:{String(match.aka.yuko)}</div>
          <div className="text-xs mt-1">
            {match.aka.senshu && <span className="text-golden font-bold mr-2">Senshu</span>}
            {match.aka.warnings.length > 0 && (
              <span className="text-orange-400">{match.aka.warnings.map(w => foulLabel(String(w.foul))).join(' ')}</span>
            )}
          </div>
        </div>
      </div>
      {match.winner && (
        <div className="mt-2 text-center text-golden font-bold text-sm">
          🏆 Winner: {match.winner}
        </div>
      )}
    </div>
  );
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const { matches, refresh } = useLocalHistory();

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all match history? This cannot be undone.')) {
      clearHistoryLocal();
      refresh();
    }
  };

  // Refresh whenever the modal opens
  React.useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 rounded-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-xl">Match History <span className="text-gray-500 text-sm font-normal">({matches.length} matches)</span></h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-all"
              title="Refresh history"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => matches.length > 0 && exportHistoryToPDF(matches)}
              disabled={matches.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded transition-all"
            >
              <Download size={14} />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={matches.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-semibold rounded transition-all"
              title="Clear all history"
            >
              <Trash2 size={14} />
              Clear History
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {matches.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <p className="text-lg mb-2">No matches recorded yet.</p>
              <p className="text-sm text-gray-500">Matches are saved automatically when you click Reset Match.</p>
            </div>
          ) : (
            [...matches].reverse().map((match, idx) => (
              <MatchRow key={`${String(match.matchNumber)}-${String(match.timestamp)}`} match={match} index={matches.length - 1 - idx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
