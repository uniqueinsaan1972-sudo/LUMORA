'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; kind: Kind };
const Ctx = createContext<{ push: (message: string, kind?: Kind) => void }>({ push: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]); const n = useRef(0);
  const push = useCallback((message: string, kind: Kind = 'info') => {
    const id = ++n.current; setList((l) => [...l.slice(-3), { id, message, kind }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2" role="region" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {list.map((t) => { const I = Icon[t.kind]; return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: .96 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role={t.kind === 'error' ? 'alert' : 'status'} className="glass pointer-events-auto flex items-start gap-3 !p-3 text-sm">
              <I size={18} className={t.kind === 'error' ? 'text-red-400' : t.kind === 'success' ? 'text-emerald-400' : 'text-sky-400'} aria-hidden />
              <span className="flex-1">{t.message}</span></motion.div>); })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
