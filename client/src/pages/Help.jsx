/* =============================================================
   AURELIS MAISON — HELP & CLIENT CARE
   Direct human concierge contact, topic filters, and comprehensive FAQs.
   ============================================================= */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Accordion, Breadcrumbs, Field, Icon, PageHead, Reveal, SectionHead
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import api from '../lib/api';
import { dx } from '../lib/format';

const CHANNELS = [
  {
    icon: 'chat',
    title: 'Concierge Direct',
    body: 'Human response from our Geneva salon desk. Available 09:00 to 21:00 CET daily.',
    action: 'Send Message'
  },
  {
    icon: 'phone',
    title: 'Telephone Consultation',
    body: '+41 22 501 88 00 — Geneva Atelier. Each boutique also provides a direct line.',
    action: 'View Boutique Numbers',
    to: '/stores'
  },
  {
    icon: 'mail',
    title: 'Written Inquiry',
    body: 'concierge@aurelis.example — answered within one business day by a named artisan.',
    action: 'Use Online Form'
  }
];

const TOPIC_CHOICES = ['General', 'Orders', 'Returns', 'Care', 'Sizing', 'Membership', 'Payment', 'Commission'];

export default function Help() {
  const { content, session, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || 'All';

  const [form, setForm] = useState({
    name: session.user ? `${session.user.first} ${session.user.last}` : '',
    email: session.user?.email || '',
    topic: topic === 'All' ? 'General' : topic,
    order: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [ticket, setTicket] = useState(null);
  const [sending, setSending] = useState(false);

  const faqs = content?.faqs || [];
  const cats = useMemo(() => ['All', ...new Set(faqs.map((f) => f.cat))], [faqs]);
  const shown = topic === 'All' ? faqs : faqs.filter((f) => f.cat === topic);

  const setTopic = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'All') next.delete('topic');
    else next.set('topic', t);
    setParams(next, { replace: true });
  };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please provide your name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) errs.message = 'Please provide a little more detail.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      const res = await api.contact(form);
      setTicket(res);
      toast(res.message, 'chat');
    } catch (err) {
      toast(err.message, 'close');
      setErrors({ message: err.message });
    } finally {
      setSending(false);
    }
  };

  const accordionItems = shown.map((f) => ({
    title: f.q,
    body: <p>{f.a}</p>
  }));

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Client Care & Concierge' }]} />

      <PageHead
        kicker="Atelier Client Care"
        title="Help &amp; Concierge"
        lede="No automated ticket queues or scripted robots. Every inquiry is answered directly by senior concierge staff."
        aside={
          <div className="badge badge--gold" style={{ padding: '8px 14px', fontSize: '12px' }}>
            Typical Response: Under 4 Hours
          </div>
        }
      />

      {/* 3 Contact Channels */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {CHANNELS.map((c, i) => (
            <Reveal key={c.title} delay={i + 1}>
              <div style={{ background: 'var(--color-bone)', padding: '28px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'var(--gold-text)', marginBottom: '12px' }}>
                    <Icon name={c.icon} size={24} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--pearl)' }}>{c.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--pearl-3)', lineHeight: 1.6, marginTop: '8px' }}>{c.body}</p>
                </div>
                <div style={{ marginTop: '20px' }}>
                  {c.to ? (
                    <Link className="btn btn--sm btn--outline" to={c.to}>{c.action}</Link>
                  ) : (
                    <a className="btn btn--sm btn--outline" href="#contact">{c.action}</a>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contact Form & FAQs Split */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'start' }}>
          {/* Contact Form */}
          <div id="contact" style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '36px' }}>
            <span className="eyebrow">Direct Dispatch</span>
            <h2 className="h2" style={{ marginTop: '8px' }}>Speak with an Atelier Specialist</h2>
            <p className="muted" style={{ marginTop: '8px', fontSize: '14px' }}>
              We assist with ring sizing, calibre maintenance, bespoke stone sourcing, and order tracking.
            </p>

            {ticket ? (
              <div style={{ marginTop: '24px', padding: '24px', background: 'var(--color-bone)', borderRadius: 'var(--r-xs)', border: '1px solid var(--line-gold)' }}>
                <span style={{ color: 'var(--gold-text)' }}><Icon name="check" size={28} /></span>
                <h4 className="h4" style={{ marginTop: '8px' }}>Inquiry Registered &middot; Ref #{ticket.ticketId || 'AUR-CARE'}</h4>
                <p style={{ fontSize: '13px', color: 'var(--pearl-3)', marginTop: '4px' }}>
                  A named concierge will reply to <b>{form.email}</b> shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} style={{ marginTop: '24px' }} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Full Name" name="name" value={form.name} onChange={set('name')} error={errors.name} required />
                  <Field label="Email Address" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} required autoComplete="email" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field
                    label="Topic of Inquiry"
                    name="topic"
                    type="select"
                    value={form.topic}
                    onChange={set('topic')}
                    options={TOPIC_CHOICES.map((t) => ({ value: t, label: t }))}
                  />
                  <Field label="Order Ref (Optional)" name="order" value={form.order} onChange={set('order')} placeholder="e.g. AUR-1024" />
                </div>

                <Field
                  label="Inquiry Details"
                  name="message"
                  type="textarea"
                  value={form.message}
                  onChange={set('message')}
                  error={errors.message}
                  placeholder="Describe your question, sizing concern, or commission requirements…"
                  required
                />

                <button className="btn btn--gold btn--block" style={{ marginTop: '20px' }} type="submit" disabled={sending}>
                  {sending ? 'Dispatching…' : 'Send Inquiry to Concierge'}
                </button>
              </form>
            )}
          </div>

          {/* FAQs with Category Filter */}
          <div>
            <div className="between" style={{ marginBottom: '16px' }}>
              <h3 className="h3" style={{ fontFamily: 'var(--serif)', fontSize: '22px' }}>
                Frequently Answered
              </h3>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${topic === c ? ' is-active' : ''}`}
                  onClick={() => setTopic(c)}
                  style={{ fontSize: '11px' }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--color-paper-light)', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', padding: '24px' }}>
              {accordionItems.length > 0 ? (
                <Accordion items={accordionItems} openFirst />
              ) : (
                <p className="muted">No questions listed in this category.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
