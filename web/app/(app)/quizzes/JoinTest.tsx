'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { joinTestByCode } from './actions';
export function JoinTest() {
  const toast = useToast(); const router = useRouter(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="card flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (busy || !code.trim()) return; setBusy(true); const r = await joinTestByCode(code); setBusy(false);
    if (!r.ok) return toast.push(r.error ?? 'Could not join', 'error'); toast.push('Test added to your list', 'success'); setCode(''); router.refresh(); }}>
    <label className="min-w-0 flex-1 text-sm font-medium">Have a test code?<input className="input mt-1 uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 7KQ2XM9A" maxLength={20} /></label>
    <button className="btn" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}Join test</button></form>;
}
