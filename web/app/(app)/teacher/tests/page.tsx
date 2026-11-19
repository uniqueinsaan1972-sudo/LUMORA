import { ClipboardList } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { LiveRefresh } from '@/components/LiveRefresh';
import { TeacherTests } from './TeacherTests';
export default async function Tests() {
  const { supabase } = await requireUser('teacher');
  const { data } = await supabase.from('teacher_tests').select('id,title,status,opens_at,closes_at,results_published,access_code').order('created_at', { ascending: false });
  return (<><LiveRefresh name="teacher-tests" tables={['test_attempts']} /><PageTitle icon={<ClipboardList size={22} />} sub="Share a test’s access code with students so they can join it.">Manage Tests</PageTitle><TeacherTests initial={(data ?? []) as any} /></>);
}
