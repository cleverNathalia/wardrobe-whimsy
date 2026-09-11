# Deploying to Vercel

This app cannot be hosted on GitHub Pages. It has 12 API route handlers, Clerk middleware
(`apps/web/proxy.ts`), Prisma against Neon Postgres, and a Google OAuth code exchange that uses
`GOOGLE_CLIENT_SECRET`. All of those need a server at request time. A static host would force the
client secret and database URL into browser JavaScript, where anyone can read them.

Vercel runs the app as built, with no code changes required.

## Already done in this repo

- `apps/web/package.json` has `"postinstall": "prisma generate"`. Without it, Vercel restores a
  cached `node_modules` and the Prisma client is never generated — the single most common
  Prisma-on-Vercel build failure.
- `pnpm-workspace.yaml` `allowBuilds` entries are real booleans. Three were the literal string
  `set this to true or false`, which a strict CI install can reject.
- `pnpm --filter ./apps/web build` passes locally.

## Step 1 — Create the Vercel project

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. Import **cleverNathalia/wardrobe-whimsy**.
3. Set **Root Directory** to `apps/web`. This is the important one — the repo is a pnpm workspace,
   and Vercel still installs from the repo root so workspace packages resolve correctly.
4. Framework Preset should auto-detect as **Next.js**. Leave Build and Install commands on their
   defaults.
5. **Do not deploy yet** — add the environment variables first, or the first build fails.

## Step 2 — Environment variables

Add these under **Settings → Environment Variables**, for Production *and* Preview. Copy the values
from `apps/web/.env.local`.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | |
| `CLERK_SECRET_KEY` | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | |
| `GOOGLE_CLIENT_SECRET` | |
| `NEXT_PUBLIC_APP_URL` | **Set in step 4** — you need the deployed URL first |

**Do not copy these across.** They are dead and only add risk:

- `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` — the service account was removed; this is a live private key
  and should be deleted from `.env.local` and revoked in the Google Cloud Console.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — the Cloudinary code path
  no longer exists.
- `CLERK_WEBHOOK_SIGNING_SECRET` — the webhook route was deleted and has not been restored.

## Step 3 — First deploy

Click **Deploy**. You will get a URL like `https://wardrobe-whimsy.vercel.app`.

Sign-in will work at this point, but connecting Drive will not — the redirect URI is not registered
and `NEXT_PUBLIC_APP_URL` is not set yet. That is expected.

## Step 4 — Point the OAuth flow at the deployed URL

1. In Vercel, set `NEXT_PUBLIC_APP_URL` to the exact deployed origin, no trailing slash:
   ```
   https://wardrobe-whimsy.vercel.app
   ```
2. In the [Google Cloud Console → Clients](https://console.cloud.google.com/auth/clients), open the
   OAuth client and add a second **Authorized redirect URI**:
   ```
   https://wardrobe-whimsy.vercel.app/api/auth/google/callback
   ```
   Keep the `localhost` one so local development still works.
3. **Redeploy** — `NEXT_PUBLIC_APP_URL` is inlined at build time, so changing it does not take
   effect until the app is rebuilt. Use **Deployments → ⋯ → Redeploy**.

The redirect URI must match `NEXT_PUBLIC_APP_URL` character for character, or Google returns
`Error 400: redirect_uri_mismatch`.

## Step 5 — Verify

1. Open the deployed URL and sign in.
2. Go to `/wardrobe` and click **Connect Google Drive**.
3. Complete consent, then confirm a folder named **Wardrobe Whimsy — My Wardrobe** appears in your
   Drive, owned by you.
4. Add an item with a photo and confirm the file lands in that folder.

## Known caveats on a `*.vercel.app` domain

**Clerk stays on its development instance.** A Clerk *production* instance requires a custom domain
you own, because it needs a CNAME record for the Frontend API. On `*.vercel.app` you keep using the
development keys — the app works, but shows Clerk's development banner and has lower rate limits.

**Publishing the Google OAuth app may still be blocked.** Publishing removes the 7-day refresh-token
expiry that applies while the app's status is *Testing*. It requires a home page, privacy policy,
terms of service, and an **authorized domain** — and Google requires authorized domains to be
verifiable in Google Search Console. A `*.vercel.app` subdomain is not yours to verify, so this may
be rejected.

If the 7-day reconnect becomes annoying, buy a cheap custom domain, point it at Vercel, and use it
for both Clerk production and the Google authorized domain. That single change resolves both
caveats.

## Database migrations

The database is managed with `prisma db push`, not Prisma Migrate — there is no `migrations/`
directory. Vercel will **not** apply schema changes on deploy; `postinstall` only runs
`prisma generate`.

After changing `schema.prisma`, apply it yourself before deploying:

```bash
pnpm --filter ./apps/web exec prisma db push
```

Adopting Prisma Migrate and running `prisma migrate deploy` in the build is a sensible follow-up
once the schema settles.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails on `@prisma/client did not initialize` | `postinstall` missing or skipped | Confirm `apps/web/package.json` still has `"postinstall": "prisma generate"` |
| Build fails resolving `@wardrobe-whimsy/*` | Root Directory not set to `apps/web` | Set it in Settings → General |
| `redirect_uri_mismatch` | Console URI ≠ `NEXT_PUBLIC_APP_URL` | Make them identical, then redeploy |
| Connect button does nothing after consent | `NEXT_PUBLIC_APP_URL` changed but not rebuilt | Redeploy |
| `GOOGLE_CLIENT_SECRET is not set` | Variable missing for that environment | Add it to Production *and* Preview |
