import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { ClassesClient } from './ClassesClient';
export default async function Classes() {
  const { supabase, profile } = await requireUser('student'); const { data } = await supabase.rpc('my_classes');
  return (<><PageTitle icon={<BookOpen size={22} />} sub="Join your teacher’s class with its code to receive tests and material.">My Classes</PageTitle><ClassesClient userId={profile.id} initial={(data ?? []) as any} /></>);
}
