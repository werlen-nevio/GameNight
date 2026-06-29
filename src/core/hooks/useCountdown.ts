import { useCallback, useEffect, useRef, useState } from 'react';

export interface CountdownController {
  /** Remaining seconds (can be fractional during the final second). */
  remaining: number;
  /** 0..1, fraction of time elapsed — handy for ring/bar visuals. */
  progress: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: (seconds?: number) => void;
}

/**
 * A precise, pausable countdown timer driven by wall-clock deltas (not naive
 * interval counting, which drifts). Calls `onComplete` once when it hits zero.
 * The backbone of every timed game mode.
 */
export function useCountdown(
  durationSeconds: number,
  options?: { autoStart?: boolean; onComplete?: () => void; tickMs?: number },
): CountdownController {
  const { autoStart = false, onComplete, tickMs = 100 } = options ?? {};
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(autoStart);
  const deadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + remaining * 1000;
    }
    const id = setInterval(() => {
      const left = Math.max(0, (deadlineRef.current! - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        setRunning(false);
        deadlineRef.current = null;
        onCompleteRef.current?.();
      }
    }, tickMs);
    return () => clearInterval(id);
    // `remaining` intentionally excluded: deadline captures it once per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, tickMs]);

  const start = useCallback(() => {
    if (completedRef.current) return;
    deadlineRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    setRunning(false);
    deadlineRef.current = null;
  }, []);

  const reset = useCallback(
    (seconds?: number) => {
      completedRef.current = false;
      deadlineRef.current = null;
      setRunning(false);
      setRemaining(seconds ?? durationSeconds);
    },
    [durationSeconds],
  );

  const progress = durationSeconds > 0 ? 1 - remaining / durationSeconds : 1;
  return { remaining, progress, running, start, pause, reset };
}
