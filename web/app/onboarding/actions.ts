'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import type { FormState } from '@/app/(auth)/actions';

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'Username: 3–24 letters, numbers or underscores').optional().or(z.literal('')),
  grade: z.string().trim().max(40).optional(), school: z.string().trim().max(120).optional(), subjects: z.string().max(400).optional(),
  daily_goal_minutes: z.coerce.number().int().min(5).max(600).default(30), class_name: z.string().trim().max(120).optional(), avatar_url: z.string().max(500).optional(),
});
export async function completeOnboarding(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireUser();
  const p = schema.safeParse(Object.fromEntries(fd)); if (!p.success) return { error: p.error.issues[0]?.message ?? 'Check your details.' };
  const v = p.data; const avatarPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
  if (v.avatar_url && !v.avatar_url.startsWith(avatarPrefix)) return { error: 'Invalid profile photo.' };
  const patch: Record<string, unknown> = { grade: v.grade || null, school: v.school || null, subjects: (v.subjects ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
    discoverable: fd.get('discoverable') === 'on', show_online: fd.get('show_online') === 'on', show_on_leaderboard: fd.get('show_on_leaderboard') === 'on', onboarded: true };
  if (v.avatar_url) patch.avatar_url = v.avatar_url; if (v.username) patch.username = v.username;
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return { error: error.code === '23505' ? 'That username is already taken.' : 'Could not save your profile. Please try again.' };
  await supabase.from('user_preferences').update({ daily_goal_minutes: v.daily_goal_minutes }).eq('user_id', user.id);
  if (profile.role === 'teacher' && v.class_name) await supabase.from('teacher_classes').insert({ teacher_id: user.id, name: v.class_name });
  redirect('/dashboard');
}
