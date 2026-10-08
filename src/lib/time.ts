import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` while `active`. */
export const useNow = (intervalMs: number, active = true): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
};

/** "4h 12m", "12m 05s" or "45s" until `targetIso`. */
export const formatCountdown = (targetIso: string, now: Date): string => {
  const ms = Math.max(0, Date.parse(targetIso) - now.getTime());
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
};
