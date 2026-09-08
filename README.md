# AURELIS — Maison

A luxury e-commerce storefront built on **React (Vite)** with a **Node/Express** API.
Deep-obsidian palette, aurora backdrop, and a hand-built **liquid glass / glassmorphism**
design system: layered backdrop blur, refracted hairline rims, travelling specular
highlights and pointer-tracked light.

All product imagery is **generated as SVG in the browser** — no external assets, no
broken links, nothing to license.

---

## Run it

```bash
npm install          # installs both workspaces
npm run dev          # API on :4000, client on :5173 (opens automatically)
```

Production preview (client build served by the API on a single port):

```bash
npm run preview      # build + serve on http://localhost:4000
```

| Script | Does |
| --- | --- |
| `npm run dev` | API + Vite dev server together, with `/api` proxied |
| `npm run dev:api` | API only (`node --watch`) |
| `npm run dev:web` | Vite only |
| `npm run build` | Builds the client to `client/dist` |
| `npm start` | Serves the API, plus `client/dist` if it exists |

**Demo sign-in:** any valid email address with a passphrase of six or more characters.
**Promotion codes:** `CERCLE10` (10% off) and `ATELIER20K` (₹20,000 off orders above ₹1,65,000).

**Currency and language.** The maison prices in **Indian Rupees**, formatted to the Indian
convention so ₹15,68,500 groups as lakh rather than millions. GST is charged at the standard
**18%** and is included in every figure shown. Copy is **English (UK)** throughout —
jewellery, tokenised, recognised, towards — and dates render as `en-GB`.

---

## The 25 screens

| # | Screen | Route |
| --- | --- | --- |
| 1 | Homepage | `/` |
| 2 | Category Overview | `/categories` |
| 3 | Category Page | `/category/:slug` |
| 4 | Product Page | `/product/:id` |
| 5 | Search & Listing Results | `/search?q=` |
| 6 | Login / Create Account | `/account/auth` |
| 7 | Mini Cart | global drawer (bag icon, any page) |
| 8 | Cart Page | `/cart` |
| 9 | Log In / Guest Checkout | `/checkout/login` |
| 10 | Shipping | `/checkout/shipping` |
| 11 | Payment | `/checkout/payment` |
| 12 | Checkout Review | `/checkout/review` |
| 13 | Order Confirmation | `/order/confirmation/:id` |
| 14 | Orders / Order History | `/account/orders` |
| 15 | Individual Order View | `/account/orders/:id` |
| 16 | Profile / Account Settings | `/account/profile` |
| 17 | Payment Settings | `/account/payment` |
| 18 | Addresses | `/account/addresses` |
| 19 | Email & SMS Sign Up | `/signup` |
| 20 | Returns | `/returns` |
| 21 | Shipping (information) | `/shipping` |
| 22 | Help / Contact Us | `/help` |
| 23 | Store Locator | `/stores` |
| 24 | Store Details | `/stores/:id` |
| 25 | Terms & Conditions / Privacy | `/legal` |

Plus `/membership` (Le Cercle), `/wishlist` (saved pieces) and a styled 404.

---

## What actually works

Not a click-through mock — the commerce paths are real, server-backed and validated:

- **Cart** — add, change quantity, remove, save for later, empty. Line keys are
  `id::variant::size`, so two finishes of the same ring are separate lines.
- **Pricing** — subtotal, promotion codes, delivery and GST are computed **server-side**
  in `server/src/pricing.js` and never trusted from the client.
- **Checkout** — four steps, each persisted to the session, with guest and signed-in paths.
  Placing an order returns a real order object, empties the bag and files it in history.
- **Account** — addresses and cards are full CRUD with defaults; profile and channel
  preferences persist. Card numbers are never stored: the API keeps brand, last four and
  expiry only.
- **Returns** — pick an order, pick lines, choose refund/exchange/credit. The server
  rejects lines that are not on the order and refuses a second open return.
- **Search** — debounced live suggestions in the overlay, faceted results page.
- **Store locator** — text and service filters, an interactive map, live open/closed
  state computed from each boutique's hours, and a working appointment request.

- **Accounts** — storefront sign-in is real. Passphrases are hashed with scrypt and
  stored in the `customers` table; a wrong one is refused, and repeated failures lock
  the address out for fifteen minutes. Registering with an address that already checked
  out as a guest claims that record rather than duplicating it.

Sessions are issued via an `x-aurelis-session` header on first contact, held in memory
and snapshotted to `server/.data/sessions.json` so a dev restart does not empty a bag.
Ids are 256 bits from `randomBytes`, and the server honours only ids it issued — a
made-up id is discarded and a fresh one handed back. Sessions expire after a week of
silence and are capped, so an unauthenticated caller cannot fill the disk with them.

### What is simulated

Payment, shipping and email. No card is charged, no carrier is booked and no mail is
sent; the checkout page says so, in a notice generated from `/api/deployment` rather
than written into the markup. Inventory is not simulated — stock is decremented in the
same transaction that writes the order.

See [DEPLOY.md](DEPLOY.md) for hosting, environment variables and the guards that stop
a demo build reaching production.

---

## Layout

```
├── client/                     React (Vite)
│   └── src/
│       ├── components/         Layout, Header, Footer, MiniCart, NavDrawer,
│       │                       SearchLayer, ProductCard, checkout, primitives
│       ├── context/            StoreContext — session, actions, toasts, layers
│       ├── lib/                api · art (SVG engine) · format · useAsync
│       ├── pages/              25 screens (+ checkout/ and account/ folders)
│       └── styles/             core.css (tokens · glass · chrome)
│                               views.css (page composition)
└── server/                     Node + Express (ESM)
    └── src/
        ├── data/catalog.js     22 pieces, 7 collections, 8 boutiques, policy copy
        ├── routes/catalog.js   public catalogue + content
        ├── routes/commerce.js  session, cart, auth, account, checkout, orders
        ├── pricing.js          authoritative totals
        └── store.js            session store + disk snapshot
```

---

## API

Public: `GET /api/health` · `/brand` · `/categories` · `/categories/:slug` ·
`/products` (`cat`, `sub`, `q`, `min`, `max`, `sort`, `badge`, `page`, `perPage`) ·
`/products/:id` · `/search?q=` · `/stores` · `/stores/:id` · `/content`

Session-scoped: `/session` · `/cart/items` (POST/PATCH/DELETE) ·
`/cart/items/:key/save` · `/cart/promo` · `/wishlist/toggle` · `/recent` ·
`/auth/login|register|logout` · `/account/profile|prefs` · `/addresses` · `/cards` ·
`/checkout` · `/orders` · `/orders/:id/return` · `/newsletter` · `/contact` ·
`/appointments`

---

## The glass system

Defined once in `client/src/styles/core.css` and reused everywhere:

- `.glass` — layered `backdrop-filter` blur + saturation, a gradient rim drawn with a
  masked pseudo-element, inset top highlight and a soft lower bloom.
- `::before` — a diagonal specular band that sweeps across on hover.
- `--lx / --ly` — pointer coordinates written by the `useLiquid` hook, moving a radial
  highlight with the cursor.
- `.glass--refract` — real refraction via `backdrop-filter: url(#liquidRefractSoft)`
  (an SVG `feTurbulence` + `feDisplacementMap` filter), inside `@supports` so browsers
  without it simply get the blur.
- Modifiers: `--soft`, `--deep`, `--frost`, `--gold`, `--flat`, `--lift`, `--pane`.

Motion respects `prefers-reduced-motion`, and the whole system is keyboard navigable
with visible focus rings.
