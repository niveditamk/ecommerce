# Aurelis ML service

A Python trainer that sits **beside** the Node platform rather than on top of it.

It reads the platform's SQLite database read-only, fits demand models with numpy and
scikit-learn, and hands each finished version back to the Node API — which writes it into the
existing model registry. A Python version then appears in the existing admin console next to
the JavaScript baselines, on the same leaderboard, judged by the same metrics.

The point of the exercise is to find out **honestly** whether Python actually wins. If the
moving average written in JavaScript beats scikit-learn on this catalogue, the moving average
wins and the console says so.

---

## Why it is built this way

**The database is opened read-only, always.** Two processes writing one SQLite file is the
failure this whole arrangement exists to avoid. Python connects through a `file:…?mode=ro` URI
and sets `PRAGMA query_only`, so a stray `INSERT` fails at the engine rather than corrupting a
file the Node process believes it owns alone. Python is *denied* the ability to write, not
merely asked not to.

**Writes go back through Node.** When training finishes, the version is POSTed to
`POST /api/admin/ml/register` and Node persists it through the same `registerVersion()` the
JavaScript trainer uses. Node stays the single writer. It also assigns the version number,
because `ml_versions.version` is `MAX(version)+1` over a table two runtimes write to — choosing
it in Python would be a race with every JavaScript training run, and the loser would not get an
error, it would get a `UNIQUE` constraint failure halfway through a night's work.

**The registry was already runtime-agnostic.** `ml_models.runtime` is `node | python`, so
nothing in the console had to change to display a Python-trained version. That one column is the
whole of what makes a Python version different from a JavaScript one.

**The numeric contract is shared, not reimplemented.** `score()`, `backtest()` and
`confidence_of()` mirror `server/src/ml/forecast.js` exactly — same holdout protocol, same
rounding, same definition of every metric. They are duplicated rather than imported because two
runtimes cannot share a module, and **they must be changed in both places together**. If they
drift, the leaderboard is ranking versions that were judged by different rules, and the
comparison it presents is a lie.

---

## Honesty rules this service is held to

These are not aspirations; they are visible in the output.

- **Never fabricate a prediction.** Below 28 clean days the answer is `INSUFFICIENT` — a
  refusal, not a number. A figure labelled "low confidence" still gets acted on. A refusal does
  not.
- **A zero-sales day while the piece was out of stock is not zero demand.** Those days are
  censored and excluded from both fitting and scoring. Stock is a *state*, not an event: a SKU
  sitting at zero for four quiet days writes no ledger row on those days, and they are exactly
  the days that matter most, so the balance is carried forward across them.
- **Synthetic data is for development only.** It is labelled at source (`orders.channel =
  'synthetic'`) and reported alongside every trained version, so nobody reads a model built on
  generated demand as a statement about real trade. It carries no customer, deliberately —
  which is why customer segmentation refuses to run on it.
- **Every recommendation is decision support for a human.** Nothing here reorders stock,
  reprices anything or pauses a listing. An anomaly is a day worth a person looking at, and the
  most common innocent explanation for a drop is still a stock-out.

---

## Running it

The virtual environment already exists. Do not create another.

```bash
cd ml-service

# readiness — can anything be trained, and on what?
.venv/Scripts/python.exe -m aurelis_ml.cli readiness

# train, then hand the version to Node
.venv/Scripts/python.exe -m aurelis_ml.cli train

# train without telling Node (useful while the API is down)
.venv/Scripts/python.exe -m aurelis_ml.cli train --no-register

# serve a forecast from the latest local artifact
.venv/Scripts/python.exe -m aurelis_ml.cli forecast aur-101

# Isolation Forest, reported beside the z-score baseline it has to beat
.venv/Scripts/python.exe -m aurelis_ml.cli anomalies

# RFM segments, or the honest refusal
.venv/Scripts/python.exe -m aurelis_ml.cli segments

# the Python leaderboard beside the Node one
.venv/Scripts/python.exe -m aurelis_ml.cli compare
```

Every command takes `--json` for the raw result, and `--db` / `--api` to point at somewhere
other than the defaults for one run. `python cli.py <command>` works too, from this directory.

### The HTTP surface

```bash
.venv/Scripts/python.exe app.py                 # binds 127.0.0.1:5001
.venv/Scripts/python.exe -m flask --app app run --host 127.0.0.1 --port 5001
```

| Route | Method | Token | Purpose |
|---|---|---|---|
| `/health` | GET | no | service status, Python and package versions, database reachability |
| `/readiness` | GET | if set | per-SKU clean-day counts and whether training is possible |
| `/train` | POST | **yes** | train, save the artifact, register with Node, return the leaderboard |
| `/forecast/<sku>` | GET | if set | serve from the latest locally-trained artifact |
| `/anomalies` | GET | if set | Isolation Forest results |
| `/segments` | GET | if set | RFM segments, or the refusal |

`/health` is deliberately unauthenticated: a health check that needs a secret is one the process
supervisor cannot run. It reports the token as a *state* (`set (32 characters)`), never as a
value.

---

## This service must never be exposed to a browser

It has no session, no CSRF protection, no rate limiting and no user model. It authenticates
exactly one caller — the Node API — with one shared secret in an `X-ML-Service-Token` header,
compared in constant time.

