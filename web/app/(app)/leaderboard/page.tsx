import { Trophy } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { LeaderboardChooser } from './LeaderboardChooser';
export default async function Leaderboard() {
  const { supabase } = await requireUser('student');
  const [{ data: classes }, { data: groups }] = await Promise.all([supabase.rpc('my_classes'), supabase.rpc('my_groups')]);
  const opts = [...(classes ?? []).map((c: any) => ({ scope: 'class' as const, id: c.id, name: `Class: ${c.name}` })), ...(groups ?? []).map((g: any) => ({ scope: 'group' as const, id: g.id, name: `Group: ${g.name}` }))];
  const ids = opts.map((o) => o.id);
  const [{ data: asg }, { data: tga }] = ids.length ? await Promise.all([supabase.from('test_assignments').select('test_id,class_id').in('class_id', ids), supabase.from('test_group_assignments').select('test_id,group_id').in('group_id', ids)]) : [{ data: [] as any[] }, { data: [] as any[] }];
  const tids = [...new Set([...(asg ?? []).map((a: any) => a.test_id), ...(tga ?? []).map((a: any) => a.test_id)])];
  const { data: tests } = tids.length ? await supabase.from('teacher_tests').select('id,title').in('id', tids).eq('results_published', true) : { data: [] as any[] };
  const byScope: Record<string, { id: string; title: string }[]> = {};
  [...(asg ?? []).map((a: any) => [a.class_id, a.test_id]), ...(tga ?? []).map((a: any) => [a.group_id, a.test_id])].forEach(([s, t]) => { const x = (tests ?? []).find((y: any) => y.id === t); if (x) (byScope[s] ??= []).push(x); });
  return (<><PageTitle icon={<Trophy size={22} />} sub="Real results only — published, fully graded tests. Your privacy settings are respected.">Leaderboard</PageTitle><LeaderboardChooser options={opts} testsByScope={byScope} /></>);
}
