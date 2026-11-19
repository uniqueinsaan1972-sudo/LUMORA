import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { ClipboardList } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
async function setStatus(id: string, status: 'published' | 'cancelled' | 'draft') {
  'use server';
  const { supabase } = await requireUser('teacher');
  const { data: qs } = await supabase.from('test_questions').select('id').eq('test_id', id).limit(1);
  if (status === 'published' && !qs?.length) return; // cannot publish an empty test
  await supabase.from('teacher_tests').update({ status }).eq('id', id); revalidatePath('/teacher/tests');
}
export default async function Tests() {
  const { supabase } = await requireUser('teacher');
  const { data } = await supabase.from('teacher_tests').select('*').order('created_at', { ascending: false });
  return (<><PageTitle icon={<ClipboardList size={22} />}>Manage Tests</PageTitle>
    {!data?.length ? <Empty>No tests yet. <Link className="underline" href="/teacher/tests/new">Create one</Link>.</Empty> : <ul className="space-y-2">{data.map((t) => (
      <li key={t.id} className="card flex flex-wrap items-center justify-between gap-2"><div><Link className="font-semibold underline" href={`/teacher/tests/${t.id}`}>{t.title}</Link>
        <p className="muted text-sm">{t.status}{t.results_published && ' · results published'} · closes {new Date(t.closes_at).toLocaleString()}</p></div>
        <div className="flex gap-1">{t.status === 'draft' && <form action={setStatus.bind(null, t.id, 'published')}><button className="btn">Publish</button></form>}
          {t.status !== 'cancelled' && <form action={setStatus.bind(null, t.id, 'cancelled')}><button className="btn btn-ghost">Cancel</button></form>}</div></li>))}</ul>}</>);
}
