import { useEffect, useState } from 'react';

const TICK_MS = 1_000;

function secondsUntil(expiresAt: string): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / TICK_MS));
}

/** Seconds left before a server deadline, counted down once a second until it passes. */
export function useSecondsLeft(expiresAt: string): number {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setSecondsLeft(secondsUntil(expiresAt));
    const interval = setInterval(() => {
      const next = secondsUntil(expiresAt);
      setSecondsLeft(next);
      if (next === 0) {
        clearInterval(interval);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return secondsLeft;
}
