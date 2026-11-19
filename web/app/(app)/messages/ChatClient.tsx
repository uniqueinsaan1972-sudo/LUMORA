'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, Check, CheckCheck, Flag, Loader2, Send, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Dropdown } from '@/components/Dropdown';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';
import { usePresence } from '@/lib/usePresence';
import { blockUser, reportUser } from '../friends/actions';

type Convo = { id: string; display_name: string; username: string | null; avatar_url: string | null; show_online: boolean; last_body: string | null; last_at: string | null; last_mine: boolean | null; unread: number };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; state?: 'sending' | 'failed' };
const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

export function ChatClient({ me, initial, initialWith }: { me: { id: string; showOnline: boolean }; initial: Convo[]; initialWith: string | null }) {
  const toast = useToast(); const [convos, setConvos] = useState<Convo[]>(initial); const [active, setActive] = useState<string | null>(initialWith); const [msgs, setMsgs] = useState<Msg[]>([]); const [loading, setLoading] = useState(false);
  const [text, setText] = useState(''); const [typing, setTyping] = useState(false); const [blockAsk, setBlockAsk] = useState(false); const [report, setReport] = useState(false); const [reason, setReason] = useState('');
  const online = usePresence(me.id, me.showOnline); const bottom = useRef<HTMLDivElement>(null); const activeRef = useRef(active); activeRef.current = active; const typingTimer = useRef<ReturnType<typeof setTimeout>>(); const lastTyped = useRef(0); const chan = useRef<any>(null);
  const cur = convos.find((c) => c.id === active) ?? null;

  const reloadConvos = useCallback(async () => { const { data } = await supabaseBrowser().rpc('conversation_list'); if (data) setConvos(data as Convo[]); }, []);
  const markRead = useCallback(async (other: string) => { await supabaseBrowser().rpc('mark_conversation_read', { p_other: other }); setConvos((l) => l.map((c) => (c.id === other ? { ...c, unread: 0 } : c))); }, []);

  useEffect(() => {   // load a thread
    if (!active) { setMsgs([]); return; } let live = true; setLoading(true); const sb = supabaseBrowser();
    (async () => {
      const { data } = await sb.from('messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(`and(sender_id.eq.${me.id},recipient_id.eq.${active}),and(sender_id.eq.${active},recipient_id.eq.${me.id})`).order('created_at', { ascending: false }).limit(60);
      if (!live) return; setMsgs(((data ?? []) as Msg[]).reverse()); setLoading(false); void markRead(active);
    })(); return () => { live = false; };
  }, [active, me.id, markRead]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, typing]);

  // incoming messages + read receipts (Realtime, filtered by RLS on the server)
  useLive('chat-in-' + me.id, [{ table: 'messages', event: 'INSERT', filter: `recipient_id=eq.${me.id}` }], (p) => {
    const m = p.new as Msg;
    if (m.sender_id === activeRef.current) { setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m])); void markRead(m.sender_id); setConvos((l) => l.map((c) => (c.id === m.sender_id ? { ...c, last_body: m.body, last_at: m.created_at, last_mine: false } : c))); }
    else void reloadConvos();
  });
  useLive('chat-read-' + me.id, [{ table: 'messages', event: 'UPDATE', filter: `sender_id=eq.${me.id}` }], (p) => { const m = p.new as Msg; setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x))); });
  useLive('chat-friends-' + me.id, [{ table: 'friendships' }], () => void reloadConvos());

  useEffect(() => {   // typing indicator (ephemeral broadcast between the two friends; not stored)
    if (!active) return; const sb = supabaseBrowser(); const name = 'typing-' + [me.id, active].sort().join('-'); const ch = sb.channel(name);
    ch.on('broadcast', { event: 'typing' }, (p: any) => { if (p.payload?.from === active) { setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 3000); } }); ch.subscribe(); chan.current = ch;
    return () => { sb.removeChannel(ch); chan.current = null; setTyping(false); };
  }, [active, me.id]);
  const onType = (v: string) => { setText(v); const now = Date.now(); if (chan.current && now - lastTyped.current > 2000) { lastTyped.current = now; chan.current.send({ type: 'broadcast', event: 'typing', payload: { from: me.id } }); } };

  async function send(body: string, retryId?: string) {
    const b = body.trim(); if (!b || !active) return; const to = active; const tmpId = retryId ?? 'tmp-' + Date.now() + Math.random().toString(36).slice(2, 6);
    const tmp: Msg = { id: tmpId, sender_id: me.id, recipient_id: to, body: b, created_at: new Date().toISOString(), read_at: null, state: 'sending' };
    setMsgs((l) => (retryId ? l.map((x) => (x.id === retryId ? tmp : x)) : [...l, tmp])); if (!retryId) setText('');
    const { data, error } = await supabaseBrowser().rpc('send_message', { p_to: to, p_body: b });
    if (error || !data) { setMsgs((l) => l.map((x) => (x.id === tmpId ? { ...x, state: 'failed' } : x))); toast.push(error?.message?.includes('slow down') ? 'You are sending messages too fast.' : error?.message?.includes('only message friends') ? 'You can only message friends.' : 'Message not sent. Tap retry.', 'error'); return; }
    const real = data as Msg; setMsgs((l) => l.map((x) => (x.id === tmpId ? real : x))); setConvos((l) => l.map((c) => (c.id === to ? { ...c, last_body: real.body, last_at: real.created_at, last_mine: true } : c)));
  }
  async function doBlock() { setBlockAsk(false); const r = await blockUser(active!); if (r.ok) { toast.push('User blocked', 'success'); setActive(null); await reloadConvos(); } else toast.push(r.error ?? 'Failed', 'error'); }
  async function doReport() { const r = await reportUser(active!, reason); if (r.ok) { toast.push('Report sent. Thank you.', 'success'); setReport(false); setReason(''); } else toast.push(r.error ?? 'Failed', 'error'); }

  const list = (
    <div className={`${active ? 'hidden md:block' : 'block'} w-full md:w-80 md:shrink-0`}>
      {!convos.length ? <Empty>Add friends to start chatting. <Link className="underline" href="/friends">Find friends</Link></Empty> : <ul className="space-y-1.5">{convos.map((c) => (
        <li key={c.id}><button onClick={() => setActive(c.id)} className={`card flex w-full items-center gap-3 !p-3 text-start ${c.id === active ? 'ring-2 ring-[color:var(--a1)]' : ''}`}><Avatar name={c.display_name} url={c.avatar_url} online={c.show_online && me.showOnline ? online.has(c.id) : undefined} />
          <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><span className="truncate font-semibold">{c.display_name}</span>{c.last_at && <span className="muted shrink-0 text-xs">{time(c.last_at)}</span>}</span>
            <span className="muted block truncate text-sm">{c.last_body ? `${c.last_mine ? 'You: ' : ''}${c.last_body}` : 'Say hello 👋'}</span></span>
          {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">{c.unread}</span>}</button></li>))}</ul>}
    </div>);
  let lastDay = '';
  const thread = (
    <div className={`${active ? 'flex' : 'hidden md:flex'} card min-h-[60vh] min-w-0 flex-1 flex-col !p-0`} style={{ height: 'min(72vh, 640px)' }}>
      {!cur ? <div className="m-auto p-6 text-center muted">Select a conversation</div> : (<>
        <div className="flex items-center gap-3 border-b p-3" style={{ borderColor: 'var(--border)' }}>
          <button className="btn btn-ghost !p-2 md:hidden" onClick={() => setActive(null)} aria-label="Back to conversations"><ArrowLeft size={16} className="rtl:rotate-180" /></button>
          <Avatar name={cur.display_name} url={cur.avatar_url} online={cur.show_online && me.showOnline ? online.has(cur.id) : undefined} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{cur.display_name}</p><p className="muted truncate text-xs">{typing ? 'typing…' : cur.show_online && me.showOnline && online.has(cur.id) ? 'online' : `@${cur.username}`}</p></div>
          <Dropdown items={[{ label: 'Report', icon: <Flag size={14} />, onSelect: () => setReport(true) }, { label: 'Block', icon: <Ban size={14} />, danger: true, onSelect: () => setBlockAsk(true) }]} /></div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Messages">
          {loading ? <div className="skeleton h-12 w-2/3" /> : !msgs.length ? <p className="muted m-auto py-10 text-center text-sm">No messages yet. Say hi!</p> : msgs.map((m) => { const mine = m.sender_id === me.id; const d = day(m.created_at); const sep = d !== lastDay; lastDay = d; return (
            <div key={m.id}>{sep && <p className="muted my-2 text-center text-xs">{d}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm" style={mine ? { background: 'linear-gradient(135deg, var(--a1), var(--a2))', color: 'var(--on-accent)', borderEndEndRadius: 6 } : { background: 'var(--surface-2)', border: '1px solid var(--border)', borderEndStartRadius: 6 }}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'opacity-80' : 'muted'}`}>{time(m.created_at)}{mine && (m.state === 'sending' ? <Loader2 size={11} className="animate-spin" aria-label="Sending" /> : m.state === 'failed' ? <button className="inline-flex items-center gap-0.5 text-red-200 underline" onClick={() => send(m.body, m.id)}><AlertCircle size={11} />Retry</button> : m.read_at ? <CheckCheck size={12} aria-label="Read" /> : <Check size={12} aria-label="Sent" />)}</p></div></div></div>); })}
          {typing && <p className="muted text-xs">{cur.display_name} is typing…</p>}<div ref={bottom} /></div>
        <form className="flex items-end gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }} onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <textarea className="input max-h-32 min-h-11 flex-1 resize-none" rows={1} value={text} onChange={(e) => onType(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }} placeholder="Write a message…" maxLength={2000} aria-label="Message" />
          <button className="btn !h-11" disabled={!text.trim()} aria-label="Send"><Send size={16} className="rtl:-scale-x-100" /></button></form></>)}
    </div>);
  return (<>
    <div className="flex gap-4">{list}{thread}</div>
    <ConfirmDialog open={blockAsk} danger title={`Block ${cur?.display_name ?? ''}?`} body="This closes your conversation. They won’t be able to message or add you." confirmLabel="Block" onCancel={() => setBlockAsk(false)} onConfirm={doBlock} />
    <Modal open={report} onClose={() => setReport(false)} title="Report this user"><textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="What happened?" /><button className="btn mt-3" onClick={doReport}>Send report</button></Modal>
  </>);
}
