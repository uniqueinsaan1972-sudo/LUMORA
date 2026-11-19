'use client';
import { useState } from 'react';
import { Link2, Loader2, Mail, MessageSquare, Share2, Trash2 } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useList } from '@/lib/useList';
import { createInvite, revokeInvite } from './actions';
type Inv = { id: string; kind: string; expires_at: string; max_uses: number; uses: number; revoked: boolean; created_at: string };
type Target = { id: string; name: string };
const MSG = (link: string) => `Join me on LUMORA — where learning meets possibility! ${link}`;

export function InviteClient({ initial, classes, groups, publicId }: { initial: Inv[]; classes: Target[]; groups: Target[]; publicId: string }) {
  const toast = useToast(); const { items, mutate, setItems } = useList<Inv>(initial); const [kind, setKind] = useState<'app' | 'class' | 'group'>('app'); const [target, setTarget] = useState(''); const [days, setDays] = useState(7); const [max, setMax] = useState(10);
  const [link, setLink] = useState(''); const [busy, setBusy] = useState(false); const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  async function create() {
    if (busy) return; setBusy(true); const r = await createInvite({ kind, target: kind === 'app' ? undefined : target, days, max }); setBusy(false);
    if (!r.ok || !r.link) return toast.push(r.error ?? 'Could not create the invitation', 'error');
    setLink(r.link); toast.push('Invitation link created', 'success');
    setItems((l) => [{ id: 'tmp-' + Date.now(), kind, expires_at: new Date(Date.now() + days * 86400000).toISOString(), max_uses: max, uses: 0, revoked: false, created_at: new Date().toISOString() }, ...l]);
  }
  const open = (url: string, what: string) => { window.open(url, '_blank', 'noopener'); toast.push(`${what} opened — the invitation is only sent once you press Send there.`, 'info'); };
  async function nativeShare() { try { await navigator.share({ title: 'Join me on LUMORA', text: MSG(link) }); toast.push('Share sheet completed.', 'success'); } catch { /* user cancelled: do not claim anything was sent */ } }
  return (<>
    <section className="card mb-6 space-y-3"><h2 className="font-display font-bold">Create an invitation link</h2>
      <p className="muted text-sm">Your User ID is <code className="rounded bg-slate-500/20 px-1">{publicId}</code> — friends can also search for it directly.</p>
      <div className="grid gap-2 sm:grid-cols-4"><label className="text-sm font-medium">Invite to<select className="input mt-1" value={kind} onChange={(e) => { setKind(e.target.value as any); setTarget(''); }}><option value="app">LUMORA (as a friend)</option>{classes.length > 0 && <option value="class">One of my classes</option>}{groups.length > 0 && <option value="group">One of my groups</option>}</select></label>
        {kind !== 'app' && <label className="text-sm font-medium">Which<select className="input mt-1" value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Choose…</option>{(kind === 'class' ? classes : groups).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
        <label className="text-sm font-medium">Expires in<select className="input mt-1" value={days} onChange={(e) => setDays(+e.target.value)}>{[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}</select></label>
        <label className="text-sm font-medium">Max uses<input className="input mt-1" type="number" min={1} max={1000} value={max} onChange={(e) => setMax(Math.max(1, Math.min(1000, +e.target.value || 1)))} /></label></div>
      <button className="btn" onClick={create} disabled={busy || (kind !== 'app' && !target)}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}Generate link</button>
      {link && <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-strong)' }}><p className="muted mb-2 text-xs">Copy it now — for security the full link can’t be shown again.</p><code className="block break-all rounded bg-slate-500/20 p-2 text-sm">{link}</code>
        <div className="mt-3 flex flex-wrap gap-2"><CopyButton text={link} label="Copy link" />
          <button className="btn btn-ghost" onClick={() => open(`https://wa.me/?text=${encodeURIComponent(MSG(link))}`, 'WhatsApp')}>WhatsApp</button>
          <button className="btn btn-ghost" onClick={() => open(`sms:?&body=${encodeURIComponent(MSG(link))}`, 'Messages')}><MessageSquare size={14} />SMS</button>
          <button className="btn btn-ghost" onClick={() => open(`mailto:?subject=${encodeURIComponent('Join me on LUMORA')}&body=${encodeURIComponent(MSG(link))}`, 'Your email app')}><Mail size={14} />Email</button>
          {canShare && <button className="btn btn-ghost" onClick={nativeShare}><Share2 size={14} />Share…</button>}</div></div>}</section>
    <h2 className="font-display mb-2 font-bold">Your invitations</h2>
    {!items.length ? <Empty>No invitations yet.</Empty> : <ul className="space-y-2">{items.map((i) => { const expired = new Date(i.expires_at) < new Date(); const state = i.revoked ? 'Revoked' : expired ? 'Expired' : i.uses >= i.max_uses ? 'Used up' : 'Active';
      return (<li key={i.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3"><span className="text-sm"><b className="capitalize">{i.kind}</b> invitation <span className={`badge ms-1 ${state === 'Active' ? 'text-emerald-300' : 'muted'}`}>{state}</span><br />
        <span className="muted text-xs">{i.uses}/{i.max_uses} used · expires {new Date(i.expires_at).toLocaleDateString()}</span></span>
        {state === 'Active' && !i.id.startsWith('tmp-') && <button className="btn btn-ghost" onClick={() => mutate({ key: i.id, apply: (l) => l.map((x) => (x.id === i.id ? { ...x, revoked: true } : x)), run: () => revokeInvite(i.id), success: 'Invitation revoked' })}><Trash2 size={14} />Revoke</button>}</li>); })}</ul>}
    <p className="muted mt-4 text-xs">We only show how many people used an invitation — never who they are.</p></>);
}
