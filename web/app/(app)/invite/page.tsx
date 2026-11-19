import { UserPlus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { InviteClient } from './InviteClient';
export default async function Invite() {
  const { supabase, profile } = await requireUser();
  const [{ data: inv }, { data: classes }, { data: groups }] = await Promise.all([supabase.from('invitations').select('id,kind,expires_at,max_uses,uses,revoked,created_at').order('created_at', { ascending: false }).limit(50), supabase.rpc('my_classes'), supabase.rpc('my_groups')]);
  return (<><PageTitle icon={<UserPlus size={22} />} sub="Invite friends to LUMORA, or students to your class or group.">Invite Friends</PageTitle>
    <InviteClient initial={(inv ?? []) as any} publicId={profile.public_id} classes={profile.role === 'teacher' ? (classes ?? []).filter((c: any) => c.is_teacher).map((c: any) => ({ id: c.id, name: c.name })) : []} groups={(groups ?? []).map((g: any) => ({ id: g.id, name: g.name }))} /></>);
}
