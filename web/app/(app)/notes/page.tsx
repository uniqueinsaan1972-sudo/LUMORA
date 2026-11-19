import Link from 'next/link';
import { FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Empty, PageTitle } from '@/components/ui';
import { LiveRefresh } from '@/components/LiveRefresh';
import { NotesList } from './NotesList';
import { SharedList } from './SharedList';

const PAGE = 20;
export default async function Notes({ searchParams }: { searchParams: { q?: string; subject?: string; tag?: string; sort?: string; archived?: string; page?: string; tab?: string } }) {
  const { supabase, user } = await requireUser();
  const shared = searchParams.tab === 'shared'; const page = Math.max(1, Number(searchParams.page) || 1);
  const tabs = (<div className="mb-4 flex gap-2" role="tablist">{[['', 'My notes'], ['shared', 'Shared with me']].map(([v, l]) => <Link key={v} role="tab" aria-selected={(v === 'shared') === shared} href={v ? `?tab=${v}` : '?'} className={`btn ${(v === 'shared') === shared ? '' : 'btn-ghost'}`}>{l}</Link>)}</div>);
  if (shared) {
    const { data } = await supabase.rpc('shared_notes');
    return (<><LiveRefresh name="notes-shared" tables={['note_shares']} /><PageTitle icon={<FileText size={22} />} sub="Notes friends, groups and teachers shared with you.">Notes Vault</PageTitle>{tabs}<SharedList notes={(data ?? []) as any} /></>);
  }
  let q = supabase.from('notes').select('id,title,subject,chapter,tags,pinned,bookmarked,archived,updated_at', { count: 'exact' }).eq('owner_id', user.id).eq('archived', searchParams.archived === '1');
  if (searchParams.q) { const s = searchParams.q.replace(/[%,()]/g, ' ').slice(0, 80); q = q.or(`title.ilike.%${s}%,body.ilike.%${s}%`); }
  if (searchParams.subject) q = q.eq('subject', searchParams.subject); if (searchParams.tag) q = q.contains('tags', [searchParams.tag]);
  const sort = searchParams.sort ?? 'edited';
  q = sort === 'oldest' ? q.order('created_at', { ascending: true }) : sort === 'newest' ? q.order('created_at', { ascending: false }) : q.order('pinned', { ascending: false }).order('updated_at', { ascending: false });
  const { data, count, error } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  return (<>
    <PageTitle icon={<FileText size={22} />} sub="Your private notes. Only you — and people you choose to share with — can see them.">Notes Vault</PageTitle>{tabs}
    <form className="mb-4 flex flex-wrap gap-2" role="search"><input className="input min-w-0 flex-1" name="q" placeholder="Search notes…" defaultValue={searchParams.q} aria-label="Search notes" />
      <select className="input w-auto" name="sort" defaultValue={sort} aria-label="Sort"><option value="edited">Recently edited</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
      <select className="input w-auto" name="archived" defaultValue={searchParams.archived ?? '0'} aria-label="Status"><option value="0">Active</option><option value="1">Archived</option></select><button className="btn btn-ghost">Apply</button></form>
    {error ? <Empty>Couldn’t load notes. Please refresh.</Empty> : <NotesList notes={(data ?? []) as any} archivedView={searchParams.archived === '1'} />}
    {(count ?? 0) > PAGE && <p className="mt-4 flex gap-3 text-sm">{page > 1 && <Link className="underline" href={`?page=${page - 1}`}>← Newer</Link>}{page * PAGE < (count ?? 0) && <Link className="underline" href={`?page=${page + 1}`}>Older →</Link>}</p>}
  </>);
}
