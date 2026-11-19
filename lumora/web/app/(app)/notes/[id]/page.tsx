import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { NoteEditor } from './NoteEditor';
export default async function NotePage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase } = await requireUser();
  const { data } = await supabase.from('notes').select('*').eq('id', params.id).maybeSingle(); // RLS: only the owner's row is visible
  if (!data) notFound();
  return <NoteEditor note={data} />;
}
