/* =============================================================
   AURELIS // TERMINAL DIRECTORY & SYSTEM SPECIFICATIONS
   Technical machine colophon, category directories, and transaction guarantees.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Icon } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const TERMINAL_CARE = [
  ['/help', '01 // Concierge & Inquiries'],
  ['/shipping', '02 // Global Courier Dispatch'],
  ['/returns', '03 // 30-Day Escrow Return'],
  ['/account/orders', '04 // Real-Time Ledger Tracking'],
  ['/help?topic=Care', '05 // Technical Servicing & Restoration'],
  ['/help?topic=Sizing', '06 // Calibration & Size Indices']
];

const TERMINAL_SYSTEM = [
  ['/membership', '01 // Member Terminal Access'],
  ['/stores', '02 // Physical Atelier Vaults'],
  ['/#story', '03 // Geneva Precision Heritage (1911)'],
  ['/#journal', '04 // The Digital Dispatch'],
  ['/legal#privacy', '05 // Cryptographic Discretion'],
  ['/legal', '06 // Commercial Terms of Sale']
];

const PROTOCOLS = ['ESCROW VERIFIED', '256-BIT RSA', 'NODE-DIRECT', 'GENEVA ATELIER CERTIFIED'];

export default function Footer() {
  const { categories } = useStore();

  return (
    <footer className="site-footer" style={{ borderTop: '1px solid var(--line-dark)', background: 'var(--color-paper-light)' }}>
      {/* Top Machine Telemetry Ribbon */}
      <div style={{ padding: '12px 24px', borderBottom: '1px dashed var(--line)', background: 'var(--color-bone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--pearl-2)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-terminal-green)', display: 'inline-block' }} />
          <span>TERMINAL // ONLINE &middot; REAL-TIME COMMERCE PROTOCOL 1980.2026</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--pearl-3)' }}>
          {PROTOCOLS.map((p) => (
            <span key={p}>[ {p} ]</span>
          ))}
        </div>
      </div>

      <div className="footer-grid" style={{ padding: '48px 24px' }}>
        {/* Brand Colophon */}
        <div className="footer-brand">
          <Link className="brand" style={{ alignItems: 'flex-start', padding: 0 }} to="/">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--color-terminal-green)', borderRadius: '1px' }} />
              <span className="footer-brand__mark" style={{ letterSpacing: '0.1em' }}>AURELIS</span>
            </div>
            <span className="footer-brand__sub" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
              COMMERCE TERMINAL &middot; GENEVA NODE
            </span>
          </Link>
          <p className="footer-brand__desc" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', lineHeight: '1.5', marginTop: '12px' }}>
            Mechanical precision, numbered jewellery editions, and rare olfactive extraits. Engineered in Geneva ateliers. No production line. Recorded in the immutable maison ledger.
          </p>
          <div className="center wrap" style={{ marginTop: '20px', gap: '8px' }}>
            <span className="badge badge--green">
              <Icon name="shield" size={12} /> LIFETIME RESTORATION
            </span>
            <span className="badge badge--terminal">
              <Icon name="truck" size={12} /> INSURED TRANSIT
            </span>
          </div>
        </div>

        {/* Collections Directory */}
        <div className="footer-col">
          <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', letterSpacing: '0.08em', color: 'var(--pearl-3)' }}>
            CATALOGUE DIRECTORY
          </h5>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '14px' }}>
            {categories.slice(0, 6).map((c, i) => (
              <li key={c.slug} style={{ marginBottom: '8px' }}>
                <Link to={`/category/${c.slug}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--pearl-2)' }}>
                  {String(i + 1).padStart(2, '0')} // {dx(c.name)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Client Care Directory */}
        <div className="footer-col">
          <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', letterSpacing: '0.08em', color: 'var(--pearl-3)' }}>
            CLIENT TERMINAL
          </h5>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '14px' }}>
            {TERMINAL_CARE.map(([to, label]) => (
              <li key={to} style={{ marginBottom: '8px' }}>
                <Link to={to} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--pearl-2)' }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* The Maison Systems */}
        <div className="footer-col">
          <h5 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', letterSpacing: '0.08em', color: 'var(--pearl-3)' }}>
            SYSTEM PROTOCOLS
          </h5>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '14px' }}>
            {TERMINAL_SYSTEM.map(([to, label]) => (
              <li key={to} style={{ marginBottom: '8px' }}>
                <Link to={to} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--pearl-2)' }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom" style={{ borderTop: '1px solid var(--line)', background: 'var(--color-paper)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          &copy; {new Date().getFullYear()} AURELIS TERMINAL SA &middot; ALL LEDGER RIGHTS RESERVED
        </div>
        <div className="center wrap" style={{ gap: '12px' }}>
          {['VISA', 'MASTERCARD', 'AMEX', 'ESCROW WIRE', 'UPI NETBANKING'].map((p) => (
            <span key={p} className="tiny footer-pay" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }}>
              [ {p} ]
            </span>
          ))}
        </div>
        <div className="center" style={{ gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          <Link to="/legal#privacy" className="footer-pay">DISCRETION</Link>
          <Link to="/legal" className="footer-pay">TERMS</Link>
          <Link to="/admin/login" className="footer-pay" style={{ color: 'var(--color-terminal-green-text)' }}>[ STAFF TERMINAL ]</Link>
        </div>
      </div>
    </footer>
  );
}
