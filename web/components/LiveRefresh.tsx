'use client';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useLive } from '@/lib/useLive';
/** Re-fetches the current server-rendered page (no full reload) when the listed tables change — keeps dashboards and teacher lists live. */
export function LiveRefresh({ name, tables }: { name: string; tables: string[] }) {
  const router = useRouter(); const t = useRef<ReturnType<typeof setTimeout>>();
  useLive(name, tables.map((table) => ({ table })), () => { clearTimeout(t.current); t.current = setTimeout(() => router.refresh(), 300); });
  return null;
}
