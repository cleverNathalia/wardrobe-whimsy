# Wardrobe Whimsy — Project Plan (two-app, with Google Photos import)

## Context

**Wardrobe Whimsy** is a full-stack, portfolio-grade wardrobe management and outfit
collage app. Users save their clothes, organise them, build outfits and drag-and-drop
collages, and (eventually) get outfit suggestions from items they own.

This plan adds a new capability on top of the base product: **importing clothing photos
directly from a user's Google Photos library**, in addition to manual device upload.

The repo is currently greenfield — only planning docs exist. This plan is the
foundational plan for the whole project, structured into phases, with the Google Photos
import feature integrated as Phase 3.

### Architecture decision (updated 2026-07-07)

Earlier drafts of this plan specified a single "universal" Expo (React Native)
codebase compiling to iOS, Android, *and* web. That was reconsidered: React Native
doesn't render a DOM, and Expo's web output (`react-native-web`) can't run DOM-based
libraries like Radix/shadcn/ui. Building one universal codebase would have meant giving
up shadcn/ui + real Tailwind CSS for the web experience in favour of NativeWind +
Gluestack UI approximations everywhere — which works against the goal of this project
(showcasing strong React/Tailwind web skills, some backend depth, and picking up React
Native as a new skill).

**Decision: two separate client apps sharing one backend**, in a monorepo:

- **`apps/web`** — a real Next.js (App Router) web app, shadcn/ui + Tailwind CSS,
  Clerk web SDK. This is the primary, full-featured product and where shadcn/ui is used
  exactly as designed in `Wardrobe Whimsy Design System.md`.
- **`apps/mobile`** — an Expo (React Native) app, NativeWind v4 for styling, Clerk Expo
  SDK. Covers the core flows natively on iOS/Android. Not required to have 100% feature
  parity with web on day one (see §Phased plan, Phase 3b/5).
- Both apps call the **same backend**: Prisma + Neon Postgres, exposed as authenticated
  API routes hosted by `apps/web` (Next.js Route Handlers). `apps/mobile` has no direct
  database access — it's a pure HTTP client of the deployed web app's API, authenticated
  via a Clerk session token attached as a Bearer header. This mirrors a realistic
  "one backend, multiple clients" setup and is the main way this plan demonstrates
  backend design, not just CRUD-behind-a-form-per-platform.
