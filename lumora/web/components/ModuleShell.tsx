'use client';
import { usePathname } from 'next/navigation';
/** Sets data-module so the whole shell (sidebar + page) adopts that module's accent identity. */
export function ModuleShell({ children, dir, lang }: { children: React.ReactNode; dir: string; lang: string }) {
  const seg = (usePathname() ?? '/').split('/')[1] || 'dashboard';
  return <div data-module={seg === 'tests' ? 'quizzes' : seg} dir={dir} lang={lang} className="flex min-h-screen flex-col md:flex-row">{children}</div>;
}
