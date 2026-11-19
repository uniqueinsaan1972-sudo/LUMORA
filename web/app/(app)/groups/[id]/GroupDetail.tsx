'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { LogOut, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { CopyButton } from '@/components/CopyButton';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { deleteGroup, inviteToGroup, leaveGroup } from '../actions';
type M = { id: string; display_name: string; username: string | null; avatar_url: string | null; is_owner: boolean };
type F = { id: string; display_name: string };
export function GroupDetail({ groupId, meId, isOwner, joinCode, initial, friends }: { groupId: string; meId: string; isOwner: boolean; joinCode: string | null; initial: M[]; friends: F[] }) {
  const toast = useToast(); const router = useRouter(); const [members, setMembers] = useState(initial); const [ask, setAsk] = useState<'leave' | 'delete' | M | null>(null); const [inv, setInv] = useState(false); const t = useRef<ReturnType<typeof setTimeout>>();
  const reload = useCallback(async () => { const { data } = await supabaseBrowser().rpc('group_members_list', { p_group: groupId }); if (data) setMembers(data as M[]); }, [groupId]);
  useLive('group-' + groupId, [{ table: 'group_members', filter: `group_id=eq.${groupId}` }], () => { clearTimeout(t.current); t.current = setTimeout(() => void reload(), 150); });
  const invitable = friends.filter((f) => !members.some((m) => m.id === f.id));
  async function confirm() {
    const a = ask; setAsk(null); if (!a) return;
    if (a === 'delete') { const r = await deleteGroup(groupId); if (r.ok) { toast.push('Group deleted', 'success'); router.push('/groups'); } else toast.push(r.error ?? 'Failed', 'error'); return; }
    const target = a === 'leave' ? meId : (a as M).id; const prev = members; setMembers((l) => l.filter((m) => m.id !== target));   // instant
    const r = await leaveGroup(groupId, target); if (!r.ok) { setMembers(prev); toast.push(r.error ?? 'Failed', 'error'); } else if (a === 'leave') { toast.push('You left the group', 'success'); router.push('/groups'); } else toast.push('Member removed', 'success');
  }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {isOwner && joinCode && <><code className="rounded bg-slate-500/20 px-2 py-1">{joinCode}</code><CopyButton text={joinCode} label="Copy code" /><button className="btn btn-ghost" onClick={() => setInv(true)}><UserPlus size={14} />Invite a friend</button><Link className="btn btn-ghost" href="/invite">Invite link</Link></>}
        <span className="ms-auto flex gap-2">{isOwner ? <button className="btn btn-ghost" onClick={() => setAsk('delete')}><Trash2 size={14} />Delete group</button> : <button className="btn btn-ghost" onClick={() => setAsk('leave')}><LogOut size={14} />Leave</button>}</span></div>
      <ul className="space-y-2">{members.map((m) => (<li key={m.id} className="card flex items-center gap-3 !p-3"><Avatar name={m.display_name} url={m.avatar_url} /><span className="min-w-0 flex-1 truncate font-semibold">{m.display_name}{m.id === meId && ' (you)'} {m.is_owner && <span className="badge ms-1">Owner</span>}</span>
        {isOwner && !m.is_owner && <button className="btn btn-ghost !p-2" aria-label={`Remove ${m.display_name}`} onClick={() => setAsk(m)}><UserMinus size={14} /></button>}</li>))}</ul>
      <ConfirmDialog open={!!ask} danger title={ask === 'delete' ? 'Delete this group?' : ask === 'leave' ? 'Leave this group?' : `Remove ${(ask as M | null)?.display_name}?`} body={ask === 'delete' ? 'All members lose access to group sharing. This can’t be undone.' : undefined} confirmLabel={ask === 'delete' ? 'Delete' : ask === 'leave' ? 'Leave' : 'Remove'} onCancel={() => setAsk(null)} onConfirm={confirm} />
      <Modal open={inv} onClose={() => setInv(false)} title="Invite a friend"><p className="muted mb-3 text-sm">They’ll get a notification with a link to join.</p>
        {invitable.length ? <ul className="space-y-1.5">{invitable.map((f) => <li key={f.id} className="flex items-center justify-between rounded-xl border p-2.5" style={{ borderColor: 'var(--border)' }}><span>{f.display_name}</span>
          <button className="btn" onClick={async () => { const r = await inviteToGroup(groupId, f.id); toast.push(r.ok ? `Invitation sent to ${f.display_name}` : r.error ?? 'Failed', r.ok ? 'success' : 'error'); }}>Invite</button></li>)}</ul> : <p className="muted text-sm">All your friends are already members (or you have no friends yet).</p>}</Modal>
    </>
  );
}
