import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { BookOpen } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
async function create(fd: FormData) {
  'use server';
  const name = String(fd.get('name') ?? '').trim().slice(0, 120); if (!name) return;
  const { supabase, user } = await requireUser('teacher');
  await supabase.from('teacher_classes').insert({ teacher_id: user.id, name }); revalidatePath('/teacher/classes');
}
export default async function Classes() {
  const { supabase } = await requireUser('teacher');
  const { data } = await supabase.from('teacher_classes').select('id,name,join_code,class_members(count)').order('created_at', { ascending: false });
  return (<><PageTitle icon={<BookOpen size={22} />} sub="Share the join code with your students.">My Classes</PageTitle>
    <form action={create} className="card mb-4 flex gap-2"><input className="input" name="name" placeholder="Class name (e.g. Grade 9 Physics)" required maxLength={120} /><button className="btn">Create</button></form>
    {!data?.length ? <Empty>No classes yet.</Empty> : <ul className="space-y-2">{data.map((c: any) => <li key={c.id} className="card flex justify-between"><span className="font-semibold">{c.name}</span>
      <span className="muted text-sm">{c.class_members?.[0]?.count ?? 0} students · join code <code className="rounded bg-slate-500/20 px-1">{c.join_code}</code></span></li>)}</ul>}</>);
}
