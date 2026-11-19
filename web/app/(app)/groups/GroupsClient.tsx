'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Loader2, Plus, UsersRound } from 'lucide-react';
import { Empty } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { CopyButton } from '@/components/CopyButton';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { createGroup, joinGroup } from './actions';
type G = { id: string; name: string; description: string | null; join_code: string | null; owner_name: string; member_count: number; is_owner: boolean };

export function GroupsClient({ userId, initial, prefill }: { userId: string; initial: G[]; prefill?: string }) {
  const toast = useToast(); const router = useRouter(); const [groups, setGroups] = useState<G[]>(initial); const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [code, setCode] = useState(prefill ?? ''); const [busy, setBusy] = useState<string | null>(null); const t = useRef<ReturnType<typeof setTimeout>>();
  const reload = useCallback(async () => { const { data } = await supabaseBrowser().rpc('my_groups'); if (data) setGroups(data as G[]); }, []);
  useLive('groups-' + userId, [{ table: 'group_members' }, { table: 'study_groups' }], () => { clearTimeout(t.current); t.current = setTimeout(() => void reload(), 150); });
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy('create'); const tmp: G = { id: 'tmp-' + Date.now(), name: name.trim(), description: desc.trim() || null, join_code: null, owner_name: 'You', member_count: 1, is_owner: true };
    setGroups((l) => [tmp, ...l]); setOpen(false);     // appears immediately
    const r = await createGroup({ name, description: desc });
    if (!r.ok) { setGroups((l) => l.filter((g) => g.id !== tmp.id)); toast.push(r.error ?? 'Could not create group', 'error'); setOpen(true); } else { toast.push('Group created', 'success'); setName(''); setDesc(''); await reload(); }
    setBusy(null);
  }
  async function join(e: React.FormEvent) { e.preventDefault(); if (busy || !code.trim()) return; setBusy('join'); const r = await joinGroup(code); setBusy(null);
    if (!r.ok) return toast.push(r.error ?? 'Could not join', 'error'); toast.push('You joined the group', 'success'); setCode(''); await reload(); router.replace('/groups'); }
  return (
    <>
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <button className="card lift flex items-center gap-3 text-start" onClick={() => setOpen(true)}><span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, var(--a1), var(--a2))' }}><Plus size={18} /></span><span><b>Create a group</b><br /><span className="muted text-sm">Study together and share notes.</span></span></button>
        <form onSubmit={join} className="card flex items-end gap-2"><label className="flex-1 text-sm font-medium">Join with a code<input className="input mt-1 uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 7KQ2XM9A" maxLength={20} /></label><button className="btn" disabled={busy === 'join'}>{busy === 'join' ? <Loader2 size={16} className="animate-spin" /> : null}Join</button></form></div>
      {!groups.length ? <Empty icon={<UsersRound size={26} />}>You’re not in any groups yet. Create one or join with a code.</Empty> : <ul className="grid gap-3 md:grid-cols-2">{groups.map((g) => (
        <li key={g.id} className="card lift"><Link href={g.id.startsWith('tmp-') ? '#' : `/groups/${g.id}`} className="block"><p className="font-display font-bold">{g.name}</p><p className="muted line-clamp-2 text-sm">{g.description ?? 'No description'}</p>
          <p className="muted mt-2 text-xs">{g.member_count} member{g.member_count === 1 ? '' : 's'} · owner {g.owner_name}{g.is_owner && <span className="badge ms-2">Owner</span>}</p></Link>
          {g.is_owner && g.join_code && <div className="mt-3 flex items-center gap-2 text-sm"><code className="rounded bg-slate-500/20 px-2 py-1">{g.join_code}</code><CopyButton text={g.join_code} /></div>}</li>))}</ul>}
      <Modal open={open} onClose={() => setOpen(false)} title="Create a group"><form onSubmit={create} className="grid gap-2"><input className="input" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        <textarea className="input" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} /><button className="btn w-fit">Create group</button></form></Modal>
    </>
  );
}
