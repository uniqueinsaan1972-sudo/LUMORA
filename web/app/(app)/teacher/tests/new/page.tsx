import { PlusCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { TestBuilder } from './TestBuilder';
export default async function NewTest() {
  const { supabase, user } = await requireUser('teacher');
  const [{ data: classes }, { data: groups }] = await Promise.all([supabase.from('teacher_classes').select('id,name'), supabase.from('study_groups').select('id,name').eq('owner_id', user.id)]);
  return (<><PageTitle icon={<PlusCircle size={22} />} sub="Correct answers are stored server-side and never sent to students before results are published.">Create Test</PageTitle><TestBuilder classes={classes ?? []} groups={groups ?? []} /></>);
}
