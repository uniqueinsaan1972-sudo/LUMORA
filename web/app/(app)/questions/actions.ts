'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { questionSchema } from '@/lib/validation';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid();
export async function addQuestion(input: unknown): Promise<R & { id?: string }> {
  const p = questionSchema.safeParse(input); if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Invalid question' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('questions').insert({ ...p.data, owner_id: user.id, options: p.data.options ?? null }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not save the question.' }; revalidatePath('/questions'); return { ok: true, id: data.id };
}
export async function setQuestionFlag(id: string, patch: { important?: boolean; bookmarked?: boolean; status?: 'new' | 'learned' | 'revise' }): Promise<R> {
  const p = z.object({ important: z.boolean().optional(), bookmarked: z.boolean().optional(), status: z.enum(['new', 'learned', 'revise']).optional() }).safeParse(patch);
  if (!p.success || !uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser(); const { data, error } = await supabase.from('questions').update(p.data).eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not update the question.' }; revalidatePath('/questions'); return { ok: true };
}
export async function deleteQuestion(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser(); const { data, error } = await supabase.from('questions').delete().eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not delete the question.' }; revalidatePath('/questions'); return { ok: true };
}
