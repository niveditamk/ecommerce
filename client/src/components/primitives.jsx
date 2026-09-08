/* =============================================================
   AURELIS MAISON — DESIGN SYSTEM PRIMITIVES
   Accessible, responsive, high-precision building blocks.
   ============================================================= */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Art from '../lib/art';
import { dx, money } from '../lib/format';
import IMAGES from '../lib/imageManifest.json';

/* ---------- Icon ---------- */
export function Icon({ name, size = 20, className = '' }) {
  const html = useMemo(() => Art.icon(name, size, className), [name, size, className]);
  return <span className="ico-wrap" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- Rating Stars ---------- */
export function Stars({ rating = 5, size = 12 }) {
  const html = useMemo(() => Art.stars(rating, size), [rating, size]);
  return <span className="stars-wrap" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- Barcode Graphic Motif ---------- */
export function Barcode({ code = 'AUR-1980', className = '' }) {
  const bars = useMemo(() => {
    const chars = String(code).split('');
    return chars.flatMap((c) => {
      const codeVal = c.charCodeAt(0);
      return [
        { w: (codeVal % 3) + 1, space: (codeVal % 2) + 1 },
        { w: ((codeVal >> 1) % 3) + 1, space: 1 }
      ];
    }).slice(0, 14);
  }, [code]);

  return (
    <div className={`barcode-motif ${className}`} aria-hidden="true">
      {bars.map((b, i) => (
        <span
          key={i}
          className="barcode-bar"
          style={{
            width: `${b.w}px`,
            marginRight: `${b.space}px`
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Product Imagery & Technical Blueprint Vitrine ---------- */
export function ProductArt({ id, shape, palette, label, category, className = '', glow = false }) {
  const photo = id ? IMAGES[id] : null;
  const [failed, setFailed] = useState(false);

  const html = useMemo(
    () => Art.product(shape || 'atelier', palette || 'gold', { label: dx(label || 'AURELIS piece') }),
    [shape, palette, label]
  );

  if (photo && !failed) {
    return (
      <figure className={`art art--photo ${className}`}>
        <img
          className="art__img"
          src={photo.src}
          alt={dx(label) || photo.alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
        <div className="blueprint-corners" aria-hidden="true" />
        {glow && <span className="art__glow" />}
      </figure>
    );
  }

  const refCode = id ? String(id).toUpperCase() : 'REF-001';
  const catCode = category ? String(category).toUpperCase() : (shape || 'OBJECT').toUpperCase();

  return (
    <figure className={`blueprint-card ${className}`}>
      <div className="blueprint-corners" aria-hidden="true" />
      
      {/* Top Technical Metadata */}
      <div style={{ position: 'absolute', top: 8, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--pearl-3)', letterSpacing: '0.06em' }}>
        <span>SPEC // {refCode}</span>
        <span style={{ color: 'var(--color-terminal-green-text)', fontWeight: 700 }}>[ CAD SCHEMATIC ]</span>
      </div>

      {/* Center Precision Blueprint SVG */}
      <div className="blueprint-svg-wrap">
        <span className="art__svg" style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* Bottom Technical Scale & Barcode */}
      <div className="blueprint-meta">
        <span>DIV // {catCode}</span>
        <Barcode code={refCode} />
        <span>1:1 SCALE</span>
      </div>

      {glow && <span className="art__glow" />}
    </figure>
  );
}

/* ---------- Button Sheen ---------- */
export const Sheen = () => <span className="btn__sheen" aria-hidden="true" />;

/* ---------- Formatted Money Price ---------- */
export function Price({ value, currency, className = '' }) {
  return <span className={className}>{money(value, currency)}</span>;
}

/* ---------- Viewport Reveal (Intersection Observer) ---------- */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      setSeen(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    );
    io.observe(node);

    const failsafe = setTimeout(() => setSeen(true), 1200);
    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  const cls = ['rv', delay ? `rv-${delay}` : '', seen ? 'in' : '', className].filter(Boolean).join(' ');
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}

/* ---------- Glass / Vitrine Surface ---------- */
export function Glass({ as: Tag = 'div', variant = '', className = '', children, ...rest }) {
  const cls = ['glass', variant, className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Form Field ---------- */
export function Field({
  label, name, type = 'text', value, onChange, placeholder, hint, error,
  required, options, autoComplete, inputMode, maxLength, rows, disabled
}) {
  const id = `f-${name}`;
  const common = {
    id, name, value: value ?? '', onChange, required, disabled,
    className: 'input',
    placeholder: dx(placeholder || ''),
    autoComplete, inputMode, maxLength
  };

  return (
    <div className={`field${error ? ' is-invalid' : ''}`}>
      {label && (
        <label htmlFor={id}>
          {dx(label)}
          {required && <em className="gold" style={{ fontStyle: 'normal' }}> *</em>}
        </label>
      )}

      {type === 'select' ? (
        <select {...common}>
          {(options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lab = typeof opt === 'string' ? opt : opt.label;
            return <option key={val} value={val}>{dx(lab)}</option>;
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea {...common} rows={rows || 4} />
      ) : (
        <input {...common} type={type} />
      )}

      {hint && !error && <span className="tiny" style={{ color: 'var(--pearl-3)', marginTop: 2 }}>{dx(hint)}</span>}
      {error && <span className="tiny" style={{ color: 'var(--error)', marginTop: 2 }}>{dx(error)}</span>}
    </div>
  );
}

export function Check({ label, name, checked, onChange, type = 'checkbox', value, hint }) {
  return (
    <label className="check-label">
      <input type={type} name={name} value={value} checked={!!checked} onChange={onChange} />
      <span>
        {dx(label)}
        {hint && <span className="tiny" style={{ display: 'block', color: 'var(--pearl-3)', marginTop: 2 }}>{dx(hint)}</span>}
      </span>
    </label>
  );
}

export function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      className={`chip${on ? ' is-active' : ''}`}
      onClick={onClick}
      role="switch"
      aria-checked={on}
    >
      {dx(label || 'Toggle')}
    </button>
  );
}

/* ---------- Accordion ---------- */
export function Accordion({ items, openFirst = false }) {
  const [open, setOpen] = useState(() => (openFirst ? { 0: true } : {}));

  return (
    <div className="accordion">
      {items.map((item, i) => (
        <div key={item.title} className="accordion__item">
          <button
            type="button"
            className="accordion__head"
            aria-expanded={!!open[i]}
            onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
          >
            <span>{dx(item.title)}</span>
            <span style={{ fontSize: '18px', fontWeight: 300, color: 'var(--pearl-3)' }}>
              {open[i] ? '−' : '+'}
            </span>
          </button>
          {open[i] && (
            <div className="accordion__body">
              {item.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Quantity Control ---------- */
export function QtyControl({ qty, onChange, small = false, max = 20, disabled }) {
  return (
    <div className="qty-ctrl">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        disabled={disabled || qty <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span aria-live="polite">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(qty + 1, max))}
        disabled={disabled || qty >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/* ---------- Breadcrumbs ---------- */
export function Breadcrumbs({ trail }) {
  return (
    <nav className="crumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pearl-3)', paddingBlock: '20px 12px' }} aria-label="Breadcrumb">
      {trail.map((t, i) =>
        i === trail.length - 1 ? (
          <span className="gold" key={t.label}>{dx(t.label)}</span>
        ) : (
          <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Link to={t.to} style={{ color: 'var(--pearl-3)' }}>{dx(t.label)}</Link>
            <span style={{ opacity: 0.4 }}>/</span>
          </span>
        )
      )}
    </nav>
  );
}

/* ---------- Page Header ---------- */
export function PageHead({ kicker, title, lede, aside, plainKicker }) {
  return (
    <header className="page-head">
      <div className="between wrap" style={{ gap: '24px' }}>
        <div>
          {kicker && <span className={`eyebrow${plainKicker ? ' eyebrow--plain' : ''}`}>{dx(kicker)}</span>}
          <h1 className="page-head__title">{dx(title)}</h1>
          {lede && <p className="page-head__desc">{dx(lede)}</p>}
        </div>
        {aside && <div>{aside}</div>}
      </div>
    </header>
  );
}

/* ---------- Section Header ---------- */
export function SectionHead({ kicker, title, body, action }) {
  return (
    <div className="section-head">
      <div className="section-head__left">
        {kicker && <span className="eyebrow">{dx(kicker)}</span>}
        <h2 className="section-head__title">{dx(title)}</h2>
        {body && <p className="section-head__body">{dx(body)}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ---------- Empty State ---------- */
export function Empty({ icon = 'bag', title, body, cta }) {
  return (
    <div className="newsletter-box" style={{ padding: '64px 32px' }}>
      <div style={{ color: 'var(--gold-text)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        <Icon name={icon} size={36} />
      </div>
      <h2 className="h2">{dx(title)}</h2>
      <p className="lede muted" style={{ maxWidth: '44ch', margin: '12px auto 28px' }}>{dx(body)}</p>
      {cta && (
        <Link className="btn btn--gold" to={cta.to}>
          {dx(cta.label)}
        </Link>
      )}
    </div>
  );
}

/* ---------- Badge ---------- */
export function Badge({ children, tone = '' }) {
  return <span className={`badge${tone ? ` badge--${tone}` : ''}`}>{children}</span>;
}

/* ---------- Skeleton Loader ---------- */
export function Loading({ label = 'Bringing the pieces out' }) {
  return (
    <div className="shell section" style={{ textAlign: 'center', padding: '96px 20px' }}>
      <div style={{ color: 'var(--gold-text)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        <Icon name="sparkle" size={32} />
      </div>
      <div className="h3">{dx(label)}</div>
      <p className="muted" style={{ marginTop: '8px' }}>One moment as the atelier prepares your view.</p>
    </div>
  );
}

/* ---------- PIN Code Delivery Estimator Component ---------- */
export function PincodeChecker({ onCheck }) {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState(null);

  const handleCheck = (e) => {
    e.preventDefault();
    if (!pin || pin.length < 4) return;
    // Calculate delivery date 3 business days from now
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    setResult({
      date: dateStr,
      msg: `Complimentary signature delivery available for PIN ${pin}`
    });
    if (onCheck) onCheck(pin);
  };

  return (
    <div className="pincode-box">
      <span className="tiny" style={{ letterSpacing: '0.12em', color: 'var(--pearl-2)', fontWeight: 600 }}>
        Estimated Delivery
      </span>
      <form className="pincode-box__row" onSubmit={handleCheck}>
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit PIN code"
          maxLength={6}
          style={{ maxWidth: '200px' }}
        />
        <button type="submit" className="btn btn--sm btn--outline">
          Check
        </button>
      </form>
      {result && (
        <div className="pincode-box__result">
          <Icon name="check" size={14} />
          <span>Expected by <b>{result.date}</b> &mdash; {result.msg}</span>
        </div>
      )}
    </div>
  );
}
