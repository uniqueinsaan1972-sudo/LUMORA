'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }:
  { open: boolean; title: string; body?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const ok = useRef<HTMLButtonElement>(null); const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return; const prev = document.activeElement as HTMLElement | null; ok.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onCancel(); window.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onCancel]);
  if (!mounted) return null; // avoid SSR/hydration mismatch for the portal
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onCancel} aria-hidden />
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" className="glass relative w-full max-w-md !p-6" style={{ background: 'var(--surface-2)' }}
            initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .97 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <h2 id="dlg-title" className="text-lg font-bold">{title}</h2>
            {body && <div className="muted mt-2 text-sm">{body}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
              <button ref={ok} className="btn" style={danger ? { background: 'linear-gradient(135deg,#ef4444,#be123c)', color: '#fff' } : undefined} onClick={onConfirm}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>)}
    </AnimatePresence>, document.body);
}
