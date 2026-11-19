import Link from 'next/link';
import { Brain, CalendarCheck, ClipboardList, Clock, FileText, Flame, GraduationCap, HelpCircle, Sparkles, Target, BookOpen, PlusCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { average, percent, streak } from '@/lib/scoring';
import { Bars, Empty, PageTitle, ProgressBar, ProgressRing, Stat } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { LiveRefresh } from '@/components/LiveRefresh';

const messages = ['Small steps every day add up.', 'Progress, not perfection.', 'Every question you practise makes the next one easier.', 'Rest is part of learning too.'];
const shortDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Quick({ href, icon, title, text, a1, a2, glow }: { href: string; icon: React.ReactNode; title: string; text: string; a1: string; a2: string; glow: string }) {
  return (
    <Link href={href} className="card lift group block" style={{ ['--a1' as string]: a1, ['--a2' as string]: a2, ['--glow' as string]: glow }}>
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl text-white transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${a1}, ${a2})` }} aria-hidden>{icon}</span>
      <p className="font-display font-bold">{title}</p><p className="muted text-sm">{text}</p>
    </Link>
  );
}

export default async function Dashboard() {
  const { supabase, profile } = await requireUser();
  if (profile.role === 'teacher') return <TeacherDash name={profile.display_name} />;
  const today = new Date().toISOString().slice(0, 10); const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [sessions, quizzes, notes, qCount, fCount, goals, tests, prefs] = await Promise.all([
    supabase.from('study_sessions').select('minutes, studied_on, subject'),
    supabase.from('quiz_attempts').select('score,total,subject,created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('notes').select('id,title,updated_at').eq('archived', false).order('updated_at', { ascending: false }).limit(5),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('important', true),
    supabase.from('flashcards').select('id', { count: 'exact', head: true }),
    supabase.from('study_goals').select('id,title,status').eq('status', 'open').limit(5),
    supabase.from('teacher_tests').select('id,title,closes_at').gt('closes_at', new Date().toISOString()).order('closes_at').limit(5),
    supabase.from('user_preferences').select('daily_goal_minutes').maybeSingle(),
  ]);
  if (sessions.error || quizzes.error) return <Empty>We couldn’t load your dashboard right now. Please refresh.</Empty>;
  const sess = sessions.data ?? []; const q = quizzes.data ?? [];
  const totalMin = sess.reduce((a, s) => a + s.minutes, 0); const goalMin = prefs.data?.daily_goal_minutes ?? 30;
  const todayMin = sess.filter((s) => s.studied_on === today).reduce((a, s) => a + s.minutes, 0); const pct = Math.min(100, Math.round((todayMin / goalMin) * 100));
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10));
  const week = days.map((d) => ({ label: d.slice(8), value: sess.filter((s) => s.studied_on === d).reduce((a, s) => a + s.minutes, 0) }));
  const recentQ = [...q].slice(0, 10).reverse().map((a, i) => ({ label: `#${i + 1}`, value: Math.round(percent(a.score, a.total)) }));
  const subj = new Map<string, number[]>(); q.forEach((a) => { if (a.subject) subj.set(a.subject, [...(subj.get(a.subject) ?? []), percent(a.score, a.total)]); });
  const activity = [
    ...(notes.data ?? []).map((n) => ({ at: n.updated_at, icon: <FileText size={14} />, text: `Edited note “${n.title || 'Untitled'}”`, href: `/notes/${n.id}` })),
    ...q.slice(0, 5).map((a) => ({ at: a.created_at, icon: <GraduationCap size={14} />, text: `Practice quiz: ${a.score}/${a.total}${a.subject ? ` · ${a.subject}` : ''}`, href: '/performance' })),
    ...sess.filter((s) => s.studied_on >= since).slice(0, 5).map((s) => ({ at: s.studied_on, icon: <Clock size={14} />, text: `Studied ${s.minutes} min${s.subject ? ` · ${s.subject}` : ''}`, href: '/planner' })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 6);
  const st = streak(sess.map((s) => s.studied_on));

  return (
    <>
      <LiveRefresh name="dash-student" tables={['teacher_tests', 'test_results', 'class_members', 'study_goals', 'study_sessions', 'quiz_attempts']} />
      <Reveal><section className="glass card-accent relative overflow-hidden !p-6 md:!p-8">
        <div className="absolute -end-16 -top-16 h-56 w-56 rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgba(var(--glow), .35), transparent)' }} aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 max-w-xl">
            <p className="muted text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="font-display mt-1 text-3xl font-extrabold md:text-4xl">Welcome back, <span className="grad-text">{profile.display_name}</span></h1>
            <p className="muted mt-2">{messages[new Date().getDate() % messages.length]}</p>
            <div className="mt-5 flex flex-wrap gap-2"><Link href="/flashcards/practice" className="btn"><Brain size={16} />Practise cards</Link><Link href="/planner" className="btn btn-ghost"><CalendarCheck size={16} />Log study time</Link></div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing pct={pct}><p className="font-display text-2xl font-extrabold">{pct}%</p><p className="muted text-[11px]">of today’s goal</p></ProgressRing>
            <p className="muted text-sm">{todayMin} / {goalMin} min<br />studied today</p>
          </div>
        </div></section></Reveal>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Study streak" count={st} suffix={st === 1 ? ' day' : ' days'} icon={<Flame size={18} />} hint={st ? 'Keep it going!' : 'Log a session to start'} />
        <Stat label="Total study time" count={totalMin} suffix=" min" icon={<Clock size={18} />} delay={0.06} />
        <Stat label="Practice quizzes" count={q.length} icon={<GraduationCap size={18} />} delay={0.12} />
        <Stat label="Average score" icon={<Target size={18} />} delay={0.18} {...(q.length ? { count: average(q.map((a) => percent(a.score, a.total))), suffix: '%', decimals: 0 } : { value: '—' })} hint="Practice MCQs only" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Reveal><section className="card h-full"><h2 className="font-display mb-4 font-bold">Minutes studied this week</h2>
          {sess.some((s) => s.studied_on >= since) ? <Bars data={week} /> : <p className="muted">No study time logged yet. <Link className="underline" href="/planner">Log a session</Link>.</p>}</section></Reveal>
        <Reveal delay={0.08}><section className="card h-full"><h2 className="font-display mb-4 font-bold">Recent quiz performance (%)</h2>
          {recentQ.length ? <Bars data={recentQ} /> : <p className="muted">Take a practice quiz to see your results here.</p>}</section></Reveal>
      </div>

      <h2 className="font-display mb-3 mt-8 text-lg font-bold">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Reveal><Quick href="/notes" icon={<FileText size={18} />} title="New note" text="Capture an idea" a1="#8b5cf6" a2="#6366f1" glow="139,92,246" /></Reveal>
        <Reveal delay={0.05}><Quick href="/flashcards" icon={<Brain size={18} />} title="Flashcards" text={`${fCount.count ?? 0} cards`} a1="#f472b6" a2="#8b5cf6" glow="244,114,182" /></Reveal>
        <Reveal delay={0.1}><Quick href="/quizzes" icon={<GraduationCap size={18} />} title="Quiz arena" text="Practise & tests" a1="#34d399" a2="#22d3ee" glow="52,211,153" /></Reveal>
        <Reveal delay={0.15}><Quick href="/comeback" icon={<Sparkles size={18} />} title="Comeback mode" text="Your next step" a1="#fbbf24" a2="#f472b6" glow="251,146,120" /></Reveal>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Reveal><section className="card h-full"><h2 className="font-display mb-3 font-bold">Upcoming teacher tests</h2>
          {tests.data?.length ? <ul className="space-y-2">{tests.data.map((t) => <li key={t.id}><Link className="font-semibold underline" href="/quizzes">{t.title}</Link><p className="muted text-xs">closes {new Date(t.closes_at).toLocaleString()}</p></li>)}</ul> : <p className="muted">Nothing assigned right now.</p>}</section></Reveal>
        <Reveal delay={0.06}><section className="card h-full"><h2 className="font-display mb-3 font-bold">Today’s goals</h2>
          {goals.data?.length ? <ul className="space-y-1.5">{goals.data.map((g) => <li key={g.id} className="flex gap-2"><CalendarCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--a1)' }} />{g.title}</li>)}</ul> : <p className="muted">No open goals. <Link className="underline" href="/planner">Set one</Link>.</p>}</section></Reveal>
        <Reveal delay={0.12}><section className="card h-full"><h2 className="font-display mb-3 font-bold">Recent activity</h2>
          {activity.length ? <ul className="space-y-2">{activity.map((a, i) => <li key={i}><Link href={a.href} className="flex items-center gap-2 text-sm hover:underline"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={{ background: 'rgba(var(--glow), .15)' }}>{a.icon}</span><span className="min-w-0 flex-1 truncate">{a.text}</span><span className="muted text-xs">{shortDate(a.at)}</span></Link></li>)}</ul> : <p className="muted">Your activity will appear here.</p>}</section></Reveal>
      </div>

      <Reveal><section className="card mt-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Subject progress</h2><span className="muted text-sm">{qCount.count ?? 0} important questions saved</span></div>
        {subj.size ? <ul className="space-y-3">{[...subj].map(([s, v]) => <li key={s}><div className="mb-1 flex justify-between text-sm"><span>{s}</span><span className="muted">{average(v)}% · {v.length} quiz{v.length > 1 ? 'zes' : ''}</span></div><ProgressBar pct={average(v)} label={`${s} average`} /></li>)}</ul> : <p className="muted">Take a practice quiz with a subject to see progress here.</p>}</section></Reveal>
    </>
  );
}

async function TeacherDash({ name }: { name: string }) {
  const { supabase } = await requireUser('teacher');
  const [classes, tests, pending] = await Promise.all([
    supabase.from('teacher_classes').select('id', { count: 'exact', head: true }),
    supabase.from('teacher_tests').select('id,title,status', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
    supabase.from('test_results').select('attempt_id', { count: 'exact', head: true }).eq('pending_manual', true),
  ]);
  return (<>
    <LiveRefresh name="dash-teacher" tables={['test_attempts', 'test_results', 'class_members', 'teacher_tests']} />
    <Reveal><section className="glass card-accent !p-6 md:!p-8" style={{ ['--a1' as string]: '#818cf8', ['--a2' as string]: '#38bdf8', ['--glow' as string]: '129,140,248' }}>
      <h1 className="font-display text-3xl font-extrabold md:text-4xl">Welcome, <span className="grad-text">{name}</span></h1><p className="muted mt-2">Create tests, review submissions and publish results.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Link className="btn" href="/teacher/tests/new"><PlusCircle size={16} />Create test</Link><Link className="btn btn-ghost" href="/teacher/classes"><BookOpen size={16} />My classes</Link></div></section></Reveal>
    <div className="mt-6 grid grid-cols-3 gap-3"><Stat label="Classes" count={classes.count ?? 0} icon={<BookOpen size={18} />} /><Stat label="Tests" count={tests.count ?? 0} icon={<ClipboardList size={18} />} delay={0.06} /><Stat label="Awaiting grading" count={pending.count ?? 0} icon={<HelpCircle size={18} />} delay={0.12} /></div>
    <Reveal><section className="card mt-6"><h2 className="font-display mb-3 font-bold">Recent tests</h2>
      {tests.data?.length ? <ul className="space-y-2">{tests.data.map((t) => <li key={t.id} className="flex items-center justify-between"><Link className="font-semibold underline" href={`/teacher/tests/${t.id}`}>{t.title}</Link><span className="badge">{t.status}</span></li>)}</ul> : <p className="muted">No tests yet.</p>}</section></Reveal></>);
}
