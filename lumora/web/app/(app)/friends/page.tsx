import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { Users } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
const uuid = /^[0-9a-f-]{36}$/i;
async function sendRequest(to: string) { 'use server'; if (!uuid.test(to) || !rateLimit('friendreq', 15, 60 * 60_000)) return; const { supabase, user } = await requireUser(); await supabase.from('friend_requests').insert({ from_id: user.id, to_id: to }); revalidatePath('/friends'); }
async function respond(id: string, accept: boolean) { 'use server'; const { supabase } = await requireUser(); await supabase.rpc('respond_friend_request', { p_id: id, p_accept: accept }); revalidatePath('/friends'); }
async function unfriend(other: string) { 'use server'; const { supabase, user } = await requireUser(); const [a, b] = [user.id, other].sort(); await supabase.from('friendships').delete().eq('user_a', a).eq('user_b', b); revalidatePath('/friends'); }
async function block(other: string) { 'use server'; const { supabase, user } = await requireUser(); await supabase.from('blocks').upsert({ blocker_id: user.id, blocked_id: other }); await unfriend(other); }
async function report(fd: FormData) {
  'use server'; const reason = String(fd.get('reason') ?? '').trim(); const target = String(fd.get('target') ?? ''); if (reason.length < 5 || !uuid.test(target)) return;
  const { supabase, user } = await requireUser(); await supabase.from('reports').insert({ reporter_id: user.id, target_user: target, reason: reason.slice(0, 2000) }); revalidatePath('/friends');
}
export default async function Friends({ searchParams }: { searchParams: { q?: string } }) {
  const { supabase, profile } = await requireUser('student');
  const q = (searchParams.q ?? '').trim().slice(0, 40);
  const [friends, incoming, found] = await Promise.all([supabase.rpc('list_friends'), supabase.rpc('list_incoming_requests'),
    q.length >= 3 && rateLimit('usersearch', 30, 60_000) ? supabase.rpc('search_users', { q }) : Promise.resolve({ data: null })]);
  return (<><PageTitle icon={<Users size={22} />} sub="Your notes and results stay private unless you choose to share.">Friends &amp; Challenges</PageTitle>
    {!profile.discoverable && <p className="card muted mb-4 text-sm">Others can’t find you right now. Turn on “Let others find me” in Settings (and set a username) if you want friend requests.</p>}
    <form className="mb-4 flex gap-2" role="search"><input className="input" name="q" placeholder="Search by name or username (3+ letters)" defaultValue={q} /><button className="btn">Search</button></form>
    {found.data && (found.data.length ? <ul className="mb-6 space-y-2">{found.data.map((u: any) => <li key={u.id} className="card flex justify-between"><span>{u.display_name} <span className="muted text-sm">@{u.username}</span></span><form action={sendRequest.bind(null, u.id)}><button className="btn">Add friend</button></form></li>)}</ul> : <p className="muted mb-6">No matching public profiles.</p>)}
    {!!incoming.data?.length && <section className="mb-6"><h2 className="mb-2 font-semibold">Requests</h2><ul className="space-y-2">{incoming.data.map((r: any) => <li key={r.id} className="card flex justify-between"><span>{r.from_name}</span>
      <span className="flex gap-1"><form action={respond.bind(null, r.id, true)}><button className="btn">Accept</button></form><form action={respond.bind(null, r.id, false)}><button className="btn btn-ghost">Reject</button></form></span></li>)}</ul></section>}
    <h2 className="mb-2 font-semibold">Friends</h2>
    {!friends.data?.length ? <Empty>No friends yet.</Empty> : <ul className="space-y-2">{friends.data.map((f: any) => <li key={f.id} className="card"><div className="flex justify-between"><span>{f.display_name} <span className="muted text-sm">@{f.username}</span></span>
      <span className="flex gap-1"><form action={unfriend.bind(null, f.id)}><button className="btn btn-ghost">Remove</button></form><form action={block.bind(null, f.id)}><button className="btn btn-ghost">Block</button></form></span></div>
      <details className="mt-2"><summary className="muted cursor-pointer text-sm">Report</summary><form action={report} className="mt-2 flex gap-2"><input type="hidden" name="target" value={f.id} /><input className="input" name="reason" placeholder="What happened?" required minLength={5} /><button className="btn btn-ghost">Send</button></form></details></li>)}</ul>}
    <p className="muted mt-6 text-sm">Study groups, challenges and leaderboards: database tables exist, but screens are not built yet (see docs/KNOWN_LIMITATIONS.md).</p></>);
}
