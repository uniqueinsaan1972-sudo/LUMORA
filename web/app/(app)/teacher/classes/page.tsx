import { BookOpen } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { TeacherClasses } from './TeacherClasses';
export default async function Classes() {
  const { supabase } = await requireUser('teacher'); const { data } = await supabase.rpc('my_classes');
  return (<><PageTitle icon={<BookOpen size={22} />} sub="Create classes, share the code, manage students and tests.">My Classes</PageTitle><TeacherClasses initial={(data ?? []) as any} /></>);
}
