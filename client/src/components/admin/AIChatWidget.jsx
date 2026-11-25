/* =============================================================
   AI CHAT WIDGET
   Floating assistant available on every admin page. It never
   invents a figure — see server/src/ai/assistant.js — so each
   turn is answered fresh against live stock, orders and
   inventory data, with the transcript kept only for readability.
   ============================================================= */
import { useEffect, useRef, useState } from 'react';
import { adminApi, AdminError } from '../../lib/adminApi';

const STORAGE_KEY = 'aurelis.admin.aichat';

const SUGGESTIONS = [
  'Which products are close to running out of stock?',
  'What is our current inventory value?',
  'Which items are overstocked right now?',
  "Summarise this month's real trade so far."
];

function loadHistory() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-40)));
  } catch { /* private mode */ }
}

/* The model reliably answers in **bold** figures and "- " lists (it is
   never told to, that is just how it writes). Rendering that literally
   as asterisks and dashes reads worse than plain text would, so this
   parses just those two things — not a general markdown library. */
function boldSplit(line, keyPrefix) {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`}>{part}</strong> : part
  );
}

function renderAnswer(text) {
  const blocks = String(text || '').trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
    if (isList) {
      return (
        <ul key={bi} className="ai-chat__list">
          {lines.map((l, li) => <li key={li}>{boldSplit(l.replace(/^[-*]\s+/, ''), `${bi}-${li}`)}</li>)}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((l, li) => (
          <span key={li}>
            {boldSplit(l, `${bi}-${li}`)}
            {li < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => { saveHistory(messages); }, [messages]);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy, open]);

  const send = async (text) => {
    const q = String(text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setErr('');
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.text }));
    setMessages((cur) => [...cur, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const out = await adminApi.ai.ask(q, history);
      if (out.ok) {
        setMessages((cur) => [...cur, { role: 'assistant', text: out.answer, model: out.model }]);
      } else {
        setErr(out.error || 'The assistant could not answer that.');
      }
    } catch (e) {
      setErr(e instanceof AdminError ? e.message : 'The server is unreachable.');
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setMessages([]); setErr(''); };

  return (
    <div className={`ai-chat${open ? ' is-open' : ''}`}>
      {open && (
        <div className="ai-chat__panel" role="dialog" aria-label="AI assistant">
          <div className="ai-chat__head">
            <div>
              <h2 className="ai-chat__title">Aurelis Assistant</h2>
              <p className="ai-chat__sub">Reads live stock, orders and inventory figures</p>
            </div>
            <div className="ai-chat__headActions">
              {messages.length > 0 && (
                <button type="button" className="ai-chat__iconbtn" onClick={clear}>
                  Clear
                </button>
              )}
              <button
                type="button"
                className="ai-chat__iconbtn"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="ai-chat__body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="ai-chat__empty">
                <p>
                  Ask about stock levels, low-stock risk, overstock or real sales &mdash; every
                  answer is read from this system&rsquo;s own figures, never guessed.
                </p>
                <div className="ai-chat__suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="ai-chat__suggestion" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`ai-chat__msg ai-chat__msg--${m.role}`}>
                {m.role === 'assistant' ? renderAnswer(m.text) : <p>{m.text}</p>}
                {m.model && <span className="ai-chat__modelTag">{m.model}</span>}
              </div>
            ))}

            {busy && (
              <div className="ai-chat__msg ai-chat__msg--assistant ai-chat__msg--thinking" aria-live="polite">
                <span className="sr-only">Thinking&hellip;</span>
                <span className="ai-chat__dot" />
                <span className="ai-chat__dot" />
                <span className="ai-chat__dot" />
              </div>
            )}

            {err && <p className="ai-chat__error">{err}</p>}
          </div>

          <form className="ai-chat__inputRow" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Ask about products, stock or sales..."
              disabled={busy}
              aria-label="Ask the assistant"
            />
            <button type="submit" className="btn btn--sm" disabled={busy || !input.trim()}>
              Ask
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="ai-chat__fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? '✕' : 'Ask AI'}
      </button>
    </div>
  );
}
