import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ClipboardList } from 'lucide-react';
import { PageTitle } from '@/components/ui';

async function start(testId: string) {
  'use server';
  const { supabase } = await requireUser('student');
  const { data, error } = await supabase.rpc('start_test_attempt', { p_test: testId }); // server decides eligibility + official start/deadline
  if (error || !data) redirect(`/tests/${testId}?error=${encodeURIComponent(error?.message ?? 'Unavailable')}`);
  redirect(`/tests/attempt/${data}`);
}
export default async function TestIntro({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase } = await requireUser('student');
  const { data: t } = await supabase.from('teacher_tests').select('id,title,description,instructions,duration_minutes,closes_at').eq('id', params.id).maybeSingle();
  if (!t) notFound();
  return (<><PageTitle icon={<ClipboardList size={22} />}>{t.title}</PageTitle>
    <div className="card space-y-2">{t.description && <p className="muted">{t.description}</p>}<p className="whitespace-pre-wrap">{t.instructions || 'No special instructions.'}</p>
      <p>Duration: <b>{t.duration_minutes} minutes</b>. The official timer starts when you press Start and is enforced by the server — your device clock does not matter.</p>
      <p className="muted text-sm">You get one attempt. Closes {new Date(t.closes_at).toLocaleString()}.</p>
      {searchParams.error && <p role="alert" className="text-red-400">{searchParams.error}</p>}
      <form action={start.bind(null, t.id)}><button className="btn">Start test</button></form></div></>);
}
