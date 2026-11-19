'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
type Res = { ok: boolean; error?: string };
/**
 * Optimistic list state. `mutate` applies the change to the screen immediately, runs the server action, and rolls back (with a toast)
 * if it fails. A `key` blocks duplicate in-flight submissions. When fresh server data arrives (router refresh / revalidation) it is adopted.
 */
export function useList<T extends { id: string }>(server: T[]) {
  const [items, setItems] = useState<T[]>(server); const toast = useToast(); const busy = useRef(new Set<string>()); const ref = useRef(items); ref.current = items;
  useEffect(() => { setItems(server); }, [server]);
  const mutate = useCallback(async <R extends Res>(o: { key?: string; apply: (l: T[]) => T[]; run: () => Promise<R>; success?: string }): Promise<R | null> => {
    if (o.key) { if (busy.current.has(o.key)) return null; busy.current.add(o.key); }
    const prev = ref.current; setItems(o.apply(prev));
    try {
      const r = await o.run();
      if (!r.ok) { setItems(prev); toast.push(r.error ?? 'That did not work. Your change was undone.', 'error'); return r; }
      if (o.success) toast.push(o.success, 'success'); return r;
    } catch { setItems(prev); toast.push('Network problem — your change was not saved.', 'error'); return null; }
    finally { if (o.key) busy.current.delete(o.key); }
  }, [toast]);
  return { items, setItems, mutate };
}
