'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { noteSchema } from '@/lib/validation';

export async function createNote() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('notes').insert({ owner_id: user.id, title: 'Untitled' }).select('id').single();
  if (error || !data) throw new Error('Could not create note');
  redirect(`/notes/${data.id}`);
}
export async function saveNote(id: string, input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid note' };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('notes').update(parsed.data).eq('id', id).eq('owner_id', user.id); // RLS also enforces ownership
  return error ? { ok: false, error: 'Save failed' } : { ok: true };
}
export async function toggleNote(id: string, field: 'pinned' | 'bookmarked' | 'archived', value: boolean) {
  if (!['pinned', 'bookmarked', 'archived'].includes(field)) return;
  const { supabase } = await requireUser();
  await supabase.from('notes').update({ [field]: value }).eq('id', id);
  revalidatePath('/notes');
}
export async function deleteNote(id: string) {
  const { supabase } = await requireUser();
  await supabase.from('notes').delete().eq('id', id);
  redirect('/notes');
}
