import { createHash, randomBytes } from 'node:crypto';
/** 192-bit random token; only its SHA-256 hash is stored in the database. */
export const newToken = () => randomBytes(24).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const validToken = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);
