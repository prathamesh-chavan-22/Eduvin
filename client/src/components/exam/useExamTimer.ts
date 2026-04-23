import { useState, useEffect, useCallback } from "react";

interface UseExamTimerReturn {
  remainingSeconds: number;
  timerLabel: string;
  isTimeWarning: boolean;
  pause: () => void;
  resume: () => void;
  isExpired: boolean;
}

export function useExamTimer(
  initialSeconds: number,
  onExpire?: () => void
): UseExamTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (isPaused || hasExpired) return;
    if (remainingSeconds <= 0) {
      setHasExpired(true);
      onExpire?.();
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        if (next <= 0) {
          setHasExpired(true);
          onExpire?.();
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, isPaused, hasExpired, onExpire]);

  const timerLabel = useCallback(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds])();

  const isTimeWarning = remainingSeconds < 300 && remainingSeconds > 0;

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    remainingSeconds,
    timerLabel,
    isTimeWarning,
    pause,
    resume,
    isExpired: hasExpired,
  };
}
