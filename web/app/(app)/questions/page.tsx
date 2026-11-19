import { HelpCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PageTitle } from '@/components/ui';
import { QuestionManager } from './QuestionManager';
export default async function Questions({ searchParams }: { searchParams: { q?: string; type?: string; status?: string } }) {
  const { supabase } = await requireUser();
  let q = supabase.from('questions').select('id,type,prompt,options,answer,explanation,subject,important,status').order('created_at', { ascending: false }).limit(100);
  if (searchParams.type) q = q.eq('type', searchParams.type); if (searchParams.status) q = q.eq('status', searchParams.status);
  if (searchParams.q) q = q.ilike('prompt', `%${searchParams.q.replace(/[%_]/g, '')}%`);
  const { data } = await q;
  return (<><PageTitle icon={<HelpCircle size={22} />} sub="Save questions and answers, mark what you’ve learned.">Important Questions</PageTitle>
    <form className="mb-4 flex flex-wrap gap-2" role="search"><input className="input min-w-0 flex-1" name="q" placeholder="Search…" defaultValue={searchParams.q} aria-label="Search questions" />
      <select className="input w-auto" name="status" defaultValue={searchParams.status ?? ''} aria-label="Status"><option value="">Any status</option><option value="new">New</option><option value="learned">Learned</option><option value="revise">Needs revision</option></select><button className="btn btn-ghost">Filter</button></form>
    <QuestionManager questions={(data ?? []) as any} /></>);
}
