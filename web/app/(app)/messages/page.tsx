import { MessageCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { ChatClient } from './ChatClient';
export default async function Messages({ searchParams }: { searchParams: { with?: string } }) {
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.rpc('conversation_list');
  const w = searchParams.with && /^[0-9a-f-]{36}$/i.test(searchParams.with) && (data ?? []).some((c: any) => c.id === searchParams.with) ? searchParams.with : null;
  return (<><PageTitle icon={<MessageCircle size={22} />} sub="Private chats with your friends. Only the two of you can read them.">Messages</PageTitle>
    <ChatClient me={{ id: profile.id, showOnline: profile.show_online }} initial={(data ?? []) as any} initialWith={w} /></>);
}
