import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { ClipboardList } from 'lucide-react';
import { PageTitle } from '@/components/ui';
async function grade(attempt: string, question: string, fd: FormData) {
  'use server';
  const marks = Number(fd.get('marks')); if (!Number.isFinite(marks)) return;
  const { supabase } = await requireUser('teacher');
  await supabase.rpc('grade_answer', { p_attempt: attempt, p_question: question, p_marks: marks, p_feedback: String(fd.get('feedback') ?? '').slice(0, 5000) });
  revalidatePath(`/teacher/tests`);
}
export default async function Grade({ params }: { params: { id: string; attempt: string } }) {
  const { supabase } = await requireUser('teacher');
  const { data: attempt } = await supabase.from('test_attempts').select('id,test_id').eq('id', params.attempt).eq('test_id', params.id).maybeSingle(); // RLS: only your tests
  if (!attempt) notFound();
  const [{ data: qs }, { data: answers }] = await Promise.all([
    supabase.from('test_questions').select('*').eq('test_id', params.id).order('position'),
    supabase.from('test_answers').select('*').eq('attempt_id', params.attempt)]);
  const byQ = new Map((answers ?? []).map((a) => [a.question_id, a]));
  return (<><PageTitle icon={<ClipboardList size={22} />}>Review submission</PageTitle><ul className="space-y-3">{(qs ?? []).map((q) => { const a: any = byQ.get(q.id); const written = ['short', 'long', 'definition'].includes(q.kind);
    return (<li key={q.id} className="card"><p className="font-semibold">{q.position}. {q.prompt} <span className="muted text-sm">({q.marks} marks)</span></p>
      <p className="mt-1 whitespace-pre-wrap">Answer: {a?.answer || <span className="muted">no answer</span>}</p>
      {!written ? <p className="muted text-sm">Correct: {q.correct_answer?.replace('|', ' / ')} · auto-marked {a?.auto_marks ?? 0}</p> :
        <form action={grade.bind(null, params.attempt, q.id)} className="mt-2 flex flex-wrap items-end gap-2"><label className="text-sm">Marks<input className="input w-24" name="marks" type="number" step="0.5" min={0} max={q.marks} defaultValue={a?.awarded_marks ?? ''} required /></label>
          <label className="flex-1 text-sm">Feedback<input className="input" name="feedback" defaultValue={a?.feedback ?? ''} maxLength={5000} /></label><button className="btn">Save</button></form>}</li>); })}</ul></>);
}
