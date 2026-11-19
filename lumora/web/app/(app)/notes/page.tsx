import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { FileText } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
import { createNote, toggleNote } from './actions';
import { Archive, Bookmark, Pin } from 'lucide-react';

const PAGE = 20;
export default async function Notes({ searchParams }: { searchParams: { q?: string; subject?: string; tag?: string; sort?: string; archived?: string; page?: string } }) {
  const { supabase } = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  let q = supabase.from('notes').select('id,title,subject,chapter,tags,pinned,bookmarked,archived,updated_at', { count: 'exact' }).eq('archived', searchParams.archived === '1');
  if (searchParams.q) { const s = searchParams.q.replace(/[%,()]/g, ' ').slice(0, 80); q = q.or(`title.ilike.%${s}%,body.ilike.%${s}%`); }
  if (searchParams.subject) q = q.eq('subject', searchParams.subject);
  if (searchParams.tag) q = q.contains('tags', [searchParams.tag]);
  const sort = searchParams.sort ?? 'edited';
  q = sort === 'oldest' ? q.order('created_at', { ascending: true }) : sort === 'newest' ? q.order('created_at', { ascending: false }) : q.order('pinned', { ascending: false }).order('updated_at', { ascending: false });
  const { data, count, error } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  return (
    <>
      <PageTitle icon={<FileText size={22} />} sub="Your private notes. Only you can see them.">My Notes</PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action={createNote}><button className="btn">+ New note</button></form>
        <form className="flex flex-1 gap-2" role="search"><input className="input" name="q" placeholder="Search notes…" defaultValue={searchParams.q} />
          <select className="input w-auto" name="sort" defaultValue={sort}><option value="edited">Recently edited</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
          <select className="input w-auto" name="archived" defaultValue={searchParams.archived ?? '0'}><option value="0">Active</option><option value="1">Archived</option></select>
          <button className="btn btn-ghost">Apply</button></form>
      </div>
      {error ? <Empty>Couldn’t load notes. Please refresh.</Empty> : !data?.length ? <Empty>No notes here yet.</Empty> : (
        <ul className="space-y-2">{data.map((n) => (
          <li key={n.id} className="card flex items-center justify-between gap-3">
            <Link href={`/notes/${n.id}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{n.pinned && '📌 '}{n.title || 'Untitled'}</p>
              <p className="muted text-sm">{[n.subject, n.chapter].filter(Boolean).join(' · ')} {n.tags?.map((t: string) => `#${t}`).join(' ')}</p></Link>
            <div className="flex gap-1">
              <form action={toggleNote.bind(null, n.id, 'pinned', !n.pinned)}><button className="btn btn-ghost" aria-label="Pin"><Pin size={14} /></button></form>
              <form action={toggleNote.bind(null, n.id, 'bookmarked', !n.bookmarked)}><button className="btn btn-ghost" aria-label="Bookmark"><Bookmark size={14} fill={n.bookmarked ? 'currentColor' : 'none'} /></button></form>
              <form action={toggleNote.bind(null, n.id, 'archived', !n.archived)}><button className="btn btn-ghost" aria-label={n.archived ? 'Restore' : 'Archive'}><Archive size={14} /></button></form>
            </div></li>))}</ul>)}
      {(count ?? 0) > PAGE && <p className="mt-4 flex gap-3 text-sm">{page > 1 && <Link className="underline" href={`?page=${page - 1}`}>← Newer</Link>}{page * PAGE < (count ?? 0) && <Link className="underline" href={`?page=${page + 1}`}>Older →</Link>}</p>}
    </>
  );
}
