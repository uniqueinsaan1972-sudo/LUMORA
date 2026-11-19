import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { LANGS } from '@/lib/i18n';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageTitle } from '@/components/ui';
import { logoutEverywhere } from '@/app/(auth)/actions';
async function save(fd: FormData) {
  'use server';
  const lang = String(fd.get('language')); const theme = String(fd.get('theme')); const un = String(fd.get('username') ?? '').trim().toLowerCase();
  const { supabase, user } = await requireUser();
  const patch: Record<string, unknown> = { display_name: String(fd.get('display_name') ?? '').trim().slice(0, 80) || undefined, language: lang in LANGS ? lang : 'en', theme: ['light', 'dark', 'system'].includes(theme) ? theme : 'system',
    grade: String(fd.get('grade') ?? '').slice(0, 40) || null, school: String(fd.get('school') ?? '').slice(0, 120) || null, username: /^[a-z0-9_]{3,24}$/.test(un) ? un : null,
    discoverable: fd.get('discoverable') === 'on', share_achievements: fd.get('share_achievements') === 'on',
    subjects: String(fd.get('subjects') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) };
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  await supabase.from('profiles').update(patch).eq('id', user.id); // role is not in the patch — and a DB trigger blocks it anyway
  revalidatePath('/', 'layout');
}
async function claim(fd: FormData) { 'use server'; const { supabase } = await requireUser(); await supabase.rpc('claim_teacher_invite', { p_code: String(fd.get('code') ?? '').trim().slice(0, 64) }); redirect('/dashboard'); }
async function requestDeletion() { 'use server'; const { supabase } = await requireUser(); await supabase.rpc('request_account_deletion'); revalidatePath('/settings'); }
export default async function Settings() {
  const { profile } = await requireUser();
  return (<><PageTitle icon={<SettingsIcon size={22} />}>Settings &amp; profile</PageTitle>
    <form action={save} className="card grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Display name<input className="input" name="display_name" defaultValue={profile.display_name} required maxLength={80} /></label>
      <label className="text-sm">Username (for friends)<input className="input" name="username" defaultValue={profile.username ?? ''} pattern="[a-z0-9_]{3,24}" placeholder="a–z, 0–9, _" /></label>
      <label className="text-sm">Class / grade<input className="input" name="grade" defaultValue={profile.grade ?? ''} /></label>
      <label className="text-sm">School / college (optional)<input className="input" name="school" defaultValue={profile.school ?? ''} /></label>
      <label className="text-sm sm:col-span-2">Subjects (comma separated)<input className="input" name="subjects" /></label>
      <label className="text-sm">Interface language<select className="input" name="language" defaultValue={profile.language}>{Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></label>
      <label className="text-sm">Theme<select className="input" name="theme" defaultValue={profile.theme}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="discoverable" defaultChecked={profile.discoverable} /> Let others find me by username</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="share_achievements" defaultChecked={profile.share_achievements} /> Allow my achievement card to be shared</label>
      <button className="btn w-fit">Save</button></form>
    <p className="muted mt-2 text-sm">Other languages (Arabic, Hindi, Spanish, French, Chinese) are enabled only once human-reviewed translations are added. Your notes are never auto-translated.</p>
    {profile.role === 'student' && <form action={claim} className="card mt-4 flex items-end gap-2"><label className="flex-1 text-sm">Teacher invite code<input className="input" name="code" autoComplete="off" /></label><button className="btn">Apply</button></form>}
    <section className="card mt-4 space-y-2"><h2 className="font-semibold">Privacy &amp; security</h2>
      <p><a className="underline" href="/api/export">Download my data (JSON)</a></p>
      <form action={logoutEverywhere}><button className="btn btn-ghost">Sign out of all devices</button></form>
      <form action={requestDeletion}><button className="btn btn-ghost">Request account deletion</button></form>
      {/* deletion_requested_at is set; an operator completes deletion within the documented window (docs/PRIVACY_AND_RETENTION.md) */}</section></>);
}
