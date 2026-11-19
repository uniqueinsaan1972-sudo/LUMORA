import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { GraduationCap } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
import { rateLimit } from '@/lib/rateLimit';

async function joinClass(fd: FormData) {
  'use server';
  if (!rateLimit('join', 10, 10 * 60_000)) return;
  const code = String(fd.get('code') ?? '').trim().slice(0, 20);
  const { supabase } = await requireUser('student');
  await supabase.rpc('join_class', { p_code: code });
  revalidatePath('/quizzes');
}
export default async function Quizzes() {
  const { supabase } = await requireUser('student');
  const [tests, attempts, subjects] = await Promise.all([
    supabase.from('teacher_tests').select('id,title,subject,duration_minutes,opens_at,closes_at,results_published').order('closes_at', { ascending: false }),
    supabase.from('test_attempts').select('id,test_id,status'),
    supabase.from('questions').select('subject').eq('type', 'mcq'),
  ]);
  const att = new Map((attempts.data ?? []).map((a) => [a.test_id, a]));
  const subs = [...new Set((subjects.data ?? []).map((s) => s.subject).filter(Boolean))] as string[];
  const now = Date.now();
  return (<>
    <PageTitle icon={<GraduationCap size={22} />}>Quizzes &amp; Tests</PageTitle>
    <section className="card mb-6"><h2 className="mb-2 font-semibold">Practice quiz</h2>
      <p className="muted mb-3 text-sm">Built from the multiple-choice questions in your Important Questions bank. Scores are calculated on the server.</p>
      <form action="/quizzes/practice" className="flex flex-wrap gap-2"><select className="input w-auto" name="subject"><option value="">All subjects</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input w-auto" name="n" defaultValue="10"><option>5</option><option>10</option><option>20</option></select><button className="btn">Start</button></form></section>
    <section className="mb-6"><h2 className="mb-2 font-semibold">Teacher-assigned tests</h2>
      {!tests.data?.length ? <Empty>No tests assigned. Join a class with a code below.</Empty> : <ul className="space-y-2">{tests.data.map((t) => {
        const a = att.get(t.id); const open = now >= +new Date(t.opens_at) && now < +new Date(t.closes_at);
        return (<li key={t.id} className="card flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{t.title}</p>
          <p className="muted text-sm">{t.duration_minutes} min · opens {new Date(t.opens_at).toLocaleString()} · closes {new Date(t.closes_at).toLocaleString()}</p></div>
          {a ? (a.status === 'in_progress' ? <Link className="btn" href={`/tests/attempt/${a.id}`}>Resume</Link> : t.results_published ? <Link className="btn" href={`/tests/attempt/${a.id}/result`}>View result</Link> : <span className="muted text-sm">Submitted — awaiting results</span>)
            : open ? <Link className="btn" href={`/tests/${t.id}`}>Open</Link> : <span className="muted text-sm">{now < +new Date(t.opens_at) ? 'Not open yet' : 'Closed'}</span>}</li>);})}</ul>}</section>
    <form action={joinClass} className="card flex flex-wrap items-end gap-2"><label className="text-sm">Join a class<input className="input mt-1" name="code" placeholder="Class code from your teacher" required /></label><button className="btn">Join</button></form>
  </>);
}
