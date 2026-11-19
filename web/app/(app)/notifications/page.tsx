import { Bell } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { NotificationList } from './NotificationList';
export default async function Notifications() {
  const { supabase, profile } = await requireUser();
  if (profile.role === 'student') await supabase.rpc('refresh_my_reminders');
  const { data } = await supabase.from('notifications').select('id,kind,message,link,read,created_at').order('created_at', { ascending: false }).limit(100);
  return (<><PageTitle icon={<Bell size={22} />} sub="Friend requests, messages, tests, results, shared notes and announcements.">Notifications</PageTitle><NotificationList userId={profile.id} initial={(data ?? []) as any} /></>);
}
