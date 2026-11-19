'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid(); const bad: R = { ok: false, error: 'Invalid request' };
const clean = (m: string) => m.replace(/^.*?(cannot send request|already friends|this person already sent you a request|you can only [a-z ]+)/i, '$1');

export async function sendFriendRequest(to: string): Promise<R> {
  if (!uuid.safeParse(to).success) return bad; if (!rateLimit('friendreq', 20, 60 * 60_000)) return { ok: false, error: 'You are sending requests too quickly. Try again later.' };
  const { supabase, user } = await requireUser(); if (to === user.id) return { ok: false, error: 'You cannot add yourself.' };
  const { error } = await supabase.from('friend_requests').insert({ from_id: user.id, to_id: to });
  if (error) return { ok: false, error: error.code === '23505' ? 'Request already sent.' : /cannot send|already|sent you/.test(error.message) ? clean(error.message) : 'Could not send the request.' };
  revalidatePath('/friends'); return { ok: true };
}
export async function respondRequest(id: string, accept: boolean): Promise<R> {
  if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser();
  const { error } = await supabase.rpc('respond_friend_request', { p_id: id, p_accept: accept }); if (error) return { ok: false, error: 'Could not update the request.' }; revalidatePath('/friends'); return { ok: true };
}
export async function cancelRequest(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser();
  const { data, error } = await supabase.from('friend_requests').delete().eq('id', id).select('id'); return error || !data?.length ? { ok: false, error: 'Could not cancel the request.' } : { ok: true };
}
export async function removeFriend(id: string): Promise<R> { if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser(); const { error } = await supabase.rpc('remove_friend', { p_other: id }); return error ? { ok: false, error: 'Could not remove friend.' } : { ok: true }; }
export async function blockUser(id: string): Promise<R> { if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser(); const { error } = await supabase.rpc('block_user', { p_other: id }); return error ? { ok: false, error: 'Could not block this user.' } : { ok: true }; }
export async function unblockUser(id: string): Promise<R> { if (!uuid.safeParse(id).success) return bad; const { supabase } = await requireUser(); const { error } = await supabase.rpc('unblock_user', { p_other: id }); return error ? { ok: false, error: 'Could not unblock.' } : { ok: true }; }
export async function reportUser(id: string, reason: string): Promise<R> {
  const r = reason.trim(); if (!uuid.safeParse(id).success || r.length < 5 || r.length > 2000) return { ok: false, error: 'Please describe what happened (at least 5 characters).' };
  if (!rateLimit('report', 10, 60 * 60_000)) return { ok: false, error: 'Too many reports. Try later.' };
  const { supabase, user } = await requireUser(); const { error } = await supabase.from('reports').insert({ reporter_id: user.id, target_user: id, reason: r });
  return error ? { ok: false, error: 'Could not send the report.' } : { ok: true };
}
