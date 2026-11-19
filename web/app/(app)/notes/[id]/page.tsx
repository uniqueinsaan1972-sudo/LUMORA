import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { NoteEditor } from './NoteEditor';
export default async function NotePage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { supabase } = await requireUser();
  const { data } = await supabase.from('notes').select('*').eq('id', params.id).maybeSingle(); // RLS: owner, or someone it was shared with
  if (!data) notFound();
  const { data: access } = await supabase.rpc('note_access', { p_note: params.id });
  return <NoteEditor note={data} access={(access as 'owner' | 'edit' | 'view') ?? 'view'} />;
}
