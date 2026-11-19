'use client';
import { useState } from 'react';
import { createTest } from './actions';
import { useToast } from '@/components/Toast';
type Q = { kind: 'mcq' | 'true_false' | 'short' | 'long'; prompt: string; options: string; correct_answer: string; marks: number };
const blank: Q = { kind: 'mcq', prompt: '', options: '', correct_answer: '', marks: 1 };
export function TestBuilder({ classes }: { classes: { id: string; name: string }[] }) {
  const [f, setF] = useState({ title: '', instructions: '', subject: '', duration: 30, passing: 0, opens: '', closes: '' });
  const [sel, setSel] = useState<string[]>([]); const [qs, setQs] = useState<Q[]>([{ ...blank }]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const toast = useToast();
  const upd = (i: number, p: Partial<Q>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...p } : q)));
  async function submit(publish: boolean) {
    if (busy) return; setBusy(true); setErr('');
    const res = await createTest({ title: f.title, instructions: f.instructions || undefined, subject: f.subject || undefined, duration_minutes: Number(f.duration), passing_marks: Number(f.passing),
      opens_at: f.opens ? new Date(f.opens).toISOString() : '', closes_at: f.closes ? new Date(f.closes).toISOString() : '', class_ids: sel,
      questions: qs.map((q) => ({ kind: q.kind, prompt: q.prompt, options: q.kind === 'mcq' ? q.options.split('\n').map((s) => s.trim()).filter(Boolean) : undefined, correct_answer: q.correct_answer || undefined, marks: Number(q.marks) })) }, publish);
    if (res?.error) { setErr(res.error); toast.push(res.error, 'error'); setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <div className="card grid gap-2 sm:grid-cols-2">
        <input className="input sm:col-span-2" placeholder="Test title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input sm:col-span-2" placeholder="Instructions for students" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
        <input className="input" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
        <label className="text-sm">Duration (minutes)<input className="input" type="number" min={1} value={f.duration} onChange={(e) => setF({ ...f, duration: +e.target.value })} /></label>
        <label className="text-sm">Opens<input className="input" type="datetime-local" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} /></label>
        <label className="text-sm">Closes<input className="input" type="datetime-local" value={f.closes} onChange={(e) => setF({ ...f, closes: e.target.value })} /></label>
        <label className="text-sm">Passing marks<input className="input" type="number" min={0} value={f.passing} onChange={(e) => setF({ ...f, passing: +e.target.value })} /></label>
        <fieldset className="text-sm"><legend>Assign to classes</legend>{classes.length ? classes.map((c) => <label key={c.id} className="mr-3"><input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => setSel(e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id))} /> {c.name}</label>) : <span className="muted">Create a class first.</span>}</fieldset>
      </div>
      {qs.map((q, i) => (<div key={i} className="card grid gap-2"><div className="flex justify-between"><b>Question {i + 1}</b>{qs.length > 1 && <button className="btn btn-ghost" onClick={() => setQs(qs.filter((_, k) => k !== i))}>Remove</button>}</div>
        <select className="input" value={q.kind} onChange={(e) => upd(i, { kind: e.target.value as Q['kind'], correct_answer: '' })}><option value="mcq">MCQ</option><option value="true_false">True / False</option><option value="short">Short answer (manual grading)</option><option value="long">Long answer (manual grading)</option></select>
        <textarea className="input" placeholder="Question text" value={q.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} />
        {q.kind === 'mcq' && <textarea className="input" placeholder="Options, one per line" value={q.options} onChange={(e) => upd(i, { options: e.target.value })} />}
        {q.kind === 'mcq' && <input className="input" placeholder="Correct answer (must match an option exactly)" value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })} />}
        {q.kind === 'true_false' && <select className="input" value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })}><option value="">Correct answer…</option><option>True</option><option>False</option></select>}
        <label className="text-sm">Marks<input className="input w-24" type="number" min={0.5} step={0.5} value={q.marks} onChange={(e) => upd(i, { marks: +e.target.value })} /></label></div>))}
      <button className="btn btn-ghost" onClick={() => setQs([...qs, { ...blank }])}>+ Add question</button>
      {err && <p role="alert" className="text-red-400">{err}</p>}
      <div className="flex gap-2"><button className="btn btn-ghost" disabled={busy} onClick={() => submit(false)}>Save draft</button><button className="btn" disabled={busy} onClick={() => submit(true)}>Save &amp; publish</button></div>
    </div>
  );
}
