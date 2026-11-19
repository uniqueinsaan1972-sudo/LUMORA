'use client';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './Toast';
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false); const toast = useToast();
  return <button type="button" className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); toast.push('Copied to clipboard', 'success'); setTimeout(() => setDone(false), 1500); } catch { toast.push('Could not copy — select and copy manually.', 'error'); } }}>{done ? <Check size={14} /> : <Copy size={14} />}{label}</button>;
}
