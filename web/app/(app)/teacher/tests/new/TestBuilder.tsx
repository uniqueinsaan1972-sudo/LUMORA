'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createTest } from './actions';
type Kind = 'mcq' | 'true_false' | 'fill_blank' | 'short' | 'long' | 'definition';
type Q = { kind: Kind; prompt: string; options: string; correct_answer: string; marks: number; explanation: string };
const blank: Q = { kind: 'mcq', prompt: '', options: '', correct_answer: '', marks: 1, explanation: '' };
const KINDS: [Kind, string][] = [['mcq', 'Multiple choice'], ['true_false', 'True / False'], ['fill_blank', 'Fill in the blank'], ['short', 'Short answer (manual grading)'], ['long', 'Long answer (manual grading)'], ['definition', 'Definition (manual grading)']];
export function TestBuilder({ classes, groups }: { classes: { id: string; name: string }[]; groups: { id: string; name: string }[] }) {
  const toast = useToast(); const router = useRouter();
  const [f, setF] = useState({ title: '', description: '', instructions: '', subject: '', duration: 30, passing: 0, opens: '', closes: '' });
  const [cls, setCls] = useState<string[]>([]); const [grp, setGrp] = useState<string[]>([]); const [qs, setQs] = useState<Q[]>([{ ...blank }]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const total = qs.reduce((a, q) => a + (Number(q.marks) || 0), 0); const upd = (i: number, p: Partial<Q>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  async function submit(publish: boolean) {
    if (busy) return; setBusy(true); setErr('');
    const res = await createTest({ title: f.title, description: f.description || undefined, instructions: f.instructions || undefined, subject: f.subject || undefined, duration_minutes: Number(f.duration), passing_marks: Number(f.passing),
      opens_at: f.opens ? new Date(f.opens).toISOString() : '', closes_at: f.closes ? new Date(f.closes).toISOString() : '', class_ids: cls, group_ids: grp,
      questions: qs.map((q) => ({ kind: q.kind, prompt: q.prompt, options: q.kind === 'mcq' ? q.options.split('\n').map((s) => s.trim()).filter(Boolean) : undefined, correct_answer: q.correct_answer || undefined, marks: Number(q.marks), explanation: q.explanation || undefined })) }, publish);
    setBusy(false); if (!res.ok) { setErr(res.error ?? 'Failed'); toast.push(res.error ?? 'Could not create the test', 'error'); return; }
    toast.push(publish ? 'Test published — students were notified' : 'Draft saved', 'success'); router.push(`/teacher/tests/${res.id}`);
  }
  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Test title<input className="input mt-1" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} /></label>
        <label className="text-sm font-medium">Subject<input className="input mt-1" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
        <label className="text-sm font-medium">Duration (minutes)<input className="input mt-1" type="number" min={1} value={f.duration} onChange={(e) => setF({ ...f, duration: +e.target.value })} /></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea className="input mt-1" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={2000} /></label>
        <label className="text-sm font-medium sm:col-span-2">Instructions for students<textarea className="input mt-1" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} maxLength={5000} /></label>
        <label className="text-sm font-medium">Opens<input className="input mt-1" type="datetime-local" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} /></label>
        <label className="text-sm font-medium">Closes<input className="input mt-1" type="datetime-local" value={f.closes} onChange={(e) => setF({ ...f, closes: e.target.value })} /></label>
        <label className="text-sm font-medium">Passing marks<input className="input mt-1" type="number" min={0} value={f.passing} onChange={(e) => setF({ ...f, passing: +e.target.value })} /></label>
        <div className="flex items-end"><p className="badge !text-sm">Total marks: {total}</p></div>
        <fieldset className="text-sm sm:col-span-2"><legend className="mb-1 font-medium">Assign to classes</legend>{classes.length ? classes.map((c) => <label key={c.id} className="me-4 inline-flex items-center gap-2"><input type="checkbox" checked={cls.includes(c.id)} onChange={(e) => toggle(cls, setCls, c.id, e.target.checked)} />{c.name}</label>) : <span className="muted">No classes yet.</span>}</fieldset>
        <fieldset className="text-sm sm:col-span-2"><legend className="mb-1 font-medium">Assign to groups</legend>{groups.length ? groups.map((g) => <label key={g.id} className="me-4 inline-flex items-center gap-2"><input type="checkbox" checked={grp.includes(g.id)} onChange={(e) => toggle(grp, setGrp, g.id, e.target.checked)} />{g.name}</label>) : <span className="muted">No groups yet.</span>}
          <p className="muted mt-1 text-xs">A unique access code is generated automatically so you can also share the test with anyone you choose.</p></fieldset>
      </div>
      {qs.map((q, i) => (<div key={i} className="card grid gap-2"><div className="flex items-center justify-between"><b>Question {i + 1}</b>{qs.length > 1 && <button className="btn btn-ghost !p-2" aria-label={`Remove question ${i + 1}`} onClick={() => setQs(qs.filter((_, k) => k !== i))}><Trash2 size={14} /></button>}</div>
        <select className="input" aria-label="Question type" value={q.kind} onChange={(e) => upd(i, { kind: e.target.value as Kind, correct_answer: '' })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <textarea className="input" placeholder={q.kind === 'fill_blank' ? 'Question — use ___ for the blank' : 'Question text'} value={q.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} />
        {q.kind === 'mcq' && <><textarea className="input" placeholder="Options, one per line" value={q.options} onChange={(e) => upd(i, { options: e.target.value })} /><input className="input" placeholder="Correct answer (must match an option exactly)" value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })} /></>}
        {q.kind === 'true_false' && <select className="input" aria-label="Correct answer" value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })}><option value="">Correct answer…</option><option>True</option><option>False</option></select>}
        {q.kind === 'fill_blank' && <input className="input" placeholder="Accepted answer(s) — separate alternatives with |  (e.g. Paris|paris, france)" value={q.correct_answer} onChange={(e) => upd(i, { correct_answer: e.target.value })} />}
        <textarea className="input" placeholder={['short', 'long', 'definition'].includes(q.kind) ? 'Model answer / marking criteria (shown to students after results are published)' : 'Explanation (shown after results are published)'} value={q.explanation} onChange={(e) => upd(i, { explanation: e.target.value })} />
        <label className="text-sm font-medium">Marks<input className="input mt-1 !w-28" type="number" min={0.5} step={0.5} value={q.marks} onChange={(e) => upd(i, { marks: +e.target.value })} /></label></div>))}
      <button className="btn btn-ghost" onClick={() => setQs([...qs, { ...blank }])}><Plus size={16} />Add question</button>
      {err && <p role="alert" className="text-red-400">{err}</p>}
      <div className="flex gap-2"><button className="btn btn-ghost" disabled={busy} onClick={() => submit(false)}>Save draft</button><button className="btn" disabled={busy} onClick={() => submit(true)}>{busy && <Loader2 size={16} className="animate-spin" />}Save &amp; publish</button></div>
    </div>
  );
}
