import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Onboarding } from '@/components/Onboarding';
export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboarded) redirect('/dashboard');
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6"><Logo /></div>
      <div className="glass card-accent !p-6 sm:!p-8"><p className="muted mb-4 text-sm">Welcome, <b>{profile.display_name}</b>! Your User ID is <code className="rounded bg-slate-500/20 px-1">{profile.public_id}</code> — friends can find you with it.</p>
        <Onboarding role={profile.role === 'teacher' ? 'teacher' : 'student'} userId={profile.id} name={profile.display_name} needsUsername={!profile.username} /></div>
    </main>
  );
}
