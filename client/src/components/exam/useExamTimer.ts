import { useState, useEffect, useCallback, useRef } from "react";

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
  onExpire?: () => void,
  warningThresholdSeconds: number = 300
): UseExamTimerReturn {
  // Validate input
  const validatedSeconds = Math.max(0, Math.floor(initialSeconds));

  const [remainingSeconds, setRemainingSeconds] = useState(validatedSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  // Prevent double onExpire callback
  const hasExpiredRef = useRef(false);

  // Sync remainingSeconds when initialSeconds changes (e.g. when session is loaded)
  useEffect(() => {
    if (validatedSeconds > 0) {
      if (remainingSeconds === 0 && !hasExpiredRef.current) {
        setRemainingSeconds(validatedSeconds);
      }
      if (hasExpired) {
        setHasExpired(false);
        hasExpiredRef.current = false;
      }
    }
  }, [validatedSeconds, remainingSeconds, hasExpired]);

  useEffect(() => {
    if (isPaused || hasExpired || validatedSeconds <= 0) return;
    
    if (remainingSeconds <= 0) {
      setHasExpired(true);
      hasExpiredRef.current = true;
      onExpire?.();
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        if (next <= 0 && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          setHasExpired(true);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused, hasExpired, onExpire]);

  const timerLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const isTimeWarning = remainingSeconds < warningThresholdSeconds && remainingSeconds > 0;

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
