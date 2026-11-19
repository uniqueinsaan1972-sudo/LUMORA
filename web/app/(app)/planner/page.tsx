import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { streak } from '@/lib/scoring';
import { CalendarCheck } from 'lucide-react';
import { Empty, PageTitle, Stat } from '@/components/ui';
async function addGoal(fd: FormData) {
  'use server';
  const title = String(fd.get('title') ?? '').trim().slice(0, 200); if (!title) return;
  const kind = ['daily', 'weekly', 'subject', 'exam'].includes(String(fd.get('kind'))) ? String(fd.get('kind')) : 'daily';
  const due = String(fd.get('due') ?? '') || null;
  const { supabase, user } = await requireUser(); await supabase.from('study_goals').insert({ owner_id: user.id, title, kind, subject: String(fd.get('subject') ?? '').slice(0, 80) || null, due_date: due });
  revalidatePath('/planner');
}
async function setGoal(id: string, status: string) { 'use server'; if (!['open', 'done', 'missed'].includes(status)) return; const { supabase } = await requireUser(); await supabase.from('study_goals').update({ status }).eq('id', id); revalidatePath('/planner'); }
async function delGoal(id: string) { 'use server'; const { supabase } = await requireUser(); await supabase.from('study_goals').delete().eq('id', id); revalidatePath('/planner'); }
async function logSession(fd: FormData) {
  'use server';
  const minutes = Math.floor(Number(fd.get('minutes'))); if (!(minutes >= 1 && minutes <= 1440)) return;
  const { supabase, user } = await requireUser(); await supabase.from('study_sessions').insert({ owner_id: user.id, minutes, subject: String(fd.get('subject') ?? '').slice(0, 80) || null }); revalidatePath('/planner');
}
export default async function Planner() {
  const { supabase } = await requireUser();
  const [{ data: goals }, { data: sess }] = await Promise.all([supabase.from('study_goals').select('*').order('created_at', { ascending: false }).limit(100), supabase.from('study_sessions').select('minutes,studied_on')]);
  const open = (goals ?? []).filter((g) => g.status === 'open'); const done = (goals ?? []).filter((g) => g.status === 'done').length; const missed = (goals ?? []).filter((g) => g.status === 'missed').length;
  const exams = (goals ?? []).filter((g) => g.kind === 'exam' && g.due_date && g.status === 'open');
  return (<><PageTitle icon={<CalendarCheck size={22} />} sub="Missed a goal? No pressure — mark it and start fresh.">Study Planner</PageTitle>
    <div className="mb-4 grid grid-cols-3 gap-3"><Stat label="Streak" value={`${streak((sess ?? []).map((s) => s.studied_on))} days`} /><Stat label="Goals done" value={done} /><Stat label="Missed (restart anytime)" value={missed} /></div>
    <div className="grid gap-4 md:grid-cols-2">
      <form action={addGoal} className="card grid gap-2"><h2 className="font-semibold">New goal</h2><input className="input" name="title" placeholder="e.g. Finish Chapter 3 notes" required />
        <select className="input" name="kind"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="subject">Subject target</option><option value="exam">Exam date</option></select>
        <input className="input" name="subject" placeholder="Subject (optional)" /><label className="text-sm">Date (optional)<input className="input" type="date" name="due" /></label><button className="btn w-fit">Add</button></form>
      <form action={logSession} className="card grid gap-2"><h2 className="font-semibold">Log a study session</h2><input className="input" name="minutes" type="number" min={1} max={1440} placeholder="Minutes" required /><input className="input" name="subject" placeholder="Subject (optional)" /><button className="btn w-fit">Log</button></form></div>
    {exams.length > 0 && <p className="muted mt-4 text-sm">Upcoming exams: {exams.map((e) => `${e.title} (${e.due_date})`).join(', ')}</p>}
    <h2 className="mb-2 mt-6 font-semibold">Goals</h2>
    {!goals?.length ? <Empty>No goals yet.</Empty> : <ul className="space-y-2">{goals.map((g) => (<li key={g.id} className="card flex flex-wrap items-center justify-between gap-2"><span className={g.status === 'done' ? 'line-through' : ''}>{g.title} <span className="muted text-xs">{g.kind}{g.due_date && ` · ${g.due_date}`} · {g.status}</span></span>
      <span className="flex gap-1">{g.status !== 'done' && <form action={setGoal.bind(null, g.id, 'done')}><button className="btn btn-ghost">Done</button></form>}{g.status === 'open' && <form action={setGoal.bind(null, g.id, 'missed')}><button className="btn btn-ghost">Missed</button></form>}
        {g.status === 'missed' && <form action={setGoal.bind(null, g.id, 'open')}><button className="btn btn-ghost">Restart</button></form>}<form action={delGoal.bind(null, g.id)}><button className="btn btn-ghost">Delete</button></form></span></li>))}</ul>}</>);
}
