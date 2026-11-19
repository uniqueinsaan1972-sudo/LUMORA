'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useList } from '@/lib/useList';
import { CopyButton } from '@/components/CopyButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Empty } from '@/components/ui';
import { createClass, deleteClass } from '../../classes/actions';
type C = { id: string; name: string; description: string | null; join_code: string | null; member_count: number };
export function TeacherClasses({ initial }: { initial: C[] }) {
  const { items, mutate } = useList<C>(initial); const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [busy, setBusy] = useState(false); const [del, setDel] = useState<C | null>(null);
  async function add(e: React.FormEvent) { e.preventDefault(); if (busy || name.trim().length < 2) return; setBusy(true); const n = name.trim(), d = desc.trim(); setName(''); setDesc('');
    const r = await mutate({ key: 'add', apply: (l) => [{ id: 'tmp-' + Date.now(), name: n, description: d || null, join_code: '…', member_count: 0 }, ...l], run: () => createClass({ name: n, description: d }), success: 'Class created' }); if (!r?.ok) { setName(n); setDesc(d); } setBusy(false); }
  return (<>
    <form onSubmit={add} className="card mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="input" placeholder="Class name (e.g. Grade 9 Physics)" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} /><input className="input" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} />
      <button className="btn" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Create</button></form>
    {!items.length ? <Empty>No classes yet.</Empty> : <ul className="space-y-2">{items.map((c) => (<li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4"><Link href={c.id.startsWith('tmp-') ? '#' : `/teacher/classes/${c.id}`} className="min-w-0 flex-1"><p className="font-display font-bold">{c.name}</p><p className="muted text-sm">{c.description ?? 'No description'} · {c.member_count} student{c.member_count === 1 ? '' : 's'}</p></Link>
      {c.join_code && c.join_code !== '…' && <span className="flex items-center gap-2"><code className="rounded bg-slate-500/20 px-2 py-1 text-sm">{c.join_code}</code><CopyButton text={c.join_code} /></span>}
      <button className="btn btn-ghost !p-2" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Trash2 size={14} /></button></li>))}</ul>}
    <ConfirmDialog open={!!del} danger title={`Delete “${del?.name}”?`} body="Students are removed from the class and its assigned tests become unavailable to them through the class." confirmLabel="Delete class" onCancel={() => setDel(null)} onConfirm={() => { const c = del!; setDel(null); void mutate({ key: c.id, apply: (l) => l.filter((x) => x.id !== c.id), run: () => deleteClass(c.id), success: 'Class deleted' }); }} /></>);
}
