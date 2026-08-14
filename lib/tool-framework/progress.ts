import { PROGRESS_INTERVAL_MS } from "./limits.ts";

export function createThrottledProgressReporter<T>(
  report: (value: T) => void,
  options: {
    readonly intervalMs?: number;
    readonly now?: () => number;
  } = {},
): (value: T) => void {
  const intervalMs = options.intervalMs ?? PROGRESS_INTERVAL_MS;
  const now = options.now ?? (() => performance.now());
  let lastSentAt = Number.NEGATIVE_INFINITY;

  return (value) => {
    const sentAt = now();
    if (sentAt - lastSentAt < intervalMs) return;
    lastSentAt = sentAt;
    report(value);
  };
}
