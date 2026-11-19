import { Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { FriendsClient } from './FriendsClient';
export default async function Friends() {
  const { supabase, profile } = await requireUser();
  const [f, i, o, b] = await Promise.all([supabase.rpc('list_friends'), supabase.rpc('list_incoming_requests'), supabase.rpc('list_outgoing_requests'), supabase.rpc('list_blocked')]);
  return (<><PageTitle icon={<Users size={22} />} sub="Search by username or User ID. Your notes and results stay private unless you share them.">Friends</PageTitle>
    <FriendsClient me={{ id: profile.id, showOnline: profile.show_online, discoverable: profile.discoverable }} init={{ friends: (f.data ?? []) as any, incoming: (i.data ?? []) as any, outgoing: (o.data ?? []) as any, blocked: (b.data ?? []) as any }} /></>);
}
