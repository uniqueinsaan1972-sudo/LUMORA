'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { hashToken, newToken } from '@/lib/invite';
type R = { ok: boolean; error?: string };
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export async function createInvite(input: { kind: 'app' | 'class' | 'group'; target?: string; days: number; max: number }): Promise<R & { link?: string }> {
  const p = z.object({ kind: z.enum(['app', 'class', 'group']), target: z.string().uuid().optional(), days: z.number().int().min(1).max(30), max: z.number().int().min(1).max(1000) }).safeParse(input);
  if (!p.success || (p.data.kind !== 'app' && !p.data.target)) return { ok: false, error: 'Choose what to invite people to.' };
  if (!rateLimit('invite', 15, 60 * 60_000)) return { ok: false, error: 'Too many invitations created. Try later.' };
  const { supabase } = await requireUser(); const token = newToken();   // the token exists only in this response; the database keeps just its hash
  const { error } = await supabase.rpc('create_invitation', { p_hash: hashToken(token), p_kind: p.data.kind, p_target: p.data.target ?? null, p_days: p.data.days, p_max: p.data.max });
  if (error) return { ok: false, error: /too many/.test(error.message) ? 'You have too many active invitations. Revoke one first.' : 'Could not create the invitation.' };
  revalidatePath('/invite'); return { ok: true, link: `${SITE}/invite/${token}` };
}
export async function revokeInvite(id: string): Promise<R> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'Invalid request' }; const { supabase } = await requireUser(); const { error } = await supabase.rpc('revoke_invitation', { p_id: id });
  revalidatePath('/invite'); return error ? { ok: false, error: 'Could not revoke.' } : { ok: true };
}
