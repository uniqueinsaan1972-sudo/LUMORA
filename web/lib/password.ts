export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; hints: string[] };
const COMMON = ['password', '12345678', 'qwerty', 'letmein', 'iloveyou', 'admin', 'welcome', 'lumora'];
/** Client-side guidance only; the real policy (min length) is enforced by Supabase Auth and the server action. */
export function passwordStrength(pw: string): Strength {
  const hints: string[] = []; if (!pw) return { score: 0, label: 'Enter a password', hints: [] };
  let s = 0; if (pw.length >= 10) s++; if (pw.length >= 14) s++;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length; if (kinds >= 3) s++; if (kinds === 4 && pw.length >= 12) s++;
  if (pw.length < 10) hints.push('Use at least 10 characters'); if (kinds < 3) hints.push('Mix upper/lower case, numbers and symbols');
  if (COMMON.some((c) => pw.toLowerCase().includes(c)) || /(.)\1{3,}/.test(pw)) { s = Math.min(s, 1); hints.push('Avoid common words and repeated characters'); }
  const score = Math.max(0, Math.min(4, pw.length < 10 ? Math.min(s, 1) : s)) as Strength['score'];
  return { score, label: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][score], hints };
}
