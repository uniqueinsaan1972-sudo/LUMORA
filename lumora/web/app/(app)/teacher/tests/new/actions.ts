'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
const schema = z.object({
  title: z.string().trim().min(1).max(200), instructions: z.string().max(5000).optional(), subject: z.string().max(80).optional(),
  duration_minutes: z.number().int().min(1).max(600), passing_marks: z.number().min(0), opens_at: z.string().datetime(), closes_at: z.string().datetime(),
  class_ids: z.array(z.string().uuid()).min(1, 'Select at least one class'),
  questions: z.array(z.object({ kind: z.enum(['mcq', 'true_false', 'short', 'long']), prompt: z.string().trim().min(1).max(5000), options: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
    correct_answer: z.string().max(5000).optional(), marks: z.number().positive().max(1000), explanation: z.string().max(5000).optional() })
    .refine((q) => q.kind !== 'mcq' || (q.options && q.options.length >= 2 && q.correct_answer && q.options.includes(q.correct_answer)), 'MCQ needs options and a matching correct answer')
    .refine((q) => q.kind !== 'true_false' || ['True', 'False'].includes(q.correct_answer ?? ''), 'True/False needs True or False')).min(1).max(200),
}).refine((t) => new Date(t.closes_at) > new Date(t.opens_at), 'Closing time must be after opening time');

export async function createTest(input: unknown, publish: boolean): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid test' };
  const t = parsed.data; const { supabase, user } = await requireUser('teacher');
  const { data: test, error } = await supabase.from('teacher_tests').insert({ teacher_id: user.id, title: t.title, instructions: t.instructions || null, subject: t.subject || null,
    duration_minutes: t.duration_minutes, passing_marks: t.passing_marks, opens_at: t.opens_at, closes_at: t.closes_at, status: publish ? 'published' : 'draft' }).select('id').single();
  if (error || !test) return { error: 'Could not create test' };
  const { error: e2 } = await supabase.from('test_questions').insert(t.questions.map((q, i) => ({ test_id: test.id, position: i + 1, kind: q.kind, prompt: q.prompt, options: q.options ?? null,
    correct_answer: q.correct_answer ?? null, marks: q.marks, explanation: q.explanation ?? null })));
  const { error: e3 } = await supabase.from('test_assignments').insert(t.class_ids.map((c) => ({ test_id: test.id, class_id: c }))); // RLS rejects classes the teacher doesn't own
  if (e2 || e3) { await supabase.from('teacher_tests').delete().eq('id', test.id); return { error: 'Could not save questions or class assignment' }; }
  redirect('/teacher/tests');
}
