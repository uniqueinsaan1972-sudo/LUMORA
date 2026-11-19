'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProgressBar } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { saveAnswer, submitAttempt } from './actions';

type Q = { id: string; position: number; kind: 'mcq' | 'true_false' | 'fill_blank' | 'short' | 'long' | 'definition'; prompt: string; options: string[] | null; marks: number };
export function Attempt({ data }: { data: { attempt: { id: string; deadline_at: string; server_now: string }; test: { title: string }; questions: Q[]; answers: Record<string, string> } }) {
  const router = useRouter(); const toast = useToast();
  // DISPLAY ONLY: remaining time is computed from the server's clock offset. The server re-checks the deadline on every save and submit.
  const offset = useRef(new Date(data.attempt.server_now).getTime() - Date.now());
  const deadline = new Date(data.attempt.deadline_at).getTime(); const total = useRef(Math.max(1, deadline - (Date.now() + offset.current)));
  const [left, setLeft] = useState(deadline - (Date.now() + offset.current));
  const [ans, setAns] = useState<Record<string, string>>(data.answers ?? {}); const [i, setI] = useState(0); const [ask, setAsk] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set()); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [saveState, setSave] = useState('');
  const submitting = useRef(false); const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function finish(auto = false) {
    setAsk(false); if (submitting.current) return; submitting.current = true; setBusy(true);
    const r = await submitAttempt(data.attempt.id, ans);
    if (r.ok) { toast.push(auto ? 'Time is up — your answers were submitted.' : 'Test submitted.', 'success'); router.replace('/quizzes'); router.refresh(); }
    else { setMsg(r.error ?? 'Submit failed'); toast.push(r.error ?? 'Submit failed', 'error'); submitting.current = false; setBusy(false); if (auto) router.refresh(); }
  }
  useEffect(() => { const h = setInterval(() => setLeft(deadline - (Date.now() + offset.current)), 1000); return () => clearInterval(h); }, [deadline]);
  useEffect(() => { if (left <= 0) void finish(true); /* the server decides whether answers are still accepted */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);

  function change(qid: string, v: string) {
    setAns((a) => ({ ...a, [qid]: v })); setSave('Saving…'); clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(async () => { const r = await saveAnswer(data.attempt.id, qid, v); setSave(r.ok ? 'Progress saved' : 'Not saved — will retry on submit'); }, 700);
  }
  const q = data.questions[i]; const mm = Math.max(0, Math.floor(left / 60000)); const ss = Math.max(0, Math.floor((left % 60000) / 1000)); const low = left < 60000;
  const answered = data.questions.filter((x) => (ans[x.id] ?? '').trim()).length;
  return (
    <div>
      <ConfirmDialog open={ask} title="Submit your test?" body={`${data.questions.length - answered} unanswered. You cannot change answers after submitting.`} confirmLabel="Submit test" cancelLabel="Go back" onCancel={() => setAsk(false)} onConfirm={() => finish()} />
      <div className="glass sticky top-2 z-20 mb-4 !p-4 md:top-4"><div className="flex items-center justify-between gap-3"><h1 className="font-display min-w-0 truncate font-bold">{data.test.title}</h1>
        <p className={`flex items-center gap-2 font-mono text-lg font-bold ${low ? 'text-red-400' : ''}`} style={low ? { animation: 'pop 1s infinite' } : undefined}><Clock size={18} />{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</p></div>
        <div className="mt-2"><ProgressBar pct={(Math.max(0, left) / total.current) * 100} label="Time remaining (display only; the server enforces the deadline)" /></div></div>
      <p className="muted mb-2 text-sm" role="status">Answered {answered}/{data.questions.length} · marked {marked.size} · {saveState}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">{data.questions.map((x, k) => <button key={x.id} onClick={() => setI(k)} aria-label={`Question ${k + 1}`} aria-current={k === i}
        className={`h-9 w-9 rounded-lg border text-sm font-semibold transition active:scale-90 ${k === i ? 'border-transparent' : (ans[x.id] ?? '').trim() ? 'border-emerald-400/50 bg-emerald-400/15' : 'border-[color:var(--border-strong)]'} ${marked.has(x.id) ? 'ring-2 ring-amber-400' : ''}`}
        style={k === i ? { background: 'linear-gradient(135deg, var(--a1), var(--a2))', color: 'var(--on-accent)' } : undefined}>{k + 1}</button>)}</div>
      <div className="card"><AnimatePresence mode="wait"><motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
        <p className="muted text-xs"><span className="badge">{q.marks} mark{q.marks === 1 ? '' : 's'}</span></p><p className="font-display mt-2 text-xl font-bold">{q.prompt}</p>
        {(q.kind === 'mcq' || q.kind === 'true_false') ? <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">{(q.kind === 'true_false' ? ['True', 'False'] : q.options ?? []).map((o) => (
          <label key={o} className="option" data-selected={ans[q.id] === o}><input type="radio" name={q.id} checked={ans[q.id] === o} onChange={() => change(q.id, o)} /><span className="dot" aria-hidden /><span>{o}</span></label>))}</div>
          : q.kind === 'fill_blank' ? <input className="input mt-4" value={ans[q.id] ?? ''} onChange={(e) => change(q.id, e.target.value)} maxLength={500} aria-label="Your answer" placeholder="Type your answer" /> : <textarea className="input mt-4 min-h-[10rem]" value={ans[q.id] ?? ''} onChange={(e) => change(q.id, e.target.value)} maxLength={20000} aria-label="Your answer" />}
      </motion.div></AnimatePresence>
        <div className="mt-6 flex flex-wrap gap-2"><button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button><button className="btn btn-ghost" disabled={i === data.questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
          <button className="btn btn-ghost" aria-pressed={marked.has(q.id)} onClick={() => setMarked((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}>Mark for review</button>
          <button className="btn ms-auto" disabled={busy} onClick={() => setAsk(true)}>{busy ? 'Submitting…' : 'Submit test'}</button></div>
        {msg && <p role="alert" className="mt-2 text-red-400">{msg}</p>}</div>
    </div>
  );
}
