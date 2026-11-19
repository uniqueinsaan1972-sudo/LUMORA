import { requireUser } from '@/lib/auth';
import { average, percent, streak } from '@/lib/scoring';
import { BarChart3 } from 'lucide-react';
import { Empty, PageTitle, Stat } from '@/components/ui';
export default async function Performance() {
  const { supabase, profile } = await requireUser('student');
  const [{ data: q }, { data: s }, { data: g }, { data: tr }] = await Promise.all([
    supabase.from('quiz_attempts').select('score,total,subject,created_at').order('created_at'), supabase.from('study_sessions').select('minutes,studied_on'),
    supabase.from('study_goals').select('status'), supabase.from('test_results').select('obtained_marks,total_marks,pending_manual')]);
  const pcts = (q ?? []).map((a) => percent(a.score, a.total)); const by = new Map<string, number[]>();
  (q ?? []).forEach((a) => a.subject && by.set(a.subject, [...(by.get(a.subject) ?? []), percent(a.score, a.total)]));
  const official = (tr ?? []).filter((r) => !r.pending_manual).map((r) => percent(r.obtained_marks, r.total_marks));
  return (<><PageTitle icon={<BarChart3 size={22} />} sub="Calculated only from your real activity.">Performance</PageTitle>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Practice quizzes" value={pcts.length} /><Stat label="Average" value={pcts.length ? `${average(pcts)}%` : '—'} /><Stat label="Best" value={pcts.length ? `${Math.max(...pcts)}%` : '—'} />
      <Stat label="Study time" value={`${(s ?? []).reduce((a, x) => a + x.minutes, 0)} min`} hint={`${streak((s ?? []).map((x) => x.studied_on))}-day streak`} /></div>
    <p className="muted mt-2 text-sm">Practice score = correct MCQs ÷ scored MCQs × 100 per attempt; the average is the mean of attempt percentages. Practice scores are self-study data, not official school results.</p>
    <section className="card mt-6"><h2 className="mb-2 font-semibold">Subject performance</h2>{by.size ? <ul>{[...by].map(([k, v]) => <li key={k}>{k}: {average(v)}% over {v.length} quiz(zes) {v.length < 3 && <span className="muted text-xs">(early data)</span>}</li>)}</ul> : <p className="muted">Take practice quizzes with a subject to see this.</p>}</section>
    <section className="card mt-4"><h2 className="mb-2 font-semibold">Improvement over time</h2>{pcts.length >= 2 ? <p>First quiz {pcts[0]}% → latest {pcts[pcts.length - 1]}% ({pcts[pcts.length - 1] - pcts[0] >= 0 ? '+' : ''}{Math.round((pcts[pcts.length - 1] - pcts[0]) * 10) / 10} points)</p> : <p className="muted">Needs at least two quizzes.</p>}</section>
    <section className="card mt-4"><h2 className="mb-2 font-semibold">Teacher tests</h2>{official.length ? <p>{official.length} graded result(s) · average {average(official)}%</p> : <p className="muted">No published teacher test results yet.</p>}</section>
    <section className="card mt-4"><p>Goals completed: {(g ?? []).filter((x) => x.status === 'done').length}</p><p className="muted mt-1 text-sm">Achievement card sharing is {profile.share_achievements ? 'ON' : 'OFF'} (change in Settings).</p></section></>);
}
