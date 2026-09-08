/* =============================================================
   OPENROUTER
   A small client for the free models, used to put the analyst's
   figures into plain English.

   Two things it is careful about:

   1. FREE MODELS FAIL OFTEN. Upstream providers rate-limit them
      without warning — during setup, three of six returned 429 or
      403 on the first call. So the client walks a chain and only
      gives up once every model has refused, and it reports which
      one answered rather than pretending there is one model.

   2. THE MODEL NEVER SEES A BLANK PAGE. It is given the figures
      this system computed and told to explain them. It is not
      asked what the stock levels are — it is told, and asked to
      say what they mean. A model inventing a number here would be
      indistinguishable from a real one on screen, which is the
      exact failure this project forbids.
   ============================================================= */

const API = 'https://openrouter.ai/api/v1/chat/completions';

/* Ordered by how reliably they answered when this was set up.
   openrouter/free is an auto-router and sits last because it
   returned empty content in testing. */
/* Ordered by what actually answered when this was last checked against
   the live API, not by reputation. Each was sent a real question with
   figures and judged on whether it returned a usable answer:

     nemotron-3-super   188ms, clean prose, arithmetic agreed with ours
     dots-3-note        585ms, clean prose, reasoning kept out of content
     gemma-4-*          429 rate-limited at the time; free capacity comes
                        and goes, so they stay as fallbacks
     nemotron-lightning last: it returns its planning notes as the answer

   Removed, with the reason:
     minimax/minimax-m3  404 "unavailable for free" — the free tier is gone
     z-ai/glm-5.2        404, same
     nex-agi/nex-n2.5-*  200 with an empty body and no finish_reason */
export const MODEL_CHAIN = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'dots-studio/dots-3-note-preview:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'openrouter/free'
];

const key = () => process.env.OPENROUTER_API_KEY || '';
export const isConfigured = () => Boolean(key());

export class AiError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'AiError';
    this.detail = detail;
  }
}

/** Reasoning models emit their working before the answer. Keep only
    what a person is meant to read. */
function tidy(text) {
  let out = String(text || '');
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
  /* Some models open with "Here's a thinking process:" and similar. */
  out = out.replace(/^\s*(here'?s? (a|my) (thinking process|plan)[^\n]*\n+)/i, '');
  return out.trim();
}

/**
 * Ask a model to write the answer, walking the chain on failure.
 * Returns { text, model, attempts } or throws once nothing is left.
 */
export async function complete({ system, user, maxTokens = 700, temperature = 0.2, signal }) {
  if (!isConfigured()) {
    throw new AiError('OPENROUTER_API_KEY is not set on this server.');
  }

  const attempts = [];
  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${key()}`,
          'Content-Type': 'application/json',
          /* OpenRouter asks callers to identify themselves. */
          'HTTP-Referer': 'http://localhost:4000',
          'X-Title': 'Aurelis Admin'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          max_tokens: maxTokens,
          temperature
        })
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || body?.error) {
        attempts.push({ model, error: body?.error?.message || `HTTP ${res.status}` });
        continue;
      }

      const message = body?.choices?.[0]?.message || {};

      /* Some reasoning models put their planning notes in `content` and
         the same bytes again in `reasoning` — they never wrote a final
         answer. Measured on nemotron-3.5-lightning: both fields 678
         characters, identical. Serving that would show the operator a
         numbered plan instead of a reply, so it counts as a failure and
         the chain moves on. */
      const reasoning = String(message.reasoning || '');
      const raw = String(message.content || '');
      if (raw && reasoning && raw.trim() === reasoning.trim()) {
        attempts.push({ model, error: 'returned its reasoning instead of an answer' });
        continue;
      }

      const text = tidy(raw);
      if (!text) {
        attempts.push({ model, error: 'returned an empty answer' });
        continue;
      }

      return { text, model, attempts };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      attempts.push({ model, error: err.message });
    }
  }

  throw new AiError(
    'Every free model refused or was rate-limited. Free capacity on OpenRouter comes and goes; try again shortly.',
    attempts
  );
}

/** Which models are currently answering — useful when the console
    needs to explain why the AI panel is quiet. */
export async function probe() {
  if (!isConfigured()) return { configured: false, models: [] };
  const out = [];
  for (const model of MODEL_CHAIN.slice(0, 3)) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 4
        })
      });
      const body = await res.json().catch(() => null);
      out.push({ model, ok: res.ok && !body?.error, note: body?.error?.message?.slice(0, 80) });
    } catch (err) {
      out.push({ model, ok: false, note: err.message });
    }
  }
  return { configured: true, models: out };
}
