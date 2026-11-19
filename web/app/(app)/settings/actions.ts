'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { LANGS } from '@/lib/i18n';
import type { FormState } from '@/app/(auth)/actions';
const schema = z.object({ display_name: z.string().trim().min(1).max(80), username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'Username: 3–24 letters, numbers or underscores').optional().or(z.literal('')),
  grade: z.string().max(40).optional(), school: z.string().max(120).optional(), subjects: z.string().max(400).optional(), language: z.string(), theme: z.enum(['light', 'dark', 'system']), avatar_url: z.string().max(500).optional() });
export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser(); const p = schema.safeParse(Object.fromEntries(fd)); if (!p.success) return { error: p.error.issues[0]?.message ?? 'Check your details.' };
  const v = p.data; const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`; if (v.avatar_url && !v.avatar_url.startsWith(prefix)) return { error: 'Invalid profile photo.' };
  const patch: Record<string, unknown> = { display_name: v.display_name, language: v.language in LANGS ? v.language : 'en', theme: v.theme, grade: v.grade || null, school: v.school || null,
    subjects: (v.subjects ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20), discoverable: fd.get('discoverable') === 'on', share_achievements: fd.get('share_achievements') === 'on', show_online: fd.get('show_online') === 'on', show_on_leaderboard: fd.get('show_on_leaderboard') === 'on' };
  if (v.username) patch.username = v.username; if (v.avatar_url) patch.avatar_url = v.avatar_url;   // role / public_id are not in the patch — and DB triggers block them anyway
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return { error: error.code === '23505' ? 'That username is already taken.' : 'Could not save your settings.' };
  revalidatePath('/', 'layout'); return { message: 'Settings saved' };
}
