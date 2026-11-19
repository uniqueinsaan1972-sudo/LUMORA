'use server';
import { requireUser } from '@/lib/auth';
export async function saveAnswer(attempt: string, question: string, answer: string) {
  const { supabase } = await requireUser('student');
  const { error } = await supabase.rpc('save_answer', { p_attempt: attempt, p_question: question, p_answer: answer });
  return { ok: !error, error: error?.message };
}
export async function submitAttempt(attempt: string, answers: Record<string, string>) {
  const { supabase } = await requireUser('student');
  const { data, error } = await supabase.rpc('submit_attempt', { p_attempt: attempt, p_answers: answers });
  return { ok: !error, status: data as string | null, error: error?.message };
}
