import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { logoutEverywhere } from '@/app/(auth)/actions';
import { SettingsForm } from './SettingsForm';
async function claim(fd: FormData) { 'use server'; const { supabase } = await requireUser(); await supabase.rpc('claim_teacher_invite', { p_code: String(fd.get('code') ?? '').trim().slice(0, 64) }); redirect('/dashboard'); }
async function requestDeletion() { 'use server'; const { supabase } = await requireUser(); await supabase.rpc('request_account_deletion'); revalidatePath('/settings'); }
export default async function Settings() {
  const { profile } = await requireUser();
  return (<><PageTitle icon={<SettingsIcon size={22} />}>Settings &amp; profile</PageTitle><SettingsForm profile={profile} />
    <p className="muted mt-2 text-sm">Other languages (Arabic, Hindi, Spanish, French, Chinese) are enabled only once human-reviewed translations are added. Your notes are never auto-translated.</p>
    {profile.role !== 'admin' && !profile.teacher_verified && <form action={claim} className="card mt-4 flex items-end gap-2"><label className="flex-1 text-sm font-medium">Teacher invite code<input className="input mt-1" name="code" autoComplete="off" /></label><button className="btn">Apply</button></form>}
    <section className="card mt-4 space-y-2"><h2 className="font-display font-bold">Account &amp; data</h2><p><a className="underline" href="/api/export">Download my data (JSON)</a></p>
      <form action={logoutEverywhere}><button className="btn btn-ghost">Sign out of all devices</button></form>
      <form action={requestDeletion}><button className="btn btn-ghost">Request account deletion</button></form>
      {profile && <p className="muted text-xs">Deletion requests are processed within 30 days (see Privacy Policy).</p>}</section></>);
}
