/* =============================================================
   AURELIS - STORE DETAILS PAGE
   ============================================================= */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumbs, Empty, Field, Glass, Icon, Loading, PageHead, ProductArt, Reveal, SectionHead, Sheen
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { useAsync } from '../lib/useAsync';
import api from '../lib/api';
import { dx, isOpenNow, todayName } from '../lib/format';

const SERVICE_ICON = {
  'Atelier & Repairs': 'scissors',
  'Private Salon': 'key',
  'Watchmaker On Site': 'clock',
  Engraving: 'sparkle',
  'Perfume Bar': 'sparkle',
  'Bespoke Commissions': 'crown',
  'Silk Atelier': 'scissors'
};

export default function StoreDetail() {
  const { id } = useParams();
  const { session, toast } = useStore();
  const { data, loading, error } = useAsync(() => api.store(id), [id]);

  const [form, setForm] = useState({
    name: session.user ? `${session.user.first} ${session.user.last}` : '',
    email: session.user?.email || '',
    date: '',
    service: 'Private viewing'
  });
  const [booking, setBooking] = useState(null);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  if (loading) return <Loading label="Opening the boutique" />;

  if (error || !data) {
    return (
      <div className="shell section">
        <Empty
          icon="pin"
          title="No such boutique"
          body="This house is not one of ours, or the address may be mistyped."
          cta={{ to: '/stores', label: 'All boutiques' }}
        />
      </div>
    );
  }

  const { store, nearby } = data;
  const open = isOpenNow(store);
  const today = todayName();

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })); };

  const book = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'We need a name for the appointment.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.date) errs.date = 'Choose a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      const res = await api.bookAppointment({ storeId: store.id, ...form });
      setBooking(res);
      toast(res.message, 'key');
    } catch (err) {
      toast(err.message, 'close');
      setErrors({ date: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="shell">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: 'Boutiques', to: '/stores' },
          { label: dx(store.city) }
        ]}
      />

      <PageHead
        kicker={`${dx(store.city)} · ${dx(store.country)}`}
        title={dx(store.name)}
        lede={dx(store.note)}
        aside={
          <Glass variant={open ? 'glass--gold' : 'glass--soft'} style={{ padding: '1.1rem 1.4rem', borderRadius: 'var(--r-lg)' }}>
            <span className={`open-dot ${open ? 'is-open' : 'is-shut'}`}>
              <i className="dot" />{open ? 'Open now' : 'Closed'}
            </span>
            <div className="h4" style={{ marginTop: '.4rem' }}>
              {open ? `Until ${store.closes}` : `Opens ${store.opens}`}
            </div>
          </Glass>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="store-hero">
          <Glass variant="glass--deep" className="store-hero__media">
            <ProductArt shape="boutique" palette={store.flagship ? 'gold' : 'platinum'} label={store.name} />
          </Glass>

          <div>
            <Glass variant="glass--pane" className="panel">
              <span className="eyebrow eyebrow--plain">Visit</span>
              <address style={{ fontStyle: 'normal', color: 'var(--pearl)', lineHeight: 1.9, marginTop: '.7rem', fontFamily: 'var(--serif)', fontSize: '1.08rem' }}>
                {store.address.map((l) => <span key={l}>{dx(l)}<br /></span>)}
              </address>

              <ul className="pdp__assure" style={{ marginTop: '1.2rem' }}>
                <li><Icon name="phone" size={16} /><span>{dx(store.phone)}</span></li>
                <li><Icon name="mail" size={16} /><span>concierge@aurelis.example</span></li>
              </ul>

              <div className="center wrap" style={{ gap: '.7rem', marginTop: '1.4rem' }}>
                <a className="btn btn--gold btn--sm" href="#appointment"><Sheen />Book an appointment</a>
                <a className="btn btn--glass btn--sm" href={`tel:${dx(store.phone).replace(/\s+/g, '')}`}>
                  <Sheen /><Icon name="phone" size={14} />Call
                </a>
              </div>
            </Glass>

            <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
              <span className="eyebrow eyebrow--plain">Hours</span>
              <div className="hours">
                {store.hours.map(([day, hours]) => (
                  <div className={`hours__row${day === today ? ' is-today' : ''}`} key={day}>
                    <span>{day}{day === today ? ' · today' : ''}</span>
                    <span>{dx(hours)}</span>
                  </div>
                ))}
              </div>
              <p className="field__hint" style={{ marginTop: '1rem' }}>
                Private salon appointments can be arranged outside these hours.
              </p>
            </Glass>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <SectionHead kicker="At this house" title="What can be done here" />
        </Reveal>
        <div className="values">
          {store.services.map((s, i) => (
            <Reveal key={s} delay={(i % 3) + 1}>
              <Glass variant="glass--lift" className="value" style={{ minHeight: 0 }}>
                <span className="value__icon" style={{ marginTop: 0 }}>
                  <Icon name={SERVICE_ICON[dx(s)] || 'sparkle'} size={26} />
                </span>
                <h3 style={{ fontSize: '1.2rem' }}>{dx(s)}</h3>
                <p>
                  {dx(s) === 'Atelier & Repairs' && 'A working bench on site. Most repairs are quoted the same day.'}
                  {dx(s) === 'Private Salon' && 'A closed room, by appointment, after hours if you prefer.'}
                  {dx(s) === 'Watchmaker On Site' && 'Regulation, servicing and strap fitting while you wait.'}
                  {dx(s) === 'Engraving' && 'Hand engraving in under an hour, complimentary on most pieces.'}
                  {dx(s) === 'Perfume Bar' && 'The full archive of formulae, sampled at the counter.'}
                  {dx(s) === 'Bespoke Commissions' && 'Design consultations with a maker, not a salesperson.'}
                  {dx(s) === 'Silk Atelier' && 'The screen archive, and made-to-order colourways.'}
                </p>
              </Glass>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- appointment ---------- */}
      <section className="section" id="appointment" style={{ paddingTop: 0 }}>
        <div className="split">
          <Glass variant="glass--pane" className="panel">
            {booking ? (
              <div className="center" style={{ gap: '1.2rem', alignItems: 'flex-start', padding: '1rem 0' }}>
                <span className="empty__ring" style={{ width: 62, height: 62, flex: '0 0 auto' }}>
                  <Icon name="check" size={26} />
                </span>
                <div>
                  <span className="eyebrow eyebrow--plain">Reserved</span>
                  <h2 className="h2" style={{ marginTop: '.5rem' }}>{booking.reference}</h2>
                  <p className="lede muted" style={{ marginTop: '.8rem', maxWidth: '46ch' }}>
                    {dx(booking.message)}
                  </p>
                  <div className="center wrap" style={{ marginTop: '1.2rem', gap: '.6rem' }}>
                    <span className="badge">{booking.date}</span>
                    <span className="badge badge--quiet">{dx(booking.service)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <span className="eyebrow eyebrow--plain">Appointment</span>
                <h2 className="h3" style={{ marginTop: '.5rem' }}>Reserve a private viewing</h2>
                <p className="muted" style={{ marginTop: '.7rem', maxWidth: '54ch' }}>
                  No cost, no obligation. Tell us what you would like to see and it will be brought out and waiting.
                </p>

                <form onSubmit={book} style={{ marginTop: '1.6rem' }} noValidate>
                  <div className="field-row" style={{ marginTop: 0 }}>
                    <Field label="Your name" name="name" value={form.name} onChange={set('name')} error={errors.name} required autoComplete="name" />
                    <Field label="Email address" name="email" type="email" value={form.email} onChange={set('email')} error={errors.email} required autoComplete="email" />
                  </div>
                  <div className="field-row">
                    <Field label="Preferred date" name="date" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
                    <Field
                      label="Purpose"
                      name="service"
                      type="select"
                      value={form.service}
                      onChange={set('service')}
                      options={['Private viewing', 'Servicing or repair', 'Sizing or fitting', 'Commission consultation', 'Perfume bar', 'Collection']}
                    />
                  </div>
                  <button className="btn btn--gold btn--block btn--lg" style={{ marginTop: '1.4rem' }} type="submit" disabled={sending}>
                    <Sheen />{sending ? 'Reserving…' : 'Request this time'}
                  </button>
                  <p className="field__hint" style={{ marginTop: '1rem', textAlign: 'center' }}>
                    A member of the boutique team will confirm within a day.
                  </p>
                </form>
              </>
            )}
          </Glass>

          <div>
            <Glass variant="glass--gold" className="panel">
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="crown" size={22} /></span>
                <div>
                  <h3 className="h4">Members visit after hours</h3>
                  <p className="muted" style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                    Cercle Or members may book the salon outside opening hours in any boutique, including this one.
                  </p>
                  <Link className="btn btn--gold btn--sm" style={{ marginTop: '1rem' }} to="/membership">
                    <Sheen />About Le Cercle
                  </Link>
                </div>
              </div>
            </Glass>

            {nearby?.length > 0 && (
              <Glass variant="glass--pane" className="panel" style={{ marginTop: '1.4rem' }}>
                <h3 className="h4" style={{ marginBottom: '1rem' }}>Other houses</h3>
                {nearby.map((s) => (
                  <Link className="acct__link" key={s.id} to={`/stores/${s.id}`}>
                    <Icon name="pin" size={16} />
                    <span>{dx(s.city)}</span>
                    <span style={{ marginLeft: 'auto' }} className="tiny">
                      {isOpenNow(s) ? 'Open' : 'Closed'}
                    </span>
                  </Link>
                ))}
                <Link className="btn btn--glass btn--sm btn--block" style={{ marginTop: '1rem' }} to="/stores">
                  <Sheen />All boutiques
                </Link>
              </Glass>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
