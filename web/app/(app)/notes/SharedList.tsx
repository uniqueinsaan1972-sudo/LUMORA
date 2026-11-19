'use client';
import Link from 'next/link';
import { Eye, Pencil, Save } from 'lucide-react';
import { useList } from '@/lib/useList';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { saveSharedNote } from './actions';
type S = { id: string; title: string; subject: string | null; chapter: string | null; updated_at: string; owner_name: string; permission: string };
export function SharedList({ notes }: { notes: S[] }) {
  const { items } = useList<S>(notes); const toast = useToast();
  async function save(n: S) { const r = await saveSharedNote(n.id); toast.push(r.ok ? 'Saved a copy to “My notes”.' : r.error ?? 'Could not save', r.ok ? 'success' : 'error'); }
  if (!items.length) return <Empty>Nothing has been shared with you yet. Notes shared by friends, groups or teachers appear here instantly.</Empty>;
  return (<ul className="space-y-2">{items.map((n) => (
    <li key={n.id} className="card flex items-center justify-between gap-3 !p-4"><Link href={`/notes/${n.id}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{n.title || 'Untitled'}</p>
      <p className="muted truncate text-sm">from {n.owner_name} · {[n.subject, n.chapter].filter(Boolean).join(' · ')}</p></Link>
      <span className="badge">{n.permission === 'edit' ? <><Pencil size={12} />Can edit</> : <><Eye size={12} />View only</>}</span>
      <button className="btn btn-ghost" onClick={() => save(n)}><Save size={14} />Save copy</button></li>))}</ul>);
}
