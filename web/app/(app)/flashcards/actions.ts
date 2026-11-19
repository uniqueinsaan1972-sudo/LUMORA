'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { flashcardSchema } from '@/lib/validation';
import { nextReview } from '@/lib/scoring';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid();

export async function addCard(input: unknown): Promise<R & { id?: string }> {
  const p = flashcardSchema.safeParse(input); if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Invalid card' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('flashcards').insert({ ...p.data, owner_id: user.id }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not add the card.' };
  revalidatePath('/flashcards'); return { ok: true, id: data.id };
}
export async function editCard(id: string, input: unknown): Promise<R> {
  const p = flashcardSchema.safeParse(input); if (!p.success || !uuid.safeParse(id).success) return { ok: false, error: 'Invalid card' };
  const { supabase } = await requireUser(); const { data, error } = await supabase.from('flashcards').update(p.data).eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not save the card.' }; revalidatePath('/flashcards'); return { ok: true };
}
export async function deleteCard(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser(); const { data, error } = await supabase.from('flashcards').delete().eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not delete the card.' }; revalidatePath('/flashcards'); return { ok: true };
}
export async function bookmarkCard(id: string, v: boolean) { const { supabase } = await requireUser(); await supabase.from('flashcards').update({ bookmarked: v }).eq('id', id); revalidatePath('/flashcards'); }
/** quality 0..5 -> spaced repetition schedule + learned/revise status */
export async function reviewCard(id: string, quality: number) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5 || !uuid.safeParse(id).success) return;
  const { supabase } = await requireUser();
  const { data } = await supabase.from('flashcards').select('ease,interval_days').eq('id', id).single(); if (!data) return;
  const n = nextReview(Number(data.ease), data.interval_days, quality);
  await supabase.from('flashcards').update({ ease: n.ease, interval_days: n.interval, due_at: new Date(Date.now() + n.interval * 86400000).toISOString(), status: quality >= 4 ? 'learned' : 'revise' }).eq('id', id);
  revalidatePath('/flashcards');
}
