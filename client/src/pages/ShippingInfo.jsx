/* =============================================================
   AURELIS - SHIPPING (information page)
   ============================================================= */
import { Link } from 'react-router-dom';
import {
  Accordion, Breadcrumbs, Glass, Icon, PageHead, Reveal, SectionHead, Sheen
} from '../components/primitives';
import { useStore } from '../context/StoreContext';
import { dx, money } from '../lib/format';

const REGIONS = [
  ['Mumbai, Delhi NCR, Bengaluru', '1–2 business days', 'Complimentary', 'GST included', 'Same-day hand delivery'],
  ['Chennai, Hyderabad, Pune, Kolkata', '2–3 business days', 'Complimentary', 'GST included', 'Express from ₹2,900'],
  ['Rest of India', '3–5 business days', 'Complimentary', 'GST included', 'Express from ₹2,900'],
  ['Singapore & Middle East', '3–5 business days', 'Complimentary', 'Settled by us', 'Hand delivery in Dubai'],
  ['Europe & United Kingdom', '4–6 business days', 'Complimentary', 'Settled by us', 'Express from ₹2,900'],
  ['United States & Canada', '4–7 business days', 'Complimentary', 'Settled by us', 'Tracked and insured'],
  ['Rest of world', '5–9 business days', 'Complimentary', 'Assessed on arrival', 'Tracked and insured']
];

const FAQ = [
  { title: 'When does the clock start?', body: <p>At dispatch, not at order. Stock pieces dispatch within forty-eight hours. Made-to-order, engraved and resized pieces add seven to fourteen days, and the product page states this before you buy.</p> },
  { title: 'Do I pay GST or import duty?', body: <p>Every price on this site includes GST at 18%, so the figure you see is the figure you pay. For delivery within India we also settle all duty on import before a piece is dispatched — nothing is collected at your door. Outside India, local duty is assessed on arrival and is the recipient’s responsibility. We declare full value; we will not under-declare.</p> },
  { title: 'What if nobody is home?', body: <p>Every consignment requires a signature and we cannot authorise a doorstep drop. The courier will attempt twice, then hold at a depot for ten days. Your concierge can redirect it to a boutique instead.</p> },
  { title: 'Can I ship to a hotel or office?', body: <p>Yes, provided someone can sign. Add the recipient’s name and a room or floor to line two so the courier can find them.</p> },
  { title: 'Is my order insured?', body: <p>In full, from the moment it leaves the atelier until it is signed for. If a consignment is lost, we remake or refund — you are never asked to argue with a courier on our behalf.</p> },
  { title: 'Can I change the address after ordering?', body: <p>Until dispatch, yes — contact your concierge. After dispatch, the courier can often redirect within the same country.</p> }
];

export default function ShippingInfo() {
  const { content } = useStore();
  const methods = content?.shippingMethods || [];

  return (
    <div className="shell">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shipping' }]} />

      <PageHead
        kicker="Client care"
        title="Shipping & delivery"
        lede="Every consignment is insured for its full value and requires a signature. Standard delivery is complimentary, everywhere we go."
        aside={
          <Glass variant="glass--gold" style={{ padding: '1.1rem 1.4rem', borderRadius: 'var(--r-lg)' }}>
            <div className="tiny">Countries served</div>
            <div className="h3" style={{ marginTop: '.3rem' }}>62</div>
          </Glass>
        }
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <SectionHead kicker="Options" title="How a piece can travel" />
        </Reveal>
        <div className="values">
          {methods.map((m, i) => (
            <Reveal key={m.id} delay={(i % 3) + 1}>
              <Glass variant={m.price === 0 ? 'glass--gold glass--lift' : 'glass--lift'} className="value">
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <span className="value__icon" style={{ marginTop: 0 }}>
                    <Icon name={m.id === 'pick' ? 'pin' : m.id === 'hand' ? 'gift' : 'truck'} size={26} />
                  </span>
                  <span className="opt__price">{m.price ? money(m.price) : 'Free'}</span>
                </div>
                <h3>{dx(m.name)}</h3>
                <p>{dx(m.note)}</p>
                <span className="badge badge--quiet" style={{ marginTop: 'auto' }}>{dx(m.eta)}</span>
              </Glass>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <Reveal>
          <SectionHead
            kicker="By region"
            title="Where we go, and how long it takes"
            body="Business days from dispatch. Made-to-order pieces add their stated lead time on top."
          />
        </Reveal>

        <Glass variant="glass--pane" className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Region</th>
                <th>Standard</th>
                <th>Cost</th>
                <th>Duties</th>
                <th>Also available</th>
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((r) => (
                <tr key={r[0]}>
                  <td><b>{r[0]}</b></td>
                  <td>{r[1]}</td>
                  <td className="gold">{r[2]}</td>
                  <td>{r[3]}</td>
                  <td>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="split">
          <Glass variant="glass--pane" className="panel">
            <h2 className="h3" style={{ marginBottom: '.4rem' }}>Questions asked most</h2>
            <Accordion items={FAQ} openFirst />
          </Glass>

          <div>
            <Glass variant="glass--soft" className="panel">
              <h3 className="h4" style={{ marginBottom: '1rem' }}>What arrives with your piece</h3>
              <ul className="pdp__assure" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
                <li><Icon name="box" size={16} /><span>Lacquered presentation box, made in Como.</span></li>
                <li><Icon name="doc" size={16} /><span>Hallmark card naming the artisan who finished it.</span></li>
                <li><Icon name="shield" size={16} /><span>Guarantee certificate — no registration needed.</span></li>
                <li><Icon name="scissors" size={16} /><span>Care kit appropriate to the material.</span></li>
                <li><Icon name="gift" size={16} /><span>Gift wrapping and a hand-written card on request.</span></li>
              </ul>
            </Glass>

            <Glass variant="glass--gold" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="pin" size={22} /></span>
                <div>
                  <h3 className="h4">Collect in boutique instead</h3>
                  <p className="muted" style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                    Reserve under your name at any of eight houses, ready within two hours during opening times. Fitting
                    and engraving can be done while you wait.
                  </p>
                  <Link className="btn btn--gold btn--sm" style={{ marginTop: '1rem' }} to="/stores">
                    <Sheen />Find a boutique
                  </Link>
                </div>
              </div>
            </Glass>

            <Glass variant="glass--soft" className="panel" style={{ marginTop: '1.4rem' }}>
              <div className="center" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                <span className="gold"><Icon name="leaf" size={22} /></span>
                <div>
                  <h3 className="h4">Carbon</h3>
                  <p className="muted" style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                    All shipping is carbon neutral through verified removals, not offsets against future promises.
                    Packaging is plastic-free and the box is designed to be kept.
                  </p>
                </div>
              </div>
            </Glass>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <Glass variant="glass--deep" className="panel">
          <div className="between wrap">
            <div>
              <h3 className="h3">Tracking an order?</h3>
              <p className="muted" style={{ marginTop: '.5rem', maxWidth: '56ch' }}>
                Every order carries live tracking from dispatch. Open it from your register, or use the reference in
                your confirmation email.
              </p>
            </div>
            <div className="center wrap" style={{ gap: '.7rem' }}>
              <Link className="btn btn--gold" to="/account/orders"><Sheen />Track an order</Link>
              <Link className="btn btn--glass" to="/returns"><Sheen />Returns</Link>
            </div>
          </div>
        </Glass>
      </section>
    </div>
  );
}
