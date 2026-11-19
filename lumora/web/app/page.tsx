import Link from 'next/link';
import { Brain, FileText, GraduationCap, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Reveal } from '@/components/Reveal';
const features = [
  [FileText, 'Smart notes', 'Autosaving, searchable notes that only you can see.', '#8b5cf6', '#6366f1'],
  [Brain, 'Flashcards', 'Flip, review and revisit hard cards with spaced repetition.', '#f472b6', '#8b5cf6'],
  [GraduationCap, 'Quiz arena', 'Practise with your own questions and see real scores.', '#34d399', '#22d3ee'],
  [Timer, 'Fair timed tests', 'Teacher tests are timed by the server, not the browser.', '#38bdf8', '#6366f1'],
  [Sparkles, 'Comeback mode', 'Gentle, data-based suggestions for what to practise next.', '#fbbf24', '#f472b6'],
  [ShieldCheck, 'Private by default', 'Your notes and results are yours. You control sharing.', '#818cf8', '#38bdf8'],
] as const;
export default function Landing() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
      <nav className="flex items-center justify-between"><Logo /><div className="flex items-center gap-2"><ThemeToggle /><Link className="btn btn-ghost" href="/login">Log in</Link></div></nav>
      <section className="mx-auto max-w-3xl pb-16 pt-20 text-center">
        <Reveal><span className="badge">Make learning easier. Make improvement possible.</span></Reveal>
        <Reveal delay={0.08}><h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.1] sm:text-6xl">Where Learning <span className="grad-text">Meets Possibility.</span></h1></Reveal>
        <Reveal delay={0.16}><p className="muted mx-auto mt-5 max-w-xl text-lg">Notes, flashcards, practice and teacher tests — one calm, secure place to organise your studies and watch yourself improve.</p></Reveal>
        <Reveal delay={0.24}><div className="mt-8 flex flex-wrap justify-center gap-3"><Link className="btn !px-6 !py-3" href="/register">Get started free</Link><Link className="btn btn-ghost !px-6 !py-3" href="/login">I have an account</Link></div></Reveal>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(([Icon, title, text, a, b], i) => (
          <Reveal key={title} delay={i * 0.06}><div className="card lift h-full" style={{ ['--a1' as string]: a, ['--a2' as string]: b, ['--glow' as string]: '139,92,246' }}>
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} aria-hidden><Icon size={20} /></span>
            <h2 className="font-display font-bold">{title}</h2><p className="muted mt-1 text-sm">{text}</p></div></Reveal>))}
      </section>
      <p className="muted mt-16 text-center text-sm"><Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link></p>
    </main>
  );
}
