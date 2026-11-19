'use client';
import { useEffect, useState } from 'react';
import { Trash2, UserRound, UsersRound, BookOpen } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { revokeShare, shareNote } from '../actions';
type Share = { id: string; target_type: 'user' | 'group' | 'class'; target_id: string; permission: 'view' | 'edit' };
type Opt = { id: string; name: string };

export function ShareDialog({ noteId, open, onClose }: { noteId: string; open: boolean; onClose: () => void }) {
  const toast = useToast(); const [tab, setTab] = useState<'user' | 'group' | 'class'>('user'); const [perm, setPerm] = useState<'view' | 'edit'>('view'); const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<Record<'user' | 'group' | 'class', Opt[]>>({ user: [], group: [], class: [] }); const [shares, setShares] = useState<Share[]>([]); const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open) return; let live = true; const sb = supabaseBrowser();
    (async () => {
      const [f, g, c, s] = await Promise.all([sb.rpc('list_friends'), sb.rpc('my_groups'), sb.rpc('my_classes'), sb.from('note_shares').select('id,target_type,target_id,permission').eq('note_id', noteId)]);
      if (!live) return;
      setOpts({ user: (f.data ?? []).map((x: any) => ({ id: x.id, name: x.display_name })), group: (g.data ?? []).map((x: any) => ({ id: x.id, name: x.name })), class: (c.data ?? []).filter((x: any) => x.is_teacher).map((x: any) => ({ id: x.id, name: x.name })) });
      setShares((s.data ?? []) as Share[]); setLoaded(true);
    })(); return () => { live = false; };
  }, [open, noteId]);
  const nameOf = (s: Share) => opts[s.target_type].find((o) => o.id === s.target_id)?.name ?? 'Unknown';
  async function share(target: string) {
    if (busy) return; setBusy(true); const r = await shareNote(noteId, tab, target, perm);
    if (!r.ok) toast.push(r.error ?? 'Could not share', 'error');
    else { toast.push(`Shared (${perm === 'edit' ? 'can edit' : 'view only'})`, 'success'); setShares((l) => [...l.filter((x) => !(x.target_type === tab && x.target_id === target)), { id: 'tmp' + target, target_type: tab, target_id: target, permission: perm }]);
      const { data } = await supabaseBrowser().from('note_shares').select('id,target_type,target_id,permission').eq('note_id', noteId); setShares((data ?? []) as Share[]); }
    setBusy(false);
  }
  async function revoke(s: Share) { const prev = shares; setShares((l) => l.filter((x) => x.id !== s.id)); const r = await revokeShare(s.id); if (!r.ok) { setShares(prev); toast.push(r.error ?? 'Could not revoke', 'error'); } else toast.push('Access revoked', 'success'); }
  const tabs = [['user', 'Friends', UserRound], ['group', 'Groups', UsersRound], ['class', 'Classes', BookOpen]] as const;
  return (
    <Modal open={open} onClose={onClose} title="Share this note" wide>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist">{tabs.map(([k, l, I]) => <button key={k} role="tab" aria-selected={tab === k} className={`btn ${tab === k ? '' : 'btn-ghost'}`} onClick={() => setTab(k)}><I size={14} />{l}</button>)}
        <label className="ms-auto flex items-center gap-2 text-sm">Permission<select className="input !w-auto" value={perm} onChange={(e) => setPerm(e.target.value as 'view' | 'edit')}><option value="view">Can view</option><option value="edit">Can edit</option></select></label></div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pe-1">{!loaded ? <div className="skeleton h-16" /> : opts[tab].length ? opts[tab].map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-xl border p-2.5" style={{ borderColor: 'var(--border)' }}><span className="truncate">{o.name}</span><button className="btn" disabled={busy} onClick={() => share(o.id)}>Share</button></div>))
        : <p className="muted text-sm">{tab === 'user' ? 'Add friends first to share with them.' : tab === 'group' ? 'Join or create a group to share with it.' : 'Only teachers can share to a class, and you have no classes yet.'}</p>}</div>
      <h3 className="mb-2 mt-5 text-sm font-semibold">People &amp; groups with access</h3>
      {shares.length ? <ul className="space-y-1.5">{shares.map((s) => <li key={s.id} className="flex items-center justify-between rounded-xl border p-2.5 text-sm" style={{ borderColor: 'var(--border)' }}><span className="truncate">{nameOf(s)} <span className="badge ms-1">{s.target_type}</span> <span className="muted">· {s.permission === 'edit' ? 'can edit' : 'view only'}</span></span>
        <button className="btn btn-ghost !p-2" onClick={() => revoke(s)} aria-label={`Revoke access for ${nameOf(s)}`}><Trash2 size={14} /></button></li>)}</ul> : <p className="muted text-sm">Not shared with anyone.</p>}
    </Modal>
  );
}
