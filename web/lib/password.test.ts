import { describe, it, expect } from 'vitest';
import { passwordStrength } from './password';
import { studentTestStatus, teacherTestPhase } from './testStatus';
import { hashToken, newToken, validToken } from './invite';
describe('passwordStrength', () => {
  it('rates weak/strong', () => { expect(passwordStrength('').score).toBe(0); expect(passwordStrength('abc').score).toBeLessThanOrEqual(1); expect(passwordStrength('Tr0ub4dor&3xyzQ!').score).toBe(4); });
  it('flags common words', () => { expect(passwordStrength('Password12345!').score).toBeLessThanOrEqual(1); });
});
describe('test status', () => {
  const t = { opens_at: '2026-01-01T10:00:00Z', closes_at: '2026-01-02T10:00:00Z' }; const at = (s: string) => +new Date(s);
  it('before open / open / closed without attempt', () => { expect(studentTestStatus(t, undefined, at('2025-12-31T00:00:00Z'))).toBe('upcoming'); expect(studentTestStatus(t, undefined, at('2026-01-01T12:00:00Z'))).toBe('active'); expect(studentTestStatus(t, undefined, at('2026-01-03T00:00:00Z'))).toBe('expired'); });
  it('attempt lifecycle', () => {
    const f = (o: object) => ({ attempt_status: 'submitted', pending_manual: false, graded_any: false, results_published: false, ...o });
    expect(studentTestStatus(t, f({ attempt_status: 'in_progress' }))).toBe('active'); expect(studentTestStatus(t, f({ pending_manual: true }))).toBe('submitted');
    expect(studentTestStatus(t, f({ pending_manual: true, graded_any: true }))).toBe('under_evaluation'); expect(studentTestStatus(t, f({}))).toBe('graded'); expect(studentTestStatus(t, f({ results_published: true }))).toBe('results_published');
  });
  it('teacher phase', () => { expect(teacherTestPhase({ ...t, status: 'draft', results_published: false })).toBe('Draft'); expect(teacherTestPhase({ ...t, status: 'published', results_published: true })).toBe('Results Published'); });
});
describe('invite tokens', () => {
  it('hash is deterministic hex and tokens are unique/valid', () => { const a = newToken(), b = newToken(); expect(a).not.toBe(b); expect(validToken(a)).toBe(true); expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/); expect(hashToken(a)).toBe(hashToken(a)); expect(validToken('x y')).toBe(false); });
});
