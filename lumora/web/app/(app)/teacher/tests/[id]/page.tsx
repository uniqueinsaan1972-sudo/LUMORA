import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { percent } from '@/lib/scoring';
import { ClipboardList } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
async function publish(id: string) { 'use server'; const { supabase } = await requireUser('teacher'); await supabase.rpc('publish_results', { p_test: id }); revalidatePath(`/teacher/tests/${id}`); }
export default async function TestDetail({ params }: { params: { id: string } }) {
  const { supabase } = await requireUser('teacher');
  const { data: test } = await supabase.from('teacher_tests').select('*').eq('id', params.id).maybeSingle();
  if (!test) notFound();
  const { data: attempts } = await supabase.from('test_attempts').select('id,student_id,status,submitted_at,test_results(obtained_marks,total_marks,pending_manual)').eq('test_id', params.id);
  const ids = (attempts ?? []).map((a) => a.student_id);
  const { data: people } = ids.length ? await supabase.from('profiles').select('id,display_name').in('id', ids) : { data: [] as any[] };
  const name = new Map((people ?? []).map((p: any) => [p.id, p.display_name]));
  const scores = (attempts ?? []).map((a: any) => a.test_results).filter(Boolean).map((r: any) => percent(r.obtained_marks, r.total_marks));
  return (<><PageTitle icon={<ClipboardList size={22} />} sub={`${test.status} · closes ${new Date(test.closes_at).toLocaleString()}`}>{test.title}</PageTitle>
    <div className="card mb-4 flex flex-wrap items-center justify-between gap-2"><p>{attempts?.length ?? 0} submissions{scores.length ? ` · class average ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : ''}</p>
      {!test.results_published && <form action={publish.bind(null, test.id)}><button className="btn">Publish results</button></form>}{test.results_published && <span className="muted">Results published</span>}</div>
    {!attempts?.length ? <Empty>No submissions yet.</Empty> : <ul className="space-y-2">{attempts.map((a: any) => (
      <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2"><span>{name.get(a.student_id) ?? 'Student'} <span className="muted text-sm">({a.status})</span></span>
        <span className="flex items-center gap-3 text-sm">{a.test_results && `${a.test_results.obtained_marks}/${a.test_results.total_marks}`}{a.test_results?.pending_manual && ' · needs grading'}
          {a.status !== 'in_progress' && <Link className="btn btn-ghost" href={`/teacher/tests/${test.id}/grade/${a.id}`}>Review &amp; grade</Link>}</span></li>))}</ul>}</>);
}
