'use server';
import { requireUser } from '@/lib/auth';
export async function submitPractice(subject: string, answers: Record<string, string>) {
  const { supabase } = await requireUser('student');
  const { data, error } = await supabase.rpc('record_practice_quiz', { p_subject: subject.slice(0, 80), p_answers: answers });
  if (error) return { error: 'Could not score this quiz.' } as const;
  const ids = (data.details as { question_id: string }[]).map((d) => d.question_id);
  const { data: qs } = await supabase.from('questions').select('id,answer,explanation').in('id', ids); // revealed only AFTER submission
  return { score: data.score as number, total: data.total as number, details: data.details as { question_id: string; correct: boolean }[], reveal: qs ?? [] } as const;
}
