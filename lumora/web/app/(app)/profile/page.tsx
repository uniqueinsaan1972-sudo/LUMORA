import { requireUser } from '@/lib/auth';
import { UserCircle } from 'lucide-react';
import { PageTitle } from '@/components/ui';
import Link from 'next/link';
export default async function Profile() {
  const { profile, user } = await requireUser();
  return (<><PageTitle icon={<UserCircle size={22} />}>Profile</PageTitle><div className="card space-y-1"><p className="text-xl font-bold">{profile.display_name}</p><p className="muted capitalize">{profile.role}{profile.grade && ` · ${profile.grade}`}{profile.school && ` · ${profile.school}`}</p>
    <p className="muted text-sm">Your email and private details are never shown to other users.</p><p className="muted text-sm">Account email: {user.email}</p><Link className="btn mt-2" href="/settings">Edit profile</Link></div></>);
}
