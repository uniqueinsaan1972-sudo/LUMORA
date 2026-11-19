'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  function toggle() {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('lumora-theme', next ? 'dark' : 'light'); } catch {}
  }
  return (
    <button className="btn btn-ghost !p-2" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? 'd' : 'l'} initial={{ rotate: -80, opacity: 0, scale: .6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 80, opacity: 0, scale: .6 }} transition={{ duration: .18 }} className="grid">
          {dark ? <Sun size={16} /> : <Moon size={16} />}</motion.span>
      </AnimatePresence>
    </button>
  );
}
