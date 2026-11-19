'use client';
import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useList } from '@/lib/useList';
import { Empty } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { addCard, deleteCard, editCard } from './actions';
type C = { id: string; front: string; back: string; subject: string | null; chapter: string | null; status: string; bookmarked: boolean };
type Draft = { front: string; back: string; subject: string; chapter: string };
const blank: Draft = { front: '', back: '', subject: '', chapter: '' };

export function FlashcardManager({ cards }: { cards: C[] }) {
  const { items, mutate } = useList<C>(cards); const [d, setD] = useState<Draft>(blank); const [edit, setEdit] = useState<C | null>(null); const [del, setDel] = useState<C | null>(null); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const clean = (x: Draft) => ({ front: x.front.trim(), back: x.back.trim(), subject: x.subject.trim() || undefined, chapter: x.chapter.trim() || undefined });
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (busy || !d.front.trim() || !d.back.trim()) return; setBusy(true); const draft = d; const tmp = 'tmp-' + Date.now();
    setD(blank); const r = await mutate({ key: 'add', apply: (l) => [{ id: tmp, front: draft.front.trim(), back: draft.back.trim(), subject: draft.subject || null, chapter: draft.chapter || null, status: 'new', bookmarked: false }, ...l], run: () => addCard(clean(draft)), success: 'Card added' });
    if (!r?.ok) setD(draft); else if ('id' in r && r.id) { /* real id arrives with the revalidated list */ } setBusy(false);
  }
  async function save(e: React.FormEvent) { e.preventDefault(); const c = edit!; setEdit(null); await mutate({ key: c.id, apply: (l) => l.map((x) => (x.id === c.id ? c : x)), run: () => editCard(c.id, clean({ front: c.front, back: c.back, subject: c.subject ?? '', chapter: c.chapter ?? '' })), success: 'Card updated' }); }
  return (
    <>
      <form onSubmit={add} className="card mb-4 grid gap-2"><h2 className="font-display font-bold">Add flashcard</h2>
        <input className="input" placeholder="Front (question or word)" value={d.front} onChange={(e) => setD({ ...d, front: e.target.value })} maxLength={2000} required />
        <textarea className="input" placeholder="Back (answer or meaning)" value={d.back} onChange={(e) => setD({ ...d, back: e.target.value })} maxLength={5000} required />
        <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Subject" value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} /><input className="input" placeholder="Chapter" value={d.chapter} onChange={(e) => setD({ ...d, chapter: e.target.value })} /></div>
        <button className="btn w-fit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Add card</button></form>
      {!items.length ? <Empty>No flashcards yet — add your first above.</Empty> : <ul className="space-y-2">{items.map((c) => (
        <li key={c.id} className="card flex items-center justify-between gap-3 !p-4"><div className="min-w-0"><p className="truncate font-semibold">{c.front}</p><p className="muted truncate text-sm">{c.back}</p><p className="mt-1 flex gap-1.5"><span className="badge">{c.status}</span>{c.subject && <span className="badge">{c.subject}</span>}</p></div>
          <div className="flex gap-1"><button className="btn btn-ghost !p-2" aria-label="Edit card" onClick={() => { setEdit(c); setOpen(true); }}><Pencil size={14} /></button><button className="btn btn-ghost !p-2" aria-label="Delete card" onClick={() => setDel(c)}><Trash2 size={14} /></button></div></li>))}</ul>}
      <Modal open={open && !!edit} onClose={() => setOpen(false)} title="Edit flashcard">{edit && <form onSubmit={(e) => { setOpen(false); void save(e); }} className="grid gap-2">
        <input className="input" value={edit.front} onChange={(e) => setEdit({ ...edit, front: e.target.value })} required /><textarea className="input" value={edit.back} onChange={(e) => setEdit({ ...edit, back: e.target.value })} required />
        <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Subject" value={edit.subject ?? ''} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /><input className="input" placeholder="Chapter" value={edit.chapter ?? ''} onChange={(e) => setEdit({ ...edit, chapter: e.target.value })} /></div>
        <button className="btn w-fit">Save changes</button></form>}</Modal>
      <ConfirmDialog open={!!del} danger title="Delete this card?" body="This can’t be undone." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { const c = del!; setDel(null); void mutate({ key: c.id + 'd', apply: (l) => l.filter((x) => x.id !== c.id), run: () => deleteCard(c.id), success: 'Card deleted' }); }} />
    </>
  );
}
