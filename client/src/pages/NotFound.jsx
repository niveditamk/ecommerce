/* =============================================================
   AURELIS - NOT FOUND
   ============================================================= */
import { Link } from 'react-router-dom';
import { Glass, Icon, ProductArt, Sheen } from '../components/primitives';

const ROUTES = [
  ['/categories', 'Collections', 'grid'],
  ['/stores', 'Boutiques', 'pin'],
  ['/account/orders', 'Orders', 'box'],
  ['/help', 'Help & Contact', 'chat']
];

export default function NotFound() {
  return (
    <div className="shell section">
      <Glass variant="glass--deep" className="confirm">
        <div style={{ width: 180, margin: '0 auto 2rem', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          <ProductArt shape="atelier" palette="violet" label="Not found" />
        </div>
        <span className="eyebrow eyebrow--plain" style={{ display: 'flex', justifyContent: 'center' }}>
          Error 404
        </span>
        <h1 className="h1" style={{ marginTop: '.8rem' }}>This room is empty</h1>
        <p className="lede muted" style={{ margin: '1.2rem auto 0', maxWidth: '48ch' }}>
          The page you asked for is not in the house. It may have been retired to the archive, or the address may be
          mistyped.
        </p>

        <div className="center wrap" style={{ justifyContent: 'center', marginTop: '2.2rem', gap: '.7rem' }}>
          <Link className="btn btn--gold btn--lg" to="/"><Sheen />Return to the maison</Link>
          <Link className="btn btn--glass btn--lg" to="/help"><Sheen />Ask a concierge</Link>
        </div>

        <div className="rule" style={{ margin: '2.6rem 0 1.8rem' }} />

        <div className="center wrap" style={{ justifyContent: 'center', gap: '.6rem' }}>
          {ROUTES.map(([to, label, icon]) => (
            <Link className="chip" key={to} to={to}>
              <Icon name={icon} size={14} />{label}
            </Link>
          ))}
        </div>
      </Glass>
    </div>
  );
}
