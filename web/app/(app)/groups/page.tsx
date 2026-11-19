import { UsersRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { GroupsClient } from './GroupsClient';
export default async function Groups({ searchParams }: { searchParams: { code?: string } }) {
  const { supabase, profile } = await requireUser(); const { data } = await supabase.rpc('my_groups');
  return (<><PageTitle icon={<UsersRound size={22} />} sub="Study groups for sharing notes and competing on leaderboards.">Groups</PageTitle><GroupsClient userId={profile.id} initial={(data ?? []) as any} prefill={searchParams.code?.slice(0, 20)} /></>);
}
