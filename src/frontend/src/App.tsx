import React, { useState, useEffect, useCallback, useRef } from "react";
import CenterPanel from "./components/CenterPanel";
import ControlBar from "./components/ControlBar";
import FileMenu from "./components/FileMenu";
import HistoryModal from "./components/HistoryModal";
import PlayerPanel, { type PlayerPanelState } from "./components/PlayerPanel";
import WinnerPopup from "./components/WinnerPopup";
import { useGetDefaultSettings, useSaveMatchLocal } from "./hooks/useQueries";
import { useTimer } from "./hooks/useTimer";
import ExternalDisplay from "./pages/ExternalDisplay";
import { buildRecordMatch } from "./utils/matchRecordMapper";
import { broadcastState } from "./utils/stateSync";

const DEFAULT_WARNINGS = (): boolean[] => [false, false, false, false, false];

const DEFAULT_PLAYER = (name = ""): PlayerPanelState => ({
  name,
  score: 0,
  ippon: 0,
  wazaari: 0,
  yuko: 0,
  senshu: false,
  warnings: DEFAULT_WARNINGS(),
});

let matchCounter = 0;

function checkIsExternalRoute() {
  const hash = window.location.hash;
  const search = window.location.search;
  const pathname = window.location.pathname;
  return (
    hash === "#/external" ||
    hash.startsWith("#/external") ||
    pathname.endsWith("/external") ||
    search.includes("external=1") ||
    search.includes("mode=external")
  );
}

export default function App() {
  const [isExternal, setIsExternal] = React.useState(checkIsExternalRoute);

  // Listen for hash changes in case the route changes dynamically
  useEffect(() => {
    const handler = () => setIsExternal(checkIsExternalRoute());
    window.addEventListener("hashchange", handler);
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("popstate", handler);
    };
  }, []);

  if (isExternal) {
    return <ExternalDisplay />;
  }

  return <MainScoreboard />;
}

