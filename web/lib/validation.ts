import { z } from 'zod';
export const registerSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
  teacher_code: z.string().trim().max(64).optional(),
});
export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
export const noteSchema = z.object({ title: z.string().max(200), body: z.string().max(100000), subject: z.string().max(80).optional(), chapter: z.string().max(120).optional(),
  folder: z.string().max(80).optional(), tags: z.array(z.string().max(40)).max(20) });
export const flashcardSchema = z.object({ front: z.string().trim().min(1).max(2000), back: z.string().trim().min(1).max(5000), subject: z.string().max(80).optional(), chapter: z.string().max(120).optional() });
export const questionSchema = z.object({
  type: z.enum(['mcq','short','long','definition','word_meaning','numerical','qa']), prompt: z.string().trim().min(1).max(5000),
  options: z.array(z.string().trim().min(1).max(500)).max(8).optional(), answer: z.string().max(10000).optional(), explanation: z.string().max(10000).optional(),
  subject: z.string().max(80).optional(), chapter: z.string().max(120).optional(),
}).refine((q) => q.type !== 'mcq' || (q.options && q.options.length >= 2 && q.answer && q.options.includes(q.answer)), { message: 'MCQ needs 2+ options and an answer that matches one' });
