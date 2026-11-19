export type TestStatus = 'upcoming' | 'active' | 'submitted' | 'under_evaluation' | 'graded' | 'results_published' | 'expired';
export const STATUS_LABEL: Record<TestStatus, string> = { upcoming: 'Upcoming', active: 'Active', submitted: 'Submitted', under_evaluation: 'Under Evaluation', graded: 'Graded', results_published: 'Results Published', expired: 'Expired' };
export type AttemptFlags = { attempt_status: string; pending_manual: boolean; graded_any: boolean; results_published: boolean } | undefined;
/** Student-facing status. Uses only flags (never marks) so nothing leaks before publication. */
export function studentTestStatus(t: { opens_at: string; closes_at: string }, a: AttemptFlags, now = Date.now()): TestStatus {
  if (a) {
    if (a.attempt_status === 'in_progress') return 'active';
    if (a.results_published) return 'results_published';
    if (a.pending_manual) return a.graded_any ? 'under_evaluation' : 'submitted';
    return 'graded';
  }
  if (now < +new Date(t.opens_at)) return 'upcoming';
  return now < +new Date(t.closes_at) ? 'active' : 'expired';
}
export function teacherTestPhase(t: { status: string; opens_at: string; closes_at: string; results_published: boolean }, now = Date.now()) {
  if (t.status === 'draft') return 'Draft'; if (t.status === 'cancelled') return 'Cancelled'; if (t.results_published) return 'Results Published';
  if (now < +new Date(t.opens_at)) return 'Upcoming'; return now < +new Date(t.closes_at) ? 'Active' : 'Closed';
}
