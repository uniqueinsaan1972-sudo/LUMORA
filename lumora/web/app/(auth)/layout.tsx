import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Reveal } from '@/components/Reveal';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center justify-between"><Link href="/"><Logo /></Link><ThemeToggle /></div>
      <Reveal><div className="glass card-accent !p-6 sm:!p-8">{children}</div></Reveal>
      <p className="muted mt-6 text-center text-sm">Where Learning Meets Possibility.</p>
    </main>
  );
}
