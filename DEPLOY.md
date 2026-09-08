# Deploying AURELIS

The application is one Node service: Express serves the API and the built
client from the same origin. There is no second deployment and no CORS
configuration to keep in step.

Everything below was run against this codebase. Where something is
untested — anything that needs a real card, a real domain or a paid plan —
it says so rather than implying otherwise.

---

## What the free tier actually gives you

Render's free plan is enough to put this on the internet, with two costs
that are easy to miss:

**The service sleeps** after about fifteen minutes idle. The first request
after a quiet spell takes 30–50 seconds while the container wakes.

**The filesystem is ephemeral.** There is no disk. `server/.data/aurelis.db`
and `sessions.json` are destroyed on every deploy, crash and wake-from-sleep,
and the database re-seeds itself on the next boot — so the storefront still
looks populated and the loss is invisible unless you go looking for the order
you placed yesterday.

The server states this rather than hiding it:

- it prints an `EPHEMERAL STORAGE` warning at boot
- `GET /api/deployment` reports `storage: "ephemeral"`
- the storefront renders a dismissible banner saying data will not survive a
  restart

To keep data, attach a persistent disk mounted at `server/.data` and set
`RENDER_DISK_PATH` to the mount point. The banner and the warning disappear
on their own once the data directory is inside that mount — they are derived
from the environment, not from a flag someone has to remember to flip.

---

## Deploying to Render

1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. `render.yaml` is
   picked up automatically.
3. Set the environment variables below in the dashboard. Every one of them is
   `sync: false`, which means Render asks you for the value rather than taking
   a committed literal.
4. Deploy.

### Build and start

```
buildCommand: npm ci --include=dev && npm run build
startCommand: npm start
```

`--include=dev` is not optional. Render sets `NODE_ENV=production`, which makes
plain `npm install` skip devDependencies — and `vite` is a devDependency, so the
build fails with `'vite' is not recognized` before anything else runs.

`NODE_VERSION` is pinned to `24.16.0`. `node:sqlite` stayed behind
`--experimental-sqlite` until 22.13; on anything older the static import in
`server/src/db/index.js` throws `ERR_UNKNOWN_BUILTIN_MODULE` and the process
exits 1.

---

## Environment variables

| Variable | Required | What happens without it |
|---|---|---|
| `NODE_VERSION` | yes | Set to `24.16.0`. Older runtimes cannot import `node:sqlite`. |
| `NODE_ENV` | yes | `production`. Enables the production guards below. |
| `SUPER_ADMIN_EMAIL` | no | Falls back to `owner@aurelis.test`. |
| `SUPER_ADMIN_PASSWORD` | recommended | A random password is generated at first boot and printed **once** to the deploy log. Nothing else records it. |
| `DEMO_MODE` | no | **Off by default.** See below. |
| `SESSION_SECRET` | recommended | Generated per boot, so every restart invalidates open sessions. |
| `STRIPE_SECRET_KEY` | no | Checkout stays **simulated** and says so on screen. |
| `OPENROUTER_API_KEY` | no | The admin AI assistant reports itself unavailable instead of erroring. |
| `MEDUSA_URL` / `MEDUSA_EMAIL` / `MEDUSA_PASSWORD` | no | The Medusa panel in the admin reports itself unconfigured. |

### `SUPER_ADMIN_PASSWORD` is authoritative

Set it and the owner account is reconciled to it on **every** boot, not only
the first. That is the recovery path: if the generated password scrolled out
of the log, set the variable and redeploy.

Leave it unset and a fresh database generates one with
`randomBytes(18).toString('base64url')` and prints it once:

```
[aurelis] No SUPER_ADMIN_PASSWORD was set, so one was generated for this database:
    owner@aurelis.test
    UtEB2ja8FjREU_u-_-ir8WwV
```

There is no fallback to a literal password anywhere in the code.

### `DEMO_MODE`

Off unless explicitly set to `true`. With it on, the app seeds three staff
accounts whose passwords are in this repository and lists them at
`/api/admin/demo-accounts`.

