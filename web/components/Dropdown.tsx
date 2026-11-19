'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; icon?: React.ReactNode };
/** Accessible animated menu: click outside / Esc closes, arrow keys move between items. */
export function Dropdown({ items, label = 'More actions', trigger }: { items: MenuItem[]; label?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return; const click = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []); const i = els.indexOf(document.activeElement as HTMLElement); els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus(); } };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key); setTimeout(() => root.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 30);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div className="relative" ref={root}>
      <button className="btn btn-ghost !p-2" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>{trigger ?? <MoreVertical size={16} />}</button>
      <AnimatePresence>{open && (
        <motion.div role="menu" className="glass absolute end-0 z-50 mt-2 min-w-44 !p-1.5" style={{ background: 'var(--surface-2)' }} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.14 }}>
          {items.map((it) => <button key={it.label} role="menuitem" className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium hover:bg-[rgba(var(--glow),.14)] ${it.danger ? 'text-red-400' : ''}`} onClick={() => { setOpen(false); it.onSelect(); }}>{it.icon}{it.label}</button>)}
        </motion.div>)}</AnimatePresence>
    </div>
  );
}
