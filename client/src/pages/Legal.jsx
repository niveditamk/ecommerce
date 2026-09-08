/* =============================================================
   AURELIS - TERMS & CONDITIONS / PRIVACY POLICY
   ============================================================= */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumbs, Glass, Icon, PageHead, Sheen } from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { dx } from '../lib/format';

const UPDATED = '12 March 2026';

export default function Legal() {
  const { content } = useStore();
  const location = useLocation();
  const sections = content?.legal || [];
  const [active, setActive] = useState(sections[0]?.id || 'terms');

  /* Highlight the section currently in view. */
  useEffect(() => {
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((s) => {
      const node = document.getElementById(s.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);

  /* Jump to the hash target once the content has arrived. */
  useEffect(() => {
    if (!location.hash || !sections.length) return;
    const node = document.querySelector(location.hash);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, sections.length]);

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Terms & Privacy' }]} />

      <PageHead
        kicker={`Last revised ${UPDATED}`}
        title="Terms & conditions · Privacy policy"
        lede="Written to be read. If any clause here is unclear, ask a concierge and we will explain it rather than point at it."
        aside={
          <Glass variant="glass--soft" style={{ padding: '1.1rem 1.4rem', borderRadius: 'var(--r-lg)' }}>
            <div className="tiny">Governing law</div>
            <div className="h3" style={{ marginTop: '.3rem' }}>Switzerland</div>
          </Glass>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="legal">
          <Glass as="nav" variant="glass--pane" className="legal__toc" aria-label="On this page">
            <h5 className="eyebrow eyebrow--plain" style={{ marginBottom: '1rem' }}>On this page</h5>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={active === s.id ? 'is-on' : ''}
                onClick={() => setActive(s.id)}
              >
                {dx(s.title)}
              </a>
            ))}
            <div className="rule" style={{ margin: '1.2rem 0' }} />
            <Link className="acct__link" to="/help"><Icon name="chat" size={16} /><span>Ask about a clause</span></Link>
          </Glass>

          <div>
            <Glass variant="glass--pane" className="panel">
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="doc" size={22} /></span>
                <div>
                  <h2 className="h4">In short</h2>
                  <p className="muted" style={{ marginTop: '.5rem', maxWidth: '64ch', fontSize: '.92rem' }}>
                    Buy from us and you get an object made properly, guaranteed for its lifetime, returnable for thirty
                    days. We hold the minimum data needed to sell and service it, we never sell that data, and you can
                    have it erased on request. Disputes go to Geneva, but we would rather resolve them ourselves.
                  </p>
                </div>
              </div>
            </Glass>

            {sections.length === 0 ? (
              <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
                <p className="muted">Loading the terms…</p>
              </Glass>
            ) : (
              sections.map((s, i) => (
                <Glass variant="glass--pane" className="panel" id={s.id} key={s.id} style={{ marginTop: '1.4rem', scrollMarginTop: '140px' }}>
                  <span className="eyebrow eyebrow--plain">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="h2" style={{ marginTop: '.6rem' }}>{dx(s.title)}</h2>
                  <div className="prose" style={{ marginTop: '.4rem' }}>
                    {s.body.map((p, j) => <p key={j}>{dx(p)}</p>)}
                  </div>
                </Glass>
              ))
            )}

            <Glass variant="glass--gold" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="between wrap">
                <div>
                  <h3 className="h4">Exercising your rights</h3>
                  <p className="muted" style={{ marginTop: '.5rem', maxWidth: '54ch' }}>
                    To request a copy of your data, a correction, or an erasure, write to the address in Help &amp;
                    Contact. We answer within thirty days, and usually within two.
                  </p>
                </div>
                <div className="center wrap" style={{ gap: '.7rem' }}>
                  <Link className="btn btn--gold" to="/help"><Sheen />Contact us</Link>
                  <Link className="btn btn--glass" to="/account/profile"><Sheen />Your data</Link>
                </div>
              </div>
            </Glass>

            <p className="tiny" style={{ marginTop: '1.6rem', textTransform: 'none', letterSpacing: '.03em' }}>
              AURELIS SA · 14 Rue du Rhône, 1204 Geneva, Switzerland · Registered CHE-114.882.301 ·
              Revised {UPDATED}. Previous versions are available on request.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
