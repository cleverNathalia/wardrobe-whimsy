# Contributing

Thanks for looking. This is a personal project built in the open, and help is genuinely welcome.

## Before you start

Please **open an issue first** for anything beyond a small fix. It saves you building something
that's already half-done on a branch, or that conflicts with where the roadmap is heading.

The [issues list](https://github.com/cleverNathalia/wardrobe-whimsy/issues) is organised by phase —
Looks, the collage builder, the dashboard, AI suggestions. Anything labelled
`good first issue` is a reasonable starting point.

## Licence, and what it means for you

This project is under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). By contributing you
agree your contribution is licensed on the same terms.

Be aware this is **not** an OSI-approved open-source licence — it forbids commercial use. That's a
deliberate choice so the app stays free for people who can't pay for one, but it does mean you
can't later use this code in commercial work. If that's a problem for you, better to know now than
after writing a feature.

## Setting up

See [Getting started](README.md#getting-started) in the README. You'll need your own Clerk
application, a PostgreSQL database, and a Google OAuth client — all free, all covered in
[docs/google-drive-setup.md](docs/google-drive-setup.md).

There's no demo mode, so the app won't run without those. That's intentional: a missing key should
fail loudly rather than silently serve fixture data.

## Before opening a pull request

CI runs these three, and it's much faster to catch failures locally:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Please also:

- **Test the flow you changed against real Google Drive.** Much of this app's behaviour only shows
  up against the live API — quota errors, scope limits, token expiry. A green typecheck proves
  very little here.
- Keep commits grouped by concern with messages in the imperative mood.
- Fill in the pull request template, including the risk tier.

## Things that are easy to get wrong

A few pieces of this codebase have non-obvious constraints. Worth reading before you touch them:

- **`drive.file` scope.** The app can only ever see files it created. Anything that assumes access
  to a user's wider Drive — reading an existing folder, adopting a pasted link — cannot work.
- **The orphan sweep** (`lib/drive-cleanup.ts`) deletes files in the wardrobe folder that no
  database row references. If you add a model that stores a Drive file id, you **must** teach the
  sweep about it, or those files get binned an hour after upload.
- **Images can't use the Next.js optimiser.** `/api/drive/image/*` requires a session cookie, and
  the optimiser fetches server-side without one. Use `AppImage` from `components/ui/app-image.tsx`
  rather than `next/image` directly for anything Drive-backed.
- **Uploads happen on file selection, not on submit**, so an abandoned form leaves a file in Drive.
  The sweep cleans these up; don't be surprised by the extra files while developing.
- **The schema is managed with `prisma db push`**, not Prisma Migrate. There is no `migrations/`
  directory. Apply schema changes yourself before deploying.

## Reporting bugs

Include what you expected, what happened, and anything the server log printed — many failures in
this app surface server-side (`[drive/image]`, `[auth/google/callback]`, `[drive-cleanup]`) while
the browser only shows something generic.

## Security

If you find something security-sensitive — anything touching auth, tokens, or another user's data —
please report it privately rather than opening a public issue.
