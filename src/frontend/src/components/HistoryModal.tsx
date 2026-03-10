import { Download, RefreshCw, Trash2, X } from "lucide-react";
import React from "react";
import type { RecordMatch } from "../backend";
import { useLocalHistory } from "../hooks/useQueries";
import { clearHistoryLocal } from "../utils/localHistory";
import { exportHistoryToPDF } from "../utils/pdfExport";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimestamp(ts: bigint): string {
  try {
    const ms = Number(ts / BigInt(1_000_000));
    if (ms === 0) return "N/A";
    return new Date(ms).toLocaleString();
  } catch {
    return "N/A";
  }
}

function foulLabel(foul: string): string {
  const map: Record<string, string> = {
    c1: "1C",
    c2: "2C",
    c3: "3C",
    hansoku: "HC",
    hansokumake: "H",
  };
  return map[foul] ?? foul;
}

function MatchRow({ match, index }: { match: RecordMatch; index: number }) {
  let aoScore = 0;
  let akaScore = 0;
  try {
    aoScore =
      Number(match.ao.ippon) * 3 +
      Number(match.ao.wazaari) * 2 +
      Number(match.ao.yuko);
    akaScore =
      Number(match.aka.ippon) * 3 +
      Number(match.aka.wazaari) * 2 +
      Number(match.aka.yuko);
  } catch {
    // fallback
  }

  return (
    <div
      style={{
        backgroundColor: "#1f2937",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 8,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "#9ca3af", fontSize: 11 }}>
          #{index + 1} &middot; {formatTimestamp(match.timestamp)}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: "#d1d5db", fontSize: 11 }}>
            Category:{" "}
            <span style={{ color: "#fff" }}>{match.category || "N/A"}</span>
          </span>
          <span style={{ color: "#d1d5db", fontSize: 11 }}>
            Tatami: <span style={{ color: "#fff" }}>{match.tatamiNumber}</span>
          </span>
          <span style={{ color: "#d1d5db", fontSize: 11 }}>
            Time: <span style={{ color: "#fff" }}>{match.totalTime}</span>
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* AO */}
        <div
          style={{
            backgroundColor: "oklch(0.22 0.10 255)",
            border: "1px solid oklch(0.35 0.18 255)",
            borderRadius: 6,
            padding: 8,
          }}
        >
          <div
            style={{
              color: "#93c5fd",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            AO &mdash; {match.ao.name || "N/A"}
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
            {aoScore}
          </div>
          <div style={{ color: "#d1d5db", fontSize: 11 }}>
            I:{String(match.ao.ippon)} W:{String(match.ao.wazaari)} Y:
            {String(match.ao.yuko)}
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {match.ao.senshu && (
              <span
                style={{
                  color: "oklch(0.82 0.18 85)",
                  fontWeight: 700,
                  marginRight: 6,
                }}
              >
                Senshu
              </span>
            )}
            {match.ao.warnings.length > 0 && (
              <span style={{ color: "#fb923c" }}>
                {match.ao.warnings
                  .map((w) => foulLabel(String(w.foul)))
                  .join(" ")}
              </span>
            )}
          </div>
        </div>
        {/* AKA */}
        <div
          style={{
            backgroundColor: "oklch(0.22 0.10 25)",
            border: "1px solid oklch(0.35 0.18 25)",
            borderRadius: 6,
            padding: 8,
          }}
        >
          <div
            style={{
              color: "#fca5a5",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            AKA &mdash; {match.aka.name || "N/A"}
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
            {akaScore}
          </div>
          <div style={{ color: "#d1d5db", fontSize: 11 }}>
            I:{String(match.aka.ippon)} W:{String(match.aka.wazaari)} Y:
            {String(match.aka.yuko)}
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {match.aka.senshu && (
              <span
                style={{
                  color: "oklch(0.82 0.18 85)",
                  fontWeight: 700,
                  marginRight: 6,
                }}
              >
                Senshu
              </span>
            )}
            {match.aka.warnings.length > 0 && (
              <span style={{ color: "#fb923c" }}>
                {match.aka.warnings
                  .map((w) => foulLabel(String(w.foul)))
                  .join(" ")}
              </span>
            )}
          </div>
        </div>
      </div>
      {match.winner && (
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
            color: "oklch(0.82 0.18 85)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Winner: {match.winner}
        </div>
      )}
    </div>
  );
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const { matches, refresh } = useLocalHistory();

  const handleClearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all match history? This cannot be undone.",
      )
    ) {
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#111827",
          borderRadius: 12,
          width: "100%",
          maxWidth: 780,
          margin: "0 16px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #374151",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid #374151",
            flexShrink: 0,
          }}
        >
          <h2
            style={{ color: "#fff", fontWeight: 700, fontSize: 20, margin: 0 }}
          >
            Match History{" "}
            <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 400 }}>
              ({matches.length} matches)
            </span>
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={refresh}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                backgroundColor: "#374151",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
              title="Refresh history"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (matches.length === 0) {
                  alert("No match history to export.");
                  return;
                }
                exportHistoryToPDF(matches);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                opacity: 1,
              }}
            >
              <Download size={14} />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={matches.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                backgroundColor: "#b91c1c",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: matches.length === 0 ? "not-allowed" : "pointer",
                opacity: matches.length === 0 ? 0.5 : 1,
              }}
              title="Clear all history"
            >
              <Trash2 size={14} />
              Clear History
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 6,
                color: "#9ca3af",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {matches.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "40px 0",
              }}
            >
              <p style={{ fontSize: 17, marginBottom: 8 }}>
                No matches recorded yet.
              </p>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                Matches are saved automatically when you click Reset Match.
              </p>
            </div>
          ) : (
            [...matches]
              .reverse()
              .map((match, idx) => (
                <MatchRow
                  key={`${String(match.matchNumber)}-${String(match.timestamp)}`}
                  match={match}
                  index={matches.length - 1 - idx}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}
