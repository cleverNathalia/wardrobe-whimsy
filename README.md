# Wardrobe Whimsy

A cute, visual wardrobe app for saving clothes, planning outfits, and creating outfit collages from
your closet.

Your photos stay in **your own Google Drive**, owned by you. The app creates a folder there and
stores images in it; only the metadata (names, categories, outfits) lives in the app's database.

## Status

Early and actively being built. The wardrobe and outfits features work; Looks, the collage builder,
the dashboard and AI suggestions are still ahead. See the
[issues](https://github.com/cleverNathalia/wardrobe-whimsy/issues) for the roadmap.

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router), React 19, Tailwind 4 |
| Auth | Clerk |
| Database | PostgreSQL on Neon, via Prisma 5 |
| Image storage | Google Drive, per user, via OAuth (`drive.file` scope) |
| Monorepo | pnpm workspaces + Turborepo |

## Getting started

```bash
pnpm install
```

You need three things configured before the app will run:

1. **Clerk** — create an application and copy the publishable and secret keys.
2. **A PostgreSQL database** — Neon's free tier is fine. Set `DATABASE_URL` and `DIRECT_URL`.
3. **Google OAuth** — follow [docs/google-drive-setup.md](docs/google-drive-setup.md), which walks
   through the Cloud Console click by click.

Put them in `apps/web/.env.local`, then:

```bash
pnpm --filter ./apps/web exec prisma db push   # apply the schema
pnpm dev                                       # http://localhost:3000
```

There is no keyless or demo mode — a missing key fails loudly rather than quietly serving fake data.

## Repository layout

```
apps/web/              Next.js app
  app/api/             Route handlers (wardrobe, outfits, Drive, OAuth)
  components/          UI, grouped by feature
  lib/                 Data access, Drive + OAuth integration
  prisma/schema.prisma Database schema
packages/api-client/   Shared Zod schemas and types
packages/design-tokens/
docs/                  Setup and deployment guides
```

## How the Google Drive integration works

Worth understanding before changing anything near it:

- The app uses the **`drive.file`** scope, which grants access *only to files the app itself
  created*. It cannot see the rest of your Drive. This is why the app creates its own folder rather
  than letting you paste a link to an existing one.
- Uploads happen **as the signed-in user**, so files are owned by them and count against their own
  storage. An earlier design used a service account and could not work: service accounts have no
  Drive storage quota, so every upload failed with `403 storageQuotaExceeded`.
- Images are served through `/api/drive/image/[fileId]`, which resolves the owning wardrobe from the
  file id and checks ownership before streaming bytes.

## Deployment

See [docs/deployment.md](docs/deployment.md). Vercel is the intended host; GitHub Pages cannot work,
since the app is server-rendered and holds secrets.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[PolyForm Noncommercial License 1.0.0](LICENSE.md).

In plain English: **use it, fork it, modify it, host it for yourself and the people you know —
just don't sell it or build a paid product on it.** Personal use, hobby projects, charities,
schools and public institutions are all explicitly permitted.

This is deliberately a *noncommercial* licence rather than an open-source one. The goal is that
people who can't afford a paid wardrobe app can run this instead, and that it stays that way.
That means it does not meet the OSI definition of open source, because it restricts commercial
use. If you want to use it commercially, open an issue and ask.