It binds to `127.0.0.1` by default and **should stay that way**. The public surface of this
platform is the Node app at `/api/admin/ml`, which sits behind a proper staff session and the
existing permission guards (`ai.view`, `ai.manage`, `ai.data`). There are no CORS headers
anywhere in `app.py`, deliberately: there is no browser origin that should be able to reach
this, and adding a permissive header "just for local development" is exactly how an internal
service ends up callable from a shop page.

Binding to anything other than loopback prints a warning. It is a warning rather than a refusal
because private networks are legitimate — but nobody should do it without having read this
paragraph.

---

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `AURELIS_DB` | `../server/.data/aurelis.db` | the SQLite file, opened read-only |
| `AURELIS_API` | `http://localhost:4000` | Node API base URL |
| `AURELIS_ML_TOKEN` | *(none)* | shared secret for `POST /api/admin/ml/register` |
| `AURELIS_ML_HTTP_TIMEOUT` | `30` | seconds before a handover is given up on |
| `ML_SERVICE_HOST` | `127.0.0.1` | interface `app.py` binds |
| `ML_SERVICE_PORT` | `5001` | port `app.py` binds |

`AURELIS_ML_TOKEN` has no default and never will. A token baked into the source is a published
credential the moment the repository is shared, and an empty-string default would let an
unauthenticated POST reach the registry — the one place Python is allowed to change the shop.

Trained artifacts are written to `ml-service/.artifacts/`, before the handover is attempted, so
a rejected POST costs the registration rather than the whole training run.

---

## Hosting: run this as a scheduled job, not a web service

Be honest about the footprint. The installed dependencies are **roughly 260MB** — scipy alone is
about 116MB, scikit-learn 45MB, numpy 35MB — before the interpreter, before the process, before
a single array is allocated.

On a 512MB free instance that is most of the budget spent on imports that sit idle between
training runs. The Node API on the same plan already sleeps after about fifteen minutes idle and
resets its filesystem on restart. Adding a second always-on Python service to that arrangement
buys nothing: **training is a batch job that runs for a few seconds a day.**

So the intended deployment is a **scheduled job** — a cron entry, a Render cron job, a GitHub
Action — that runs:

```bash
.venv/Scripts/python.exe -m aurelis_ml.cli train
```

…and exits. Everything `app.py` does is available from the CLI without a server. The Flask app
exists for the cases where something genuinely has to ask a live question, and for local
development; it is not the recommended way to run this in production on a free tier.

This is also why nothing in the package imports numpy at module level. `--help`, a misspelt
command and `/health` should not each pay a couple of hundred megabytes for the privilege.

**pandas and statsmodels are deliberately absent.** numpy handles the arrays and scikit-learn
handles the models. pandas would add roughly another 100MB to an install that is already the
reason this service cannot sit on a small always-on instance. Do not import them.

---

## Layout

| File | Responsibility |
|---|---|
| `aurelis_ml/config.py` | every path, URL and credential, resolved once |
| `aurelis_ml/data.py` | read-only database access; the censored demand series |
| `aurelis_ml/metrics.py` | `score`, `add_cumulative`, `pool`, `confidence_of` — the shared contract |
| `aurelis_ml/backtest.py` | the holdout protocol, identical to Node's |
| `aurelis_ml/insights.py` | Isolation Forest anomalies, k-means RFM segments |
| `aurelis_ml/registry_client.py` | the seam: POST versions out, read the registry back |
| `aurelis_ml/cli.py` | the command line |
| `app.py` | the Flask surface (internal, loopback) |
| `cli.py` | convenience shim for `python cli.py <command>` |

`app.py` and `cli.py` resolve the numerical components by name rather than importing them from a
fixed path, so a component that has not been built yet produces a sentence and a `503` rather
than an import traceback.

---

## Integration notes

Two things to be aware of when wiring this up.

**1. Registration is live, activation is deliberate.** Node exposes
`POST /api/admin/ml/register`, above the staff guard, authenticated by the
`X-ML-Service-Token` header and comparing it with `timingSafeEqual`. An unset `ML_SERVICE_TOKEN`
on the server closes the door entirely rather than falling open. That route parses its own body at
12 MB because the global limit is 256 kB, and refuses artifacts over 8 MB with a clear message.

Registering a version is safe. **Activating one is not**, and the route will refuse it: everything
that reads a forecast — the risk board, the reorder proposals — is served by the Node runtime, and
it cannot serve Croston, TSB, Holt-Winters or the gradient booster. Promoting such a version was
measured leaving all 21 SKUs at UNKNOWN and every reorder proposal gone. So a Python version lands
on the leaderboard, where it is compared honestly against the JavaScript baselines on identical
metrics, and a human promotes it only once this runtime can serve it. `ml_models.runtime` is
derived from whichever version is actually serving, never from whichever service trained last.

**2. The demand series is shared, not copied.** `aurelis_ml/insights.py` obtains its series
through `aurelis_ml.data.demand_series` so the censoring rule lives in exactly one place. Note
that `data.demand_series()` returns a `DemandSeries` dataclass, not a bare list — consumers need
`.points`.
