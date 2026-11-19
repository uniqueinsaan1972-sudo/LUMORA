'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, Bookmark, Loader2, Pin, Plus, Trash2 } from 'lucide-react';
import { useList } from '@/lib/useList';
import { Dropdown } from '@/components/Dropdown';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { createNote, deleteNote, toggleNote } from './actions';
type N = { id: string; title: string; subject: string | null; chapter: string | null; tags: string[] | null; pinned: boolean; bookmarked: boolean; archived: boolean; updated_at: string };

export function NotesList({ notes, archivedView }: { notes: N[]; archivedView: boolean }) {
  const { items, mutate } = useList<N>(notes); const router = useRouter(); const toast = useToast(); const [creating, setCreating] = useState(false); const [del, setDel] = useState<N | null>(null);
  async function create() { if (creating) return; setCreating(true); const r = await createNote(); if (r.ok && r.id) router.push(`/notes/${r.id}`); else { toast.push(r.error ?? 'Could not create note', 'error'); setCreating(false); } }
  const flag = (n: N, f: 'pinned' | 'bookmarked' | 'archived') => mutate({ key: n.id + f, apply: (l) => (f === 'archived' ? l.filter((x) => x.id !== n.id) : l.map((x) => (x.id === n.id ? { ...x, [f]: !x[f] } : x))), run: () => toggleNote(n.id, f, !n[f]), success: f === 'archived' ? (n.archived ? 'Note restored' : 'Note archived') : undefined });
  return (
    <>
      <ConfirmDialog open={!!del} danger title="Delete this note?" body="This permanently deletes the note and any sharing of it." confirmLabel="Delete" onCancel={() => setDel(null)}
        onConfirm={() => { const n = del!; setDel(null); void mutate({ key: n.id + 'del', apply: (l) => l.filter((x) => x.id !== n.id), run: () => deleteNote(n.id), success: 'Note deleted' }); }} />
      <div className="mb-4"><button className="btn" onClick={create} disabled={creating}>{creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}New note</button></div>
      {!items.length ? <Empty>{archivedView ? 'No archived notes.' : 'No notes yet — create your first one.'}</Empty> : (
        <ul className="space-y-2">{items.map((n) => (
          <li key={n.id} className="card flex items-center justify-between gap-3 !p-4">
            <Link href={`/notes/${n.id}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{n.pinned && '📌 '}{n.bookmarked && '🔖 '}{n.title || 'Untitled'}</p>
              <p className="muted truncate text-sm">{[n.subject, n.chapter].filter(Boolean).join(' · ')} {n.tags?.map((t) => `#${t}`).join(' ')}</p></Link>
            <div className="hidden gap-1 sm:flex">
              <button className="btn btn-ghost !p-2" aria-label={n.pinned ? 'Unpin' : 'Pin'} aria-pressed={n.pinned} onClick={() => flag(n, 'pinned')}><Pin size={14} fill={n.pinned ? 'currentColor' : 'none'} /></button>
              <button className="btn btn-ghost !p-2" aria-label="Bookmark" aria-pressed={n.bookmarked} onClick={() => flag(n, 'bookmarked')}><Bookmark size={14} fill={n.bookmarked ? 'currentColor' : 'none'} /></button>
              <button className="btn btn-ghost !p-2" aria-label={n.archived ? 'Restore' : 'Archive'} onClick={() => flag(n, 'archived')}><Archive size={14} /></button>
              <button className="btn btn-ghost !p-2" aria-label="Delete" onClick={() => setDel(n)}><Trash2 size={14} /></button></div>
            <div className="sm:hidden"><Dropdown items={[{ label: n.pinned ? 'Unpin' : 'Pin', onSelect: () => flag(n, 'pinned') }, { label: n.bookmarked ? 'Remove bookmark' : 'Bookmark', onSelect: () => flag(n, 'bookmarked') },
              { label: n.archived ? 'Restore' : 'Archive', onSelect: () => flag(n, 'archived') }, { label: 'Delete', danger: true, onSelect: () => setDel(n) }]} /></div>
          </li>))}</ul>)}
    </>
  );
}
