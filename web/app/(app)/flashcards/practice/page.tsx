import { requireUser } from '@/lib/auth';
import { Brain } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';
import { Practice } from './Practice';
export default async function PracticePage({ searchParams }: { searchParams: { mode?: string } }) {
  const { supabase } = await requireUser();
  const revision = searchParams.mode === 'revision';
  let q = supabase.from('flashcards').select('id,front,back,bookmarked,status').limit(200);
  q = revision ? q.or(`status.eq.revise,due_at.lte.${new Date().toISOString()}`) : q;
  const { data } = await q;
  return (<><PageTitle icon={<Brain size={22} />} sub={revision ? 'Cards that need revision or are due.' : 'All your cards.'}>{revision ? 'Revision mode' : 'Practice mode'}</PageTitle>
    {!data?.length ? <Empty>{revision ? 'Nothing due for revision — nice work.' : 'Add some flashcards first.'}</Empty> : <Practice cards={data} />}</>);
}
