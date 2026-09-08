/* =============================================================
   PASSWORD HASHING
   scrypt from node:crypto — memory-hard, in core, no dependency.
   Verification is constant-time.
   ============================================================= */
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;
const COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(plain), salt, KEYLEN, COST).toString('hex');
  return { hash, salt };
}

export function verifyPassword(plain, hash, salt) {
  if (!plain || !hash || !salt) return false;
  let candidate;
  try {
    candidate = scryptSync(String(plain), salt, KEYLEN, COST);
  } catch {
    return false;
  }
  const known = Buffer.from(hash, 'hex');
  if (known.length !== candidate.length) return false;
  return timingSafeEqual(known, candidate);
}

/* Minimum bar for a staff password. Deliberately short of a full
   policy engine — it rejects the obvious, and says why. */
export function checkStrength(plain) {
  const pw = String(plain || '');
  if (pw.length < 12) return 'Use at least twelve characters.';
  if (!/[a-z]/.test(pw)) return 'Include a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Include an uppercase letter.';
  if (!/\d/.test(pw)) return 'Include a number.';
  return null;
}
