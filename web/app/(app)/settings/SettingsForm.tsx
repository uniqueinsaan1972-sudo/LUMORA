'use client';
import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { CopyButton } from '@/components/CopyButton';
import { useToast } from '@/components/Toast';
import { LANGS } from '@/lib/i18n';
import type { Profile } from '@/lib/auth';
import { saveSettings } from './actions';
function Save() { const { pending } = useFormStatus(); return <button className="btn w-fit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />}Save changes</button>; }
const Tog = ({ name, def, label, hint }: { name: string; def: boolean; label: string; hint: string }) => <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name={name} defaultChecked={def} className="mt-1" /><span><b>{label}</b><br /><span className="muted text-xs">{hint}</span></span></label>;
export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action] = useFormState(saveSettings, undefined); const toast = useToast();
  useEffect(() => { if (state?.message) toast.push(state.message, 'success'); else if (state?.error) toast.push(state.error, 'error'); }, [state, toast]);
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><AvatarUpload userId={profile.id} name={profile.display_name} initialUrl={profile.avatar_url} /></div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><span className="muted text-sm">Your User ID</span><code className="rounded bg-slate-500/20 px-2 py-1">{profile.public_id}</code><CopyButton text={profile.public_id} /></div>
      <label className="text-sm font-medium">Full name<input className="input mt-1" name="display_name" defaultValue={profile.display_name} required maxLength={80} /></label>
      <label className="text-sm font-medium">Username<input className="input mt-1" name="username" defaultValue={profile.username ?? ''} pattern="[a-z0-9_]{3,24}" placeholder="a–z, 0–9, _" /></label>
      <label className="text-sm font-medium">Class / grade<input className="input mt-1" name="grade" defaultValue={profile.grade ?? ''} /></label>
      <label className="text-sm font-medium">School / college<input className="input mt-1" name="school" defaultValue={profile.school ?? ''} /></label>
      <label className="text-sm font-medium sm:col-span-2">Subjects (comma separated)<input className="input mt-1" name="subjects" /></label>
      <label className="text-sm font-medium">Interface language<select className="input mt-1" name="language" defaultValue={profile.language}>{Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></label>
      <label className="text-sm font-medium">Theme<select className="input mt-1" name="theme" defaultValue={profile.theme}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <h2 className="font-display mt-2 font-bold sm:col-span-2">Privacy</h2>
      <Tog name="discoverable" def={profile.discoverable} label="Let others find me" hint="By username or User ID. Only your name, username and photo are shown." />
      <Tog name="show_online" def={profile.show_online} label="Show when I’m online" hint="Only your friends can see this." />
      <Tog name="show_on_leaderboard" def={profile.show_on_leaderboard} label="Appear on class and group leaderboards" hint="Only published, fully graded results are ranked." />
      <Tog name="share_achievements" def={profile.share_achievements} label="Allow my achievement card to be shared" hint="Off by default." />
      <Save /></form>
  );
}
