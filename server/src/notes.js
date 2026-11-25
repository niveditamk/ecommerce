/* =============================================================
   COLLABORATION NOTES
   A record any staff member can attach to — orders, products,
   purchase orders, cycle counts, suppliers. @mentions resolve
   to a real staff id at write time, from the local part of
   their email (the name already visible on every staff row),
   not a re-parse on every read.
   ============================================================= */
import { db } from './db/index.js';
import { audit } from './auth/rbac.js';

const ENTITIES = new Set(['order', 'product', 'purchase_order', 'cycle_count', 'supplier']);

function resolveMentions(body) {
  const handles = [...new Set([...body.matchAll(/@([a-z0-9._-]+)/gi)].map((m) => m[1].toLowerCase()))];
  if (!handles.length) return [];
  const staff = db.prepare('SELECT id, email FROM staff').all();
  const ids = handles
    .map((h) => staff.find((s) => s.email.toLowerCase().startsWith(`${h}@`) || s.email.toLowerCase() === h))
    .filter(Boolean)
    .map((s) => s.id);
  return [...new Set(ids)];
}

export function listNotes(entity, entityId) {
  if (!ENTITIES.has(entity)) throw new Error('Unknown note target.');
  return db.prepare(`
    SELECT * FROM admin_notes WHERE entity = ? AND entity_id = ? ORDER BY created_at DESC
  `).all(entity, String(entityId)).map((n) => ({ ...n, mentioned_ids: JSON.parse(n.mentioned_ids || '[]') }));
}

export function createNote({ entity, entityId, body, staff }) {
  if (!ENTITIES.has(entity)) throw new Error('Unknown note target.');
  const text = String(body || '').trim();
  if (!text) throw new Error('Write something first.');
  if (text.length > 2000) throw new Error('Keep a note under 2000 characters.');

  const mentionedIds = resolveMentions(text);
  const authorName = staff ? `${staff.firstName} ${staff.lastName}` : 'System';

  const res = db.prepare(`
    INSERT INTO admin_notes (entity, entity_id, body, author_id, author_name, mentioned_ids)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(entity, String(entityId), text, staff?.id || null, authorName, JSON.stringify(mentionedIds));

  audit({
    staff, action: 'note_added', entity, entityId: String(entityId),
    summary: `${authorName} added a note${mentionedIds.length ? ` (mentioned ${mentionedIds.length} colleague(s))` : ''}`
  });

  const note = db.prepare('SELECT * FROM admin_notes WHERE id = ?').get(res.lastInsertRowid);
  return { ...note, mentioned_ids: mentionedIds };
}
