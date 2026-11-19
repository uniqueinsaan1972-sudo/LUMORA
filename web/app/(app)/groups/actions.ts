'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid(); const bad: R = { ok: false, error: 'Invalid request' };
export async function createGroup(input: { name: string; description?: string }): Promise<R & { id?: string }> {
  const p = z.object({ name: z.string().trim().min(2, 'Give the group a name').max(80), description: z.string().trim().max(500).optional() }).safeParse(input); if (!p.success) return { ok: false, error: p.error.issues[0]?.message };
  if (!rateLimit('group', 10, 60 * 60_000)) return { ok: false, error: 'Too many groups created. Try later.' };
  const { supabase, user } = await requireUser(); const { data, error } = await supabase.from('study_groups').insert({ owner_id: user.id, name: p.data.name, description: p.data.description || null }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not create the group.' }; revalidatePath('/groups'); return { ok: true, id: data.id };
}
export async function joinGroup(code: string): Promise<R & { id?: string }> {
  const c = code.trim(); if (c.length < 4 || c.length > 20) return { ok: false, error: 'Enter a valid group code.' };
  const { supabase } = await requireUser(); const { data, error } = await supabase.rpc('join_group', { p_code: c });
  if (error) return { ok: false, error: /too many/.test(error.message) ? 'Too many wrong codes. Try again in a few minutes.' : 'Could not join the group.' };
  if (!data) return { ok: false, error: 'That group code is not valid.' }; revalidatePath('/groups'); return { ok: true, id: data as string };
}
export async function leaveGroup(id: string, userId: string): Promise<R> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(userId).success) return bad; const { supabase } = await requireUser();
  const { data, error } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId).select('user_id'); // RLS: yourself, or the owner removing someone
  if (error || !data?.length) return { ok: false, error: 'Could not update membership.' }; revalidatePath('/groups'); return { ok: true };
}
export async function deleteGroup(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser(); const { data, error } = await supabase.from('study_groups').delete().eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Only the owner can delete a group.' }; revalidatePath('/groups'); return { ok: true };
}
export async function inviteToGroup(groupId: string, userId: string): Promise<R> {
  if (!uuid.safeParse(groupId).success || !uuid.safeParse(userId).success) return bad; const { supabase } = await requireUser();
  const { error } = await supabase.rpc('invite_friend_to_group', { p_group: groupId, p_user: userId }); return error ? { ok: false, error: error.message.replace(/^.*?: /, '') } : { ok: true };
}
