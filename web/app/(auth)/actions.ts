'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';

export type FormState = { error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('login', 10, 15 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: 'Enter a valid email and password.' };
  const { error } = await supabaseServer().auth.signInWithPassword(parsed.data);
  if (error) return { error: error.code === 'email_not_confirmed' ? 'Please verify your email first — check your inbox for the confirmation link.' : 'Incorrect email or password.' };
  redirect('/dashboard');
}

export async function checkUsername(u: string): Promise<{ available: boolean; valid: boolean }> {
  const v = u.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(v)) return { available: false, valid: false };
  if (!rateLimit('uname', 40, 60_000)) return { available: false, valid: true };
  const { data } = await supabaseServer().rpc('username_available', { u: v });
  return { available: data === true, valid: true };
}

const registerSchema = z.object({
  display_name: z.string().trim().min(2, 'Enter your full name').max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'Username: 3–24 letters, numbers or underscores'),
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
  confirm: z.string(),
  role: z.enum(['student', 'teacher']),
  terms: z.literal('on', { errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy' }) }),
  teacher_code: z.string().trim().max(64).optional(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('register', 8, 60 * 60_000)) return { error: 'Too many sign-up attempts from this network. Try again later.' };
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) { const fe: Record<string, string> = {}; parsed.error.issues.forEach((i) => { fe[String(i.path[0])] ??= i.message; }); return { error: 'Please fix the highlighted fields.', fieldErrors: fe }; }
  const { display_name, username, email, password, role, teacher_code } = parsed.data;
  const supabase = supabaseServer();
  const { data: free } = await supabase.rpc('username_available', { u: username });
  if (free === false) return { error: 'Please fix the highlighted fields.', fieldErrors: { username: 'That username is already taken' } };
  // Only 'student' or 'teacher' can be requested; the database trigger enforces it (admin can never be self-selected).
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name, username, role, terms: 'true' }, emailRedirectTo: `${SITE}/auth/callback?next=/onboarding` } });
  if (error) {
    console.error('[register] signUp failed:', error.code, error.status, error.message);
    const code = error.code ?? '';
    if (code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) return { error: 'Too many sign-up emails were sent recently. Please wait about an hour, or check your inbox for an earlier confirmation email.' };
    if (code === 'weak_password') return { error: 'That password is too weak. Try a longer one with letters and numbers.' };
    if (code === 'email_address_invalid') return { error: 'That email address is not accepted. Check it for typos.' };
    if (code === 'signup_disabled') return { error: 'Sign-ups are turned off for this project.' };
    if (code === 'unexpected_failure' || /database error/i.test(error.message)) return { error: 'Account setup failed on the server (database). The site owner should check the Supabase logs.' };
    return { error: 'Could not create account. If you already registered, try logging in or check your email for a confirmation link.' };
  }
  if (data.session) {
    if (role === 'teacher' && teacher_code) await supabase.rpc('claim_teacher_invite', { p_code: teacher_code });
    redirect('/onboarding');
  }
  return { message: 'Account created! Check your email and click the verification link to continue.' };
}

export async function forgotPassword(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit('reset', 5, 60 * 60_000)) return { error: 'Too many requests. Try later.' };
  const email = String(fd.get('email') ?? '').trim();
  if (email) await supabaseServer().auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/auth/callback?next=/reset-password` });
  return { message: 'If that email exists, a reset link has been sent.' };
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
