/* =============================================================
   AURELIS - RETURNS
   Policy, timeline and a working return request flow.
   ============================================================= */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Accordion, Breadcrumbs, Field, Glass, Icon, PageHead, ProductArt, Reveal, SectionHead, Sheen
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, formatDate, money, paletteForVariant } from '../lib/format';

const STEPS = [
  ['Tell us', 'Choose the order and the pieces, and say briefly what went wrong. Thirty days from delivery.'],
  ['We collect', 'A courier is booked at our cost, usually for the next working day. Keep the original box if you can.'],
  ['We inspect', 'The piece is checked at the returns atelier against the ledger. This takes one working day.'],
  ['You are refunded', 'Back to the original payment method within five business days of inspection.']
];

const REASONS = [
  'Not as expected',
  'Sizing — too small',
  'Sizing — too large',
  'Arrived damaged',
  'Wrong piece delivered',
  'Changed my mind',
  'Ordered more than one to compare'
];

const FAQ = [
  { title: 'What can I not return?', body: <p>Engraved, resized, monogrammed and bespoke pieces are final sale — they cannot be resold. Perfume can be returned only with the seal unbroken, for reasons of hygiene and applicable law.</p> },
  { title: 'Do I pay for return shipping?', body: <p>No. Collection is arranged and paid for by us, anywhere we deliver. You will never be asked to pay to send a piece back.</p> },
  { title: 'Can I exchange instead of refunding?', body: <p>Yes, including size exchanges on rings and eyewear. The first exchange on any order is complimentary, and we dispatch the replacement before the original reaches us.</p> },
  { title: 'What if the piece was a gift?', body: <p>The recipient can return it with the order reference on the enclosed card. Refunds are issued as a credit to the recipient rather than back to the buyer, so the gift stays private.</p> },
  { title: 'What about a fault years later?', body: <p>That is not a return, it is the guarantee. Manufacturing defects are corrected for as long as the object exists, regardless of who owns it. Contact your concierge and we will collect it.</p> }
];

