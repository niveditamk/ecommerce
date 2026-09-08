/* =============================================================
   AURELIS MAISON — LAYOUT SHELL
   Minimal editorial shell, global chrome, and route outlet.
   Ambient ground painted in CSS, not WebGL.
   ============================================================= */
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MiniCart from './MiniCart';
import NavDrawer from './NavDrawer';
import SearchLayer from './SearchLayer';
import ErrorBoundary from './ErrorBoundary';
import DeploymentNotice from './DeploymentNotice';
import { Icon } from './primitives';
import { useStore } from '../context/StoreContext';

export default function Layout() {
  const { layer, closeLayer, toasts, dismissToast, offline, ready } = useStore();
  const location = useLocation();

  /* Scroll to top on navigation, or to the anchor if one is given. */
  useEffect(() => {
    if (location.hash) {
      const node = document.querySelector(location.hash);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* The three.js Stage stood here. Measured with readPixels, its
          canvas painted 0 of 1,296,000 pixels — one plane, unlit so the
          standard material resolved black, behind everything at 10%
          opacity, with an invalid rotationX prop. It cost 1,090KB of
          JavaScript to render nothing. The ambient wash it was reaching
          for is now two CSS gradients on body::before, which weigh
          nothing and actually show up. */}

      <Header />

      <main id="main" tabIndex={-1}>
        {offline && <OfflineNotice />}
        <DeploymentNotice />
        {/* Keyed per route so a failure on one page doesn't strand navigation */}
        <ErrorBoundary key={location.pathname}>
          {ready ? <Outlet /> : <BootSkeleton />}
        </ErrorBoundary>
      </main>

      <Footer />

      {/* Backdrop Scrim for Drawers & Search Overlay */}
      <div
        className={`scrim${layer ? ' is-on' : ''}`}
        hidden={!layer}
        onClick={closeLayer}
        aria-hidden="true"
      />

      <MiniCart />
      <NavDrawer />
      <SearchLayer />

      {/* Global Toast Stack */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id} onClick={() => dismissToast(t.id)}>
            <span className="toast__icon"><Icon name={t.icon} size={16} /></span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BootSkeleton() {
  return (
    <div className="shell section" aria-busy="true" style={{ paddingBlock: '80px' }}>
      <span className="sr-only">Loading catalogue</span>
      <div style={{ width: '120px', height: '14px', background: 'var(--color-stone)', marginBottom: '16px' }} />
      <div style={{ width: '320px', height: '36px', background: 'var(--color-stone)', marginBottom: '48px' }} />
      <div className="card-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="card" key={i}>
            <div className="card__media" style={{ aspectRatio: '3/4', background: 'var(--color-bone)' }} />
            <div className="card__body" style={{ marginTop: '16px' }}>
              <div style={{ width: '40%', height: '12px', background: 'var(--color-stone)', marginBottom: '6px' }} />
              <div style={{ width: '70%', height: '18px', background: 'var(--color-stone)', marginBottom: '6px' }} />
              <div style={{ width: '30%', height: '14px', background: 'var(--color-stone)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfflineNotice() {
  return (
    <div className="shell" style={{ paddingTop: '1.5rem' }}>
      <div className="glass glass--soft" style={{ padding: '1.1rem 1.4rem', borderColor: 'rgba(153, 34, 34, 0.3)' }}>
        <div className="center" style={{ gap: '0.8rem' }}>
          <span style={{ color: 'var(--error)' }}><Icon name="close" size={18} /></span>
          <span style={{ fontSize: '0.88rem' }}>
            The AURELIS API is currently unavailable. Please verify the backend server is active.
          </span>
        </div>
      </div>
    </div>
  );
}
