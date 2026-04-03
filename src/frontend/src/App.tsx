import React, { useState, useEffect, useCallback, useRef } from "react";
import CenterPanel from "./components/CenterPanel";
import ControlBar from "./components/ControlBar";
import FileMenu from "./components/FileMenu";
import HistoryModal from "./components/HistoryModal";
import PWAInstallBanner from "./components/PWAInstallBanner";
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
  const winFromHWarningRef = useRef<"ao" | "aka" | null>(null);
  const lastWinnerSideRef = useRef<string | null>(null);
  const userDismissedRef = useRef(false);
  const pendingSenshuWinnerRef = useRef<{
    side: "Ao" | "Aka";
    name: string;
    targetScore: number;
  } | null>(null);

  const _initialTimerMs = _localFileSettings
    ? (_localFileSettings.minutes * 60 + _localFileSettings.seconds) * 1000
    : (matchTimeMinutes * 60 + matchTimeSeconds) * 1000;
  const timer = useTimer(_initialTimerMs);

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

  // Win detection
  useEffect(() => {
    let detectedWinner: {
      side: "Ao" | "Aka";
      name: string;
      score: number;
    } | null = null;
    let fromHWarning: "ao" | "aka" | null = null;

    if (pendingSenshuWinnerRef.current) {
      const pending = pendingSenshuWinnerRef.current;
      const bothReached =
        ao.score >= pending.targetScore && aka.score >= pending.targetScore;
      if (bothReached) {
        pendingSenshuWinnerRef.current = null;
        const winnerScore = pending.side === "Ao" ? ao.score : aka.score;
        detectedWinner = {
          side: pending.side,
          name: pending.name,
          score: winnerScore,
        };
      } else {
        return;
      }
    } else if (winByLead) {
      const diff = ao.score - aka.score;
      if (diff >= leadAmount && ao.score > 0) {
        detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
      } else if (aka.score - ao.score >= leadAmount && aka.score > 0) {
        detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
      }
    } else {
      if (winningScore > 0) {
        if (ao.score === aka.score && ao.score >= winningScore) {
          if (ao.senshu && !aka.senshu) {
            detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
          } else if (aka.senshu && !ao.senshu) {
            detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
          }
        } else if (ao.score >= winningScore && ao.score > aka.score) {
          detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
        } else if (aka.score >= winningScore && aka.score > ao.score) {
          detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
        }
      }
    }

    if (!detectedWinner) {
      if (ao.warnings[4]) {
        detectedWinner = { side: "Aka", name: aka.name, score: aka.score };
        fromHWarning = "ao";
      } else if (aka.warnings[4]) {
        detectedWinner = { side: "Ao", name: ao.name, score: ao.score };
        fromHWarning = "aka";
      }
    }

    if (detectedWinner) {
      winnerDeclaredRef.current = true;
      winFromHWarningRef.current = fromHWarning;
      setWinner(detectedWinner);
      if (!userDismissedRef.current) {
        setShowWinnerPopup(true);
      }
      const winnerChanged = lastWinnerSideRef.current !== detectedWinner.side;
      if (winnerChanged) {
        lastWinnerSideRef.current = detectedWinner.side;
        timer.stop();
        playDoubleWhistle();
      }
      if (!matchSavedRef.current) {
        matchSavedRef.current = true;
        doSaveMatch(detectedWinner.name, detectedWinner.side);
      }
    } else if (showWinnerPopup && !winFromHWarningRef.current) {
      winnerDeclaredRef.current = false;
      lastWinnerSideRef.current = null;
      userDismissedRef.current = false;
      setWinner(null);
      setShowWinnerPopup(false);
      matchSavedRef.current = false;
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
    showWinnerPopup,
    doSaveMatch,
    timer.stop,
  ]);

  // End-of-match tie-break
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
      if (ao.senshu && !aka.senshu) {
        tieSide = "Ao";
      } else if (aka.senshu && !ao.senshu) {
        tieSide = "Aka";
      } else {
        const aoPoints = ao.ippon + ao.wazaari;
        const akaPoints = aka.ippon + aka.wazaari;
        if (aoPoints > akaPoints) {
          tieSide = "Ao";
        } else if (akaPoints > aoPoints) {
          tieSide = "Aka";
        }
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

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "KUMITE_READY_V8") {
        setTimeout(() => broadcastState(latestStateRef.current), 50);
        setTimeout(() => broadcastState(latestStateRef.current), 200);
        setTimeout(() => broadcastState(latestStateRef.current), 500);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
    if (ao.senshu && !aka.senshu) {
      return { side: "Ao", name: ao.name || "Ao" };
    }
    if (aka.senshu && !ao.senshu) {
      return { side: "Aka", name: aka.name || "Aka" };
    }
    const aoPoints = ao.ippon + ao.wazaari;
    const akaPoints = aka.ippon + aka.wazaari;
    if (aoPoints > akaPoints) {
      return { side: "Ao", name: ao.name || "Ao" };
    }
    if (akaPoints > aoPoints) {
      return { side: "Aka", name: aka.name || "Aka" };
    }
    return { side: "Ao", name: "Draw" };
  }, [ao, aka]);

  const handleResetMatch = useCallback(() => {
    if (!matchSavedRef.current) {
      const resolved = resolveWinnerForSave();
      doSaveMatch(resolved.name, resolved.side);
    }

    setAo(DEFAULT_PLAYER());
    setAka(DEFAULT_PLAYER());
    setWinner(null);
    setShowWinnerPopup(false);
    winnerDeclaredRef.current = false;
    lastWinnerSideRef.current = null;
    userDismissedRef.current = false;
    matchSavedRef.current = false;
    winFromHWarningRef.current = null;
    pendingSenshuWinnerRef.current = null;
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
    const base = window.location.origin + window.location.pathname;
    const clean = base.endsWith("/") ? base.slice(0, -1) : base;
    const url = `${clean}#/external`;
    const popup = window.open(
      url,
      "kumite_external_sb",
      "width=1280,height=720",
    );
    if (popup) {
      setExternalWindow(popup);
      popup.addEventListener("load", () => {
        broadcastState(latestStateRef.current);
      });
      setTimeout(() => broadcastState(latestStateRef.current), 200);
      setTimeout(() => broadcastState(latestStateRef.current), 600);
      setTimeout(() => broadcastState(latestStateRef.current), 1200);
    }
  }, []);

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

  const handleAoScore = useCallback(
    (points: number) => {
      if (!winByLead && winningScore > 0) {
        const isTied = ao.score === aka.score;
        const aoWouldReachWinning = ao.score + 1 >= winningScore;
        const alreadyTiedAtWinning = isTied && ao.score >= winningScore;
        if (
          isTied &&
          !ao.senshu &&
          aka.senshu &&
          (aoWouldReachWinning || alreadyTiedAtWinning)
        ) {
          pendingSenshuWinnerRef.current = {
            side: "Aka",
            name: aka.name || "Aka",
            targetScore: ao.score + 1,
          };
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
        if (
          isTied &&
          ao.senshu &&
          !aka.senshu &&
          (aoWouldReachWinning || alreadyTiedAtWinning)
        ) {
          pendingSenshuWinnerRef.current = {
            side: "Ao",
            name: ao.name || "Ao",
            targetScore: ao.score + 1,
          };
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
      ao.name,
      aka.score,
      aka.senshu,
      aka.name,
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
          pendingSenshuWinnerRef.current = {
            side: "Ao",
            name: ao.name || "Ao",
            targetScore: aka.score + 1,
          };
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
          pendingSenshuWinnerRef.current = {
            side: "Aka",
            name: aka.name || "Aka",
            targetScore: aka.score + 1,
          };
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
      aka.name,
      ao.score,
      ao.senshu,
      ao.name,
      winByLead,
      winningScore,
    ],
  );

  const handleAoDecrement = useCallback(() => {
    updateAo((prev) => {
      if (prev.score <= 0) return prev;
      let { ippon, wazaari, yuko, score } = prev;
      if (yuko > 0) {
        yuko -= 1;
        score = Math.max(0, score - 1);
      } else if (wazaari > 0) {
        wazaari -= 1;
        score = Math.max(0, score - 2);
      } else if (ippon > 0) {
        ippon -= 1;
        score = Math.max(0, score - 3);
      }
      return { ...prev, score, ippon, wazaari, yuko };
    });
  }, [updateAo]);

  const handleAkaDecrement = useCallback(() => {
    updateAka((prev) => {
      if (prev.score <= 0) return prev;
      let { ippon, wazaari, yuko, score } = prev;
      if (yuko > 0) {
        yuko -= 1;
        score = Math.max(0, score - 1);
      } else if (wazaari > 0) {
        wazaari -= 1;
        score = Math.max(0, score - 2);
      } else if (ippon > 0) {
        ippon -= 1;
        score = Math.max(0, score - 3);
      }
      return { ...prev, score, ippon, wazaari, yuko };
    });
  }, [updateAka]);

  const handleAoToggleSenshu = useCallback(() => {
    updateAo((prev) => {
      if (!prev.senshu && aka.senshu) return prev;
      return { ...prev, senshu: !prev.senshu };
    });
  }, [updateAo, aka.senshu]);

  const handleAkaToggleSenshu = useCallback(() => {
    updateAka((prev) => {
      if (!prev.senshu && ao.senshu) return prev;
      return { ...prev, senshu: !prev.senshu };
    });
  }, [updateAka, ao.senshu]);

  const handleAoToggleWarning = useCallback(
    (idx: number) => {
      const isHWarningCurrentlyOn = ao.warnings[idx] === true;
      const turningOffH = idx === 4 && isHWarningCurrentlyOn;

      updateAo((prev) => {
        const warnings = [...prev.warnings];
        const turningOn = !warnings[idx];
        warnings[idx] = turningOn;
        let senshu = prev.senshu;
        if (idx === 3 && turningOn && timer.timeMs <= 14000) {
          senshu = false;
        }
        return { ...prev, warnings, senshu };
      });

      if (
        turningOffH &&
        winnerDeclaredRef.current &&
        winFromHWarningRef.current === "ao"
      ) {
        winnerDeclaredRef.current = false;
        winFromHWarningRef.current = null;
        matchSavedRef.current = false;
        setWinner(null);
        setShowWinnerPopup(false);
      }
    },
    [updateAo, timer.timeMs, ao.warnings],
  );

  const handleAkaToggleWarning = useCallback(
    (idx: number) => {
      const isHWarningCurrentlyOn = aka.warnings[idx] === true;
      const turningOffH = idx === 4 && isHWarningCurrentlyOn;

      updateAka((prev) => {
        const warnings = [...prev.warnings];
        const turningOn = !warnings[idx];
        warnings[idx] = turningOn;
        let senshu = prev.senshu;
        if (idx === 3 && turningOn && timer.timeMs <= 14000) {
          senshu = false;
        }
        return { ...prev, warnings, senshu };
      });

      if (
        turningOffH &&
        winnerDeclaredRef.current &&
        winFromHWarningRef.current === "aka"
      ) {
        winnerDeclaredRef.current = false;
        winFromHWarningRef.current = null;
        matchSavedRef.current = false;
        setWinner(null);
        setShowWinnerPopup(false);
      }
    },
    [updateAka, timer.timeMs, aka.warnings],
  );

  const rHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        handleResetMatch();
        return;
      }

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

      if (
        (e.key === "r" || e.key === "R") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !e.repeat
      ) {
        if (inInput) return;
        if (rHoldTimerRef.current) return;
        rHoldTimerRef.current = setTimeout(() => {
          rHoldTimerRef.current = null;
          handleResetMatch();
        }, 3000);
        return;
      }

      if (e.altKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        handleAoScore(3);
        return;
      }
      if (e.altKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        handleAoScore(2);
        return;
      }
      if (e.altKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleAoScore(1);
        return;
      }
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleAoToggleSenshu();
        return;
      }

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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">{leftPanel}</div>
        <div className="w-52 shrink-0 overflow-hidden">
          <CenterPanel
            timerDisplay={timer.timerDisplay}
            timerMs={timer.timeMs}
            isRunning={timer.isRunning}
            darkMode={darkMode}
            onToggleTimer={timer.toggle}
            onResetTime={timer.reset}
            onSet60Seconds={handleSet60Seconds}
            onResetMatch={handleResetMatch}
            onAdjustTime={timer.adjustTime}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">{rightPanel}</div>
      </div>

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

      <WinnerPopup
        isOpen={showWinnerPopup}
        winnerSide={winner?.side ?? null}
        winnerName={winner?.name ?? ""}
        winnerScore={winner?.score}
        onClose={() => {
          setShowWinnerPopup(false);
          userDismissedRef.current = true;
        }}
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

      <PWAInstallBanner />
    </div>
  );
}
