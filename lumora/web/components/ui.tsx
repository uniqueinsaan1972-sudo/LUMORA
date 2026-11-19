import { Inbox } from 'lucide-react';
import { CountUp, Reveal } from './Reveal';

export function PageTitle({ children, sub, icon, actions }: { children: React.ReactNode; sub?: string; icon?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
      <div className="flex min-w-0 items-center gap-4">
        {icon && <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--a1), var(--a2))', color: 'var(--on-accent)', boxShadow: '0 10px 28px -10px rgba(var(--glow), .8)' }} aria-hidden>{icon}</span>}
        <div className="min-w-0"><h1 className="font-display text-2xl font-extrabold leading-tight md:text-3xl">{children}</h1>{sub && <p className="muted mt-1 text-sm md:text-base">{sub}</p>}</div>
      </div>
      {actions}
    </header>
  );
}
export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Reveal><div className="card flex flex-col items-center gap-3 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'rgba(var(--glow), .14)', color: 'var(--a1)' }} aria-hidden>{icon ?? <Inbox size={26} />}</span>
      <div className="muted max-w-sm">{children}</div></div></Reveal>
  );
}
export function Stat({ label, value, hint, icon, count, suffix, delay = 0 }: { label: string; value?: React.ReactNode; hint?: string; icon?: React.ReactNode; count?: number; suffix?: string; delay?: number }) {
  return (
    <Reveal delay={delay}><div className="card card-accent lift h-full">
      <div className="flex items-start justify-between gap-2"><p className="muted text-sm">{label}</p>{icon && <span style={{ color: 'var(--a1)' }} aria-hidden>{icon}</span>}</div>
      <p className="font-display mt-2 text-2xl font-extrabold md:text-3xl">{typeof count === 'number' ? <CountUp value={count} suffix={suffix} /> : value}</p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}</div></Reveal>
  );
}
/** Real-data bar chart; bars grow in. */
export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-2 md:gap-3" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
      {data.map((d, i) => (
        <div key={d.label + i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="muted text-[10px]">{d.value || ''}</span>
          <div className="w-full rounded-t-lg" style={{ height: `${Math.max(d.value ? 4 : 2, (d.value / max) * 100)}%`, background: d.value ? 'linear-gradient(180deg, var(--a2), var(--a1))' : 'var(--border)', transformOrigin: 'bottom', animation: `growY .8s ${i * 60}ms cubic-bezier(.2,.8,.2,1) both` }} />
          <span className="muted text-xs">{d.label}</span>
        </div>))}
      <style>{`@keyframes growY{from{transform:scaleY(0)}to{transform:scaleY(1)}}`}</style>
    </div>
  );
}
export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="bar"><span style={{ ['--w' as string]: `${v}%` }} /></div>;
}
export function ProgressRing({ pct, size = 132, children }: { pct: number; size?: number; children?: React.ReactNode }) {
  const v = Math.max(0, Math.min(100, pct)); const r = 52; const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent`}>
      <svg viewBox="0 0 120 120" className="-rotate-90" width={size} height={size}>
        <defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--a1)" /><stop offset="1" stopColor="var(--a2)" /></linearGradient></defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle className="ring-fg" cx="60" cy="60" r={r} fill="none" stroke="url(#ringg)" strokeWidth="10" strokeLinecap="round" style={{ ['--c' as string]: c, ['--off' as string]: c * (1 - v / 100) }} />
      </svg>
      <div className="absolute text-center">{children}</div>
    </div>
  );
}
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden />; }
