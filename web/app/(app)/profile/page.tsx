import Link from 'next/link';
import { BadgeCheck, UserCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { CopyButton } from '@/components/CopyButton';
export default async function Profile() {
  const { profile, user, supabase } = await requireUser();
  const { data: ach } = await supabase.from('achievements').select('code');
  const names: Record<string, string> = { first_test: '🎓 First test completed', perfect_score: '💯 Perfect score', high_achiever: '🌟 90%+ achiever' };
  return (<><PageTitle icon={<UserCircle size={22} />}>Profile</PageTitle>
    <div className="card flex flex-wrap items-center gap-5"><Avatar name={profile.display_name} url={profile.avatar_url} size={88} />
      <div className="min-w-0 space-y-1"><p className="font-display flex items-center gap-2 text-2xl font-extrabold">{profile.display_name}{profile.teacher_verified && <BadgeCheck className="text-sky-400" size={20} aria-label="Verified teacher" />}</p>
        <p className="muted capitalize">{profile.role}{profile.grade && ` · ${profile.grade}`}{profile.school && ` · ${profile.school}`}</p>
        <p className="muted text-sm">@{profile.username} · <code>{profile.public_id}</code></p><div className="flex gap-2 pt-1"><CopyButton text={profile.public_id} label="Copy User ID" /><Link className="btn" href="/settings">Edit profile</Link></div></div></div>
    {!!ach?.length && <section className="card mt-4"><h2 className="font-display mb-2 font-bold">Achievements</h2><div className="flex flex-wrap gap-2">{ach.map((a) => <span key={a.code} className="badge !text-sm">{names[a.code] ?? a.code}</span>)}</div></section>}
    <p className="muted mt-4 text-sm">Your email ({user.email}) is private and never shown to other users.</p></>);
}
