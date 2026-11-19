'use server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { hashToken, validToken } from '@/lib/invite';
import { redirect } from 'next/navigation';

export async function acceptInvite(token: string) {   // from /invite/[token]
  if (!validToken(token)) redirect('/login');
  cookies().set('lumora_invite', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' });
  const { data: { user } } = await supabaseServer().auth.getUser();
  redirect(user ? '/dashboard' : '/register');
}
export async function redeemPendingInvite(): Promise<{ ok: boolean; kind?: string | null; error?: string }> {
  const token = cookies().get('lumora_invite')?.value; if (!token || !validToken(token)) return { ok: false };
  const { data, error } = await supabaseServer().rpc('redeem_invitation', { p_hash: hashToken(token) });
  cookies().delete('lumora_invite');
  if (error) return { ok: false, error: error.message };
  return { ok: !!data, kind: data };
}
