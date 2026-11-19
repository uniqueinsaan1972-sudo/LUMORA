'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, GraduationCap, Presentation, X, Loader2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { passwordStrength } from '@/lib/password';
import { checkUsername, register } from '@/app/(auth)/actions';

function Submit() { const { pending } = useFormStatus(); return <button className="btn w-full !py-3" disabled={pending}>{pending ? <><Loader2 size={16} className="animate-spin" />Creating account…</> : 'Create account'}</button>; }
const Err = ({ m }: { m?: string }) => (m ? <p role="alert" className="mt-1 text-xs text-red-400">{m}</p> : null);

export function RegisterForm() {
  const [state, action] = useFormState(register, undefined);
  const [role, setRole] = useState<'student' | 'teacher'>('student'); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [uname, setUname] = useState('');
  const [uState, setUState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle'); const s = passwordStrength(pw); const fe = state?.fieldErrors ?? {};
  useEffect(() => {
    const v = uname.trim().toLowerCase(); if (!v) { setUState('idle'); return; } if (!/^[a-z0-9_]{3,24}$/.test(v)) { setUState('invalid'); return; }
    setUState('checking'); let live = true; const h = setTimeout(async () => { const r = await checkUsername(v); if (live) setUState(r.available ? 'ok' : 'taken'); }, 400);
    return () => { live = false; clearTimeout(h); };
  }, [uname]);
  const bar = ['bg-red-500', 'bg-red-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'][s.score];
  return (
    <form action={action} className="space-y-4" noValidate>
      <fieldset><legend className="mb-2 text-sm font-medium">I am a…</legend>
        <div className="grid grid-cols-2 gap-2">{([['student', 'Student', GraduationCap], ['teacher', 'Teacher', Presentation]] as const).map(([v, label, Icon]) => (
          <label key={v} className="option !flex-col !items-start" data-selected={role === v}><input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} /><Icon size={20} style={{ color: 'var(--a1)' }} /><span className="font-semibold">{label}</span>
            <span className="muted text-xs">{v === 'student' ? 'Notes, practice, tests' : 'Classes, tests, grading'}</span></label>))}</div></fieldset>
      <div><label className="block text-sm font-medium" htmlFor="rn">Full name</label><input id="rn" className="input mt-1" name="display_name" autoComplete="name" required maxLength={80} /><Err m={fe.display_name} /></div>
      <div><label className="block text-sm font-medium" htmlFor="ru">Username</label>
        <div className="relative"><input id="ru" className="input mt-1 pe-10" name="username" autoComplete="username" value={uname} onChange={(e) => setUname(e.target.value)} maxLength={24} placeholder="e.g. ayesha_k" required />
          <span className="absolute end-3 top-1/2 mt-0.5 -translate-y-1/2" aria-hidden>{uState === 'checking' ? <Loader2 size={16} className="animate-spin muted" /> : uState === 'ok' ? <Check size={16} className="text-emerald-400" /> : uState === 'taken' || uState === 'invalid' ? <X size={16} className="text-red-400" /> : null}</span></div>
        <p className="muted mt-1 text-xs" role="status">{uState === 'ok' ? 'Username is available' : uState === 'taken' ? 'Already taken — try another' : uState === 'invalid' ? '3–24 letters, numbers or underscores' : 'Friends can find you by this username. A unique User ID is generated for you automatically.'}</p><Err m={fe.username} /></div>
      <div><label className="block text-sm font-medium" htmlFor="re">Email</label><input id="re" className="input mt-1" name="email" type="email" autoComplete="email" required /><Err m={fe.email} /></div>
      <div><label className="block text-sm font-medium" htmlFor="rp">Password</label><PasswordInput id="rp" name="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <div className="mt-2 flex gap-1" aria-hidden>{[1, 2, 3, 4].map((i) => <motion.span key={i} className={`h-1.5 flex-1 rounded-full ${i <= s.score ? bar : 'bg-[color:var(--border-strong)]'}`} initial={false} animate={{ scaleY: i <= s.score ? 1 : 0.7 }} />)}</div>
        <p className="muted mt-1 text-xs" role="status">{pw ? `${s.label}${s.hints[0] ? ' — ' + s.hints[0] : ''}` : 'At least 10 characters'}</p><Err m={fe.password} /></div>
      <div><label className="block text-sm font-medium" htmlFor="rc">Confirm password</label><PasswordInput id="rc" name="confirm" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        {pw2 && pw !== pw2 && <p className="mt-1 text-xs text-red-400">Passwords do not match</p>}<Err m={fe.confirm} /></div>
      {role === 'teacher' && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><label className="block text-sm font-medium" htmlFor="rt">Teacher invite code <span className="muted">(optional — gives a “verified” badge)</span></label><input id="rt" className="input mt-1" name="teacher_code" autoComplete="off" /></motion.div>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="mt-1" required /><span>I agree to the <Link className="underline" href="/terms" target="_blank">Terms</Link> and <Link className="underline" href="/privacy" target="_blank">Privacy Policy</Link>.</span></label><Err m={fe.terms} />
      <p className="muted text-xs">You can add a profile picture in the next step, after verifying your email.</p>
      {state?.error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
      {state?.message && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{state.message}</p>}
      <Submit />
    </form>
  );
}
