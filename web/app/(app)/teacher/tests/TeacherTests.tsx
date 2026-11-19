'use client';
import Link from 'next/link';
import { Ban, Send } from 'lucide-react';
import { useList } from '@/lib/useList';
import { CopyButton } from '@/components/CopyButton';
import { Empty } from '@/components/ui';
import { teacherTestPhase } from '@/lib/testStatus';
import { setTestStatus } from './actions';
type T = { id: string; title: string; status: string; opens_at: string; closes_at: string; results_published: boolean; access_code: string };
export function TeacherTests({ initial }: { initial: T[] }) {
  const { items, mutate } = useList<T>(initial);
  const set = (t: T, status: 'published' | 'cancelled') => mutate({ key: t.id + status, apply: (l) => l.map((x) => (x.id === t.id ? { ...x, status } : x)), run: () => setTestStatus(t.id, status), success: status === 'published' ? 'Test published — students notified' : 'Test cancelled' });
  if (!items.length) return <Empty>No tests yet. <Link className="underline" href="/teacher/tests/new">Create one</Link>.</Empty>;
  return (<ul className="space-y-2">{items.map((t) => (
    <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4"><div className="min-w-0"><Link className="font-display font-bold underline" href={`/teacher/tests/${t.id}`}>{t.title}</Link>
      <p className="muted text-sm"><span className="badge me-2">{teacherTestPhase(t)}</span>closes {new Date(t.closes_at).toLocaleString()}</p></div>
      <div className="flex flex-wrap items-center gap-2">{t.status === 'published' && <><code className="rounded bg-slate-500/20 px-2 py-1 text-sm">{t.access_code}</code><CopyButton text={t.access_code} /></>}
        {t.status === 'draft' && <button className="btn" onClick={() => set(t, 'published')}><Send size={14} />Publish</button>}{t.status !== 'cancelled' && <button className="btn btn-ghost" onClick={() => set(t, 'cancelled')}><Ban size={14} />Cancel</button>}</div></li>))}</ul>);
}
