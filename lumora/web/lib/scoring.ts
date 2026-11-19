// Pure, unit-tested calculations.
export const percent = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 1000) / 10 : 0);
export const average = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
/** Consecutive days (ending today or yesterday) that have at least one study session. dates are 'YYYY-MM-DD'. */
export function streak(dates: string[], today = new Date()): number {
  const set = new Set(dates); const d = new Date(today); d.setUTCHours(0, 0, 0, 0);
  const key = (x: Date) => x.toISOString().slice(0, 10);
  if (!set.has(key(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0; while (set.has(key(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
/** SM-2-style spaced repetition. quality: 0 (forgot) .. 5 (easy). */
export function nextReview(ease: number, interval: number, quality: number) {
  if (quality < 3) return { ease: Math.max(1.3, ease - 0.2), interval: 1 };
  const e = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const i = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * e);
  return { ease: e, interval: i };
}
