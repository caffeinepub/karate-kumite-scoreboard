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
import { playDoubleWhistle } from "./utils/audioService";
import { buildRecordMatch } from "./utils/matchRecordMapper";
import { broadcastState, setExternalWindow } from "./utils/stateSync";

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

  // Load persisted file settings from localStorage immediately
  const _localFileSettings = (() => {
    try {
      const raw = localStorage.getItem("kumite_file_settings_v1");
      return raw
        ? (JSON.parse(raw) as {
            minutes: number;
            seconds: number;
            tatamiNo: string;
          })
        : null;
    } catch {
      return null;
    }
  })();

  const [category, setCategory] = useState("");
  const [winningScore, setWinningScore] = useState(6);
  const [winByLead, setWinByLead] = useState(false);
  const [leadAmount, setLeadAmount] = useState(2);
  const [mirrorInternal, setMirrorInternal] = useState(false);
  const [mirrorExternal, setMirrorExternal] = useState(false);
  const [tatamiNo, setTatamiNo] = useState(_localFileSettings?.tatamiNo ?? "1");
  const [matchTimeMinutes, setMatchTimeMinutes] = useState(
    _localFileSettings?.minutes ?? 1,
  );
  const [matchTimeSeconds, setMatchTimeSeconds] = useState(
    _localFileSettings?.seconds ?? 30,
  );
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

  const _initialTimerMs = _localFileSettings
    ? (_localFileSettings.minutes * 60 + _localFileSettings.seconds) * 1000
    : (matchTimeMinutes * 60 + matchTimeSeconds) * 1000;
  const timer = useTimer(_initialTimerMs);

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
      if (winningScore > 0) {
        // When both are tied at or above winning score, senshu holder wins
        if (ao.score === aka.score && ao.score >= winningScore) {
          if (ao.senshu && !aka.senshu) {
            detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
          } else if (aka.senshu && !ao.senshu) {
            detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
          }
          // If both have senshu or neither → no winner yet, need more points
        } else if (ao.score >= winningScore && ao.score > aka.score) {
          // Ao clearly leads at winning score
          detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
        } else if (aka.score >= winningScore && aka.score > ao.score) {
          // Aka clearly leads at winning score
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
      // Play end-of-match double whistle
      playDoubleWhistle();
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

  // Keep a ref to the latest state so we can re-broadcast on demand
  const latestStateRef = useRef({
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

  // Broadcast state to external window
  useEffect(() => {
    const currentState = {
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
    };
    latestStateRef.current = currentState;
    broadcastState(currentState);
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

  // Listen for the external window signaling it's ready (postMessage from ExternalDisplay)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "KUMITE_READY_V8") {
        // External window is loaded and ready — send current state
        setTimeout(() => broadcastState(latestStateRef.current), 50);
        setTimeout(() => broadcastState(latestStateRef.current), 200);
        setTimeout(() => broadcastState(latestStateRef.current), 500);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
    const popup = window.open(
      url,
      "kumite_external_sb",
      "width=1280,height=720",
    );
    if (popup) {
      setExternalWindow(popup);
      // Once popup loads, send current state immediately
      popup.addEventListener("load", () => {
        broadcastState(latestStateRef.current);
      });
      // Also send after short delays in case load already fired
      setTimeout(() => broadcastState(latestStateRef.current), 200);
      setTimeout(() => broadcastState(latestStateRef.current), 600);
      setTimeout(() => broadcastState(latestStateRef.current), 1200);
    }
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
  // When both players are TIED and the next score would put the scorer at winningScore
  // (or already at/above), and the OTHER player has senshu, both get +1 and the senshu holder wins.
  // Also triggers when BOTH are already tied at or above winning score.
  const handleAoScore = useCallback(
    (points: number) => {
      if (!winByLead && winningScore > 0) {
        const isTied = ao.score === aka.score;
        // Senshu tie-break: Aka has senshu, Ao is about to reach/exceed winning score from a tied position
        const aoWouldReachWinning = ao.score + 1 >= winningScore;
        const alreadyTiedAtWinning = isTied && ao.score >= winningScore;
        if (
          isTied &&
          !ao.senshu &&
          aka.senshu &&
          (aoWouldReachWinning || alreadyTiedAtWinning)
        ) {
          // Senshu tie-break: both get +1, Aka (senshu) wins
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
        // Senshu tie-break: Ao has senshu, Ao is about to reach/exceed winning score from a tied position
        if (
          isTied &&
          ao.senshu &&
          !aka.senshu &&
          (aoWouldReachWinning || alreadyTiedAtWinning)
        ) {
          // Both get +1, Ao (senshu) wins
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
      if (!winByLead && winningScore > 0) {
        const isTied = aka.score === ao.score;
        const akaWouldReachWinning = aka.score + 1 >= winningScore;
        const alreadyTiedAtWinning = isTied && aka.score >= winningScore;
        if (
          isTied &&
          !aka.senshu &&
          ao.senshu &&
          (akaWouldReachWinning || alreadyTiedAtWinning)
        ) {
          // Senshu tie-break: both get +1, Ao (senshu) wins
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
        if (
          isTied &&
          aka.senshu &&
          !ao.senshu &&
          (akaWouldReachWinning || alreadyTiedAtWinning)
        ) {
          // Both get +1, Aka (senshu) wins
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
    updateAo((prev) => {
      if (prev.score <= 0) return prev;
      // Deduct from the highest-value score type first
      let { ippon, wazaari, yuko, score } = prev;
      if (ippon > 0) {
        ippon -= 1;
      } else if (wazaari > 0) {
        wazaari -= 1;
      } else if (yuko > 0) {
        yuko -= 1;
      }
      return { ...prev, score: Math.max(0, score - 1), ippon, wazaari, yuko };
    });
  }, [updateAo]);

  const handleAkaDecrement = useCallback(() => {
    updateAka((prev) => {
      if (prev.score <= 0) return prev;
      let { ippon, wazaari, yuko, score } = prev;
      if (ippon > 0) {
        ippon -= 1;
      } else if (wazaari > 0) {
        wazaari -= 1;
      } else if (yuko > 0) {
        yuko -= 1;
      }
      return { ...prev, score: Math.max(0, score - 1), ippon, wazaari, yuko };
    });
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

  // Hold-R reset: track keydown start time
  const rHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

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
        !e.altKey &&
        !e.shiftKey
      ) {
        if (inInput) return;
        e.preventDefault();
        timer.toggle();
        return;
      }

      // Hold R for 3 seconds → reset match
      if (
        (e.key === "r" || e.key === "R") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !e.repeat
      ) {
        if (inInput) return;
        if (rHoldTimerRef.current) return; // already holding
        rHoldTimerRef.current = setTimeout(() => {
          rHoldTimerRef.current = null;
          handleResetMatch();
        }, 3000);
        return;
      }

      // Alt+I → Ao Ippon
      if (e.altKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        handleAoScore(3);
        return;
      }
      // Alt+W → Ao Waza-ari
      if (e.altKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        handleAoScore(2);
        return;
      }
      // Alt+Y → Ao Yuko
      if (e.altKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleAoScore(1);
        return;
      }
      // Alt+S → Ao Senshu
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleAoToggleSenshu();
        return;
      }

      // Shift+I → Aka Ippon (works even when input is focused)
      if (
        e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        (e.key === "I" || e.key === "i")
      ) {
        e.preventDefault();
        handleAkaScore(3);
        return;
      }
      // Shift+W → Aka Waza-ari (works even when input is focused)
      if (
        e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        (e.key === "W" || e.key === "w")
      ) {
        e.preventDefault();
        handleAkaScore(2);
        return;
      }
      // Shift+Y → Aka Yuko (works even when input is focused)
      if (
        e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        (e.key === "Y" || e.key === "y")
      ) {
        e.preventDefault();
        handleAkaScore(1);
        return;
      }
      // Shift+S → Aka Senshu (works even when input is focused)
      if (
        e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        (e.key === "S" || e.key === "s")
      ) {
        e.preventDefault();
        handleAkaToggleSenshu();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Cancel hold-R if key released before 3s
      if ((e.key === "r" || e.key === "R") && rHoldTimerRef.current) {
        clearTimeout(rHoldTimerRef.current);
        rHoldTimerRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (rHoldTimerRef.current) {
        clearTimeout(rHoldTimerRef.current);
        rHoldTimerRef.current = null;
      }
    };
  }, [
    timer,
    handleResetMatch,
    handleAoScore,
    handleAkaScore,
    handleAoToggleSenshu,
    handleAkaToggleSenshu,
  ]);

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
