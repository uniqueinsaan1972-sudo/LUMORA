'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
export async function joinTestByCode(code: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const c = code.trim(); if (c.length < 4 || c.length > 20) return { ok: false, error: 'Enter a valid test code.' };
  const { supabase } = await requireUser('student'); const { data, error } = await supabase.rpc('join_test_by_code', { p_code: c });
  if (error) return { ok: false, error: /too many/.test(error.message) ? 'Too many wrong codes. Try again in a few minutes.' : 'Could not join the test.' };
  if (!data) return { ok: false, error: 'That test code is not valid.' }; revalidatePath('/quizzes'); return { ok: true, id: data as string };
}
