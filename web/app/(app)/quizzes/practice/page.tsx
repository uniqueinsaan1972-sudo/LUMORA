import { requireUser } from '@/lib/auth';
import { GraduationCap } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
import { PracticeQuiz } from './PracticeQuiz';
export default async function PracticeQuizPage({ searchParams }: { searchParams: { subject?: string; n?: string } }) {
  const { supabase } = await requireUser('student');
  const n = Math.min(50, Math.max(1, Number(searchParams.n) || 10));
  // NOTE: the answer column is deliberately NOT selected — correct answers are not sent to the browser before submission.
  let q = supabase.from('questions').select('id,prompt,options,subject,status').eq('type', 'mcq').limit(200);
  if (searchParams.subject) q = q.eq('subject', searchParams.subject);
  const { data } = await q;
  const pool = (data ?? []).sort((a, b) => (a.status === 'revise' ? -1 : 0) - (b.status === 'revise' ? -1 : 0) || Math.random() - 0.5).slice(0, n);
  return (<><PageTitle icon={<GraduationCap size={22} />}>Practice quiz</PageTitle>{pool.length ? <PracticeQuiz questions={pool as any} subject={searchParams.subject ?? ''} /> : <Empty>Add multiple-choice questions to Important Questions first.</Empty>}</>);
}
