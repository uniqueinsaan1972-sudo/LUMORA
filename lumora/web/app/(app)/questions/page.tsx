import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { questionSchema } from '@/lib/validation';
import { HelpCircle } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';

async function addQuestion(fd: FormData) {
  'use server';
  const { supabase, user } = await requireUser();
  const opts = String(fd.get('options') ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const parsed = questionSchema.safeParse({ type: fd.get('type'), prompt: fd.get('prompt'), options: opts.length ? opts : undefined, answer: String(fd.get('answer') ?? '') || undefined,
    explanation: String(fd.get('explanation') ?? '') || undefined, subject: String(fd.get('subject') ?? '') || undefined, chapter: String(fd.get('chapter') ?? '') || undefined });
  if (!parsed.success) return; // client-side `required` covers the common cases; server validation is authoritative
  await supabase.from('questions').insert({ ...parsed.data, owner_id: user.id, options: parsed.data.options ?? null });
  revalidatePath('/questions');
}
async function setFlag(id: string, patch: Record<string, unknown>) {
  'use server';
  const allowed = ['important', 'bookmarked', 'status']; const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  const { supabase } = await requireUser(); await supabase.from('questions').update(safe).eq('id', id); revalidatePath('/questions');
}
async function del(id: string) { 'use server'; const { supabase } = await requireUser(); await supabase.from('questions').delete().eq('id', id); revalidatePath('/questions'); }

export default async function Questions({ searchParams }: { searchParams: { q?: string; type?: string; status?: string } }) {
  const { supabase } = await requireUser();
  let q = supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(100);
  if (searchParams.type) q = q.eq('type', searchParams.type);
  if (searchParams.status) q = q.eq('status', searchParams.status);
  if (searchParams.q) q = q.ilike('prompt', `%${searchParams.q.replace(/[%_]/g, '')}%`);
  const { data } = await q;
  return (<>
    <PageTitle icon={<HelpCircle size={22} />} sub="Save questions and answers, mark what you’ve learned.">Important Questions</PageTitle>
    <details className="card mb-4"><summary className="cursor-pointer font-semibold">+ Add question</summary>
      <form action={addQuestion} className="mt-3 grid gap-2">
        <select className="input" name="type" required><option value="short">Short question</option><option value="mcq">Multiple choice</option><option value="long">Long question</option>
          <option value="definition">Definition</option><option value="word_meaning">Word meaning</option><option value="numerical">Numerical</option><option value="qa">Q&A pair</option></select>
        <textarea className="input" name="prompt" placeholder="Question" required maxLength={5000} />
        <textarea className="input" name="options" placeholder="MCQ options (one per line; MCQ only)" />
        <textarea className="input" name="answer" placeholder="Answer (for MCQ: must equal one option exactly)" />
        <textarea className="input" name="explanation" placeholder="Explanation (optional)" />
        <div className="grid grid-cols-2 gap-2"><input className="input" name="subject" placeholder="Subject" /><input className="input" name="chapter" placeholder="Chapter" /></div>
        <button className="btn w-fit">Save question</button></form></details>
    <form className="mb-4 flex flex-wrap gap-2" role="search"><input className="input flex-1" name="q" placeholder="Search…" defaultValue={searchParams.q} />
      <select className="input w-auto" name="status" defaultValue={searchParams.status ?? ''}><option value="">Any status</option><option value="new">New</option><option value="learned">Learned</option><option value="revise">Needs revision</option></select>
      <button className="btn btn-ghost">Filter</button></form>
    {!data?.length ? <Empty>No questions yet.</Empty> : <ul className="space-y-2">{data.map((x) => (
      <li key={x.id} className="card"><div className="flex items-start justify-between gap-2"><div><p className="muted text-xs uppercase">{x.type} {x.subject && `· ${x.subject}`} · {x.status}</p><p className="font-semibold">{x.important && '⭐ '}{x.prompt}</p></div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <form action={setFlag.bind(null, x.id, { important: !x.important })}><button className="btn btn-ghost">⭐</button></form>
          <form action={setFlag.bind(null, x.id, { status: 'learned' })}><button className="btn btn-ghost">Learned</button></form>
          <form action={setFlag.bind(null, x.id, { status: 'revise' })}><button className="btn btn-ghost">Revise</button></form>
          <form action={del.bind(null, x.id)}><button className="btn btn-ghost">Delete</button></form></div></div>
        {(x.answer || x.explanation) && <details className="mt-2"><summary className="muted cursor-pointer text-sm">Show answer</summary>
          {x.options && <ul className="list-disc pl-5 text-sm">{(x.options as string[]).map((o) => <li key={o}>{o}</li>)}</ul>}
          <p className="mt-1"><b>Answer:</b> {x.answer}</p>{x.explanation && <p className="muted text-sm">{x.explanation}</p>}</details>}</li>))}</ul>}
  </>);
}
