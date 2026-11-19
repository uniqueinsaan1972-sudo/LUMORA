import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { Languages } from 'lucide-react';
import { Empty, PageTitle } from '@/components/ui';

type Entry = { word: string; phonetic?: string; audio?: string; meaning?: string; example?: string; synonyms: string[]; antonyms: string[] } | null;
async function lookup(word: string): Promise<Entry> {
  // Real source: dictionaryapi.dev (English). Nothing is invented — if it's missing, we show nothing.
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/v2/entries/en/${encodeURIComponent(word)}`, { next: { revalidate: 86400 } });
    if (!r.ok) return null; const j: any[] = await r.json(); const e = j[0]; const m = e?.meanings?.[0]; const d = m?.definitions?.[0];
    return { word: e.word, phonetic: e.phonetic, audio: e.phonetics?.find((p: any) => p.audio)?.audio, meaning: d?.definition, example: d?.example, synonyms: (m?.synonyms ?? []).slice(0, 8), antonyms: (m?.antonyms ?? []).slice(0, 8) };
  } catch { return null; }
}
async function save(fd: FormData) {
  'use server';
  const word = String(fd.get('word') ?? '').trim().toLowerCase().slice(0, 80); if (!word) return;
  const { supabase, user } = await requireUser();
  await supabase.from('vocabulary_words').upsert({ owner_id: user.id, word, meaning: String(fd.get('meaning') ?? '').slice(0, 2000) || null, meaning_ur: String(fd.get('meaning_ur') ?? '').slice(0, 2000) || null,
    example: String(fd.get('example') ?? '').slice(0, 500) || null, source: fd.get('source') === 'dictionaryapi.dev' ? 'dictionaryapi.dev' : 'user' }, { onConflict: 'owner_id,word' });
  revalidatePath('/vocabulary');
}
async function del(id: string) { 'use server'; const { supabase } = await requireUser(); await supabase.from('vocabulary_words').delete().eq('id', id); revalidatePath('/vocabulary'); }

export default async function Vocabulary({ searchParams }: { searchParams: { w?: string } }) {
  const { supabase } = await requireUser();
  const word = (searchParams.w ?? '').trim().slice(0, 40); const found = word && rateLimit('dict', 30, 60_000) ? await lookup(word) : null;
  const { data: words } = await supabase.from('vocabulary_words').select('*').order('created_at', { ascending: false }).limit(200);
  const wod = words?.length ? words[Math.floor(Date.now() / 86400000) % words.length] : null;
  return (<><PageTitle icon={<Languages size={22} />} sub="English dictionary lookup + your own words. Add Urdu meanings yourself.">Vocabulary Lab</PageTitle>
    <form className="mb-4 flex gap-2" role="search"><input className="input" name="w" placeholder="Search an English word" defaultValue={word} /><button className="btn">Search</button></form>
    {word && !found && <Empty>No dictionary entry found for “{word}”. You can still save it with your own meaning below.</Empty>}
    <form action={save} className="card mb-6 grid gap-2"><h2 className="font-semibold">{found ? found.word : 'Add / save a word'} {found?.phonetic && <span className="muted text-sm">{found.phonetic}</span>}</h2>
      {found?.audio && <audio controls src={found.audio} className="h-8" />}{found && <input type="hidden" name="source" value="dictionaryapi.dev" />}
      {found && (found.synonyms.length > 0 || found.antonyms.length > 0) && <p className="muted text-sm">{found.synonyms.length > 0 && `Synonyms: ${found.synonyms.join(', ')}. `}{found.antonyms.length > 0 && `Antonyms: ${found.antonyms.join(', ')}.`}</p>}
      <input className="input" name="word" placeholder="Word" defaultValue={found?.word ?? word} required /><textarea className="input" name="meaning" placeholder="English meaning" defaultValue={found?.meaning ?? ''} />
      <textarea className="input" name="meaning_ur" dir="rtl" placeholder="اردو معنی (آپ خود لکھیں)" /><input className="input" name="example" placeholder="Example sentence" defaultValue={found?.example ?? ''} /><button className="btn w-fit">Save word</button></form>
    {wod && <p className="card mb-4"><b>Word of the day (from your list):</b> {wod.word} — {wod.meaning}</p>}
    {!words?.length ? <Empty>No saved words yet.</Empty> : <ul className="space-y-2">{words.map((w) => (<li key={w.id} className="card flex justify-between gap-2"><span><b>{w.word}</b> — {w.meaning}{w.meaning_ur && <span dir="rtl" className="font-urdu"> · {w.meaning_ur}</span>}</span><form action={del.bind(null, w.id)}><button className="btn btn-ghost">Delete</button></form></li>))}</ul>}</>);
}
