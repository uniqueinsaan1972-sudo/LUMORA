'use client';
import { useState } from 'react';
import { Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { useList } from '@/lib/useList';
import { Empty } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { addQuestion, deleteQuestion, setQuestionFlag } from './actions';
type Q = { id: string; type: string; prompt: string; options: string[] | null; answer: string | null; explanation: string | null; subject: string | null; important: boolean; status: string };
const types = [['short', 'Short question'], ['mcq', 'Multiple choice'], ['long', 'Long question'], ['definition', 'Definition'], ['word_meaning', 'Word meaning'], ['numerical', 'Numerical'], ['qa', 'Q&A pair']] as const;

export function QuestionManager({ questions }: { questions: Q[] }) {
  const { items, mutate } = useList<Q>(questions); const toast = useToast(); const [open, setOpen] = useState(false); const [del, setDel] = useState<Q | null>(null); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ type: 'short', prompt: '', options: '', answer: '', explanation: '', subject: '', chapter: '' });
  async function add(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; const opts = f.options.split('\n').map((s) => s.trim()).filter(Boolean);
    const payload = { type: f.type, prompt: f.prompt, options: opts.length ? opts : undefined, answer: f.answer || undefined, explanation: f.explanation || undefined, subject: f.subject || undefined, chapter: f.chapter || undefined };
    setBusy(true); const tmp: Q = { id: 'tmp-' + Date.now(), type: f.type, prompt: f.prompt.trim(), options: opts.length ? opts : null, answer: f.answer || null, explanation: f.explanation || null, subject: f.subject || null, important: false, status: 'new' };
    const r = await mutate({ key: 'add', apply: (l) => [tmp, ...l], run: () => addQuestion(payload), success: 'Question saved' });
    setBusy(false); if (r?.ok) { setOpen(false); setF({ ...f, prompt: '', options: '', answer: '', explanation: '' }); }
  }
  const flag = (q: Q, patch: Partial<Pick<Q, 'important' | 'status'>>, msg?: string) => mutate({ key: q.id + JSON.stringify(patch), apply: (l) => l.map((x) => (x.id === q.id ? { ...x, ...patch } : x)), run: () => setQuestionFlag(q.id, patch as any), success: msg });
  return (
    <>
      <button className="btn mb-4" onClick={() => setOpen(true)}><Plus size={16} />Add question</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add question" wide><form onSubmit={add} className="grid gap-2">
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Question type">{types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <textarea className="input" placeholder="Question" required maxLength={5000} value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} />
        {f.type === 'mcq' && <textarea className="input" placeholder="Options — one per line" value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} />}
        <textarea className="input" placeholder={f.type === 'mcq' ? 'Answer (must equal one option exactly)' : 'Answer'} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
        <textarea className="input" placeholder="Explanation (optional)" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /><input className="input" placeholder="Chapter" value={f.chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })} /></div>
        <button className="btn w-fit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : null}Save question</button></form></Modal>
      {!items.length ? <Empty>No questions yet.</Empty> : <ul className="space-y-2">{items.map((x) => (
        <li key={x.id} className="card"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="muted text-xs uppercase">{x.type} {x.subject && `· ${x.subject}`} · {x.status}</p><p className="font-semibold">{x.important && '⭐ '}{x.prompt}</p></div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1"><button className="btn btn-ghost !p-2" aria-pressed={x.important} aria-label="Mark important" onClick={() => flag(x, { important: !x.important })}><Star size={14} fill={x.important ? 'currentColor' : 'none'} /></button>
            <button className="btn btn-ghost" onClick={() => flag(x, { status: 'learned' }, 'Marked as learned')}>Learned</button><button className="btn btn-ghost" onClick={() => flag(x, { status: 'revise' }, 'Marked for revision')}>Revise</button>
            <button className="btn btn-ghost !p-2" aria-label="Delete question" onClick={() => setDel(x)}><Trash2 size={14} /></button></div></div>
          {(x.answer || x.explanation) && <details className="mt-2"><summary className="muted text-sm">Show answer</summary>{x.options && <ul className="list-disc ps-5 text-sm">{x.options.map((o) => <li key={o}>{o}</li>)}</ul>}<p className="mt-1"><b>Answer:</b> {x.answer}</p>{x.explanation && <p className="muted text-sm">{x.explanation}</p>}</details>}</li>))}</ul>}
      <ConfirmDialog open={!!del} danger title="Delete this question?" confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { const q = del!; setDel(null); void mutate({ key: q.id + 'd', apply: (l) => l.filter((x) => x.id !== q.id), run: () => deleteQuestion(q.id), success: 'Question deleted' }); }} />
    </>
  );
}
