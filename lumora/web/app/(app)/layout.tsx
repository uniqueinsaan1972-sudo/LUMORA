import { requireUser } from '@/lib/auth';
import { Nav, type NavItem } from '@/components/Nav';
import { ModuleShell } from '@/components/ModuleShell';
import { dirOf, t } from '@/lib/i18n';

const student: [string, NavItem['key']][] = [['/dashboard', 'dashboard'], ['/notes', 'notes'], ['/questions', 'questions'], ['/flashcards', 'flashcards'], ['/quizzes', 'quizzes'], ['/vocabulary', 'vocabulary'],
  ['/planner', 'planner'], ['/performance', 'performance'], ['/comeback', 'comeback'], ['/friends', 'friends'], ['/profile', 'profile'], ['/settings', 'settings']];
const teacher: [string, NavItem['key']][] = [['/dashboard', 'dashboard'], ['/teacher/classes', 'classes'], ['/teacher/tests/new', 'createTest'], ['/teacher/tests', 'manageTests'], ['/profile', 'profile'], ['/settings', 'settings']];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const dir = dirOf(profile.language) as 'ltr' | 'rtl';
  const items: NavItem[] = (profile.role === 'teacher' ? teacher : student).map(([href, key]) => ({ href, key, label: t(profile.language, key) }));
  return (
    <ModuleShell dir={dir} lang={profile.language}>
      <Nav items={items} dir={dir} logoutLabel={t(profile.language, 'logout')} />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
    </ModuleShell>
  );
}
