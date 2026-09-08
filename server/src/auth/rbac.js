/* =============================================================
   SESSIONS + ROLE-BASED ACCESS CONTROL
   Every admin route is guarded by a permission key, never by a
   role name — so changing a role's grants changes access without
   touching a single route.
   ============================================================= */
import { randomBytes } from 'node:crypto';
import { db } from '../db/index.js';

const SESSION_HOURS = 12;
const MAX_FAILED = 6;            // per email, within the window
const WINDOW_MINUTES = 15;

/* ---------- sessions ---------- */
export function createSession(staffId, ip, userAgent) {
  const token = randomBytes(32).toString('hex');
  db.prepare(
    `INSERT INTO staff_sessions (token, staff_id, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, datetime('now', '+${SESSION_HOURS} hours'))`
  ).run(token, staffId, ip || null, userAgent || null);
  return token;
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM staff_sessions WHERE token = ?').run(token);
}

export function purgeExpired() {
  db.prepare("DELETE FROM staff_sessions WHERE expires_at < datetime('now')").run();
}

export function staffFromToken(token) {
  if (!token) return null;
  const row = db.prepare(
    `SELECT s.id, s.email, s.first_name, s.last_name, s.status, s.last_login_at,
            r.key AS role_key, r.name AS role_name, r.rank AS role_rank
       FROM staff_sessions ss
       JOIN staff s ON s.id = ss.staff_id
       JOIN roles r ON r.id = s.role_id
      WHERE ss.token = ? AND ss.expires_at > datetime('now')`
  ).get(token);
  if (!row || row.status !== 'active') return null;

  const perms = db.prepare(
    `SELECT p.key FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       JOIN roles r ON r.id = rp.role_id
      WHERE r.key = ?`
  ).all(row.role_key).map((p) => p.key);

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role_key,
    roleName: row.role_name,
    roleRank: row.role_rank,
    lastLoginAt: row.last_login_at,
    permissions: perms
  };
}

/* ---------- brute-force damping ---------- */
export function recordAttempt(email, ip, ok) {
  db.prepare('INSERT INTO login_attempts (email, ip, ok) VALUES (?, ?, ?)').run(email, ip || null, ok ? 1 : 0);
}

export function isLockedOut(email) {
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE email = ? AND ok = 0 AND created_at > datetime('now', '-${WINDOW_MINUTES} minutes')`
  ).get(email);
  return row.n >= MAX_FAILED;
}

export function clearAttempts(email) {
  db.prepare('DELETE FROM login_attempts WHERE email = ?').run(email);
}

/* ---------- audit ---------- */
export function audit({ staff, action, entity, entityId, summary, before, after, ip }) {
  db.prepare(
    `INSERT INTO audit_logs (staff_id, actor, action, entity, entity_id, summary, before_val, after_val, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    staff?.id ?? null,
    staff ? `${staff.firstName} ${staff.lastName} (${staff.roleName})` : 'system',
    action, entity, entityId != null ? String(entityId) : null, summary || null,
    before === undefined ? null : JSON.stringify(before),
    after === undefined ? null : JSON.stringify(after),
    ip || null
  );
}

/* ---------- middleware ---------- */
export function attachStaff(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.adminToken = token;
  req.staff = staffFromToken(token);
  next();
}

export function requireStaff(req, res, next) {
  if (!req.staff) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
}

/** Guard a route by permission key. */
export function require_(permission) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: 'Sign in to continue.' });
    if (!req.staff.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Your role does not have access to this.',
        needed: permission,
        role: req.staff.roleName
      });
    }
    next();
  };
}

export const can = (staff, permission) => !!staff?.permissions?.includes(permission);
