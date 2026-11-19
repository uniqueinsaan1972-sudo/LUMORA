'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flag, MessageCircle, Search, UserMinus, UserPlus, X, Ban } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Dropdown } from '@/components/Dropdown';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { usePresence } from '@/lib/usePresence';
import { blockUser, cancelRequest, removeFriend, reportUser, respondRequest, sendFriendRequest, unblockUser } from './actions';

type Friend = { id: string; display_name: string; username: string | null; public_id: string; avatar_url: string | null; show_online: boolean };
type In = { id: string; from_id: string; from_name: string; username: string | null; avatar_url: string | null };
type Out = { id: string; to_id: string; to_name: string; username: string | null; avatar_url: string | null };
type Blocked = { id: string; display_name: string; username: string | null };
type Found = { id: string; display_name: string; username: string | null; public_id: string; avatar_url: string | null; role: string; relation: 'friend' | 'pending_out' | 'pending_in' | 'none' };
type Init = { friends: Friend[]; incoming: In[]; outgoing: Out[]; blocked: Blocked[] };

export function FriendsClient({ me, init }: { me: { id: string; showOnline: boolean; discoverable: boolean }; init: Init }) {
  const toast = useToast(); const [d, setD] = useState<Init>(init); const [q, setQ] = useState(''); const [found, setFound] = useState<Found[] | null>(null); const [searching, setSearching] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'block'; f: Friend } | null>(null); const [report, setReport] = useState<Friend | null>(null); const [reason, setReason] = useState(''); const busy = useRef(new Set<string>());
  const online = usePresence(me.id, me.showOnline);
  const reload = useCallback(async () => {
    const sb = supabaseBrowser(); const [f, i, o, b] = await Promise.all([sb.rpc('list_friends'), sb.rpc('list_incoming_requests'), sb.rpc('list_outgoing_requests'), sb.rpc('list_blocked')]);
    if (!f.error) setD({ friends: (f.data ?? []) as Friend[], incoming: (i.data ?? []) as In[], outgoing: (o.data ?? []) as Out[], blocked: (b.data ?? []) as Blocked[] });
  }, []);
  const tick = useRef<ReturnType<typeof setTimeout>>(); const soon = () => { clearTimeout(tick.current); tick.current = setTimeout(() => void reload(), 150); };
  useLive('friends-live-' + me.id, [{ table: 'friend_requests' }, { table: 'friendships' }, { table: 'blocks' }], soon);   // the OTHER person's action shows up instantly too

  useEffect(() => {
    const v = q.trim(); if (v.length < 3) { setFound(null); return; } setSearching(true); let live = true;
    const h = setTimeout(async () => { const { data } = await supabaseBrowser().rpc('search_users', { q: v }); if (live) { setFound((data ?? []) as Found[]); setSearching(false); } }, 350);
    return () => { live = false; clearTimeout(h); };
  }, [q]);

  // generic optimistic runner: guard duplicates, apply instantly, roll back by reloading truth on failure
  async function act(key: string, apply: () => void, run: () => Promise<{ ok: boolean; error?: string }>, ok?: string) {
    if (busy.current.has(key)) return; busy.current.add(key); apply();
    try { const r = await run(); if (!r.ok) { toast.push(r.error ?? 'That did not work.', 'error'); await reload(); } else if (ok) toast.push(ok, 'success'); } catch { toast.push('Network problem — please try again.', 'error'); await reload(); } finally { busy.current.delete(key); }
  }
  const markRel = (id: string, relation: Found['relation']) => setFound((l) => l?.map((x) => (x.id === id ? { ...x, relation } : x)) ?? null);
  const add = (u: Found) => act('add' + u.id, () => markRel(u.id, 'pending_out'), async () => { const r = await sendFriendRequest(u.id); if (!r.ok) markRel(u.id, 'none'); else void reload(); return r; }, 'Friend request sent');
  const accept = (r: In) => act('acc' + r.id, () => setD((s) => ({ ...s, incoming: s.incoming.filter((x) => x.id !== r.id), friends: [...s.friends, { id: r.from_id, display_name: r.from_name, username: r.username, public_id: '', avatar_url: r.avatar_url, show_online: true }] })), () => respondRequest(r.id, true), `You and ${r.from_name} are now friends`);
  const reject = (r: In) => act('rej' + r.id, () => setD((s) => ({ ...s, incoming: s.incoming.filter((x) => x.id !== r.id) })), () => respondRequest(r.id, false), 'Request declined');
  const cancel = (r: Out) => act('can' + r.id, () => setD((s) => ({ ...s, outgoing: s.outgoing.filter((x) => x.id !== r.id) })), () => cancelRequest(r.id), 'Request cancelled');
  const unblock = (b: Blocked) => act('unb' + b.id, () => setD((s) => ({ ...s, blocked: s.blocked.filter((x) => x.id !== b.id) })), () => unblockUser(b.id), 'User unblocked');
  const doConfirm = () => { const c = confirm!; setConfirm(null);
    if (c.kind === 'remove') void act('rm' + c.f.id, () => setD((s) => ({ ...s, friends: s.friends.filter((x) => x.id !== c.f.id) })), () => removeFriend(c.f.id), 'Friend removed');
    else void act('bl' + c.f.id, () => setD((s) => ({ ...s, friends: s.friends.filter((x) => x.id !== c.f.id), blocked: [...s.blocked, { id: c.f.id, display_name: c.f.display_name, username: c.f.username }] })), () => blockUser(c.f.id), 'User blocked'); };
  async function sendReport() { const f = report!; const r = await reportUser(f.id, reason); if (r.ok) { toast.push('Report sent. Thank you.', 'success'); setReport(null); setReason(''); } else toast.push(r.error ?? 'Could not send', 'error'); }

  return (
    <>
      {!me.discoverable && <p className="card muted mb-4 text-sm">Others can’t find you right now. Turn on “Let others find me” in Settings to receive friend requests.</p>}
      <div className="relative mb-2"><Search size={16} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" /><input className="input ps-10" placeholder="Search by username or User ID (e.g. LUM-ABC12345)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></div>
      {searching && <div className="skeleton mb-3 h-14" aria-hidden />}
      {found && !searching && (found.length ? <ul className="mb-6 space-y-2">{found.map((u) => (
        <li key={u.id} className="card flex items-center gap-3 !p-3"><Avatar name={u.display_name} url={u.avatar_url} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.display_name} <span className="badge ms-1 capitalize">{u.role}</span></p><p className="muted truncate text-xs">@{u.username} · {u.public_id}</p></div>
          {u.relation === 'none' && <button className="btn" onClick={() => add(u)}><UserPlus size={14} />Add</button>}{u.relation === 'pending_out' && <span className="badge">Request sent</span>}{u.relation === 'pending_in' && <span className="badge">Wants to connect — see below</span>}{u.relation === 'friend' && <span className="badge">Friends</span>}</li>))}</ul>
        : <p className="muted mb-6 text-sm">No matching public profiles.</p>)}
      {!!d.incoming.length && <section className="mb-6"><h2 className="font-display mb-2 font-bold">Friend requests <span className="badge">{d.incoming.length}</span></h2><ul className="space-y-2">{d.incoming.map((r) => (
        <li key={r.id} className="card flex items-center gap-3 !p-3"><Avatar name={r.from_name} url={r.avatar_url} /><span className="min-w-0 flex-1 truncate font-semibold">{r.from_name}</span>
          <button className="btn" onClick={() => accept(r)}><Check size={14} />Accept</button><button className="btn btn-ghost" onClick={() => reject(r)}><X size={14} />Reject</button></li>))}</ul></section>}
      {!!d.outgoing.length && <section className="mb-6"><h2 className="font-display mb-2 font-bold">Sent requests</h2><ul className="space-y-2">{d.outgoing.map((r) => (
        <li key={r.id} className="card flex items-center gap-3 !p-3"><Avatar name={r.to_name} url={r.avatar_url} /><span className="min-w-0 flex-1 truncate">{r.to_name} <span className="muted text-xs">· pending</span></span><button className="btn btn-ghost" onClick={() => cancel(r)}>Cancel</button></li>))}</ul></section>}
      <h2 className="font-display mb-2 font-bold">Friends <span className="badge">{d.friends.length}</span></h2>
      {!d.friends.length ? <Empty icon={<UserPlus size={26} />}>No friends yet. Search above or invite people from the Invite page.</Empty> : <ul className="space-y-2">{d.friends.map((f) => (
        <li key={f.id} className="card flex items-center gap-3 !p-3"><Avatar name={f.display_name} url={f.avatar_url} online={f.show_online && me.showOnline ? online.has(f.id) : undefined} />
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{f.display_name}</p><p className="muted truncate text-xs">@{f.username}{f.show_online && me.showOnline && online.has(f.id) ? ' · online' : ''}</p></div>
          <Link className="btn btn-ghost" href={`/messages?with=${f.id}`}><MessageCircle size={14} />Message</Link>
          <Dropdown items={[{ label: 'Remove friend', icon: <UserMinus size={14} />, onSelect: () => setConfirm({ kind: 'remove', f }) }, { label: 'Block', icon: <Ban size={14} />, danger: true, onSelect: () => setConfirm({ kind: 'block', f }) }, { label: 'Report', icon: <Flag size={14} />, onSelect: () => setReport(f) }]} /></li>))}</ul>}
      {!!d.blocked.length && <details className="card mt-6"><summary className="font-semibold">Blocked users ({d.blocked.length})</summary><ul className="mt-2 space-y-1">{d.blocked.map((b) => <li key={b.id} className="flex items-center justify-between"><span>{b.display_name}</span><button className="btn btn-ghost" onClick={() => unblock(b)}>Unblock</button></li>)}</ul></details>}
      <ConfirmDialog open={!!confirm} danger={confirm?.kind === 'block'} title={confirm?.kind === 'block' ? `Block ${confirm.f.display_name}?` : `Remove ${confirm?.f.display_name}?`} body={confirm?.kind === 'block' ? 'They will no longer be able to find, message or add you, and your conversation will close.' : 'You will no longer be friends. Your conversation will close.'} confirmLabel={confirm?.kind === 'block' ? 'Block' : 'Remove'} onCancel={() => setConfirm(null)} onConfirm={doConfirm} />
      <Modal open={!!report} onClose={() => setReport(null)} title={`Report ${report?.display_name ?? ''}`}><p className="muted mb-3 text-sm">Tell us what happened. Reports are reviewed by moderators and never shown to the other person.</p>
        <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Describe the problem…" /><button className="btn mt-3" onClick={sendReport}>Send report</button></Modal>
    </>
  );
}