export default function Returns() {
  const [params, setParams] = useSearchParams();
  const { toast } = useStore();
  const orders = useAsync(() => api.orders(), []);

  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('refund');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const eligible = (orders.data?.items || []).filter((o) => o.status === 'Delivered' && !o.returnRequest);
  const order = (orders.data?.items || []).find((o) => o.id === orderId);

  useEffect(() => {
    if (!orderId && eligible.length === 1) setOrderId(eligible[0].id);
  }, [eligible, orderId]);

  useEffect(() => { setPicked([]); }, [orderId]);

  const toggleItem = (key) =>
    setPicked((list) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!orderId) errs.order = 'Choose the order.';
    if (!picked.length) errs.items = 'Select at least one piece.';
    if (!reason) errs.reason = 'Tell us why, so we can improve.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      const res = await api.requestReturn(orderId, {
        items: picked,
        reason: note.trim() ? `${reason} — ${note.trim()}` : reason,
        resolution
      });
      setResult(res.returnRequest);
      toast('Return raised. A collection label is on its way.', 'refresh');
      orders.reload();
      const next = new URLSearchParams(params);
      next.delete('order');
      setParams(next, { replace: true });
    } catch (err) {
      toast(err.message, 'close');
      setErrors({ order: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Returns' }]} />

      <PageHead
        kicker="Client care"
        title="Returns & exchanges"
        lede="Thirty days from delivery, collected at our cost. If a piece is not right, it should not stay with you out of politeness."
        aside={
          <Glass variant="glass--gold" style={{ padding: '1.1rem 1.4rem', borderRadius: 'var(--r-lg)' }}>
            <div className="tiny">Return window</div>
            <div className="h3" style={{ marginTop: '.3rem' }}>30 days</div>
          </Glass>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="split">
          {/* ---------- request form ---------- */}
          <div>
            {result ? (
              <Glass variant="glass--gold" className="panel">
                <div className="center" style={{ gap: '1.2rem', alignItems: 'flex-start' }}>
                  <span className="empty__ring" style={{ width: 62, height: 62, flex: '0 0 auto' }}>
                    <Icon name="check" size={26} />
                  </span>
                  <div>
                    <span className="eyebrow eyebrow--plain">Return raised</span>
                    <h2 className="h2" style={{ marginTop: '.5rem' }}>{result.ref}</h2>
                    <p className="lede muted" style={{ marginTop: '.8rem', maxWidth: '48ch' }}>
                      A collection label has been issued and a courier will be in touch to arrange a time. Keep the
                      piece in its box if you still have it.
                    </p>
                    <div className="center wrap" style={{ marginTop: '1.4rem', gap: '.6rem' }}>
                      <span className="badge">{result.status}</span>
                      <span className="badge badge--quiet">Raised {formatDate(result.raised)}</span>
                      <span className="badge badge--quiet">{dx(result.resolution === 'exchange' ? 'Exchange' : 'Refund')}</span>
                    </div>
                    <div className="center wrap" style={{ marginTop: '1.6rem', gap: '.7rem' }}>
                      <Link className="btn btn--gold" to={`/account/orders/${orderId}`}><Sheen />View the order</Link>
                      <button type="button" className="btn btn--glass" onClick={() => { setResult(null); setPicked([]); setReason(''); setNote(''); }}>
                        <Sheen />Raise another
                      </button>
                    </div>
                  </div>
                </div>
              </Glass>
            ) : (
              <Glass variant="glass--pane" className="panel">
                <div className="panel__head">
                  <div>
                    <span className="eyebrow eyebrow--plain">Start a return</span>
                    <h2 className="h3" style={{ marginTop: '.4rem' }}>Which order?</h2>
                  </div>
                  <Link className="link" to="/account/orders">All orders</Link>
                </div>

                {orders.loading ? (
                  <p className="muted">Opening your register…</p>
                ) : eligible.length === 0 ? (
                  <div style={{ padding: '1rem 0' }}>
                    <p className="muted" style={{ maxWidth: '56ch' }}>
                      There is nothing eligible to return right now. Returns open once an order is delivered, and stay
                      open for thirty days. If a piece has a fault outside that window, that is covered by the
                      guarantee instead — <Link className="link-gold" to="/help">tell your concierge</Link>.
                    </p>
                    <Link className="btn btn--glass btn--sm" style={{ marginTop: '1.2rem' }} to="/account/orders">
                      <Sheen />View orders
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate>
                    <Field
                      label="Order"
                      name="order"
                      type="select"
                      value={orderId}
                      onChange={(e) => { setOrderId(e.target.value); setErrors({}); }}
                      error={errors.order}
                      options={[
                        { value: '', label: 'Choose an order…' },
                        ...eligible.map((o) => ({
                          value: o.id,
                          label: `${o.id} — ${formatDate(o.date)} — ${money(o.totals.total)}`
                        }))
                      ]}
                      required
                    />

                    {order && (
                      <>
                        <div className="rule" style={{ margin: '1.6rem 0 1.2rem' }} />
                        <h3 className="field__label" style={{ marginBottom: '.9rem' }}>Which pieces?</h3>
                        {errors.items && <p className="field__err" style={{ display: 'block', marginBottom: '.7rem' }}>{errors.items}</p>}

                        <div style={{ display: 'grid', gap: '.8rem' }}>
                          {order.items.map((it, i) => {
                            const key = `${it.id}::${i}`;
                            const on = picked.includes(key);
                            return (
                              <label className={`opt${on ? ' is-on' : ''}`} key={key}>
                                <input type="checkbox" className="sr-only" checked={on} onChange={() => { toggleItem(key); setErrors((x) => ({ ...x, items: null })); }} />
                                <span style={{ width: 54, borderRadius: 10, overflow: 'hidden', flex: '0 0 auto' }}>
                                  <ProductArt
                                    id={it.id}
                                    shape={it.product?.shape || 'atelier'}
                                    palette={paletteForVariant(it.product, it.variant)}
                                    label={it.product?.name}
                                  />
                                </span>
                                <span className="opt__body">
                                  <span className="opt__title">{dx(it.product?.name || 'Piece')}</span>
                                  <span className="opt__meta">
                                    {[it.variant, it.size].filter(Boolean).map(dx).join(' · ')} · Quantity {it.qty}
                                  </span>
                                </span>
                                <span className="opt__price">{money(it.lineTotal)}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="rule" style={{ margin: '1.6rem 0 1.2rem' }} />

                        <Field
                          label="Reason"
                          name="reason"
                          type="select"
                          value={reason}
                          onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: null })); }}
                          error={errors.reason}
                          options={[{ value: '', label: 'Choose a reason…' }, ...REASONS]}
                          required
                        />

                        <Field
                          label="Anything else?"
                          name="note"
                          type="textarea"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional. Detail helps the atelier more than you would think."
                          rows={3}
                        />

                        <h3 className="field__label" style={{ margin: '1.4rem 0 .9rem' }}>Preferred outcome</h3>
                        <div style={{ display: 'grid', gap: '.8rem' }}>
                          {[
                            ['refund', 'Refund', 'Back to the original payment method within five business days of inspection.', 'card'],
                            ['exchange', 'Exchange', 'A replacement is dispatched before the original reaches us. First exchange is free.', 'refresh'],
                            ['credit', 'Boutique credit', 'Held against your register, with ten per cent added. Never expires.', 'gift']
                          ].map(([value, title, body, icon]) => (
                            <label className={`opt${resolution === value ? ' is-on' : ''}`} key={value}>
                              <input type="radio" name="resolution" className="sr-only" checked={resolution === value} onChange={() => setResolution(value)} />
                              <span className="gold" style={{ marginTop: '.15rem' }}><Icon name={icon} size={20} /></span>
                              <span className="opt__body">
                                <span className="opt__title">{title}</span>
                                <span className="opt__meta">{body}</span>
                              </span>
                            </label>
                          ))}
                        </div>

                        <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.8rem' }} type="submit" disabled={sending}>
                          <Sheen />{sending ? 'Raising…' : 'Raise the return'}
                        </button>
                      </>
                    )}
                  </form>
                )}
              </Glass>
            )}

            <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
              <h2 className="h3" style={{ marginBottom: '.4rem' }}>Questions</h2>
              <Accordion items={FAQ} openFirst />
            </Glass>
          </div>

          {/* ---------- policy ---------- */}
          <div>
            <Glass variant="glass--pane" className="panel">
              <span className="eyebrow eyebrow--plain">How it goes</span>
              <h2 className="h3" style={{ marginTop: '.5rem' }}>Four steps, no argument</h2>
              <div className="timeline">
                {STEPS.map(([title, body], i) => (
                  <div className="tl-item" key={title}>
                    <span className="tl-item__dot">{i + 1}</span>
                    <div>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>

            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <h3 className="h4" style={{ marginBottom: '.9rem' }}>The short version</h3>
              <ul className="pdp__assure" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
                <li><Icon name="clock" size={16} /><span>Thirty days from delivery, unworn, with the hallmark tag.</span></li>
                <li><Icon name="truck" size={16} /><span>Collection booked and paid for by us, worldwide.</span></li>
                <li><Icon name="scissors" size={16} /><span>Engraved, resized and bespoke pieces are final sale.</span></li>
                <li><Icon name="shield" size={16} /><span>Faults are covered by the guarantee, with no time limit at all.</span></li>
              </ul>
            </Glass>

            <Glass variant="glass--gold" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="chat" size={22} /></span>
                <div>
                  <h3 className="h4">Rather just talk to someone?</h3>
                  <p className="muted" style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                    A concierge can raise this for you and often resolve it faster.
                  </p>
                  <Link className="btn btn--gold btn--sm" style={{ marginTop: '1rem' }} to="/help">
                    <Sheen />Contact the concierge
                  </Link>
                </div>
              </div>
            </Glass>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <SectionHead kicker="Related" title="Before you send it back" />
        </Reveal>
        <div className="help-grid">
          {[
            { icon: 'refresh', title: 'It might just need a service', body: 'Resizing, re-waxing and re-polishing are usually free, and always cheaper than starting again.', to: '/help', cta: 'Arrange a service' },
            { icon: 'truck', title: 'Shipping & delivery', body: 'Lead times, duties, and what happens if nobody is home to sign.', to: '/shipping', cta: 'Read shipping' },
            { icon: 'doc', title: 'Terms of sale', body: 'The full returns clause, in plain language, alongside the rest of the terms.', to: '/legal#returns', cta: 'Read the terms' }
          ].map((c, i) => (
            <Reveal key={c.title} delay={i + 1}>
              <Glass variant="glass--lift" className="help-card">
                <Icon name={c.icon} size={26} />
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <Link className="btn btn--glass btn--sm" to={c.to}><Sheen />{c.cta}</Link>
              </Glass>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
