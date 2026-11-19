'use client';
import { useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle, Star } from 'lucide-react';
import { ProgressBar } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { bookmarkCard, reviewCard } from '../actions';
type Card = { id: string; front: string; back: string; bookmarked: boolean; status: string };
export function Practice({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0); const [flipped, setFlipped] = useState(false); const [seen, setSeen] = useState<Set<string>>(new Set([cards[0].id]));
  const [marks, setMarks] = useState<Record<string, boolean>>(Object.fromEntries(cards.map((c) => [c.id, c.bookmarked])));
  const [, start] = useTransition(); const toast = useToast(); const c = cards[i];
  const go = (n: number) => { const k = (n + cards.length) % cards.length; setI(k); setFlipped(false); setSeen((s) => new Set(s).add(cards[k].id)); };
  const rate = (q: number, msg: string) => { start(async () => { await reviewCard(c.id, q); }); toast.push(msg, 'success'); };
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-1 flex justify-between text-sm" role="status"><span className="muted">Card {i + 1} of {cards.length}</span><span className="muted">seen {seen.size}/{cards.length}</span></div>
      <ProgressBar pct={(seen.size / cards.length) * 100} label="Cards seen" />
      <button className="flip mt-5 block w-full text-start" onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Show question' : 'Show answer'} style={{ cursor: 'pointer' }}>
        <div className={`flip-inner min-h-[16rem] ${flipped ? 'flipped' : ''}`}>
          <div className="face card card-accent flex min-h-[16rem] items-center justify-center text-center font-display text-2xl font-bold"><span>{c.front}</span></div>
          <div className="face back card card-accent flex items-center justify-center text-center text-xl" aria-hidden={!flipped}><span>{c.back}</span></div></div></button>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn btn-ghost" onClick={() => go(i - 1)}><ArrowLeft size={16} className="rtl:rotate-180" />Previous</button>
        <button className="btn" onClick={() => setFlipped(!flipped)}><RotateCw size={16} />{flipped ? 'Hide answer' : 'Show answer'}</button>
        <button className="btn btn-ghost" onClick={() => go(i + 1)}>Next<ArrowRight size={16} className="rtl:rotate-180" /></button>
        <button className="btn btn-ghost" onClick={() => go(Math.floor(Math.random() * cards.length))}><Shuffle size={16} />Random</button></div>
      {flipped && <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="How well did you know it?">
        <button className="btn btn-ghost" onClick={() => rate(1, 'Marked for revision')}>Needs revision</button>
        <button className="btn btn-ghost" onClick={() => rate(3, 'Marked as hard')}>Hard</button>
        <button className="btn btn-ghost" onClick={() => rate(5, 'Marked as learned')}>Learned</button></div>}
      <div className="mt-3 text-center"><button className="btn btn-ghost" aria-pressed={marks[c.id]} onClick={() => { const v = !marks[c.id]; setMarks({ ...marks, [c.id]: v }); start(async () => { await bookmarkCard(c.id, v); }); }}><Star size={16} fill={marks[c.id] ? 'currentColor' : 'none'} />{marks[c.id] ? 'Bookmarked as difficult' : 'Bookmark as difficult'}</button></div>
    </div>
  );
}
