# Running AURELIS

## 1. Prerequisites
- Node.js >= 22.13
- `server/.env` with at least:
  ```
  SUPER_ADMIN_EMAIL=you@example.com
  SUPER_ADMIN_PASSWORD=your-password
  ```
  (This bootstraps the one admin account on first boot — check the file for the actual values, don't hardcode new ones.)
  Optional extras in the same file: `PORT` (default 4000), `OPENROUTER_API_KEY` (AI assistant), `MEDUSA_URL`/`MEDUSA_EMAIL`/`MEDUSA_PASSWORD` (Medusa comparison), `ALLOWED_ORIGINS`.

## 2. Install dependencies
```
npm install --workspaces
```

## 3. Run it — pick one

**Quickest (single process, what this session used):**
```
npm run build      # builds client/dist
npm start           # Express serves the API + the built client together
```
Open http://localhost:4000/admin

**Dev mode (hot reload, client + API, no Medusa):**
```
npm run dev:shop
```
Client on http://localhost:5173, API on http://localhost:4000 (client proxies `/api` to it).

**Full dev mode (adds Medusa + its Postgres):**
```
npm run dev
```
Only needed if you're working on the Medusa comparison feature — slower to start, more moving parts.

## 4. Sign in
Go to `/admin/login` and use the `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from your `.env`.

## 5. Stopping it
`Ctrl+C` in the terminal. `npm run dev` shuts down Medusa/Postgres together with it.
