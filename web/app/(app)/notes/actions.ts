'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { noteSchema } from '@/lib/validation';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid();

export async function createNote(): Promise<R & { id?: string }> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('notes').insert({ owner_id: user.id, title: 'Untitled' }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not create the note.' };
  revalidatePath('/notes'); return { ok: true, id: data.id };
}
export async function saveNote(id: string, input: unknown): Promise<R> {
  const parsed = noteSchema.safeParse(input); if (!parsed.success || !uuid.safeParse(id).success) return { ok: false, error: 'Invalid note' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('notes').update(parsed.data).eq('id', id).select('id'); // RLS decides: owner or edit-permission only
  if (error) return { ok: false, error: error.message.includes('only the owner') ? 'Only the owner can change that.' : 'Save failed' };
  if (!data?.length) return { ok: false, error: 'You no longer have permission to edit this note.' };
  revalidatePath('/notes'); return { ok: true };
}
export async function toggleNote(id: string, field: 'pinned' | 'bookmarked' | 'archived', value: boolean): Promise<R> {
  if (!['pinned', 'bookmarked', 'archived'].includes(field) || !uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('notes').update({ [field]: value }).eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not update the note.' };
  revalidatePath('/notes'); return { ok: true };
}
export async function deleteNote(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('notes').delete().eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not delete the note.' };
  revalidatePath('/notes'); return { ok: true };
}
export async function shareNote(noteId: string, type: 'user' | 'group' | 'class', target: string, perm: 'view' | 'edit'): Promise<R> {
  if (!uuid.safeParse(noteId).success || !uuid.safeParse(target).success || !['user', 'group', 'class'].includes(type) || !['view', 'edit'].includes(perm)) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('share_note', { p_note: noteId, p_type: type, p_target: target, p_perm: perm });
  return error ? { ok: false, error: error.message.replace(/^.*?: /, '') } : { ok: true };
}
export async function revokeShare(shareId: string): Promise<R> {
  if (!uuid.safeParse(shareId).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('note_shares').delete().eq('id', shareId).select('id');
  return error || !data?.length ? { ok: false, error: 'Could not revoke access.' } : { ok: true };
}
export async function saveSharedNote(noteId: string): Promise<R & { id?: string }> {
  if (!uuid.safeParse(noteId).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('save_shared_note', { p_note: noteId });
  if (error) return { ok: false, error: 'Could not save a copy.' }; revalidatePath('/notes'); return { ok: true, id: data as string };
}
