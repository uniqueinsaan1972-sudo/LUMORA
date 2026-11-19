import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { Bell } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
async function markAll() { 'use server'; const { supabase, user } = await requireUser(); await supabase.from('notifications').update({ read: true }).eq('user_id', user.id); revalidatePath('/notifications'); }
export default async function Notifications() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  return (<><PageTitle icon={<Bell size={22} />}>Notifications</PageTitle>
    {data?.length ? (<><form action={markAll}><button className="btn btn-ghost mb-3">Mark all read</button></form>
      <ul className="space-y-2">{data.map((n) => <li key={n.id} className="card"><span className={n.read ? 'muted' : 'font-semibold'}>{n.message}</span> <span className="muted text-xs">{new Date(n.created_at).toLocaleString()}</span></li>)}</ul></>) : <Empty>You’re all caught up.</Empty>}</>);
}
