'use client';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from './Toast';
// reducedMotion="user" makes every framer-motion animation respect the OS "reduce motion" setting.
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user"><ToastProvider>{children}</ToastProvider></MotionConfig>;
}
