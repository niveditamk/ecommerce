/* =============================================================
   NOTES PANEL
   Drop into any admin detail page: leave a note for a colleague,
   @mention them by their email's local part (visible on the
   Staff page), and it highlights inline once resolved server-side.
   ============================================================= */
import { useEffect, useState } from 'react';
import { readToken } from '../../lib/adminApi';
import { formatShortDate, dx } from '../../lib/format';

/* Highlights the same @handle syntax the server resolves mentions
   from (server/src/notes.js's resolveMentions), not the resolved
   display name — the name never appears literally in the body. */
function renderBody(text) {
  return text.split(/(@[a-z0-9._-]+)/gi).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="note-mention">{part}</strong> : part
  );
}

export default function NotesPanel({ entity, entityId, staffDirectory = [] }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const token = readToken();

  const load = () => {
    fetch(`/api/admin/notes?entity=${entity}&entityId=${encodeURIComponent(entityId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((res) => { setNotes(res.notes || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entity, entityId]);

  const staffById = Object.fromEntries(staffDirectory.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const namesFor = (mentionedIds) => (mentionedIds || []).map((id) => staffById[id]).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entity, entityId: String(entityId), body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save that note.');
      setBody('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">Notes {notes.length > 0 && `(${notes.length})`}</h2>

      {loading ? (
        <p className="tiny" style={{ opacity: 0.65 }}>Loading…</p>
      ) : notes.length === 0 ? (
        <p className="tiny" style={{ opacity: 0.65 }}>No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="notes-list__item">
              <div className="notes-list__meta">
                <strong>{n.author_name}</strong>
                <span className="tiny" style={{ opacity: 0.6 }}>{formatShortDate(n.created_at?.slice(0, 10))}</span>
              </div>
              <p className="tiny notes-list__body">{renderBody(dx(n.body))}</p>
              {namesFor(n.mentioned_ids).length > 0 && (
                <p className="tiny notes-list__mentioned">Mentioned: {namesFor(n.mentioned_ids).join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="notes-form">
        <textarea
          className="input"
          rows={3}
          placeholder="Leave a note — @firstname.lastname to mention a colleague"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="field__err" style={{ display: 'block' }}>{error}</p>}
        <button type="submit" className="btn btn--sm" disabled={submitting || !body.trim()}>
          {submitting ? 'Saving…' : 'Add Note'}
        </button>
      </form>
    </section>
  );
}
