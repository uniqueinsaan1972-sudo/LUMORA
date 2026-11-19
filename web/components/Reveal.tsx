'use client';
import { motion, animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
const ease = [0.2, 0.8, 0.2, 1] as const;
/** Fade + slide-up when scrolled into view (once). Use `delay` to stagger siblings. */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay, ease }}>{children}</motion.div>;
}
/** Number that counts up when visible. Final text is always the real value (also for reduced motion / no-JS). */
export function CountUp({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null); const inView = useInView(ref, { once: true }); const reduce = useReducedMotion();
  const [n, setN] = useState(value);
  useEffect(() => {
    if (!inView || reduce) { setN(value); return; }
    const c = animate(0, value, { duration: 1.1, ease, onUpdate: (v) => setN(v) }); return () => c.stop();
  }, [inView, value, reduce]);
  return <span ref={ref}>{n.toFixed(decimals)}{suffix}</span>;
}
