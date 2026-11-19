'use client';
import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from './Toast';

async function sniff(file: File): Promise<'jpg' | 'png' | 'webp' | null> {   // validate real content, not just the extension
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp';
  return null;
}
export function AvatarUpload({ userId, name, initialUrl, onChange }: { userId: string; name: string; initialUrl?: string | null; onChange?: (url: string) => void }) {
  const [url, setUrl] = useState(initialUrl ?? ''); const [busy, setBusy] = useState(false); const input = useRef<HTMLInputElement>(null); const toast = useToast();
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.push('Please choose an image under 2 MB.', 'error');
    const ext = await sniff(f); if (!ext) return toast.push('Only JPG, PNG or WebP images are allowed.', 'error');
    setBusy(true); const sb = supabaseBrowser(); const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, f, { contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`, upsert: false });
    if (error) { setBusy(false); return toast.push('Upload failed. Please try again.', 'error'); }
    const { data } = sb.storage.from('avatars').getPublicUrl(path); setUrl(data.publicUrl); onChange?.(data.publicUrl); setBusy(false); toast.push('Photo uploaded — remember to save.', 'success');
  }
  return (
    <div className="flex items-center gap-4"><Avatar name={name} url={url} size={72} />
      <div><button type="button" className="btn btn-ghost" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}{url ? 'Change photo' : 'Add photo'}</button>
        <p className="muted mt-1 text-xs">JPG, PNG or WebP, max 2 MB. Visible to people who can find you.</p></div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} /><input type="hidden" name="avatar_url" value={url} /></div>
  );
}
