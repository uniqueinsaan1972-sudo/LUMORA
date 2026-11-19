
'use client';

import { useEffect, useRef } from 'react';
import { supabaseBrowser } from './supabase/client';

type Sub = {
  table: string;
  filter?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
};

/**
 * Supabase Realtime subscription hook.
 * Registers all listeners before subscribing.
 * Cleans up the channel on dependency changes and unmount.
 */
export function useLive(
  name: string,
  subs: Sub[],
  onChange: (p: any) => void,
  enabled = true
) {
  const cb = useRef(onChange);
  const key = JSON.stringify(subs);

  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || !subs.length) return;

    const sb = supabaseBrowser();
    let ch = sb.channel(name);

    try {
      const subscriptions: Sub[] = JSON.parse(key);

      // Register all Postgres listeners first.
      subscriptions.forEach((s) => {
        ch = ch.on(
          'postgres_changes' as any,
          {
            event: s.event ?? '*',
            schema: 'public',
            table: s.table,
            ...(s.filter ? { filter: s.filter } : {}),
          },
          (payload: any) => {
            cb.current(payload);
          }
        );
      });

      // Subscribe only after all listeners are registered.
      ch.subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime error:', name);
        }
      });
    } catch (error) {
      console.error('Supabase Realtime setup failed:', error);
      void sb.removeChannel(ch);
      return;
    }

    return () => {
      void sb.removeChannel(ch);
    };
  }, [name, key, enabled]);
}
