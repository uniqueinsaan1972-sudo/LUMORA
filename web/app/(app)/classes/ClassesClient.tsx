'use client';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { joinClass } from './actions';
type C = { id: string; name: string; description: string | null; teacher_name: string; member_count: number };
export function ClassesClient({ userId, initial }: { userId: string; initial: C[] }) {
  const toast = useToast(); const [list, setList] = useState(initial); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const t = useRef<ReturnType<typeof setTimeout>>();
  const reload = useCallback(async () => { const { data } = await supabaseBrowser().rpc('my_classes'); if (data) setList(data as C[]); }, []);
  useLive('classes-' + userId, [{ table: 'class_members', filter: `student_id=eq.${userId}` }], () => { clearTimeout(t.current); t.current = setTimeout(() => void reload(), 150); });
  async function join(e: React.FormEvent) { e.preventDefault(); if (busy || !code.trim()) return; setBusy(true); const r = await joinClass(code); setBusy(false); if (!r.ok) return toast.push(r.error ?? 'Could not join', 'error'); toast.push('You joined the class', 'success'); setCode(''); await reload(); }
  return (<>
    <form onSubmit={join} className="card mb-5 flex items-end gap-2"><label className="flex-1 text-sm font-medium">Join a class<input className="input mt-1" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code from your teacher" maxLength={20} /></label><button className="btn" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Join</button></form>
    {!list.length ? <Empty icon={<BookOpen size={26} />}>You haven’t joined a class yet.</Empty> : <ul className="grid gap-3 md:grid-cols-2">{list.map((c) => <li key={c.id} className="card lift"><Link href={`/classes/${c.id}`} className="block"><p className="font-display font-bold">{c.name}</p><p className="muted text-sm">{c.description ?? `Teacher: ${c.teacher_name}`}</p><p className="muted mt-2 text-xs">{c.member_count} student{c.member_count === 1 ? '' : 's'} · {c.teacher_name}</p></Link></li>)}</ul>}</>);
}
