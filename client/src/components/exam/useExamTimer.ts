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

  // Use ref for onExpire to avoid interval resets
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Use ref to track end time for accuracy
  const endTimeRef = useRef<number | null>(null);
  const hasExpiredRef = useRef(false);

  // Sync remainingSeconds when initialSeconds changes (e.g. when session is loaded)
  useEffect(() => {
    if (validatedSeconds > 0) {
      if (!endTimeRef.current || (remainingSeconds === 0 && !hasExpiredRef.current)) {
        endTimeRef.current = Date.now() + validatedSeconds * 1000;
        setRemainingSeconds(validatedSeconds);
      }
      if (hasExpired) {
        setHasExpired(false);
        hasExpiredRef.current = false;
        endTimeRef.current = Date.now() + validatedSeconds * 1000;
      }
    } else {
      endTimeRef.current = null;
    }
  }, [validatedSeconds, hasExpired]);

  useEffect(() => {
    if (isPaused || hasExpired || validatedSeconds <= 0 || !endTimeRef.current) return;
    
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current! - now) / 1000));
      
      setRemainingSeconds(left);

      if (left <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        setHasExpired(true);
        onExpireRef.current?.();
      }
    };

    // Initial tick
    tick();

    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused, hasExpired, validatedSeconds]);

  const timerLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const isTimeWarning = remainingSeconds < warningThresholdSeconds && remainingSeconds > 0;

  const pause = useCallback(() => {
    if (!isPaused && endTimeRef.current) {
      // Store how many ms were remaining
      const remainingMs = endTimeRef.current - Date.now();
      (endTimeRef as any).pausedRemainingMs = remainingMs;
      setIsPaused(true);
    }
  }, [isPaused]);

  const resume = useCallback(() => {
    if (isPaused && (endTimeRef as any).pausedRemainingMs) {
      // Recalculate end time based on remaining ms
      endTimeRef.current = Date.now() + (endTimeRef as any).pausedRemainingMs;
      setIsPaused(false);
    }
  }, [isPaused]);

  return {
    remainingSeconds,
    timerLabel,
    isTimeWarning,
    pause,
    resume,
    isExpired: hasExpired,
  };
}
