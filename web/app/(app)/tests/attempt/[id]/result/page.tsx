import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { percent } from '@/lib/scoring';
import { GraduationCap } from 'lucide-react';
import { PageTitle } from '@/components/ui';
export default async function Result({ params }: { params: { id: string } }) {
  const { supabase } = await requireUser('student');
  const { data, error } = await supabase.rpc('get_result', { p_attempt: params.id });
  if (error || !data) notFound();
  const r = data.result; const items = data.items as any[];
  return (<><PageTitle icon={<GraduationCap size={22} />}>{data.title}</PageTitle>
    <div className="card mb-4"><p className="text-2xl font-bold">{r.obtained_marks} / {r.total_marks} ({percent(r.obtained_marks, r.total_marks)}%)</p>
      <p className="muted text-sm">{r.pending_manual ? 'Some written answers are not graded yet; marks may change. ' : ''}{Number(data.passing_marks) > 0 && (r.obtained_marks >= data.passing_marks ? 'Passed' : 'Below passing marks')}</p></div>
    <ul className="space-y-2">{items.map((x, k) => (<li key={k} className="card"><p className="font-semibold">{k + 1}. {x.prompt}</p><p className="text-sm">Your answer: {x.your_answer || '—'}</p>
      {x.correct_answer && <p className="text-sm">Correct: {x.correct_answer}</p>}<p className="text-sm">Marks: {x.awarded ?? 'pending'} / {x.marks}</p>
      {x.feedback && <p className="muted text-sm">Teacher feedback: {x.feedback}</p>}{x.explanation && <p className="muted text-sm">{x.explanation}</p>}</li>))}</ul></>);
}
