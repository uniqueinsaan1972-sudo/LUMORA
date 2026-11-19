import Image from 'next/image';
export function Avatar({ name, url, size = 40, online }: { name: string; url?: string | null; size?: number; online?: boolean }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg, var(--a1), var(--a2))' }} aria-hidden>
      {url ? <Image src={url} alt="" width={size} height={size} unoptimized className="h-full w-full object-cover" /> : initials}
      {online !== undefined && <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--surface-solid)', background: online ? '#34d399' : '#64748b' }} />}
    </span>
  );
}
