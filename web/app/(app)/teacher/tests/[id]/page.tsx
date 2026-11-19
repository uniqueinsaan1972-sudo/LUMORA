import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { average, percent } from '@/lib/scoring';
import { teacherTestPhase } from '@/lib/testStatus';
import { Empty, PageTitle, Stat } from '@/components/ui';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PublishButton, TestCode } from './PublishButton';
export default async function TestDetail({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase } = await requireUser('teacher');
  const { data: test } = await supabase.from('teacher_tests').select('*').eq('id', params.id).maybeSingle(); if (!test) notFound();
  const { data: attempts } = await supabase.from('test_attempts').select('id,student_id,status,submitted_at,test_results(obtained_marks,total_marks,pending_manual,graded_any)').eq('test_id', params.id);
  const ids = (attempts ?? []).map((a) => a.student_id); const { data: people } = ids.length ? await supabase.from('profiles').select('id,display_name').in('id', ids) : { data: [] as any[] };
  const name = new Map((people ?? []).map((p: any) => [p.id, p.display_name])); const rs = (attempts ?? []).map((a: any) => a.test_results).filter(Boolean); const pcts = rs.filter((r: any) => !r.pending_manual).map((r: any) => percent(r.obtained_marks, r.total_marks));
  const total = rs[0]?.total_marks; const label = (r: any) => (r?.pending_manual ? (r.graded_any ? 'Under evaluation' : 'Submitted') : r ? 'Graded' : '');
  return (<><LiveRefresh name={'test-' + params.id} tables={['test_attempts', 'test_results']} />
    <PageTitle icon={<ClipboardList size={22} />} sub={`${teacherTestPhase(test)} · closes ${new Date(test.closes_at).toLocaleString()}`}>{test.title}</PageTitle>
    <div className="card mb-4 space-y-3"><TestCode testId={test.id} code={test.access_code} />{test.description && <p className="muted text-sm">{test.description}</p>}</div>
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Submissions" count={attempts?.length ?? 0} /><Stat label="Average" value={pcts.length ? `${average(pcts)}%` : '—'} /><Stat label="Highest" value={pcts.length ? `${Math.max(...pcts)}%` : '—'} /><Stat label="Lowest" value={pcts.length ? `${Math.min(...pcts)}%` : '—'} /></div>
    <div className="card mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm">{test.results_published ? 'Results are published.' : 'Grade written answers, then publish results.'}{total ? ` Total marks: ${total}.` : ''}</p>{!test.results_published && test.status === 'published' && <PublishButton testId={test.id} />}</div>
    {!attempts?.length ? <Empty>No submissions yet. Share the access code or class code with students.</Empty> : <ul className="space-y-2">{attempts.map((a: any) => (
      <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3"><span>{name.get(a.student_id) ?? 'Student'} <span className="badge ms-1">{a.status === 'in_progress' ? 'In progress' : label(a.test_results) || a.status}</span></span>
        <span className="flex items-center gap-3 text-sm">{a.test_results && `${a.test_results.obtained_marks}/${a.test_results.total_marks}`}{a.status !== 'in_progress' && <Link className="btn btn-ghost" href={`/teacher/tests/${test.id}/grade/${a.id}`}>Review &amp; grade</Link>}</span></li>))}</ul>}</>);
}
