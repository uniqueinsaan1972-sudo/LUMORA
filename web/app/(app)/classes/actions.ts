'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
type R = { ok: boolean; error?: string };
const uuid = z.string().uuid(); const bad: R = { ok: false, error: 'Invalid request' };

export async function joinClass(code: string): Promise<R & { id?: string }> {
  const c = code.trim(); if (c.length < 4 || c.length > 20) return { ok: false, error: 'Enter a valid class code.' };
  const { supabase } = await requireUser('student'); const { data, error } = await supabase.rpc('join_class', { p_code: c });
  if (error) return { ok: false, error: /too many/.test(error.message) ? 'Too many wrong codes. Try again in a few minutes.' : 'Could not join the class.' };
  if (!data) return { ok: false, error: 'That class code is not valid.' }; revalidatePath('/classes'); return { ok: true, id: data as string };
}
export async function leaveClass(classId: string): Promise<R> {
  if (!uuid.safeParse(classId).success) return bad; const { supabase, user } = await requireUser('student');
  const { data, error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', user.id).select('class_id'); if (error || !data?.length) return { ok: false, error: 'Could not leave the class.' }; revalidatePath('/classes'); return { ok: true };
}
// ---- teacher ----
export async function createClass(input: { name: string; description?: string }): Promise<R & { id?: string }> {
  const p = z.object({ name: z.string().trim().min(2, 'Give the class a name').max(120), description: z.string().trim().max(500).optional() }).safeParse(input); if (!p.success) return { ok: false, error: p.error.issues[0]?.message };
  const { supabase, user } = await requireUser('teacher'); const { data, error } = await supabase.from('teacher_classes').insert({ teacher_id: user.id, name: p.data.name, description: p.data.description || null }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not create the class.' }; revalidatePath('/teacher/classes'); return { ok: true, id: data.id };
}
export async function regenerateCode(classId: string): Promise<R & { code?: string }> {
  if (!uuid.safeParse(classId).success) return bad; const { supabase } = await requireUser('teacher'); const { data, error } = await supabase.rpc('regenerate_class_code', { p_class: classId });
  return error ? { ok: false, error: 'Could not regenerate the code.' } : { ok: true, code: data as string };
}
export async function removeMember(classId: string, studentId: string): Promise<R> {
  if (!uuid.safeParse(classId).success || !uuid.safeParse(studentId).success) return bad; const { supabase } = await requireUser('teacher');
  const { error } = await supabase.rpc('remove_class_member', { p_class: classId, p_student: studentId }); return error ? { ok: false, error: 'Could not remove the student.' } : { ok: true };
}
export async function postAnnouncement(classId: string, title: string, body: string): Promise<R> {
  const p = z.object({ t: z.string().trim().min(1).max(150), b: z.string().trim().min(1).max(3000) }).safeParse({ t: title, b: body }); if (!p.success || !uuid.safeParse(classId).success) return { ok: false, error: 'Add a title and a message.' };
  const { supabase } = await requireUser('teacher'); const { error } = await supabase.rpc('post_announcement', { p_class: classId, p_title: p.data.t, p_body: p.data.b }); revalidatePath(`/teacher/classes/${classId}`); return error ? { ok: false, error: 'Could not post the announcement.' } : { ok: true };
}
export async function deleteClass(classId: string): Promise<R> {
  if (!uuid.safeParse(classId).success) return bad; const { supabase } = await requireUser('teacher'); const { data, error } = await supabase.from('teacher_classes').delete().eq('id', classId).select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not delete the class.' }; revalidatePath('/teacher/classes'); return { ok: true };
}
