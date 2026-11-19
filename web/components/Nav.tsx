'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, BookOpen, Brain, CalendarCheck, ChevronsLeft, ChevronsRight, ClipboardList, FileText, GraduationCap, HelpCircle, Languages, LayoutDashboard, LogOut, Menu, MessageCircle, PlusCircle, Settings, Sparkles, Trophy, UserCircle, UserPlus, Users, UsersRound, X } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '@/app/(auth)/actions';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLive } from '@/lib/useLive';

const ICONS = { dashboard: LayoutDashboard, notes: FileText, questions: HelpCircle, flashcards: Brain, quizzes: GraduationCap, vocabulary: Languages, planner: CalendarCheck, performance: BarChart3,
  comeback: Sparkles, friends: Users, profile: UserCircle, settings: Settings, classes: BookOpen, createTest: PlusCircle, manageTests: ClipboardList, leaderboard: Trophy, messages: MessageCircle, groups: UsersRound, invite: UserPlus } as const;
export type NavItem = { href: string; key: keyof typeof ICONS; label: string };
type Me = { id: string; name: string; avatar: string | null; role: string; publicId: string };

export function Nav({ items, dir, logoutLabel, me, unread, msgUnread }: { items: NavItem[]; dir: 'ltr' | 'rtl'; logoutLabel: string; me: Me; unread: number; msgUnread: number }) {
  const path = usePathname() ?? '/'; const [collapsed, setCollapsed] = useState(false); const [open, setOpen] = useState(false); const [msgs, setMsgs] = useState(msgUnread);
  useEffect(() => { try { setCollapsed(localStorage.getItem('lumora-nav') === '1'); } catch {} }, []);
  useEffect(() => { setOpen(false); }, [path]); useEffect(() => { setMsgs(msgUnread); }, [msgUnread]);
  const recount = useCallback(async () => { const { count } = await supabaseBrowser().from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', me.id).is('read_at', null); setMsgs(count ?? 0); }, [me.id]);
  useLive('nav-msgs-' + me.id, [{ table: 'messages' }], () => void recount());
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open]);
  const active = items.filter((i) => path === i.href || path.startsWith(i.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const toggle = () => { const n = !collapsed; setCollapsed(n); try { localStorage.setItem('lumora-nav', n ? '1' : '0'); } catch {} };
  const CollapseIcon = (dir === 'rtl') === collapsed ? ChevronsLeft : ChevronsRight;

  const links = (id: string, narrow: boolean) => items.map((i) => { const Icon = ICONS[i.key]; const on = i.href === active; const badge = i.key === 'messages' && msgs > 0 ? msgs : 0; return (
    <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined} data-tip={narrow ? i.label : undefined} aria-label={narrow ? i.label : undefined}
      className={`tip relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${on ? '' : 'muted hover:text-[color:var(--fg)] hover:bg-[rgba(var(--glow),.1)]'} ${narrow ? 'justify-center' : ''}`}>
      {on && <motion.span layoutId={id} className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(var(--glow), .28), rgba(var(--glow), .08))', border: '1px solid rgba(var(--glow), .45)', boxShadow: '0 0 24px -6px rgba(var(--glow), .6)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      {on && <motion.span layoutId={id + 'bar'} className="absolute inset-y-2 start-0 w-1 rounded-full" style={{ background: 'var(--cyan)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <Icon size={18} className="relative shrink-0" style={on ? { color: 'var(--cyan)' } : undefined} aria-hidden />
      {!narrow && <span className="relative flex-1 truncate" style={on ? { color: 'var(--fg)' } : undefined}>{i.label}</span>}
      {badge > 0 && <span className={`relative grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ${narrow ? 'absolute -end-0.5 -top-0.5' : ''}`}>{badge > 99 ? '99+' : badge}</span>}
    </Link>); });

  return (
    <>
      <motion.aside initial={false} animate={{ width: collapsed ? 76 : 272 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-e md:flex" style={{ background: 'var(--surface)', borderColor: 'var(--border)', WebkitBackdropFilter: 'blur(22px)', backdropFilter: 'blur(22px)' }}>
        <div className={`flex items-center p-4 ${collapsed ? 'justify-center' : 'justify-between'}`}><Link href="/dashboard" aria-label="LUMORA home">{collapsed ? <Logo size={36} iconOnly /> : <Logo />}</Link></div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">{links('nav-d', collapsed)}</nav>
        <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <Link href="/profile" className={`mb-2 flex items-center gap-3 rounded-xl p-2 hover:bg-[rgba(var(--glow),.1)] ${collapsed ? 'justify-center' : ''}`} aria-label="Your profile"><Avatar name={me.name} url={me.avatar} size={36} />
            {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-semibold">{me.name}</span><span className="muted block truncate text-xs capitalize">{me.role} · {me.publicId}</span></span>}</Link>
          <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}><NotificationBell userId={me.id} initial={unread} /><ThemeToggle />
            <form action={logout} className={collapsed ? '' : 'ms-auto'}><button className="btn btn-ghost !p-2" aria-label={logoutLabel} title={logoutLabel}><LogOut size={16} /></button></form>
            <button className="btn btn-ghost !p-2" onClick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}><CollapseIcon size={16} /></button></div></div>
      </motion.aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)', WebkitBackdropFilter: 'blur(18px)', backdropFilter: 'blur(18px)' }}>
        <Link href="/dashboard" aria-label="LUMORA home"><Logo size={30} /></Link>
        <div className="flex gap-2"><NotificationBell userId={me.id} initial={unread} /><ThemeToggle />
          <button className="btn btn-ghost relative !p-2" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={18} />{msgs > 0 && <span className="absolute -end-1 -top-1 h-3 w-3 rounded-full bg-rose-500" />}</button></div>
      </header>
      <AnimatePresence>
        {open && (<>
          <motion.div key="bd" className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} aria-hidden />
          <motion.aside key="dr" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-y-0 start-0 z-[80] flex w-[82vw] max-w-xs flex-col md:hidden" style={{ background: 'var(--surface-2)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)' }}
            initial={{ x: dir === 'rtl' ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: dir === 'rtl' ? '100%' : '-100%' }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
            <div className="flex items-center justify-between p-4"><Logo /><button className="btn btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
            <Link href="/profile" className="mx-3 mb-2 flex items-center gap-3 rounded-xl p-2"><Avatar name={me.name} url={me.avatar} size={40} /><span className="min-w-0"><span className="block truncate font-semibold">{me.name}</span><span className="muted block truncate text-xs">{me.publicId}</span></span></Link>
            <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">{links('nav-m', false)}</nav>
            <form action={logout} className="border-t p-3" style={{ borderColor: 'var(--border)' }}><button className="btn btn-ghost w-full"><LogOut size={16} />{logoutLabel}</button></form>
          </motion.aside></>)}
      </AnimatePresence>
    </>
  );
}