function MainScoreboard() {
  const { data: defaultSettings } = useGetDefaultSettings();
  const { save: saveMatchLocal } = useSaveMatchLocal();

  const [ao, setAo] = useState<PlayerPanelState>(DEFAULT_PLAYER());
  const [aka, setAka] = useState<PlayerPanelState>(DEFAULT_PLAYER());

  const [category, setCategory] = useState("");
  const [winningScore, setWinningScore] = useState(6);
  const [winByLead, setWinByLead] = useState(false);
  const [leadAmount, setLeadAmount] = useState(2);
  const [mirrorInternal, setMirrorInternal] = useState(false);
  const [mirrorExternal, setMirrorExternal] = useState(false);
  const [tatamiNo, setTatamiNo] = useState("1");
  const [matchTimeMinutes, setMatchTimeMinutes] = useState(1);
  const [matchTimeSeconds, setMatchTimeSeconds] = useState(30);
  const [darkMode, setDarkMode] = useState(true);

  const [winner, setWinner] = useState<{
    side: "Ao" | "Aka";
    name: string;
    score: number;
  } | null>(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const winnerDeclaredRef = useRef(false);
  const matchSavedRef = useRef(false);

  const timer = useTimer((matchTimeMinutes * 60 + matchTimeSeconds) * 1000);

  // Apply default settings from backend — only on first successful load
  const timerSetDuration = timer.setDuration;
  useEffect(() => {
    if (defaultSettings) {
      const mins = Number(defaultSettings.minutes);
      const secs = Number(defaultSettings.seconds);
      setMatchTimeMinutes(mins);
      setMatchTimeSeconds(secs);
      setTatamiNo(defaultSettings.tatamiNumber);
      timerSetDuration((mins * 60 + secs) * 1000);
    }
  }, [defaultSettings, timerSetDuration]);

  const doSaveMatch = useCallback(
    (_winnerName: string, winnerSide: "Ao" | "Aka") => {
      matchCounter += 1;
      const record = buildRecordMatch({
        ao: { ...ao, isWinner: winnerSide === "Ao" },
        aka: { ...aka, isWinner: winnerSide === "Aka" },
        category,
        tatamiNumber: tatamiNo,
        totalTime: timer.timerDisplay,
        winner: winnerSide === "Ao" ? ao.name || "Ao" : aka.name || "Aka",
        matchNumber: matchCounter,
      });
      saveMatchLocal(record);
    },
    [ao, aka, category, tatamiNo, timer.timerDisplay, saveMatchLocal],
  );

  // Win detection — score-based and H-warning-based
  useEffect(() => {
    if (winnerDeclaredRef.current) return;

    let detectedWinner: {
      side: "Ao" | "Aka";
      name: string;
      score: number;
    } | null = null;

    if (winByLead) {
      const diff = ao.score - aka.score;
      if (diff >= leadAmount && ao.score > 0) {
        detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
      } else if (aka.score - ao.score >= leadAmount && aka.score > 0) {
        detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
      }
    } else {
      // Senshu tie-break: when both players are tied at the winning threshold
      // and one has senshu, both get +1 but the senshu holder wins
      if (
        winningScore > 0 &&
        ao.score === aka.score &&
        ao.score >= winningScore
      ) {
        // Both reached/exceeded winning score at the same time with equal scores
        if (ao.senshu && !aka.senshu) {
          detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
        } else if (aka.senshu && !ao.senshu) {
          detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
        }
        // If both have senshu or neither, fall through to normal logic
      }

      if (!detectedWinner) {
        if (ao.score >= winningScore && winningScore > 0) {
          detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
        } else if (aka.score >= winningScore && winningScore > 0) {
          detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
        }
      }
    }

    // H warning (index 4) = opponent wins
    if (!detectedWinner) {
      if (ao.warnings[4]) {
        detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
      } else if (aka.warnings[4]) {
        detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
      }
    }

    if (detectedWinner) {
      winnerDeclaredRef.current = true;
      setWinner(detectedWinner);
      setShowWinnerPopup(true);
      timer.stop();
      // Auto-save match
      if (!matchSavedRef.current) {
        matchSavedRef.current = true;
        doSaveMatch(detectedWinner.name, detectedWinner.side);
      }
    }
  }, [
    ao.score,
    aka.score,
    ao.warnings,
    aka.warnings,
    ao.name,
    aka.name,
    ao.senshu,
    aka.senshu,
    winByLead,
    leadAmount,
    winningScore,
    doSaveMatch,
    timer.stop,
  ]);

  // End-of-match tie-break: runs when timer hits 0
  useEffect(() => {
    if (timer.timeMs !== 0 || timer.isRunning) return;
    if (winnerDeclaredRef.current) return;
    if (ao.score === 0 && aka.score === 0) return;

    let tieSide: "Ao" | "Aka" | null = null;

    if (ao.score > aka.score) {
      tieSide = "Ao";
    } else if (aka.score > ao.score) {
      tieSide = "Aka";
    } else {
      // Tied — check senshu first
      if (ao.senshu && !aka.senshu) {
        tieSide = "Ao";
      } else if (aka.senshu && !ao.senshu) {
        tieSide = "Aka";
      } else {
        // Check total ippon + wazaari
        const aoPoints = ao.ippon + ao.wazaari;
        const akaPoints = aka.ippon + aka.wazaari;
        if (aoPoints > akaPoints) {
          tieSide = "Ao";
        } else if (akaPoints > aoPoints) {
          tieSide = "Aka";
        }
        // Still tied → no automatic winner (draw)
      }
    }

    if (tieSide) {
      winnerDeclaredRef.current = true;
      const detectedWinner = {
        side: tieSide,
        name: tieSide === "Ao" ? ao.name : aka.name,
        score: tieSide === "Ao" ? ao.score : aka.score,
      };
      setWinner(detectedWinner);
      setShowWinnerPopup(true);
      if (!matchSavedRef.current) {
        matchSavedRef.current = true;
        doSaveMatch(detectedWinner.name, detectedWinner.side);
      }
    }
  }, [
    timer.timeMs,
    timer.isRunning,
    ao.score,
    aka.score,
    ao.senshu,
    aka.senshu,
    ao.ippon,
    ao.wazaari,
    aka.ippon,
    aka.wazaari,
    ao.name,
    aka.name,
    doSaveMatch,
  ]);

  // Broadcast state to external window
  useEffect(() => {
    broadcastState({
      ao,
      aka,
      timerDisplay: timer.timerDisplay,
      timerMs: timer.timeMs,
      isRunning: timer.isRunning,
      tatamiNo,
      winner,
      mirrorExternal,
      category,
      darkMode,
    });
  }, [
    ao,
    aka,
    timer.timerDisplay,
    timer.timeMs,
    timer.isRunning,
    tatamiNo,
    winner,
    mirrorExternal,
    category,
    darkMode,
  ]);

  // Determine the winner for a match being reset (tie-break logic)
  const resolveWinnerForSave = useCallback((): {
    side: "Ao" | "Aka";
    name: string;
  } => {
    if (ao.score > aka.score) {
      return { side: "Ao", name: ao.name || "Ao" };
    }
    if (aka.score > ao.score) {
      return { side: "Aka", name: aka.name || "Aka" };
    }
    // Tied — senshu
    if (ao.senshu && !aka.senshu) {
      return { side: "Ao", name: ao.name || "Ao" };
    }
    if (aka.senshu && !ao.senshu) {
      return { side: "Aka", name: aka.name || "Aka" };
    }
    // Tied — ippon + wazaari count
    const aoPoints = ao.ippon + ao.wazaari;
    const akaPoints = aka.ippon + aka.wazaari;
    if (aoPoints > akaPoints) {
      return { side: "Ao", name: ao.name || "Ao" };
    }
    if (akaPoints > aoPoints) {
      return { side: "Aka", name: aka.name || "Aka" };
    }
    // Draw — save as Ao (arbitrary, but type requires a side)
    return { side: "Ao", name: "Draw" };
  }, [ao, aka]);

  const handleResetMatch = useCallback(() => {
    // Always save on reset — captures the final state of this match
    const resolved = resolveWinnerForSave();
    doSaveMatch(resolved.name, resolved.side);

    setAo(DEFAULT_PLAYER());
    setAka(DEFAULT_PLAYER());
    setWinner(null);
    setShowWinnerPopup(false);
    winnerDeclaredRef.current = false;
    matchSavedRef.current = false;
    timer.reset();
    timer.resetWhistleFlags();
  }, [resolveWinnerForSave, doSaveMatch, timer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R → reset match
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        handleResetMatch();
        return;
      }
      // S / s (no modifier) → start/stop timer
      if (
        (e.key === "s" || e.key === "S") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const target = e.target as HTMLElement;
        // Don't intercept if typing in an input
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        timer.toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timer, handleResetMatch]);

  const _handleSetMatchTime = useCallback(() => {
    const ms = (matchTimeMinutes * 60 + matchTimeSeconds) * 1000;
    timer.setDuration(ms);
  }, [matchTimeMinutes, matchTimeSeconds, timer]);

  const handleSet60Seconds = useCallback(() => {
    timer.setDuration(60000);
    setMatchTimeMinutes(1);
    setMatchTimeSeconds(0);
  }, [timer]);

  const handleFileSettingsApplied = useCallback(
    (mins: number, secs: number, tatami: string) => {
      setMatchTimeMinutes(mins);
      setMatchTimeSeconds(secs);
      setTatamiNo(tatami);
      timer.setDuration((mins * 60 + secs) * 1000);
    },
    [timer],
  );

  const handleOpenExternalSB = useCallback(() => {
    // Build the external URL: same origin + same pathname but with #/external hash
    const base = window.location.origin + window.location.pathname;
    // Remove any trailing slash before appending hash
    const clean = base.endsWith("/") ? base.slice(0, -1) : base;
    const url = `${clean}#/external`;
    window.open(url, "kumite_external_sb", "width=1280,height=720");
  }, []);

  // Player state updaters
  const updateAo = useCallback(
    (updater: (prev: PlayerPanelState) => PlayerPanelState) => {
      setAo((prev) => updater(prev));
    },
    [],
  );

  const updateAka = useCallback(
    (updater: (prev: PlayerPanelState) => PlayerPanelState) => {
      setAka((prev) => updater(prev));
    },
    [],
  );

  // Senshu tie-break scoring:
  // When both players are TIED at or above winningScore and one has senshu,
  // any additional score gives +1 to BOTH, but the senshu holder wins.
  const handleAoScore = useCallback(
    (points: number) => {
      const isTied = ao.score === aka.score;
      const atOrAboveWinning =
        !winByLead && winningScore > 0 && ao.score >= winningScore;
      if (isTied && atOrAboveWinning && ao.senshu && !aka.senshu) {
        // Senshu tie-break: both get +1, Ao (senshu) wins
        updateAo((prev) => ({
          ...prev,
          score: prev.score + 1,
          ippon: points === 3 ? prev.ippon + 1 : prev.ippon,
          wazaari: points === 2 ? prev.wazaari + 1 : prev.wazaari,
          yuko: points === 1 ? prev.yuko + 1 : prev.yuko,
        }));
        updateAka((prev) => ({ ...prev, score: prev.score + 1 }));
        return;
      }
      updateAo((prev) => ({
        ...prev,
        score: prev.score + points,
        ippon: points === 3 ? prev.ippon + 1 : prev.ippon,
        wazaari: points === 2 ? prev.wazaari + 1 : prev.wazaari,
        yuko: points === 1 ? prev.yuko + 1 : prev.yuko,
      }));
    },
    [
      updateAo,
      updateAka,
      ao.score,
      ao.senshu,
      aka.score,
      aka.senshu,
      winByLead,
      winningScore,
    ],
  );

  const handleAkaScore = useCallback(
    (points: number) => {
      const isTied = aka.score === ao.score;
      const atOrAboveWinning =
        !winByLead && winningScore > 0 && aka.score >= winningScore;
      if (isTied && atOrAboveWinning && aka.senshu && !ao.senshu) {
        // Senshu tie-break: both get +1, Aka (senshu) wins
        updateAka((prev) => ({
          ...prev,
          score: prev.score + 1,
          ippon: points === 3 ? prev.ippon + 1 : prev.ippon,
          wazaari: points === 2 ? prev.wazaari + 1 : prev.wazaari,
          yuko: points === 1 ? prev.yuko + 1 : prev.yuko,
        }));
        updateAo((prev) => ({ ...prev, score: prev.score + 1 }));
        return;
      }
      updateAka((prev) => ({
        ...prev,
        score: prev.score + points,
        ippon: points === 3 ? prev.ippon + 1 : prev.ippon,
        wazaari: points === 2 ? prev.wazaari + 1 : prev.wazaari,
        yuko: points === 1 ? prev.yuko + 1 : prev.yuko,
      }));
    },
    [
      updateAka,
      updateAo,
      aka.score,
      aka.senshu,
      ao.score,
      ao.senshu,
      winByLead,
      winningScore,
    ],
  );

  const handleAoDecrement = useCallback(() => {
    updateAo((prev) => ({ ...prev, score: Math.max(0, prev.score - 1) }));
  }, [updateAo]);

  const handleAkaDecrement = useCallback(() => {
    updateAka((prev) => ({ ...prev, score: Math.max(0, prev.score - 1) }));
  }, [updateAka]);

  // Senshu mutual exclusion: only allow toggling ON if other doesn't have senshu
  const handleAoToggleSenshu = useCallback(() => {
    updateAo((prev) => {
      if (!prev.senshu && aka.senshu) return prev; // aka has senshu, block
      return { ...prev, senshu: !prev.senshu };
    });
  }, [updateAo, aka.senshu]);

  const handleAkaToggleSenshu = useCallback(() => {
    updateAka((prev) => {
      if (!prev.senshu && ao.senshu) return prev; // ao has senshu, block
      return { ...prev, senshu: !prev.senshu };
    });
  }, [updateAka, ao.senshu]);

  const handleAoToggleWarning = useCallback(
    (idx: number) => {
      updateAo((prev) => {
        const warnings = [...prev.warnings];
        const turningOn = !warnings[idx];
        warnings[idx] = turningOn;

        let senshu = prev.senshu;

        // HC (index 3): if timer ≤ 14s and turning on, cancel senshu
        if (idx === 3 && turningOn && timer.timeMs <= 14000) {
          senshu = false;
        }

        // H (index 4): turning on means opponent (aka) wins — handled in useEffect
        return { ...prev, warnings, senshu };
      });
    },
    [updateAo, timer.timeMs],
  );

  const handleAkaToggleWarning = useCallback(
    (idx: number) => {
      updateAka((prev) => {
        const warnings = [...prev.warnings];
        const turningOn = !warnings[idx];
        warnings[idx] = turningOn;

        let senshu = prev.senshu;

        // HC (index 3): if timer ≤ 14s and turning on, cancel senshu
        if (idx === 3 && turningOn && timer.timeMs <= 14000) {
          senshu = false;
        }

        // H (index 4): turning on means opponent (ao) wins — handled in useEffect
        return { ...prev, warnings, senshu };
      });
    },
    [updateAka, timer.timeMs],
  );

  // Determine panel order based on mirror
  const leftPanel = mirrorInternal ? (
    <PlayerPanel
      side="aka"
      state={aka}
      otherHasSenshu={ao.senshu}
      timerMs={timer.timeMs}
      onNameChange={(name) => updateAka((p) => ({ ...p, name }))}
      onScore={handleAkaScore}
      onDecrementScore={handleAkaDecrement}
      onToggleSenshu={handleAkaToggleSenshu}
      onToggleWarning={handleAkaToggleWarning}
    />
  ) : (
    <PlayerPanel
      side="ao"
      state={ao}
      otherHasSenshu={aka.senshu}
      timerMs={timer.timeMs}
      onNameChange={(name) => updateAo((p) => ({ ...p, name }))}
      onScore={handleAoScore}
      onDecrementScore={handleAoDecrement}
      onToggleSenshu={handleAoToggleSenshu}
      onToggleWarning={handleAoToggleWarning}
    />
  );

  const rightPanel = mirrorInternal ? (
    <PlayerPanel
      side="ao"
      state={ao}
      otherHasSenshu={aka.senshu}
      timerMs={timer.timeMs}
      onNameChange={(name) => updateAo((p) => ({ ...p, name }))}
      onScore={handleAoScore}
      onDecrementScore={handleAoDecrement}
      onToggleSenshu={handleAoToggleSenshu}
      onToggleWarning={handleAoToggleWarning}
    />
  ) : (
    <PlayerPanel
      side="aka"
      state={aka}
      otherHasSenshu={ao.senshu}
      timerMs={timer.timeMs}
      onNameChange={(name) => updateAka((p) => ({ ...p, name }))}
      onScore={handleAkaScore}
      onDecrementScore={handleAkaDecrement}
      onToggleSenshu={handleAkaToggleSenshu}
      onToggleWarning={handleAkaToggleWarning}
    />
  );

  return (
    <div
      style={{ width: "100vw", height: "100vh" }}
      className={`flex flex-col overflow-hidden ${darkMode ? "bg-black" : "bg-white"}`}
    >
      {/* Control Bar */}
      <ControlBar
        category={category}
        winningScore={winningScore}
        winByLead={winByLead}
        leadAmount={leadAmount}
        mirrorInternal={mirrorInternal}
        mirrorExternal={mirrorExternal}
        darkMode={darkMode}
        onCategoryChange={setCategory}
        onWinningScoreChange={setWinningScore}
        onWinByLeadChange={setWinByLead}
        onLeadAmountChange={setLeadAmount}
        onMirrorInternalChange={setMirrorInternal}
        onMirrorExternalChange={setMirrorExternal}
        onShowHistory={() => setShowHistory(true)}
        onOpenExternalSB={handleOpenExternalSB}
        onOpenFileMenu={() => setShowFileMenu(true)}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />

      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-1 border-b border-gray-700 ${
          darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="font-bold text-sm">Karate Kumite Scoreboard</span>
            <span
              className={`text-[9px] italic ${darkMode ? "text-gray-500" : "text-gray-500"}`}
            >
              Software designed by Fenil Dav
            </span>
          </div>
        </div>
        <span
          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          {category && (
            <span
              className={`mr-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              {category}
            </span>
          )}
          Tatami: {tatamiNo}
        </span>
      </div>

      {/* Three Panel Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 min-w-0 overflow-hidden">{leftPanel}</div>

        {/* Center Panel */}
        <div className="w-52 shrink-0 overflow-hidden">
          <CenterPanel
            timerDisplay={timer.timerDisplay}
            isRunning={timer.isRunning}
            darkMode={darkMode}
            onToggleTimer={timer.toggle}
            onResetTime={timer.reset}
            onSet60Seconds={handleSet60Seconds}
            onResetMatch={handleResetMatch}
            onAdjustTime={timer.adjustTime}
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 overflow-hidden">{rightPanel}</div>
      </div>

      {/* Footer */}
      <footer
        className={`border-t border-gray-800 py-1 px-4 text-center shrink-0 ${darkMode ? "bg-black" : "bg-gray-100"}`}
      >
        <span
          className={`text-xs ${darkMode ? "text-gray-600" : "text-gray-500"}`}
        >
          © {new Date().getFullYear()} · Built with{" "}
          <span className="text-red-500">♥</span> using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "karate-kumite-scoreboard")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:text-white transition-colors ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            caffeine.ai
          </a>
        </span>
      </footer>

      {/* Modals */}
      <WinnerPopup
        isOpen={showWinnerPopup}
        winnerSide={winner?.side ?? null}
        winnerName={winner?.name ?? ""}
        winnerScore={winner?.score}
        onClose={() => setShowWinnerPopup(false)}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <FileMenu
        isOpen={showFileMenu}
        onClose={() => setShowFileMenu(false)}
        onSettingsApplied={handleFileSettingsApplied}
      />
    </div>
  );
}
