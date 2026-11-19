import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Nav, type NavItem } from '@/components/Nav';
import { ModuleShell } from '@/components/ModuleShell';
import { InviteRedeemer } from '@/components/InviteRedeemer';
import { dirOf, t } from '@/lib/i18n';

type K = NavItem['key'];
const student: [string, K][] = [['/dashboard', 'dashboard'], ['/notes', 'notes'], ['/questions', 'questions'], ['/flashcards', 'flashcards'], ['/quizzes', 'quizzes'], ['/classes', 'classes'], ['/leaderboard', 'leaderboard'],
  ['/vocabulary', 'vocabulary'], ['/planner', 'planner'], ['/performance', 'performance'], ['/comeback', 'comeback'], ['/friends', 'friends'], ['/messages', 'messages'], ['/groups', 'groups'], ['/invite', 'invite'], ['/profile', 'profile'], ['/settings', 'settings']];
const teacher: [string, K][] = [['/dashboard', 'dashboard'], ['/teacher/classes', 'classes'], ['/teacher/tests/new', 'createTest'], ['/teacher/tests', 'manageTests'], ['/groups', 'groups'], ['/notes', 'notes'],
  ['/friends', 'friends'], ['/messages', 'messages'], ['/invite', 'invite'], ['/profile', 'profile'], ['/settings', 'settings']];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  if (!profile.onboarded) redirect('/onboarding');
  const [n, m] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient_id', profile.id).is('read_at', null),
  ]);
  const dir = dirOf(profile.language) as 'ltr' | 'rtl';
  const items: NavItem[] = (profile.role === 'teacher' ? teacher : student).map(([href, key]) => ({ href, key, label: t(profile.language, key) }));
  return (
    <ModuleShell dir={dir} lang={profile.language}>
      <Nav items={items} dir={dir} logoutLabel={t(profile.language, 'logout')} unread={n.count ?? 0} msgUnread={m.count ?? 0} me={{ id: profile.id, name: profile.display_name, avatar: profile.avatar_url, role: profile.role, publicId: profile.public_id }} />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      {cookies().has('lumora_invite') && <InviteRedeemer />}
    </ModuleShell>
  );
}
