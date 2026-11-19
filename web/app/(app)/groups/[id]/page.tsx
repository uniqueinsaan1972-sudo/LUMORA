import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { LeaderboardPanel } from '@/components/LeaderboardPanel';
import { GroupDetail } from './GroupDetail';
export default async function GroupPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase, profile } = await requireUser();
  const [{ data: groups }, { data: members }, { data: notes }, { data: friends }, { data: tga }] = await Promise.all([supabase.rpc('my_groups'), supabase.rpc('group_members_list', { p_group: params.id }),
    supabase.rpc('group_shared_notes', { p_group: params.id }), supabase.rpc('list_friends'), supabase.from('test_group_assignments').select('test_id').eq('group_id', params.id)]);
  const g = (groups ?? []).find((x: any) => x.id === params.id); if (!g) notFound();
  const ids = (tga ?? []).map((x: any) => x.test_id); const { data: tests } = ids.length ? await supabase.from('teacher_tests').select('id,title').in('id', ids).eq('results_published', true) : { data: [] as any[] };
  return (<><PageTitle icon={<UsersRound size={22} />} sub={g.description ?? `Owner: ${g.owner_name}`}>{g.name}</PageTitle>
    <GroupDetail groupId={params.id} meId={profile.id} isOwner={g.is_owner} joinCode={g.join_code} initial={(members ?? []) as any} friends={(friends ?? []).map((f: any) => ({ id: f.id, display_name: f.display_name }))} />
    <h2 className="font-display mb-2 mt-8 font-bold">Shared notes</h2>
    {(notes ?? []).length ? <ul className="space-y-2">{(notes ?? []).map((n: any) => <li key={n.id} className="card !p-3"><Link className="font-semibold underline" href={`/notes/${n.id}`}>{n.title || 'Untitled'}</Link><span className="muted text-sm"> · from {n.owner_name} · {n.permission === 'edit' ? 'can edit' : 'view only'}</span></li>)}</ul> : <p className="muted text-sm">No notes shared with this group yet. Open a note → Share → Groups.</p>}
    <h2 className="font-display mb-2 mt-8 font-bold">Leaderboard</h2><LeaderboardPanel scope="group" scopeId={params.id} tests={tests ?? []} /></>);
}
