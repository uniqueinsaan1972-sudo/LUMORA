import { headers } from 'next/headers';
// Best-effort in-memory limiter (per server instance). For multi-instance production use Upstash/Redis. Supabase Auth also enforces its own limits.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const k = `${key}:${ip}`; const now = Date.now();
  const arr = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(k, arr); return false; }
  arr.push(now); hits.set(k, arr); return true;
}
