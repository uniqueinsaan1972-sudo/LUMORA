'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bell, CheckCheck, FileText, GraduationCap, Megaphone, MessageCircle, Trophy, UserPlus, Users } from 'lucide-react';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
type N = { id: string; kind: string; message: string; link: string | null; read: boolean; created_at: string };
const icon = (k: string) => (k.startsWith('friend') || k === 'invite_used' ? <UserPlus size={16} /> : k === 'message' ? <MessageCircle size={16} /> : k === 'results' ? <Trophy size={16} /> : k.includes('test') ? <GraduationCap size={16} /> : k === 'note_shared' ? <FileText size={16} /> : k === 'announcement' ? <Megaphone size={16} /> : k.startsWith('group') || k.startsWith('class') ? <Users size={16} /> : <Bell size={16} />);
const ago = (d: string) => { const s = (Date.now() - +new Date(d)) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : new Date(d).toLocaleDateString(); };

export function NotificationList({ userId, initial }: { userId: string; initial: N[] }) {
  const [items, setItems] = useState(initial); const router = useRouter(); const toast = useToast(); const unread = items.filter((n) => !n.read).length;
  useLive('notif-' + userId, [{ table: 'notifications', event: 'INSERT', filter: `user_id=eq.${userId}` }, { table: 'notifications', event: 'UPDATE', filter: `user_id=eq.${userId}` }], (p) => {
    const n = p.new as N; setItems((l) => (p.eventType === 'INSERT' ? (l.some((x) => x.id === n.id) ? l : [n, ...l]) : l.map((x) => (x.id === n.id ? { ...x, read: n.read } : x))));   // new notifications appear instantly
  });
  async function markAll() { const prev = items; setItems((l) => l.map((n) => ({ ...n, read: true }))); const { error } = await supabaseBrowser().from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false); if (error) { setItems(prev); toast.push('Could not mark as read', 'error'); } }
  async function open(n: N) { if (!n.read) { setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))); await supabaseBrowser().from('notifications').update({ read: true }).eq('id', n.id); } if (n.link) router.push(n.link); }
  return (<>
    <div className="mb-3 flex items-center justify-between"><p className="muted text-sm">{unread ? `${unread} unread` : 'All caught up'}</p><button className="btn btn-ghost" disabled={!unread} onClick={markAll}><CheckCheck size={14} />Mark all as read</button></div>
    {!items.length ? <Empty icon={<Bell size={26} />}>No notifications yet.</Empty> : <ul className="space-y-2">{items.map((n) => (
      <li key={n.id}><button onClick={() => open(n)} className="card lift flex w-full items-center gap-3 !p-3 text-start" style={!n.read ? { borderColor: 'rgba(var(--glow), .6)' } : undefined}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(var(--glow), .15)', color: 'var(--a1)' }}>{icon(n.kind)}</span>
        <span className="min-w-0 flex-1"><span className={`block ${n.read ? 'muted' : 'font-semibold'}`}>{n.message}</span><span className="muted text-xs">{ago(n.created_at)}</span></span>{!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--cyan)' }} aria-label="Unread" />}</button></li>))}</ul>}</>);
}
