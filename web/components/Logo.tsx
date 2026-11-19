import Image from 'next/image';
/** The approved LUMORA logo (square artwork). Never recoloured or redrawn. */
export function Logo({ size = 32, iconOnly = false }: { size?: number; iconOnly?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display font-extrabold tracking-tight">
      <Image src={size > 64 ? '/logo-256.png' : '/logo-128.png'} width={size} height={size} alt={iconOnly ? 'LUMORA' : ''} priority className="rounded-[22%] shadow-lg" style={{ boxShadow: '0 6px 18px -6px rgba(99,102,241,.6)' }} />
      {!iconOnly && <span className="text-xl tracking-wide">LUMORA</span>}
    </span>
  );
}
