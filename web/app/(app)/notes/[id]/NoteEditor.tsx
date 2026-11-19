'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteNote, saveNote } from '../actions';
import { ShareDialog } from './ShareDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Check, Loader2, AlertTriangle, Pencil, Share2, Eye } from 'lucide-react';

type Note = { id: string; title: string; body: string; subject: string | null; chapter: string | null; folder: string | null; tags: string[] };
type Status = 'saved' | 'saving' | 'unsaved' | 'error';

export function NoteEditor({ note, access }: { note: Note; access: 'owner' | 'edit' | 'view' }) {
  const router = useRouter(); const [shareOpen, setShareOpen] = useState(false); const readOnly = access === 'view'; const isOwner = access === 'owner';
  const [f, setF] = useState({ title: note.title, body: note.body, subject: note.subject ?? '', chapter: note.chapter ?? '', folder: note.folder ?? '', tags: note.tags.join(', ') });
  const [status, setStatus] = useState<Status>('saved'); const [ask, setAsk] = useState(false); const toast = useToast();
  const first = useRef(true); const latest = useRef(f); latest.current = f;

  async function persist(manual = false) {
    setStatus('saving');
    const v = latest.current;
    const res = await saveNote(note.id, { title: v.title, body: v.body, subject: v.subject || undefined, chapter: v.chapter || undefined, folder: v.folder || undefined,
      tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20) });
    setStatus(res.ok ? 'saved' : 'error');
    if (!res.ok) toast.push('Could not save your note. Check your connection and try again.', 'error'); else if (manual) toast.push('Note saved', 'success');
  }
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus('unsaved'); const h = setTimeout(persist, 1200); return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status === 'unsaved' || status === 'error') e.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const label = { saved: 'All changes saved', saving: 'Saving…', unsaved: 'Unsaved changes', error: 'Save failed — retrying on next edit' }[status];
  return (
    <div className="space-y-4">
      <ConfirmDialog open={ask} danger title="Delete this note?" body="This permanently deletes the note. This can’t be undone." confirmLabel="Delete note" onCancel={() => setAsk(false)} onConfirm={async () => { setAsk(false); const r = await deleteNote(note.id); if (r.ok) { toast.push('Note deleted', 'success'); router.push('/notes'); } else toast.push(r.error ?? 'Could not delete', 'error'); }} />
      <ShareDialog noteId={note.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      {!isOwner && <p className="badge"><Eye size={12} />{readOnly ? 'Shared with you — view only. Use “Save copy” in Shared notes to keep your own version.' : 'Shared with you — you can edit the content.'}</p>}
      <div className="flex items-center justify-between"><p role="status" className={`flex items-center gap-2 text-sm ${status === 'error' ? 'text-red-400' : 'muted'}`}>{status === 'saving' ? <Loader2 size={14} className="animate-spin" /> : status === 'saved' ? <Check size={14} className="text-emerald-400" /> : status === 'error' ? <AlertTriangle size={14} /> : <Pencil size={14} />}{label}</p>
        <div className="flex gap-2">{!readOnly && <button className="btn" onClick={() => persist(true)}>Save now</button>}
          {isOwner && <button className="btn btn-ghost" onClick={() => setShareOpen(true)}><Share2 size={14} />Share</button>}
          {isOwner && <button className="btn btn-ghost" onClick={() => setAsk(true)}>Delete</button>}</div></div>
      <input className="input font-display !text-2xl font-extrabold" aria-label="Title" value={f.title} onChange={set('title')} maxLength={200} readOnly={readOnly} />
      <div className="card grid gap-2 !p-3 sm:grid-cols-4">
        <input className="input" placeholder="Subject" value={f.subject} onChange={set('subject')} maxLength={80} readOnly={readOnly} />
        <input className="input" placeholder="Chapter / topic" value={f.chapter} onChange={set('chapter')} maxLength={120} readOnly={readOnly} />
        <input className="input" placeholder="Folder" value={f.folder} onChange={set('folder')} maxLength={80} readOnly={readOnly || !isOwner} />
        <input className="input" placeholder="Tags, comma separated" value={f.tags} onChange={set('tags')} readOnly={readOnly} />
      </div>
      <textarea className="input min-h-[50vh] font-mono text-sm" aria-label="Note body" value={f.body} onChange={set('body')} maxLength={100000} readOnly={readOnly} placeholder="Write your note… (plain text; rendered as text, never as HTML)" />
    </div>
  );
}
