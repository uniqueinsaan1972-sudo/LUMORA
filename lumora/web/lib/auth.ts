import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';

export type Profile = { id: string; role: 'student' | 'teacher' | 'admin'; display_name: string; username: string | null; grade: string | null;
  school: string | null; language: string; theme: string; discoverable: boolean; share_achievements: boolean };

export async function requireUser(role?: 'student' | 'teacher') {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');
  if (role && profile.role !== role) redirect('/dashboard');
  return { supabase, user, profile: profile as Profile };
}
