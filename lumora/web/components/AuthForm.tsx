'use client';
import { useFormState, useFormStatus } from 'react-dom';
import type { FormState } from '@/app/(auth)/actions';
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="btn w-full justify-center" disabled={pending}>{pending ? 'Please wait…' : label}</button>; }
export function AuthForm({ action, label, children }: { action: (s: FormState, f: FormData) => Promise<FormState>; label: string; children: React.ReactNode }) {
  const [state, formAction] = useFormState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm text-emerald-400">{state.message}</p>}
      <Submit label={label} />
    </form>
  );
}
