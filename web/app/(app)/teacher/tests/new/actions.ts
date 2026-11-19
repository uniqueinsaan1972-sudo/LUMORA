'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
const q = z.object({ kind: z.enum(['mcq', 'true_false', 'fill_blank', 'short', 'long', 'definition']), prompt: z.string().trim().min(1, 'Every question needs text').max(5000), options: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
  correct_answer: z.string().max(5000).optional(), marks: z.number().positive().max(1000), explanation: z.string().max(5000).optional() })
  .refine((x) => x.kind !== 'mcq' || (x.options && x.options.length >= 2 && x.correct_answer && x.options.includes(x.correct_answer)), 'MCQ needs 2+ options and a correct answer that matches one')
  .refine((x) => x.kind !== 'true_false' || ['True', 'False'].includes(x.correct_answer ?? ''), 'True/False needs True or False')
  .refine((x) => x.kind !== 'fill_blank' || !!x.correct_answer?.trim(), 'Fill-in-the-blank needs the accepted answer(s)');
const schema = z.object({
  title: z.string().trim().min(1, 'Enter a test title').max(200), description: z.string().max(2000).optional(), instructions: z.string().max(5000).optional(), subject: z.string().max(80).optional(),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(600), passing_marks: z.number().min(0), opens_at: z.string().datetime({ message: 'Choose when the test opens' }), closes_at: z.string().datetime({ message: 'Choose when the test closes' }),
  class_ids: z.array(z.string().uuid()).max(50), group_ids: z.array(z.string().uuid()).max(50), questions: z.array(q).min(1, 'Add at least one question').max(200),
}).refine((t) => new Date(t.closes_at) > new Date(t.opens_at), { message: 'Closing time must be after opening time' })
  .refine((t) => t.passing_marks <= t.questions.reduce((a, x) => a + x.marks, 0), { message: 'Passing marks cannot exceed total marks' });

export async function createTest(input: unknown, publish: boolean): Promise<{ ok: boolean; error?: string; id?: string }> {
  const parsed = schema.safeParse(input); if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid test' };
  const t = parsed.data; const { supabase, user } = await requireUser('teacher');
  const { data: test, error } = await supabase.from('teacher_tests').insert({ teacher_id: user.id, title: t.title, description: t.description || null, instructions: t.instructions || null, subject: t.subject || null, duration_minutes: t.duration_minutes,
    passing_marks: t.passing_marks, opens_at: t.opens_at, closes_at: t.closes_at, status: 'draft' }).select('id').single();   // created as draft so students are only notified after assignments exist
  if (error || !test) return { ok: false, error: 'Could not create the test.' };
  const fail = async () => { await supabase.from('teacher_tests').delete().eq('id', test.id); return { ok: false as const, error: 'Could not save the questions or assignments.' }; };
  const { error: e2 } = await supabase.from('test_questions').insert(t.questions.map((x, i) => ({ test_id: test.id, position: i + 1, kind: x.kind, prompt: x.prompt, options: x.options ?? null, correct_answer: x.correct_answer ?? null, marks: x.marks, explanation: x.explanation ?? null })));
  if (e2) return fail();
  if (t.class_ids.length) { const { error: e3 } = await supabase.from('test_assignments').insert(t.class_ids.map((c) => ({ test_id: test.id, class_id: c }))); if (e3) return fail(); }
  if (t.group_ids.length) { const { error: e4 } = await supabase.from('test_group_assignments').insert(t.group_ids.map((g) => ({ test_id: test.id, group_id: g }))); if (e4) return fail(); }
  if (publish) { const { error: e5 } = await supabase.from('teacher_tests').update({ status: 'published' }).eq('id', test.id); if (e5) return fail(); }
  revalidatePath('/teacher/tests'); revalidatePath('/dashboard'); return { ok: true, id: test.id };
}
