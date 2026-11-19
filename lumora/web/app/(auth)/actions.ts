'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';

export type FormState = { error?: string; message?: string } | undefined;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('login', 10, 15 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  const { error } = await supabaseServer().auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Incorrect email or password.' }; // generic on purpose
  redirect('/dashboard');
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('register', 5, 60 * 60_000)) return { error: 'Too many sign-ups from this network. Try later.' };
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check your details.' };
  const { display_name, email, password, teacher_code } = parsed.data;
  const supabase = supabaseServer();
  // Role is NEVER sent from the client. Everyone starts as a student; teachers upgrade with a one-time invite code below.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name }, emailRedirectTo: `${SITE}/auth/callback` } });
  if (error) return { error: 'Could not create account. If you already registered, try logging in.' };
  if (teacher_code && data.session) {
    const { error: e2 } = await supabase.rpc('claim_teacher_invite', { p_code: teacher_code });
    if (e2) return { error: 'Account created as a student, but the teacher invite code was invalid or already used.' };
  }
  if (!data.session) return { message: 'Check your email to verify your account, then log in. (Teacher invite codes can be applied in Settings after verifying.)' };
  redirect('/dashboard');
}

export async function forgotPassword(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('reset', 5, 60 * 60_000)) return { error: 'Too many requests. Try later.' };
  const email = String(fd.get('email') ?? '').trim();
  if (email) await supabaseServer().auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/auth/callback?next=/reset-password` });
  return { message: 'If that email exists, a reset link has been sent.' }; // same response either way (no account enumeration)
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get('password') ?? '');
  if (password.length < 10 || password.length > 128) return { error: 'Use 10–128 characters.' };
  const { error } = await supabaseServer().auth.updateUser({ password });
  if (error) return { error: 'Reset link expired. Request a new one.' };
  redirect('/dashboard');
}

export async function logout() { await supabaseServer().auth.signOut(); redirect('/login'); }
export async function logoutEverywhere() { await supabaseServer().auth.signOut({ scope: 'global' }); redirect('/login'); }
