import { useRef, useState, useCallback, useEffect } from 'react';
import { playSingleWhistle, playDoubleWhistle } from '../utils/audioService';

export interface TimerState {
  timeMs: number;
  isRunning: boolean;
  timerDisplay: string;
}

export interface TimerControls {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
  adjustTime: (deltaMs: number) => void;
  setDuration: (ms: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function useTimer(initialMs: number = 90000) {
  const [timeMs, setTimeMs] = useState(initialMs);
  const [isRunning, setIsRunning] = useState(false);
  const [durationMs, setDurationMs] = useState(initialMs);

  const timeMsRef = useRef(initialMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const has15SecWhistlePlayed = useRef(false);
  const hasEndWhistlePlayed = useRef(false);
  const lastTickRef = useRef<number>(0);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timeMsRef.current <= 0) return;
    setIsRunning(true);
    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimeMs(prev => {
        const next = Math.max(0, prev - delta);
        timeMsRef.current = next;

        // 15 second whistle — fires exactly once when crossing 15s boundary
        if (next <= 15000 && next > 14000 && !has15SecWhistlePlayed.current) {
          has15SecWhistlePlayed.current = true;
          playSingleWhistle();
        }

        // End whistle — fires when timer hits 0, stops interval immediately
        if (next <= 0 && !hasEndWhistlePlayed.current) {
          hasEndWhistlePlayed.current = true;
          playDoubleWhistle();
          // Stop interval right here inside the updater callback
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }

        return next;
      });
    }, 50);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    stopInterval();
  }, [stopInterval]);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  const reset = useCallback(() => {
    stopInterval();
    setIsRunning(false);
    setTimeMs(durationMs);
    timeMsRef.current = durationMs;
    has15SecWhistlePlayed.current = false;
    hasEndWhistlePlayed.current = false;
  }, [stopInterval, durationMs]);

  const adjustTime = useCallback((deltaMs: number) => {
    setTimeMs(prev => {
      const next = Math.max(0, prev + deltaMs);
      timeMsRef.current = next;
      return next;
    });
  }, []);

  const setDuration = useCallback((ms: number) => {
    setDurationMs(ms);
    stopInterval();
    setIsRunning(false);
    setTimeMs(ms);
    timeMsRef.current = ms;
    has15SecWhistlePlayed.current = false;
    hasEndWhistlePlayed.current = false;
  }, [stopInterval]);

  // Stop timer state when it reaches 0
  useEffect(() => {
    if (timeMs <= 0 && isRunning) {
      setIsRunning(false);
    }
  }, [timeMs, isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  return {
    timeMs,
    isRunning,
    timerDisplay: formatTime(timeMs),
    durationMs,
    start,
    stop,
    toggle,
    reset,
    adjustTime,
    setDuration,
    resetWhistleFlags: () => {
      has15SecWhistlePlayed.current = false;
      hasEndWhistlePlayed.current = false;
    },
  };
}
