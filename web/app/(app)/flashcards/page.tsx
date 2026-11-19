import Link from 'next/link';
import { Brain } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { FlashcardManager } from './FlashcardManager';
export default async function Flashcards({ searchParams }: { searchParams: { subject?: string } }) {
  const { supabase } = await requireUser();
  let q = supabase.from('flashcards').select('id,front,back,subject,chapter,status,bookmarked').order('created_at', { ascending: false }).limit(200);
  if (searchParams.subject) q = q.eq('subject', searchParams.subject);
  const { data } = await q;
  return (<><PageTitle icon={<Brain size={22} />} sub="Front = question or word. Back = answer or meaning.">Flashcards</PageTitle>
    <div className="mb-4 flex gap-2"><Link className="btn" href="/flashcards/practice">Practice mode</Link><Link className="btn btn-ghost" href="/flashcards/practice?mode=revision">Revision mode</Link></div>
    <FlashcardManager cards={(data ?? []) as any} /></>);
}
