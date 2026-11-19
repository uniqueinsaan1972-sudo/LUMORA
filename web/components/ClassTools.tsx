'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Megaphone, RefreshCw, UserMinus } from 'lucide-react';
import { Avatar } from './Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { CopyButton } from './CopyButton';
import { Empty } from './ui';
import { useToast } from './Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { postAnnouncement, regenerateCode, removeMember } from '@/app/(app)/classes/actions';
type M = { id: string; display_name: string; username: string | null; avatar_url: string | null; joined_at: string };
export function JoinCode({ classId, code }: { classId: string; code: string }) {
  const [c, setC] = useState(code); const [busy, setBusy] = useState(false); const toast = useToast();
  return <div className="flex flex-wrap items-center gap-2"><span className="muted text-sm">Class code</span><code className="rounded bg-slate-500/20 px-2 py-1 text-base">{c}</code><CopyButton text={c} />
    <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); const r = await regenerateCode(classId); setBusy(false); if (r.ok && r.code) { setC(r.code); toast.push('New code generated. The old code no longer works.', 'success'); } else toast.push(r.error ?? 'Failed', 'error'); }}><RefreshCw size={14} />New code</button></div>;
}
export function Members({ classId, initial, canManage }: { classId: string; initial: M[]; canManage: boolean }) {
  const toast = useToast(); const [list, setList] = useState(initial); const [ask, setAsk] = useState<M | null>(null); const t = useRef<ReturnType<typeof setTimeout>>();
  const reload = useCallback(async () => { const { data } = await supabaseBrowser().rpc('class_members_list', { p_class: classId }); if (data) setList(data as M[]); }, [classId]);
  useLive('cm-' + classId, [{ table: 'class_members', filter: `class_id=eq.${classId}` }], () => { clearTimeout(t.current); t.current = setTimeout(() => void reload(), 150); });
  async function remove() { const m = ask!; setAsk(null); const prev = list; setList((l) => l.filter((x) => x.id !== m.id)); const r = await removeMember(classId, m.id); if (!r.ok) { setList(prev); toast.push(r.error ?? 'Failed', 'error'); } else toast.push(`${m.display_name} was removed`, 'success'); }
  return (<>{!list.length ? <Empty>No students yet. Share the class code so students can join.</Empty> : <ul className="grid gap-2 sm:grid-cols-2">{list.map((m) => (
    <li key={m.id} className="card flex items-center gap-3 !p-3"><Avatar name={m.display_name} url={m.avatar_url} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.display_name}</p><p className="muted truncate text-xs">@{m.username}</p></div>
      {canManage && <button className="btn btn-ghost !p-2" aria-label={`Remove ${m.display_name}`} onClick={() => setAsk(m)}><UserMinus size={14} /></button>}</li>))}</ul>}
    <ConfirmDialog open={!!ask} danger title={`Remove ${ask?.display_name}?`} body="They lose access to this class’s tests and shared material." confirmLabel="Remove" onCancel={() => setAsk(null)} onConfirm={remove} /></>);
}
export function AnnouncementForm({ classId }: { classId: string }) {
  const toast = useToast(); const router = useRouter(); const [t, setT] = useState(''); const [b, setB] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="card mb-4 grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (busy) return; setBusy(true); const r = await postAnnouncement(classId, t, b); setBusy(false); if (r.ok) { toast.push('Announcement posted and students notified', 'success'); setT(''); setB(''); router.refresh(); } else toast.push(r.error ?? 'Failed', 'error'); }}>
    <h3 className="font-display flex items-center gap-2 font-bold"><Megaphone size={16} />Post an announcement</h3><input className="input" placeholder="Title" value={t} onChange={(e) => setT(e.target.value)} maxLength={150} required /><textarea className="input" placeholder="Message to the class" value={b} onChange={(e) => setB(e.target.value)} maxLength={3000} required /><button className="btn w-fit" disabled={busy}>Post</button></form>;
}