- A small shared `packages/design-tokens` package (colours, spacing, radius, type scale
  — the values in `Wardrobe Whimsy Design System.md`) is consumed by both apps' Tailwind
  configs (`tailwind.config.ts` for web, NativeWind's config for mobile), so the two
  apps look like the same product even though their component implementations differ.
- A shared `packages/api-client` package holds the Zod schemas and typed fetch
  wrappers for every endpoint, so both apps validate/consume the API the same way and
  a breaking API change is a type error in both, not a runtime surprise in one.

### Key research finding (verified against Google's official docs, July 2026)

The Picker API instinct is correct — and stronger than "probably the best fit":

- As of **March 31, 2025**, Google **removed** the `photoslibrary.readonly`,
  `photoslibrary`, and `photoslibrary.sharing` scopes. The old **Library API can no
  longer read any photo the app did not itself upload** (returns `403 PERMISSION_DENIED`).
- The **Google Photos Picker API is now the only supported way** for a user to select
  photos from their existing library and share only those with an app. There is no viable
  alternative to reconsider.
- Required scope is minimal: **`https://www.googleapis.com/auth/photospicker.mediaitems.readonly`**.
- Picked-media **`baseUrl`s expire after ~60 minutes**, and Google **does not allow service
  accounts** (interactive user Google sign-in is required). Both facts reinforce the
  intended architecture: **treat Google Photos strictly as an import source, copy bytes to
  Cloudinary immediately, and persist only Cloudinary URLs.**
- **Any app calling the Google Photos APIs must pass Google's OAuth verification review**
  — this is not optional past a small number of manually-added test users. Verification
  needs a live, hosted privacy policy at minimum. Plan to submit for verification once the
  consent screen and privacy policy exist (see Phase 3 checklist); until then, the import
  feature only works for accounts added as test users in the Google Cloud project.

Sources:
- [Picker API / Library API changes — Google Developers Blog](https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/)
- [Updates to the Google Photos APIs](https://developers.google.com/photos/support/updates)
- [Authorization scopes — Google Photos APIs](https://developers.google.com/photos/overview/authorization)
- [Get started with the Picker API](https://developers.google.com/photos/picker/guides/get-started-picker)
- [Create and manage sessions](https://developers.google.com/photos/picker/guides/sessions)
- [List and retrieve media items](https://developers.google.com/photos/picker/guides/media-items)

---

## Decisions locked in

- **Monorepo, two clients, one backend** (see Architecture decision above). Package
  manager: pnpm workspaces + Turborepo (fast, cache-aware task running across
  `apps/*`/`packages/*` — also a resume-worthy detail).
- **Postgres host:** Neon (serverless, built-in pooling, first-class Vercel integration).
- **Permanent media store: Cloudinary (not user-owned Google Drive).** Google Drive was considered as a zero-cost, user-owned storage option but rejected for three reasons: (1) Drive is a document store, not a media CDN — image URLs are unstable, sharing permissions are complex to manage, and there is no built-in image optimization or CDN delivery; (2) it would require persisting long-lived Google OAuth refresh tokens in the database, expanding the security surface significantly compared to the current short-lived-token approach; (3) if the user ever revokes Google access the app would lose all their images. Cloudinary's free tier is a **shared pool of 25 credits/month** (1 credit = 1 GB storage *or* 1 GB bandwidth *or* 1,000 transformations, not a flat 25 GB + 25 GB as earlier assumed) — sufficient for a portfolio build, but worth monitoring once automatic resizing/format conversion is in use since that draws from the same pool.
- **Image model:** No separate `ImportedImage` model. Keep `imageUrl` / `imagePublicId` /
  `imageSource` on `ClothingItem` and add a `status` enum (`DRAFT` | `ACTIVE`) to support the
  import-then-fill-metadata flow. `ImportedImage` can be added later if an import audit trail
  or image-reuse-across-items is ever wanted (YAGNI for now).
- **Uploads are signed, server-issued, never via a public unsigned preset.** Both apps
  request a short-lived signed upload signature from the backend (`api/cloudinary/sign`)
  before uploading directly to Cloudinary. Keeps the API secret server-side (NFR-1.1)
  without proxying image bytes through the backend.

---

## Clerk vs Google Photos OAuth — the separation (important)

These are **two independent identity/authorization concerns** and must not be conflated:

| Concern | Provider | When requested | Scope | Token lifetime |
|---|---|---|---|---|
| **App login/session** (who the user is) | **Clerk** | At normal sign-in | (managed by Clerk) | Managed by Clerk session |
| **Google Photos access** (a capability) | **Google OAuth 2.0** (direct) | Only when the user clicks "Import from Google Photos" | `photospicker.mediaitems.readonly` | Short-lived; used for the import, then discarded |

**Chosen approach — dedicated, on-demand Google OAuth (incremental authorization):**
Clerk remains the sole app-identity provider, on **both** clients — `@clerk/nextjs` on
web, `@clerk/clerk-expo` on mobile, same Clerk application/instance, so a user can sign
in with the same account on either platform. Google Photos is a *separate*, *lazily
requested* capability, and the entire Google OAuth + Picker flow lives **only in
`apps/web`** (it's a web-page-based Google flow — see the mobile handoff note below).
When a user starts an import, the backend runs a standalone Google OAuth 2.0 flow (via
`google-auth-library`) requesting **only** the picker scope, protected by a `state`
parameter to prevent CSRF. The resulting access token is held server-side just long
enough to create the picker session and download the picked bytes into Cloudinary, then
is discarded (not persisted long-term). Because Vercel functions are stateless, the
token is held in a short-lived, encrypted, signed cookie scoped to the import flow
(alternative: a KV store such as Upstash Redis keyed by session id, if cookie size
becomes a constraint) — not in the database.

This satisfies every requirement: Clerk sign-in never asks for Google Photos permission; the
picker scope is requested only at the moment of import; no Google tokens are stored
long-term; secrets stay server-side.

**Mobile handoff:** Google's Picker UI is a web page — there is no native picker. On
`apps/mobile`, "Import from Google Photos" opens the exact same `apps/web`-hosted flow
in an in-app browser (`expo-web-browser`'s `openAuthSessionAsync`), pointed at the
deployed web app's `/wardrobe/import-google-photos` route. When the flow completes,
that page redirects to a custom URL scheme (`wardrobewhimsy://import-complete?draftIds=...`)
that Expo's linking config catches to close the browser and return to the app, which
then fetches the newly created DRAFT items by id. This reuses 100% of the Phase 3
server-side logic — the mobile app never talks to Google directly.

*Auth0 considered and rejected:* Auth0 v4 is a capable option but is overbuilt for a
single-user-type app and requires more boilerplate than Clerk's Next.js/Expo SDKs, both
of which need no custom auth pages and share one user base — reducing time-to-feature for
a portfolio build with two clients.

---

## Architecture overview

**Monorepo** (pnpm workspaces + Turborepo):

```
wardrobe-whimsy/
  apps/
    web/                               # Next.js 15 App Router — the primary product
      app/
        (marketing)/page.tsx           # public landing page
        sign-in/[[...rest]]/page.tsx   # Clerk <SignIn />
        sign-up/[[...rest]]/page.tsx   # Clerk <SignUp />
        (app)/                         # authenticated route group (Clerk middleware)
          layout.tsx                   # app shell: sidebar (desktop) / bottom nav (mobile web)
          page.tsx                     # dashboard
          wardrobe/
            page.tsx                   # wardrobe grid + empty state
            new/page.tsx               # "Add item" source selection
            import-google-photos/page.tsx
            [id]/page.tsx
          outfits/ ...
          settings/page.tsx
        api/                           # Route Handlers — the shared backend
          webhooks/clerk/route.ts      # user.created + user.deleted → sync/cascade-delete User
          clothing-items/route.ts, [id]/route.ts
          outfits/route.ts, [id]/route.ts
          wear-logs/route.ts
          cloudinary/sign/route.ts     # short-lived signed upload signature
          google/photos/authorize/route.ts
          google/photos/callback/route.ts
          google/photos/session/[id]/route.ts
      components/                      # shadcn/ui-based components (per design system)
      lib/ (auth.ts, prisma.ts, cloudinary.ts, google-photos.ts, validations/ — re-exports from packages/api-client)
      prisma/schema.prisma
    mobile/                            # Expo (Expo Router), React Native, TS
      app/
        _layout.tsx                    # ClerkProvider (clerk-expo), navigation container
        sign-in.tsx | sign-up.tsx
        (app)/
          _layout.tsx                  # tab bar
          index.tsx                    # dashboard (read-mostly)
          wardrobe/index.tsx | new.tsx | [id].tsx
          outfits/index.tsx | [id].tsx
          settings.tsx
      components/                      # lighter native components, NativeWind-styled,
                                        #   using packages/design-tokens for colour/spacing
      lib/ (auth.ts, api.ts — thin fetch wrapper using packages/api-client + Clerk getToken())
  packages/
    api-client/                        # Zod schemas + typed fetch functions, shared by both apps
    design-tokens/                     # colours, spacing, radius, type scale (source of truth)
    config/                            # shared eslint/tsconfig/tailwind-preset
```

`apps/mobile` never imports Prisma or touches Postgres directly — every read/write goes
through `apps/web`'s deployed API over HTTPS, authenticated with a Clerk session token
obtained via `getToken()` and sent as `Authorization: Bearer <token>`. The web app's
middleware verifies it as a cross-origin request using Clerk's backend SDK.

### Google Photos import — end-to-end flow (server-side heavy, web-hosted)

1. User (signed in via Clerk on either client) starts an import: on web, directly at
   `/wardrobe/import-google-photos`; on mobile, via the in-app-browser handoff above.
2. Client hits `api/google/photos/authorize` → server redirects to Google consent for
   `photospicker.mediaitems.readonly` only, with a `state` value tied to the session.
3. Google → `api/google/photos/callback` → server validates `state`, exchanges code for a
   **short-lived access token** held in an encrypted, signed cookie (not the DB).
4. Server calls **`sessions.create`** (Picker API) → returns `pickerUri` + `pollingConfig`.
5. UI opens `pickerUri` (with `/autoclose` appended) in a new tab; meanwhile the client polls
   `api/google/photos/session/[id]` which proxies **`sessions.get`** at `pollingConfig.pollInterval`.
6. When `mediaItemsSet === true`, server calls **`mediaItems.list`** for the session,
   filtering out non-image media items (the Picker can also return videos).
7. For each picked photo: server downloads bytes from `baseUrl` + `=d`, sending
   `Authorization: Bearer <token>` (must happen within the 60-min window), and **uploads to
   Cloudinary** via `lib/cloudinary.ts`.
8. Server creates **DRAFT** `ClothingItem` rows with the Cloudinary `imageUrl` +
   `imagePublicId` + `imageSource = google_photos`, tied to the authenticated user.
9. Server calls **`sessions.delete`** and discards the Google token/cookie.
10. Web UI shows draft item cards directly. On mobile, the completion redirect passes the
    new draft ids back through the custom-scheme deep link so the app can fetch and show
    them. User fills metadata (RHF + Zod) → save flips status to **ACTIVE**.

Manual upload is the same tail end on both clients: request a signed Cloudinary
signature from the backend → upload directly to Cloudinary from the client → create
DRAFT item via the API → fill metadata → save, with `imageSource = manual`. On mobile,
image selection/capture uses `expo-image-picker` (covers both photo library and camera),
with `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (iOS) and
`CAMERA` / `READ_MEDIA_IMAGES` (Android) permissions declared in `app.config.ts`.

**Security:** picker scope requested only on demand; Google tokens never persisted long-term;
Cloudinary secrets and Google client secret stay server-side; every API route re-derives
the Clerk user (from either the web session or the mobile Bearer token) and scopes all
queries by `userId`; all inputs validated with Zod (shared schemas from
`packages/api-client`); the `pickerUri` is never embedded in an iframe (Google forbids it);
the Clerk webhook endpoint verifies the Svix signature using `CLERK_WEBHOOK_SIGNING_SECRET`.

---

## Prisma schema (target, lives in `apps/web/prisma/schema.prisma`)

```prisma
enum ImageSource { manual google_photos }
enum ItemStatus  { DRAFT ACTIVE }

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  clothingItems ClothingItem[]
  outfits       Outfit[]
  wearLogs      WearLog[]
}

model ClothingItem {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  category      String
  subcategory   String?
  colour        String?
  season        String?
  occasion      String?
  brand         String?
  size          String?
  imageUrl      String
  imagePublicId String
  imageSource   ImageSource
  status        ItemStatus  @default(DRAFT)   // supports import-then-fill flow
  notes         String?
  isFavourite   Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  outfitItems   OutfitItem[]
  @@index([userId])
}

model Outfit {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  occasion      String?
  season        String?
  notes         String?
  tags          String[]
  coverImageUrl String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  items         OutfitItem[]
  wearLogs      WearLog[]
  @@index([userId])
}

model OutfitItem {
  id             String  @id @default(cuid())
  outfitId       String
  outfit         Outfit  @relation(fields: [outfitId], references: [id], onDelete: Cascade)
  clothingItemId String
  clothingItem   ClothingItem @relation(fields: [clothingItemId], references: [id], onDelete: Cascade)
  positionX Float @default(0)
  positionY Float @default(0)
  scale     Float @default(1)
  rotation  Float @default(0)
  zIndex    Int   @default(0)
  @@index([outfitId])
}

model WearLog {
  id       String   @id @default(cuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  outfitId String
  outfit   Outfit   @relation(fields: [outfitId], references: [id], onDelete: Cascade)
  wornAt   DateTime @default(now())
  notes    String?
  @@index([userId])
}
```

`onDelete: Cascade` on every foreign key means deleting a `User` row cascades to all
their `ClothingItem`/`Outfit`/`OutfitItem`/`WearLog` rows automatically **at the database
level** — the remaining application-level responsibility is to actually delete the
`User` row when Clerk reports the account is gone, which is why the `user.deleted`
webhook handler (Phase 2) matters: Clerk deleting its own account record does not touch
this database at all unless that webhook is wired up.

---

## Environment variables

```bash
# Clerk (app login) — shared Clerk application, two SDKs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # pk_test_... (apps/web, @clerk/nextjs)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=    # same pk_test_... value (apps/mobile, @clerk/clerk-expo)
CLERK_SECRET_KEY=                     # sk_test_... (server-side only, apps/web)
CLERK_WEBHOOK_SIGNING_SECRET=         # whsec_... — verifies Svix signature on api/webhooks/clerk

# Database (Neon) — apps/web only, never shipped to apps/mobile
DATABASE_URL=              # pooled connection string (?sslmode=require, -pooler host)
DIRECT_URL=                # direct (non-pooled) URL for prisma migrate

# Cloudinary — apps/web only; both clients get a signature via api/cloudinary/sign
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Photos (separate OAuth — picker scope only, apps/web only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=  # http://localhost:3000/api/google/photos/callback (+ prod URL)
IMPORT_COOKIE_SECRET=       # signs/encrypts the short-lived Google-token cookie

# Cross-app wiring
EXPO_PUBLIC_API_BASE_URL=   # deployed apps/web URL that apps/mobile calls, e.g. https://wardrobe-whimsy.vercel.app
EXPO_PUBLIC_APP_SCHEME=     # wardrobewhimsy — custom scheme for the Google-import deep-link return
```

Callback/redirect URLs to register:
- Clerk Dashboard → Allowed redirect URLs: `http://localhost:3000` (+ Vercel URL) for web;
  `wardrobewhimsy://` scheme registered for mobile per `@clerk/clerk-expo` setup.
- Google OAuth Authorized redirect URI: value of `GOOGLE_OAUTH_REDIRECT_URI` (+ Vercel URL).
- Google Cloud project: enable **Photos Picker API**; configure OAuth consent screen with
  the single picker scope; add test users while unverified; publish a hosted privacy
  policy and submit for OAuth verification before relying on this for anyone besides
  test-user accounts.
- Expo `app.config.ts`: register the `wardrobewhimsy` URL scheme and the camera/photo
  library permission strings.

---

## Phased implementation plan

**Phase 1 — Web foundation**
Next.js (App Router) + TS + Tailwind + shadcn/ui setup; app shell (sidebar desktop /
bottom nav mobile-web); landing page; Clerk sign-in/sign-up (`@clerk/nextjs`); middleware
protecting the authenticated route group — unauthenticated users are redirected to
`/sign-in`. Monorepo scaffolding (pnpm workspaces + Turborepo, `packages/design-tokens`,
`packages/api-client`, `packages/config`).

**Phase 2 — Data + manual upload (backend + web)**
Prisma + Neon; `prisma.ts` singleton; Clerk↔`User` sync via webhook — **both**
`user.created` (create/find User) **and** `user.deleted` (delete User, cascades via
Prisma `onDelete: Cascade`) — with Svix signature verification using
`CLERK_WEBHOOK_SIGNING_SECRET`; wardrobe CRUD as Route Handlers + Zod (schemas live in
`packages/api-client` so mobile can reuse them); signed Cloudinary upload flow
(`api/cloudinary/sign`); `ClothingItem` DRAFT→ACTIVE flow; wardrobe grid + empty state;
item detail/edit. This phase is also where cross-origin API auth is set up (Clerk
backend SDK verifying a Bearer token from `apps/mobile`, in addition to standard web
session auth), even though `apps/mobile` doesn't exist yet — so Phase 3b isn't blocked
on backend rework later.

**Phase 3 — Google Photos import (web)**
`lib/google-photos.ts` service module; on-demand Google OAuth (picker scope only, with
CSRF `state`); picker session create/poll/list/delete API routes; download picked
bytes → Cloudinary (image items only — video media items from the Picker are filtered
out and reported to the user, not silently imported); create DRAFT items with
`imageSource = google_photos`; import UI (source cards, loading/error states, draft
cards, multi-photo support, friendly microcopy). Submit the Google Cloud project for
OAuth verification around this phase (needs the privacy policy live).

**Phase 3b — Mobile app bootstrap**
Expo app scaffolding, NativeWind v4 configured against `packages/design-tokens`; Clerk
Expo sign-in/sign-up sharing the same Clerk users as web; thin API client
(`packages/api-client` + Bearer-token fetch wrapper) wired to `EXPO_PUBLIC_API_BASE_URL`;
wardrobe list/detail, manual upload (`expo-image-picker` for camera + library, signed
Cloudinary upload), and the Google Photos import handoff (in-app browser → deep link
back into the app) reusing Phase 3's backend as-is.

**Phase 4 — Outfits** — Outfit CRUD + gallery (web + mobile, both against the shared API).
**Phase 5 — Collage builder (web-first)** — drag/scale/rotate/layer canvas on web using
pointer events (a library such as `react-moveable`/`@dnd-kit` or a canvas approach like
`react-konva`, chosen once the interaction is prototyped), persisting `OutfitItem`
layout; works with mouse and touch (pointer events cover both) on web. **Native collage
editing on mobile is a stretch goal for a later phase** — the mobile app shows outfit
collages read-only (rendered from the same `OutfitItem` data) until/unless a native
gesture-based editor (Reanimated + Gesture Handler) is built; this is an explicit,
deliberate scope cut rather than a gap, given the mobile app's goal is breadth of core
flows, not full parity.
**Phase 6 — Dashboard** — wear logs + stats (web + mobile).
**Phase 7 — Suggestions** — AI outfit-suggestion service placeholder + interface,
consumed by both clients.
**Phase 8 — Polish** — Storybook (web components), unit tests (Vitest, for
`packages/api-client` schemas and service logic like `google-photos.ts`), Playwright
(web E2E) + Detox (native E2E, core flows only given the reduced mobile scope), CI
(lint/typecheck/test on PR), basic error monitoring (e.g. Sentry), README, app-store
readiness (privacy policy, icons, screenshots, Play Data Safety form) + EAS Build
submission and Vercel web deployment.

### Storybook stories (Phase 8, web components built earlier)
Add-item source selection, image upload, Google Photos import card/button, import loading
state, import error state, draft item card, clothing item card, empty wardrobe.

### Test coverage (Phase 8)
- **Vitest (unit):** Zod schemas in `packages/api-client`; `lib/google-photos.ts` and
  `lib/cloudinary.ts` logic in isolation (no browser/server needed).
- **Playwright (web E2E):** Wardrobe page loads; Add-item page renders both source options; manual
  upload with mocked Cloudinary; **Google Photos import fully mocked**; protected routes
  redirect when unauthenticated.
- **Detox (native E2E, mobile):** Core happy paths — sign-in, add item (manual + Google
  Photos handoff), view outfit; auth guard redirects to sign-in screen when signed out.

---

## Verification (per phase, when implemented)

- **Phase 1:** `next dev`; `/` renders; navigating to `/(app)` while signed out redirects
  to `/sign-in`; after sign-in the app shell renders; sign-out clears the session.
- **Phase 2:** `prisma migrate dev` succeeds against Neon; create/edit/delete a clothing
  item; confirm rows are scoped to the logged-in user; manual image appears from
  Cloudinary; deleting a Clerk test user removes their rows via the `user.deleted`
  webhook; a forged webhook payload (bad Svix signature) is rejected.
- **Phase 3:** trigger import; complete Google picker in a new tab; confirm bytes land in
  Cloudinary and DRAFT items appear with `imageSource = google_photos`; confirm the Google
  token is not persisted and the picker session is deleted; confirm a selected video is
  filtered out with a clear message instead of silently failing.
- **Phase 3b:** `npx expo start`; sign in on mobile with the same account used on web and
  confirm the same wardrobe data appears; trigger Google Photos import from mobile and
  confirm the in-app browser → deep-link return flow produces the same draft items as web.
- **Cross-cutting:** Playwright suite green; Vitest suite green; Storybook builds; second
  user cannot see the first user's items (authorization check), on both clients.

---

## CV goal

> "Designed and built Wardrobe Whimsy, a wardrobe management and outfit collage product
> shipped as a Next.js web app (TypeScript, Tailwind, shadcn/ui) and a companion Expo
> (React Native) mobile app, sharing one Prisma/PostgreSQL backend exposed as an
> authenticated API. Implemented Clerk-based auth shared across both clients, manual and
> Google Photos Picker API image imports, signed Cloudinary uploads, gesture-driven
> outfit collage creation, outfit tracking, a monorepo build (pnpm + Turborepo) with a
> shared design-token and API-client package, and a testing stack spanning Vitest,
> Playwright, and Detox."

---

## Progress tracker

- [ ] Phase 1 — Web foundation (Next.js, Tailwind, shadcn/ui, app shell, landing, Clerk, monorepo scaffold)
- [ ] Phase 2 — Data + manual Cloudinary upload + Clerk user sync/delete webhook
- [ ] Phase 3 — Google Photos Picker import (web)
- [ ] Phase 3b — Mobile app bootstrap (Expo, Clerk Expo, shared API, manual upload + Google import handoff)
- [ ] Phase 4 — Outfits
- [ ] Phase 5 — Collage builder (web-first; mobile read-only)
- [ ] Phase 6 — Dashboard / wear logs / stats
- [ ] Phase 7 — AI suggestions placeholder
- [ ] Phase 8 — Storybook / Vitest / Detox + Playwright / CI / README / EAS Build + deploy
