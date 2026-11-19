import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Brain } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
import { addCard, deleteCard, editCard } from './actions';
export default async function Flashcards({ searchParams }: { searchParams: { subject?: string } }) {
  const { supabase } = await requireUser();
  let q = supabase.from('flashcards').select('*').order('created_at', { ascending: false }).limit(200);
  if (searchParams.subject) q = q.eq('subject', searchParams.subject);
  const { data } = await q;
  return (<>
    <PageTitle icon={<Brain size={22} />} sub="Front = question or word. Back = answer or meaning.">Flashcards</PageTitle>
    <div className="mb-4 flex gap-2"><Link className="btn" href="/flashcards/practice">Practice mode</Link><Link className="btn btn-ghost" href="/flashcards/practice?mode=revision">Revision mode</Link></div>
    <form action={addCard} className="card mb-4 grid gap-2"><h2 className="font-semibold">Add flashcard</h2>
      <input className="input" name="front" placeholder="Front (question or word)" required maxLength={2000} /><textarea className="input" name="back" placeholder="Back (answer or meaning)" required maxLength={5000} />
      <div className="grid grid-cols-2 gap-2"><input className="input" name="subject" placeholder="Subject" /><input className="input" name="chapter" placeholder="Chapter" /></div><button className="btn w-fit">Add</button></form>
    {!data?.length ? <Empty>No flashcards yet — add your first above.</Empty> : <ul className="space-y-2">{data.map((c) => (
      <li key={c.id} className="card"><details><summary className="flex cursor-pointer justify-between"><span><b>{c.front}</b> <span className="muted text-sm">{c.subject} · {c.status}</span></span><span className="muted text-sm">Edit</span></summary>
        <form action={editCard.bind(null, c.id)} className="mt-2 grid gap-2"><input className="input" name="front" defaultValue={c.front} required /><textarea className="input" name="back" defaultValue={c.back} required />
          <div className="grid grid-cols-2 gap-2"><input className="input" name="subject" defaultValue={c.subject ?? ''} /><input className="input" name="chapter" defaultValue={c.chapter ?? ''} /></div><button className="btn w-fit">Save</button></form>
        <form action={deleteCard.bind(null, c.id)} className="mt-2"><button className="btn btn-ghost">Delete card</button></form></details></li>))}</ul>}
  </>);
}
