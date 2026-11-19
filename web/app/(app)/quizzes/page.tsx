import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Empty, PageTitle } from '@/components/ui';
import { LiveRefresh } from '@/components/LiveRefresh';
import { studentTestStatus, STATUS_LABEL, type TestStatus } from '@/lib/testStatus';
import { JoinTest } from './JoinTest';

const tone: Record<TestStatus, string> = { upcoming: 'text-sky-300', active: 'text-emerald-300', submitted: 'text-slate-300', under_evaluation: 'text-amber-300', graded: 'text-violet-300', results_published: 'text-emerald-300', expired: 'text-red-300' };
export default async function Quizzes() {
  const { supabase } = await requireUser('student');
  await supabase.rpc('refresh_my_reminders');   // opportunistic reminders for tests opening/closing within 24h
  const [tests, st, attempts, subjects] = await Promise.all([
    supabase.from('teacher_tests').select('id,title,subject,duration_minutes,opens_at,closes_at,results_published').order('closes_at', { ascending: false }),
    supabase.rpc('my_test_statuses'), supabase.from('test_attempts').select('id,test_id,status'), supabase.from('questions').select('subject').eq('type', 'mcq')]);
  const flags = new Map((st.data ?? []).map((s: any) => [s.test_id, s])); const att = new Map((attempts.data ?? []).map((a) => [a.test_id, a]));
  const subs = [...new Set((subjects.data ?? []).map((s) => s.subject).filter(Boolean))] as string[];
  return (<>
    <LiveRefresh name="student-tests" tables={['teacher_tests', 'test_results', 'test_assignments', 'class_members']} />
    <PageTitle icon={<GraduationCap size={22} />}>Quizzes &amp; Tests</PageTitle>
    <section className="card mb-6"><h2 className="font-display mb-2 font-bold">Practice quiz</h2><p className="muted mb-3 text-sm">Built from the multiple-choice questions in your Important Questions bank. Scores are calculated on the server.</p>
      <form action="/quizzes/practice" className="flex flex-wrap gap-2"><select className="input w-auto" name="subject" aria-label="Subject"><option value="">All subjects</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input w-auto" name="n" defaultValue="10" aria-label="Number of questions"><option>5</option><option>10</option><option>20</option></select><button className="btn">Start</button></form></section>
    <h2 className="font-display mb-2 font-bold">Teacher-assigned tests</h2>
    {!tests.data?.length ? <Empty>No tests yet. Join a class, or enter a test code below.</Empty> : <ul className="mb-5 space-y-2">{tests.data.map((t) => {
      const a = att.get(t.id); const status = studentTestStatus(t, flags.get(t.id) as any); const open = status === 'active';
      return (<li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4"><div className="min-w-0"><p className="font-display font-bold">{t.title}</p>
        <p className="muted text-sm"><span className={`badge me-2 ${tone[status]}`}>{STATUS_LABEL[status]}</span>{t.duration_minutes} min · opens {new Date(t.opens_at).toLocaleString()} · closes {new Date(t.closes_at).toLocaleString()}</p></div>
        {a?.status === 'in_progress' ? <Link className="btn" href={`/tests/attempt/${a.id}`}>Resume</Link> : status === 'results_published' && a ? <Link className="btn" href={`/tests/attempt/${a.id}/result`}>View result</Link> : !a && open ? <Link className="btn" href={`/tests/${t.id}`}>Open</Link> : null}</li>); })}</ul>}
    <JoinTest />
    <p className="muted mt-2 text-xs">Want to join a class instead? Go to <Link className="underline" href="/classes">My Classes</Link>.</p></>);
}