Two guards, both verified:

- `DEMO_MODE=true` together with `NODE_ENV=production` **refuses to boot**
  and exits 1 with an explanation.
- `/api/admin/demo-accounts` returns 404 under `NODE_ENV=production`
  regardless of the flag, and `{"accounts": [], "demoMode": false}` otherwise.

If a database was ever booted in demo mode, those accounts already exist in
it. On every boot with `DEMO_MODE` off they are set to `status = 'disabled'`
— deactivated rather than deleted, so the audit log still resolves — and
reactivated if demo mode is turned back on.

---

## What is simulated

Say this plainly to anyone you show it to:

- **Payment.** No card is charged, no payment network is contacted, and no
  card number is stored — the API keeps brand, last four and expiry only.
  The checkout page carries a notice to that effect, generated from
  `/api/deployment`, until `STRIPE_SECRET_KEY` is present.
- **Shipping.** Tracking numbers are generated, not booked with a carrier.
- **Email.** Order confirmations are not sent anywhere.

Inventory is *not* simulated. Stock is decremented in the same transaction
that writes the order, reservations expire on a sweeper, and every movement
is written to `inventory_transactions`.

---

## Verifying a deploy

```bash
# 1. the service is up AND its database answers
curl -s https://<your-app>.onrender.com/api/health
# {"status":"ok",...}   503 with "degraded" means the process is alive but the DB is not

# 2. what this copy can actually do
curl -s https://<your-app>.onrender.com/api/deployment

# 3. the demo credentials route is closed
curl -s -o /dev/null -w '%{http_code}\n' https://<your-app>.onrender.com/api/admin/demo-accounts
# 404

# 4. assets are compressed and cacheable
curl -s -o /dev/null -D- -H 'Accept-Encoding: gzip' https://<your-app>.onrender.com/assets/<hashed>.js | grep -i 'content-encoding\|cache-control'
# content-encoding: gzip
# Cache-Control: public, max-age=31536000, immutable
```

Every response carries an `x-request-id`. A 500 returns the same id in its
body, so a report of "it broke at 14:32" can be grepped out of the log.

---

## Not part of the deploy

`medusa/` is a separate application with its own `package.json` and its own
PostgreSQL. It is not a workspace, so `npm ci` at the root does not install
it and Render never builds it. Run it locally with `npm run dev`, which
starts embedded PostgreSQL, Medusa and Aurelis in order. To point a deployed
Aurelis at a Medusa instance, set `MEDUSA_URL` and its credentials.

---

## Splitting the frontend onto Vercel

The API cannot run on Vercel — it writes a SQLite file, keeps sessions in
memory and runs a reservation sweeper on an interval, none of which survive a
serverless function. The **frontend** can, with the API hosted elsewhere.

Verified working: the built client served from its own origin, talking to the
API on another, issued a session, loaded 197 product cards, rendered a category
page and added to the bag with no CORS block and no page error.

### On Vercel

- **Root Directory:** `client`
- Build command, output directory and the SPA rewrite come from
  `client/vercel.json`; you should not need to set them by hand.
- **Environment variable:** `VITE_API_URL=https://<your-api-host>`

`VITE_API_URL` is read at **build** time, not run time — Vite compiles it into
the bundle. Changing it means redeploying, not just editing a variable.

### On the API host

Set `ALLOWED_ORIGINS` to the Vercel URL, comma-separated if there is more than
one:

```
ALLOWED_ORIGINS=https://aurelis.vercel.app,https://aurelis-git-main-you.vercel.app
```

Preview deployments each get their own hostname, so add them or accept that
previews cannot reach the API.

CORS used to reflect whatever `Origin` it was sent, which was survivable while
the client shipped from the same process and is not once it does not. Unset,
development stays permissive and production refuses every origin it was not
told about.

### What this costs

Two hosts, two deploys, and a cross-origin hop on every request instead of a
same-origin one. The single-service Render deployment above avoids all three.
Prefer it unless you specifically want Vercel's CDN in front of the storefront.
