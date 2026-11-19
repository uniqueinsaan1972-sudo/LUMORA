'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
export function NotificationBell({ userId, initial }: { userId: string; initial: number }) {
  const [n, setN] = useState(initial);
  const refresh = useCallback(async () => { const { count } = await supabaseBrowser().from('notifications').select('id', { count: 'exact', head: true }).eq('read', false); setN(count ?? 0); }, []);
  useEffect(() => { setN(initial); }, [initial]);
  useLive('bell-' + userId, [{ table: 'notifications', filter: `user_id=eq.${userId}` }], () => void refresh());
  return (
    <Link href="/notifications" className="btn btn-ghost relative !p-2" aria-label={n ? `Notifications, ${n} unread` : 'Notifications'}>
      <Bell size={16} />{n > 0 && <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{n > 99 ? '99+' : n}</span>}
    </Link>
  );
}
