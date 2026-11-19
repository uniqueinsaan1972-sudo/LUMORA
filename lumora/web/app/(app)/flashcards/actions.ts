'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { flashcardSchema } from '@/lib/validation';
import { nextReview } from '@/lib/scoring';

export async function addCard(fd: FormData) {
  const parsed = flashcardSchema.safeParse({ front: fd.get('front'), back: fd.get('back'), subject: String(fd.get('subject') ?? '') || undefined, chapter: String(fd.get('chapter') ?? '') || undefined });
  if (!parsed.success) return;
  const { supabase, user } = await requireUser();
  await supabase.from('flashcards').insert({ ...parsed.data, owner_id: user.id });
  revalidatePath('/flashcards');
}
export async function editCard(id: string, fd: FormData) {
  const parsed = flashcardSchema.safeParse({ front: fd.get('front'), back: fd.get('back'), subject: String(fd.get('subject') ?? '') || undefined, chapter: String(fd.get('chapter') ?? '') || undefined });
  if (!parsed.success) return;
  const { supabase } = await requireUser();
  await supabase.from('flashcards').update(parsed.data).eq('id', id);
  revalidatePath('/flashcards');
}
export async function deleteCard(id: string) { const { supabase } = await requireUser(); await supabase.from('flashcards').delete().eq('id', id); revalidatePath('/flashcards'); }
export async function bookmarkCard(id: string, v: boolean) { const { supabase } = await requireUser(); await supabase.from('flashcards').update({ bookmarked: v }).eq('id', id); }
/** quality 0..5 -> spaced repetition schedule + learned/revise status */
export async function reviewCard(id: string, quality: number) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) return;
  const { supabase } = await requireUser();
  const { data } = await supabase.from('flashcards').select('ease,interval_days').eq('id', id).single();
  if (!data) return;
  const n = nextReview(Number(data.ease), data.interval_days, quality);
  await supabase.from('flashcards').update({ ease: n.ease, interval_days: n.interval, due_at: new Date(Date.now() + n.interval * 86400000).toISOString(), status: quality >= 4 ? 'learned' : 'revise' }).eq('id', id);
}
