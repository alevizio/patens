# Setup — enabling the optional integrations

Font Studio runs fully in the browser by default. Three optional integrations require server-side credentials. Each gracefully degrades when not configured — the editor still works, the integration is just hidden.

This file documents what to set up for each, on each hosting platform.

| Integration | Required for | Status when unset |
|---|---|---|
| **Vercel Blob** | Cloud share — recipients in other browsers can open shared links | `/api/share` 503s; share button warns, falls back to local-only |
| **GitHub OAuth** | Sign-in via GitHub (per-account UI) | `/auth/login` 503s; AccountButton toasts "Sign-in not configured" |
| **Anthropic API key** | AI presets (audit-explain, consistency audit, design notes essay, kerning suggestions) | AI tab shows "Set your Anthropic API key" prompt |

Project data stays in IndexedDB regardless of which integrations are enabled. None of these are needed to draw glyphs, kern them, or export OpenType fonts.

---

## 1. Vercel Blob — cloud share

### Vercel (recommended host)

1. Go to your project on https://vercel.com
2. Settings → Storage → **Create Database** → Blob
3. Connect it to the project. Vercel auto-injects `BLOB_READ_WRITE_TOKEN` as a build env var on the next deploy.
4. Redeploy.

Verify: `curl https://your-domain.vercel.app/api/share -X POST -H "Content-Type: application/json" -d '{"id":"test","metadata":{}}'` should return JSON with a URL (or a 400 validation error — that means the route is alive). If it returns 503 with "Cloud share not configured", the env var didn't get picked up — check Settings → Environment Variables.

### Cloudflare Pages / Netlify / self-host

Vercel Blob is a Vercel-only service. To run cloud share elsewhere:
- Swap `@vercel/blob`'s `put` / `list` / `del` calls in `src/routes/api/share/` for an S3-compatible client (e.g. AWS S3, Cloudflare R2, Backblaze B2).
- The interface is small: write `shares/{id}.json` + `shares/{id}.token`, list by prefix, delete by URL.
- 30–60 minutes of work; the schema is documented in `src/lib/share-blob.ts`.

Until you do this, leave `BLOB_READ_WRITE_TOKEN` unset and the share route gracefully 503s.

---

## 2. GitHub OAuth — sign-in

Required env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AUTH_SECRET` (all three must be set or every `/auth/*` route 503s).

### Step 1 — register a GitHub OAuth app (one-time, ~2 minutes)

1. https://github.com/settings/applications/new
2. Application name: `Font Studio` (or your fork's name)
3. Homepage URL: `https://your-domain.com`
4. Authorization callback URL: `https://your-domain.com/auth/callback/github`
5. Click **Register application**
6. On the next page, copy the **Client ID**
7. Click **Generate a new client secret**, copy it before it disappears

For local dev, register a second OAuth app with `http://localhost:5173/auth/callback/github` as the callback. GitHub's UI only allows one callback per app; for prod + dev you need two apps.

### Step 2 — generate the cookie-signing secret

```sh
# Any random 32+ character hex string. Used to HMAC-sign session cookies.
openssl rand -hex 32
```

### Step 3 — set the env vars on your host

**Vercel:**
1. Project → Settings → Environment Variables
2. Add three entries (all three environments: Production + Preview + Development):
   - `GITHUB_CLIENT_ID` — from step 1
   - `GITHUB_CLIENT_SECRET` — from step 1
   - `AUTH_SECRET` — from step 2
3. Redeploy.

**Cloudflare Pages:**
1. Project → Settings → Environment variables
2. Add the same three variables under "Production" and "Preview"
3. Trigger a new deployment from Settings → Deployments → "Retry deployment"

**Netlify:**
1. Site → Site settings → Environment variables → Add a variable
2. Add the same three; set scopes to "All deploy contexts"
3. Trigger a new build.

**Self-host (Node):**
Add to your process environment before starting the server. With systemd, in the unit file:
```ini
[Service]
Environment=GITHUB_CLIENT_ID=...
Environment=GITHUB_CLIENT_SECRET=...
Environment=AUTH_SECRET=...
```
Or with a `.env` file consumed by your process manager (PM2, Docker Compose).

### Step 4 — verify

1. Open `https://your-domain.com/project/demo/edit`
2. Top-right corner shows "Sign in" instead of nothing
3. Click → bounces to GitHub → returns to the editor showing your avatar + username
4. Account dropdown → "Sign out" clears the cookie and returns to anonymous

If you see "Sign-in not configured" on click, one or more env vars is missing or the host hasn't redeployed since they were added.

---

## 3. Anthropic API key — AI presets

The Anthropic key is **per-user, stored in localStorage**, not a deployment-wide env var. Each user provides their own key — there's no shared cost surface for the app maintainer.

### For the user

1. Open https://console.anthropic.com → Settings → API Keys
2. Create a new key (any name). Copy it before navigating away.
3. In Font Studio: top-right ⚙ Settings → paste into "Anthropic API key" → Save.
4. AI tab on any project now activates. Each preset run is metered against your own Anthropic account.

The key stays in `localStorage` keyed by origin. It's sent to `/api/ai/messages` on each AI request (server-side proxy that adds CORS handling); the server doesn't persist the key.

### Cost expectations

Typical preset run is one `messages` call to `claude-sonnet-4` with ≤2k input + ≤1.5k output tokens. At Claude 4 Sonnet rates that's ~$0.01–0.03 per run. Heavy users running every preset on every project hit $1–3/month; light users stay under $0.50.

The "Consistency audit (visual)" preset is most expensive because it sends a rendered PNG of up to 20 glyphs as the input.

### Switching providers

To use OpenAI / Gemini / another provider instead of Anthropic:
- `src/lib/ai/anthropic.ts` is the only file that knows the API shape
- `src/routes/api/ai/messages/+server.ts` is the proxy
- Both can be swapped or extended. The presets in `/project/[id]/ai/+page.svelte` use a high-level `askClaude({ system, messages, maxTokens })` interface — point it at whichever provider you prefer.

---

## Local development checklist

To run with all integrations enabled on `pnpm dev`:

```sh
# .env.local (gitignored)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXX     # from `vercel env pull`
GITHUB_CLIENT_ID=Iv1.XXX                      # localhost OAuth app
GITHUB_CLIENT_SECRET=XXX                      # localhost OAuth app
AUTH_SECRET=XXX                               # `openssl rand -hex 32`
```

```sh
pnpm install
pnpm dev
# Open http://localhost:5173
# Settings → paste your Anthropic API key
```

Without any of these, `pnpm dev` still works — just with the corresponding feature 503'd.
