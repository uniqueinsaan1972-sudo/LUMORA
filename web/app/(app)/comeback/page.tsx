import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { average, percent } from '@/lib/scoring';
import { Sparkles } from 'lucide-react';
import { PageTitle } from '@/components/ui';
const MIN_QUIZZES = 3;
export default async function Comeback() {
  const { supabase } = await requireUser('student');
  const { data: q } = await supabase.from('quiz_attempts').select('score,total,subject,created_at').order('created_at');
  const by = new Map<string, number[]>(); (q ?? []).forEach((a) => a.subject && by.set(a.subject, [...(by.get(a.subject) ?? []), percent(a.score, a.total)]));
  const ready = [...by].filter(([, v]) => v.length >= MIN_QUIZZES).map(([s, v]) => ({ s, avg: average(v), n: v.length, trend: v[v.length - 1] - v[0] })).sort((a, b) => a.avg - b.avg);
  const pick = ready[0];
  const [notes, cards] = pick ? await Promise.all([supabase.from('notes').select('id,title').eq('subject', pick.s).limit(3), supabase.from('flashcards').select('id').eq('subject', pick.s).limit(50)]) : [null, null];
  return (<><PageTitle icon={<Sparkles size={22} />} sub="Step by step. Every attempt counts.">Backbencher Comeback Mode</PageTitle>
    {!pick ? <div className="card"><p>We need a little more practice data before recommending anything. Take at least {MIN_QUIZZES} practice quizzes in a subject (add a subject to your MCQs) and we’ll suggest where to focus.</p><Link className="btn mt-3" href="/quizzes">Take a practice quiz</Link></div> :
      <div className="card space-y-3"><p>Your next small step: <b>{pick.s}</b>. Your average there is {pick.avg}% over {pick.n} quizzes — a great place to grow.</p>
        {pick.trend > 0 && <p>🎉 You’ve improved by {Math.round(pick.trend)} points since your first quiz here. Keep going!</p>}
        <p>Try a short 5-question session (questions you marked “revise” come first).</p><Link className="btn" href={`/quizzes/practice?subject=${encodeURIComponent(pick.s)}&n=5`}>Start 5 questions</Link>
        {!!notes?.data?.length && <div><p className="font-semibold">Notes to revisit</p><ul>{notes.data.map((n) => <li key={n.id}><Link className="underline" href={`/notes/${n.id}`}>{n.title}</Link></li>)}</ul></div>}
        {!!cards?.data?.length && <p>{cards.data.length} flashcards in this subject. <Link className="underline" href="/flashcards/practice?mode=revision">Revise cards</Link></p>}
        <p className="muted text-sm">Limitation: questions don’t have difficulty levels yet, so we can’t order easy → hard automatically. Recommendations use only your own quiz history.</p></div>}</>);
}
