'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid();
export async function setTestStatus(id: string, status: 'published' | 'cancelled' | 'draft'): Promise<R> {
  if (!uuid.safeParse(id).success || !['published', 'cancelled', 'draft'].includes(status)) return { ok: false, error: 'Invalid request' };
  const { supabase } = await requireUser('teacher');
  if (status === 'published') { const { data: qs } = await supabase.from('test_questions').select('id').eq('test_id', id).limit(1); if (!qs?.length) return { ok: false, error: 'Add questions before publishing.' }; }
  const { data, error } = await supabase.from('teacher_tests').update({ status }).eq('id', id).select('id'); if (error || !data?.length) return { ok: false, error: 'Could not update the test.' };
  revalidatePath('/teacher/tests'); return { ok: true };
}
export async function regenerateTestCode(id: string): Promise<R & { code?: string }> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' }; const { supabase } = await requireUser('teacher'); const { data, error } = await supabase.rpc('regenerate_test_code', { p_test: id });
  return error ? { ok: false, error: 'Could not regenerate the code.' } : { ok: true, code: data as string };
}
export async function publishResults(id: string): Promise<R> {
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request' }; const { supabase } = await requireUser('teacher'); const { error } = await supabase.rpc('publish_results', { p_test: id });
  if (error) return { ok: false, error: /grade all/.test(error.message) ? 'Grade all written answers before publishing.' : /in progress/.test(error.message) ? 'Some students are still taking the test.' : 'Could not publish results.' };
  revalidatePath(`/teacher/tests/${id}`); return { ok: true };
}
