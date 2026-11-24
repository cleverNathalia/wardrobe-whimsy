# Wardrobe Whimsy — mobile app

An Expo (React Native) app that talks to the same API as the web app, so it
shows the same account and the same wardrobe. It has no server or database of
its own.

## Running it on your phone

1. Install **Expo Go** from the Play Store (Android) or the App Store (iPhone).
2. Copy `.env.example` to `.env.local` and fill it in:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — the same value as the web app's
     `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
   - `EXPO_PUBLIC_API_BASE_URL` — the web app it should talk to. The live site
     by default.
3. From the repo root: `pnpm install`, then `pnpm --filter @wardrobe-whimsy/mobile start`.
4. Scan the QR code with Expo Go. Your phone and computer need to be on the
   same Wi-Fi; if that is awkward, use `start -- --tunnel` instead.

## How it fits together

- **Sign-in:** Clerk (`@clerk/expo`), the same Clerk app as the website.
  "Continue with Google" opens Google in an in-app browser, which works in
  Expo Go. Native Google sign-in would need a development build.
- **API calls:** `src/lib/api.ts` sends Clerk's session token as a Bearer
  token; the web app's API routes accept it as well as their usual cookie.
- **Photos:** served by the web app from the user's Google Drive, so they are
  requested with the same token (`src/components/authed-image.tsx`).
- **Styling:** NativeWind (Tailwind for React Native), with colours from
  `packages/design-tokens` — the same palette as the web app.
- **Routes** live in `src/app` (Expo Router). Signed-out users only reach
  `sign-in`; signed-in users only reach `(app)`.

## Checks

```bash
pnpm --filter @wardrobe-whimsy/mobile typecheck
pnpm --filter @wardrobe-whimsy/mobile lint
```

Both run in CI with the rest of the repo. `npx expo-doctor` (from this folder)
checks the Expo setup itself.
