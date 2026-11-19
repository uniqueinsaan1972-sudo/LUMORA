'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from './supabase/client';
/** Online presence via Supabase Realtime. A user only broadcasts presence if THEIR privacy setting allows it, and only friends are ever shown. */
export function usePresence(meId: string, share: boolean) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  useEffect(() => {
    const sb = supabaseBrowser(); const ch = sb.channel('lumora-presence', { config: { presence: { key: meId } } });
    ch.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState()))));
    ch.subscribe(async (status) => { if (status === 'SUBSCRIBED' && share) await ch.track({ at: Date.now() }); });
    return () => { sb.removeChannel(ch); };
  }, [meId, share]);
  return online;
}
