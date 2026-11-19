'use client';
import { useCallback, useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { Avatar } from './Avatar';
import { Empty } from './ui';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
export type Row = { rank: number; user_id: string; display_name: string; username: string | null; avatar_url: string | null; tests_completed: number; obtained: number; total: number; percentage: number; improvement: number | null; achievements: number; is_me: boolean };
const medal = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : null);

export function LeaderboardPanel({ scope, scopeId, tests, initial }: { scope: 'class' | 'group'; scopeId: string; tests: { id: string; title: string }[]; initial?: Row[] }) {
  const [rows, setRows] = useState<Row[] | null>(initial ?? null); const [test, setTest] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => { const { data, error } = await supabaseBrowser().rpc('leaderboard', { p_scope: scope, p_scope_id: scopeId, p_test: test || null }); if (error) { setErr('Could not load the leaderboard.'); return; } setErr(''); setRows((data ?? []) as Row[]); }, [scope, scopeId, test]);
  useEffect(() => { void load(); }, [load]);
  useLive('lb-' + scopeId, [{ table: 'test_results' }, { table: 'teacher_tests' }], () => void load());
  const tied = (r: number) => (rows ?? []).filter((x) => x.rank === r).length > 1;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="muted text-sm">Ranked by percentage across published, fully graded tests. Ties share the same rank.</p>
        <select className="input !w-auto" value={test} onChange={(e) => setTest(e.target.value)} aria-label="Filter by test"><option value="">All tests</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
      {err ? <p role="alert" className="text-red-400">{err}</p> : rows === null ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div> : !rows.length ? <Empty icon={<Trophy size={26} />}>No published results yet. Rankings appear once a teacher publishes graded test results.</Empty> : (
        <ol className="space-y-2">{rows.map((r) => (
          <li key={r.user_id} className="card flex items-center gap-3 !p-3" style={r.is_me ? { borderColor: 'var(--cyan)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--cyan) 25%, transparent)' } : undefined}>
            <span className="font-display w-10 shrink-0 text-center text-lg font-extrabold">{medal(r.rank) ?? r.rank}{tied(r.rank) && <span className="muted block text-[10px] font-normal">tied</span>}</span>
            <Avatar name={r.display_name} url={r.avatar_url} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{r.display_name}{r.is_me && <span className="badge ms-2">You</span>}</p>
              <p className="muted truncate text-xs">{r.tests_completed} test{r.tests_completed === 1 ? '' : 's'} · {r.obtained}/{r.total} marks{r.achievements > 0 && ` · 🏅 ${r.achievements}`}</p></div>
            {r.improvement !== null && <span className={`hidden items-center gap-1 text-xs sm:flex ${r.improvement >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.improvement >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{r.improvement > 0 ? '+' : ''}{r.improvement}</span>}
            <span className="font-display text-lg font-extrabold">{r.percentage}%</span></li>))}</ol>)}
    </div>
  );
}
