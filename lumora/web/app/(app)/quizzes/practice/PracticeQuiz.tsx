'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { percent } from '@/lib/scoring';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProgressBar, ProgressRing } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { submitPractice } from './actions';
type Q = { id: string; prompt: string; options: string[] };
export function PracticeQuiz({ questions, subject }: { questions: Q[]; subject: string }) {
  const [i, setI] = useState(0); const [ans, setAns] = useState<Record<string, string>>({}); const [review, setReview] = useState<Set<string>>(new Set()); const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false); const [res, setRes] = useState<Awaited<ReturnType<typeof submitPractice>> | null>(null); const toast = useToast();
  const q = questions[i]; const answered = Object.keys(ans).length;
  async function submit() {
    setAsk(false); if (busy) return; // prevents duplicate submission
    setBusy(true); const r = await submitPractice(subject, ans); setBusy(false);
    if ('error' in r) toast.push(r.error ?? 'Could not score this quiz.', 'error'); else setRes(r);
  }
  const requestSubmit = () => (answered < questions.length ? setAsk(true) : void submit());
  if (res && !('error' in res)) {
    const p = percent(res.score, res.total);
    return (<div className="space-y-4">
      <div className="glass card-accent flex flex-wrap items-center gap-6 !p-6"><ProgressRing pct={p}><p className="font-display text-2xl font-extrabold">{p}%</p></ProgressRing>
        <div><h2 className="font-display text-2xl font-extrabold">{res.score} / {res.total} correct</h2><p className="muted text-sm">Score = correct answers ÷ scored questions × 100. This is practice data, not an official result.</p></div></div>
      <ul className="space-y-2">{questions.map((x) => { const r = res.details.find((d) => d.question_id === x.id); const rv = res.reveal.find((d) => d.id === x.id);
        return <li key={x.id} className="card flex gap-3">{r?.correct ? <CheckCircle2 className="shrink-0 text-emerald-400" size={20} /> : <XCircle className="shrink-0 text-red-400" size={20} />}
          <div><p className="font-semibold">{x.prompt}</p><p className="muted text-sm">Your answer: {ans[x.id] ?? '—'} · Correct: {rv?.answer}</p>{rv?.explanation && <p className="muted text-sm">{rv.explanation}</p>}</div></li>; })}</ul></div>);
  }
  return (
    <div className="card">
      <ConfirmDialog open={ask} title="Submit with unanswered questions?" body={`${questions.length - answered} question(s) are unanswered. You can go back and answer them first.`} confirmLabel="Submit anyway" cancelLabel="Keep answering" onCancel={() => setAsk(false)} onConfirm={submit} />
      <p className="muted text-sm" role="status">Question {i + 1} of {questions.length} · answered {answered} · unanswered {questions.length - answered} · marked {review.size}</p>
      <div className="mt-2"><ProgressBar pct={(answered / questions.length) * 100} label="Answered" /></div>
      <AnimatePresence mode="wait"><motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
        <p className="font-display mt-5 text-xl font-bold">{q.prompt}</p>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">{q.options.map((o) => (
          <label key={o} className="option" data-selected={ans[q.id] === o}><input type="radio" name={q.id} checked={ans[q.id] === o} onChange={() => setAns({ ...ans, [q.id]: o })} /><span className="dot" aria-hidden /><span>{o}</span></label>))}</div>
      </motion.div></AnimatePresence>
      <div className="mt-6 flex flex-wrap gap-2"><button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button><button className="btn btn-ghost" disabled={i === questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
        <button className="btn btn-ghost" aria-pressed={review.has(q.id)} onClick={() => setReview((s) => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}>{review.has(q.id) ? 'Unmark review' : 'Mark for review'}</button>
        <button className="btn ms-auto" disabled={busy} onClick={requestSubmit}>{busy ? 'Submitting…' : 'Submit quiz'}</button></div>
    </div>);
}
