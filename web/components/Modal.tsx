'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false); const box = useRef<HTMLDivElement>(null); useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return; const prev = document.activeElement as HTMLElement | null; setTimeout(() => box.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 50);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab' && box.current) { const f = box.current.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'); if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } };
    window.addEventListener('keydown', key); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>{open && (
      <motion.div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <motion.div ref={box} role="dialog" aria-modal="true" aria-label={title} className={`glass relative my-auto w-full ${wide ? 'max-w-2xl' : 'max-w-md'} !p-5 sm:!p-6`} style={{ background: 'var(--surface-2)' }}
          initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">{title}</h2><button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
          {children}
        </motion.div></motion.div>)}</AnimatePresence>, document.body);
}
