import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Attempt } from './Attempt';
export default async function AttemptPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireUser('student');
  const { data, error } = await supabase.rpc('get_attempt', { p_attempt: params.id });
  if (error || !data) notFound();
  if (data.attempt.status !== 'in_progress') redirect(data.test.results_published ? `/tests/attempt/${params.id}/result` : '/quizzes');
  return <Attempt data={data} />;
}
