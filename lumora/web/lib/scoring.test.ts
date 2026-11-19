import { describe, it, expect } from 'vitest';
import { percent, average, streak, nextReview } from './scoring';
describe('scoring', () => {
  it('percent', () => { expect(percent(7, 10)).toBe(70); expect(percent(1, 3)).toBe(33.3); expect(percent(0, 0)).toBe(0); });
  it('average', () => { expect(average([])).toBe(0); expect(average([50, 100])).toBe(75); });
  it('streak counts consecutive days', () => {
    const today = new Date('2026-11-14T10:00:00Z');
    expect(streak(['2026-11-14', '2026-11-13', '2026-11-12', '2026-11-10'], today)).toBe(3);
    expect(streak(['2026-11-13', '2026-11-12'], today)).toBe(2);
    expect(streak([], today)).toBe(0);
  });
  it('spaced repetition', () => {
    expect(nextReview(2.5, 6, 1).interval).toBe(1);
    expect(nextReview(2.5, 0, 4).interval).toBe(1);
    expect(nextReview(2.5, 1, 4).interval).toBe(3);
    expect(nextReview(2.5, 10, 5).interval).toBeGreaterThan(10);
  });
});
