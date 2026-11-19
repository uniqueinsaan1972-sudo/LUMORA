'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`input pe-11 ${props.className ?? ''}`} />
      <button type="button" className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 muted hover:text-[color:var(--fg)]" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </div>
  );
}
