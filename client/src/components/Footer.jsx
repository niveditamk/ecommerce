/* =============================================================
   AURELIS MAISON // PRESTIGIOUS HAUTE COLOPHON & DIRECTORY
   Geneva atelier heritage, client concierge services,
   precious material provenance, and discreet administrative portal.
   ============================================================= */
import { Link } from 'react-router-dom';
import { Icon } from './primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const CLIENT_SERVICES = [
  ['/help', 'Client Concierge & Inquiries'],
  ['/shipping', 'Complimentary Insured Dispatch'],
  ['/returns', '30-Day Return Privilege'],
  ['/account/orders', 'Track Order & Valuation Certificate'],
  ['/help?topic=Care', 'Lifetime Servicing & Ultrasonic Restoration'],
  ['/help?topic=Sizing', 'Complimentary Sizing Kit & Measurement']
];

const THE_MAISON = [
  ['/stores', 'Atelier Flagships (Geneva, London, Paris, Mumbai)'],
  ['/#story', 'The 1911 Geneva Precision Heritage'],
  ['/membership', 'Private Collector Salon'],
  ['/legal#privacy', 'Client Confidentiality & Discretion'],
  ['/legal', 'Terms of Commission & Sale']
];

export default function Footer() {
  const { categories } = useStore();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand Colophon & Craftsmanship Statement */}
        <div>
          <div className="footer-brand">AURELIS</div>
          <p className="footer-desc">
            Handcrafted fine jewellery in recycled 18k gold and platinum, mechanical horology regulated across five positions, and artisanal leather goods bench-made in our Geneva ateliers.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px', color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span>Genève</span>
            <span>&middot;</span>
            <span>London</span>
            <span>&middot;</span>
            <span>Paris</span>
            <span>&middot;</span>
            <span>Mumbai</span>
            <span>&middot;</span>
            <span>New Delhi</span>
          </div>
        </div>

        {/* Collections */}
        <div>
          <div className="footer-col-title">Collections</div>
          <ul className="footer-links">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link to={`/category/${c.slug}`}>
                  {dx(c.name)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Concierge & Client Care */}
        <div>
          <div className="footer-col-title">Concierge & Care</div>
          <ul className="footer-links">
            {CLIENT_SERVICES.map(([to, label]) => (
              <li key={to}>
                <Link to={to}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* The Maison & Governance */}
        <div>
          <div className="footer-col-title">The Maison</div>
          <ul className="footer-links">
            {THE_MAISON.map(([to, label]) => (
              <li key={to}>
                <Link to={to}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/admin/login" style={{ color: 'var(--gold)', opacity: 0.85 }}>
                Staff Management Portal &rarr;
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Colophon Bar */}
      <div className="footer-bottom">
        <div>
          &copy; {new Date().getFullYear()} AURELIS MAISON GENÈVE. ALL RIGHTS RESERVED.
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span>100% Recycled 18k Gold &amp; Platinum 950</span>
          <span>&middot;</span>
          <span>Insured Transit Across India</span>
          <span>&middot;</span>
          <span>Hallmarked Assay Certified</span>
        </div>
      </div>
    </footer>
  );
}
