'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Rocket } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import { ProgressBar } from './ui';
import { completeOnboarding } from '@/app/onboarding/actions';

function Finish() { const { pending } = useFormStatus(); return <button className="btn" disabled={pending}>{pending ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}Finish &amp; open LUMORA</button>; }
const Toggle = ({ name, label, hint, def }: { name: string; label: string; hint: string; def: boolean }) => (
  <label className="option !items-start"><input type="checkbox" name={name} defaultChecked={def} className="!static !opacity-100 mt-1 !pointer-events-auto" /><span><span className="font-semibold">{label}</span><br /><span className="muted text-xs">{hint}</span></span></label>);

export function Onboarding({ role, userId, name, needsUsername }: { role: 'student' | 'teacher'; userId: string; name: string; needsUsername: boolean }) {
  const [state, action] = useFormState(completeOnboarding, undefined); const [step, setStep] = useState(0); const teacher = role === 'teacher';
  const titles = teacher ? ['Your profile', 'What you teach', 'Privacy & first class'] : ['Your profile', 'Your study goals', 'Privacy'];
  return (
    <form action={action} className="space-y-5">
      <div><p className="muted text-sm">Step {step + 1} of 3 · {teacher ? 'Teacher' : 'Student'} setup</p><ProgressBar pct={((step + 1) / 3) * 100} label="Setup progress" /><h1 className="font-display mt-3 text-2xl font-extrabold">{titles[step]}</h1></div>
      <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div hidden={step !== 0} className="space-y-4"><AvatarUpload userId={userId} name={name} />
          {needsUsername && <label className="block text-sm font-medium">Choose a username<input className="input mt-1" name="username" pattern="[a-z0-9_]{3,24}" placeholder="letters, numbers, _" required /></label>}
          <div className="grid gap-3 sm:grid-cols-2">{!teacher && <label className="block text-sm font-medium">Class / grade<input className="input mt-1" name="grade" maxLength={40} placeholder="e.g. Grade 9" /></label>}
            <label className={`block text-sm font-medium ${teacher ? 'sm:col-span-2' : ''}`}>{teacher ? 'School / institution' : 'School or college (optional)'}<input className="input mt-1" name="school" maxLength={120} /></label></div></div>
        <div hidden={step !== 1} className="space-y-4"><label className="block text-sm font-medium">{teacher ? 'Subjects you teach' : 'Subjects you study'} (comma separated)<input className="input mt-1" name="subjects" placeholder="Math, Physics, English" /></label>
          {!teacher && <label className="block text-sm font-medium">Daily study goal (minutes)<input className="input mt-1" type="number" name="daily_goal_minutes" min={5} max={600} defaultValue={30} /></label>}</div>
        <div hidden={step !== 2} className="space-y-3"><Toggle name="discoverable" def label="Let others find me" hint="By username or User ID. Only your name, username and photo are shown." />
          <Toggle name="show_online" def label="Show when I’m online" hint="Only friends can see this." />
          {!teacher && <Toggle name="show_on_leaderboard" def label="Appear on class leaderboards" hint="Only published, fully-graded test results are ranked." />}
          {teacher && <label className="block text-sm font-medium">Create your first class (optional)<input className="input mt-1" name="class_name" maxLength={120} placeholder="e.g. Grade 9 Physics" /></label>}</div>
      </motion.div></AnimatePresence>
      {state?.error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
      <div className="flex justify-between gap-2"><button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} className="rtl:rotate-180" />Back</button>
        {step < 2 ? <button type="button" className="btn" onClick={() => setStep(step + 1)}>Next<ArrowRight size={16} className="rtl:rotate-180" /></button> : <Finish />}</div>
    </form>
  );
}
