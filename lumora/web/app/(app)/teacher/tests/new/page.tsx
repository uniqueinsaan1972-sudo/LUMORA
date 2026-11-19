import { requireUser } from '@/lib/auth';
import { PlusCircle } from 'lucide-react';
import { PageTitle } from '@/components/ui';
import { TestBuilder } from './TestBuilder';
export default async function NewTest() {
  const { supabase } = await requireUser('teacher');
  const { data: classes } = await supabase.from('teacher_classes').select('id,name');
  return (<><PageTitle icon={<PlusCircle size={22} />} sub="Correct answers are stored server-side and never sent to students.">Create Test</PageTitle><TestBuilder classes={classes ?? []} /></>);
}
