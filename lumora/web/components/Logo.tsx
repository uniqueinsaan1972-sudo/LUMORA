export function Logo({ size = 28, iconOnly = false }: { size?: number; iconOnly?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display font-extrabold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ filter: 'drop-shadow(0 6px 14px rgba(139,92,246,.55))' }}>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset=".55" stopColor="#6366F1" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
        <rect width="32" height="32" rx="9" fill="url(#lg)" />
        <path d="M16 6l2.4 6.2L25 14.6l-5.2 3.6 1.7 6.6L16 21.4 10.5 24.8l1.7-6.6L7 14.6l6.6-2.4z" fill="#FBBF24" />
      </svg>
      {!iconOnly && <span className="text-xl tracking-wide">LUMORA</span>}
    </span>
  );
}
