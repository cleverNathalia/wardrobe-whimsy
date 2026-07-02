# Wardrobe Whimsy — Project Plan (with Google Photos import)

## Context

**Wardrobe Whimsy** is a full-stack, portfolio-grade wardrobe management and outfit
collage web app. Users save their clothes, organise them, build outfits and drag-and-drop
collages, and (eventually) get outfit suggestions from items they own.

This plan adds a new capability on top of the base product: **importing clothing photos
directly from a user's Google Photos library**, in addition to manual device upload.

The repo is currently greenfield — only `README.md` and the initial commit exist. So this
plan is the foundational plan for the whole project, structured into phases, with the
Google Photos import feature integrated as Phase 3.

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

Sources:
- [Picker API / Library API changes — Google Developers Blog](https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/)
- [Updates to the Google Photos APIs](https://developers.google.com/photos/support/updates)
- [Get started with the Picker API](https://developers.google.com/photos/picker/guides/get-started-picker)
- [Create and manage sessions](https://developers.google.com/photos/picker/guides/sessions)
- [List and retrieve media items](https://developers.google.com/photos/picker/guides/media-items)

---

## Decisions locked in

- **Postgres host:** Neon (serverless, built-in pooling, first-class Vercel integration).
- **Image model:** No separate `ImportedImage` model. Keep `imageUrl` / `imagePublicId` /
  `imageSource` on `ClothingItem` and add a `status` enum (`DRAFT` | `ACTIVE`) to support the
  import-then-fill-metadata flow. `ImportedImage` can be added later if an import audit trail
  or image-reuse-across-items is ever wanted (YAGNI for now).

---

## Auth0 vs Google Photos OAuth — the separation (important)

These are **two independent identity/authorization concerns** and must not be conflated:

| Concern | Provider | When requested | Scope | Token lifetime |
|---|---|---|---|---|
| **App login/session** (who the user is) | **Auth0** | At normal login | `openid profile email` | Managed by Auth0 session cookie |
| **Google Photos access** (a capability) | **Google OAuth 2.0** (direct) | Only when the user clicks "Import from Google Photos" | `photospicker.mediaitems.readonly` | Short-lived; used for the import, then discarded |

**Chosen approach — dedicated, on-demand Google OAuth (incremental authorization):**
Auth0 remains the sole app-identity provider. Google Photos is a *separate*, *lazily
requested* capability. When a user starts an import, we run a standalone Google OAuth 2.0
flow (via `google-auth-library`) requesting **only** the picker scope. The resulting access
token lives just long enough to create the picker session and download the picked bytes into
Cloudinary, then is discarded (not persisted long-term).

This satisfies every requirement: Auth0 login never asks for Google Photos permission; the
picker scope is requested only at the moment of import; no Google tokens are stored
long-term; secrets stay server-side.

*Alternative considered:* Auth0 Token Vault (federated Google connection). Rejected for now
because it couples Google into the login/connection story and is less transparent as a
portfolio demonstration of the OAuth separation. Noted as a future option.

---

## Architecture overview

Next.js **App Router**, React, TypeScript, Tailwind, shadcn/ui + Radix, Prisma + Neon
Postgres, Auth0 (app auth), Cloudinary (permanent media), Google Photos Picker API (import
source), React Hook Form + Zod, dnd-kit (collage), Storybook, Playwright, Vercel.

### Proposed directory structure

```
src/
  app/
    (marketing)/
      page.tsx                      # / landing page (public)
    app/                            # authenticated area (route group protected by middleware)
      layout.tsx                    # app shell: sidebar/nav, requires session
      page.tsx                      # /app dashboard
      wardrobe/
        page.tsx                    # /app/wardrobe grid + empty state
        new/page.tsx                # /app/wardrobe/new — "Add item" source selection
        import/google-photos/page.tsx  # Google Photos import flow UI
        [id]/page.tsx               # item detail/edit
      outfits/
        page.tsx | new/page.tsx | [id]/page.tsx | [id]/collage/page.tsx
      settings/page.tsx
    api/
      auth/[auth0]/route.ts         # Auth0 v4 handler (login/logout/callback)
      google/photos/
        authorize/route.ts          # start Google OAuth (picker scope only)
        callback/route.ts           # Google OAuth callback -> short-lived token
        session/route.ts            # create/delete picker session (proxied server-side)
        session/[id]/route.ts       # poll picker session status
    middleware.ts                   # protect /app/* -> redirect unauthenticated to login
  components/
    ui/                             # shadcn primitives
    wardrobe/
      add-item-source-cards.tsx     # two cards: upload / import from Google Photos
      image-upload.tsx              # manual Cloudinary upload
      google-photos-import-card.tsx
      import-loading-state.tsx
      import-error-state.tsx
      draft-item-card.tsx
      clothing-item-card.tsx
      empty-wardrobe.tsx
    outfits/ ...
  lib/
    auth0.ts                        # Auth0 client/session helpers
    prisma.ts                       # PrismaClient singleton
    cloudinary.ts                   # Cloudinary config + upload helper
    google-photos.ts                # SERVICE MODULE: OAuth, sessions, list, download
    validations/                    # Zod schemas (clothing item, outfit, import, etc.)
  server/
    actions/                        # server actions (createClothingItem, importFromGooglePhotos, ...)
```

### Google Photos import — end-to-end flow (server-side heavy)

1. User (already logged into Auth0) → `/app/wardrobe/new` → clicks **Import from Google Photos**.
2. Client hits `api/google/photos/authorize` → server redirects to Google consent for
   `photospicker.mediaitems.readonly` only.
3. Google → `api/google/photos/callback` → server exchanges code for a **short-lived access
   token** held in an encrypted server session (not the DB).
4. Server calls **`sessions.create`** (Picker API) → returns `pickerUri` + `pollingConfig`.
5. UI opens `pickerUri` (with `/autoclose` appended) in a new tab; meanwhile the client polls
   `api/google/photos/session/[id]` which proxies **`sessions.get`** at `pollingConfig.pollInterval`.
6. When `mediaItemsSet === true`, server calls **`mediaItems.list`** for the session.
7. For each picked item: server downloads bytes from `baseUrl` + `=d`, sending
   `Authorization: Bearer <token>` (must happen within the 60-min window), and **uploads to
   Cloudinary** via `lib/cloudinary.ts`.
8. Server creates **DRAFT** `ClothingItem` rows with the Cloudinary `imageUrl` +
   `imagePublicId` + `imageSource = google_photos`, tied to the authenticated user.
9. Server calls **`sessions.delete`** and discards the Google token.
10. UI shows draft item cards; user fills metadata (RHF + Zod) → save flips status to **ACTIVE**.

Manual upload is the same tail end: upload to Cloudinary → draft item → fill metadata → save,
with `imageSource = manual`.

**Security:** picker scope requested only on demand; Google tokens never persisted long-term;
Cloudinary secrets and Google client secret stay server-side; every server action re-derives
the Auth0 user and scopes all queries by `userId`; all inputs validated with Zod; the
`pickerUri` is never embedded in an iframe (Google forbids it).

---

## Prisma schema (target)

```prisma
enum ImageSource { manual google_photos }
enum ItemStatus  { DRAFT ACTIVE }

model User {
  id        String   @id @default(cuid())
  auth0Id   String   @unique
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

Difference vs the original draft schema: added `ItemStatus` enum + `status` field (draft flow),
`onDelete: Cascade` + `@@index` on foreign keys, and `ImportedImage` intentionally omitted.

---

## Environment variables

```bash
# Auth0 (app login) — @auth0/nextjs-auth0 v4
AUTH0_SECRET=              # openssl rand -hex 32
APP_BASE_URL=              # http://localhost:3000 (prod: https://...vercel.app)
AUTH0_DOMAIN=              # your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Database (Neon)
DATABASE_URL=              # pooled connection string (?sslmode=require, -pooler host)
DIRECT_URL=               # direct (non-pooled) URL for prisma migrate

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=  # optional (unsigned preset) if used

# Google Photos (separate OAuth — picker scope only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI= # http://localhost:3000/api/google/photos/callback
```

Callback/redirect URLs to register:
- Auth0 Allowed Callback: `http://localhost:3000/api/auth/callback` (+ Vercel URL)
- Auth0 Allowed Logout: `http://localhost:3000` (+ Vercel URL)
- Google OAuth Authorized redirect URI: value of `GOOGLE_OAUTH_REDIRECT_URI` (+ Vercel URL)
- Google Cloud project: enable **Photos Picker API**; configure OAuth consent screen with the
  single picker scope; add test users while unverified.

---

## Phased implementation plan

**Phase 1 — Foundation**
Next.js (App Router) + TS + Tailwind + shadcn/ui setup; app shell (nav/sidebar); landing page;
Auth0 v4 login/logout/session; `middleware.ts` protecting `/app/*` with redirect for
unauthenticated users.

**Phase 2 — Data + manual upload**
Prisma + Neon; `prisma.ts` singleton; Auth0→`User` sync on first login; wardrobe CRUD (server
actions + Zod); manual Cloudinary upload; `ClothingItem` DRAFT→ACTIVE flow; wardrobe grid +
empty state; item detail/edit.

**Phase 3 — Google Photos import** (the new feature)
`lib/google-photos.ts` service module; on-demand Google OAuth (picker scope only); picker
session create/poll/list/delete API routes; download picked bytes → Cloudinary; create DRAFT
items with `imageSource = google_photos`; import UI (source cards, loading/error states, draft
cards, multi-photo support, friendly microcopy).

**Phase 4 — Outfits** — Outfit CRUD + gallery.
**Phase 5 — Collage** — dnd-kit drag-and-drop builder persisting `OutfitItem` layout.
**Phase 6 — Dashboard** — wear logs + stats.
**Phase 7 — Suggestions** — AI outfit-suggestion service placeholder + interface.
**Phase 8 — Polish** — Storybook stories, Playwright suites, README, Vercel deployment.

### Storybook stories (Phase 8, components built earlier)
Add-item source selection, image upload, Google Photos import card/button, import loading
state, import error state, draft item card, clothing item card, empty wardrobe.

### Playwright coverage (Phase 8)
Wardrobe page loads; Add-item page renders both source options; manual upload with mocked
Cloudinary; **Google Photos import fully mocked** (no real Google OAuth in E2E — stub the
picker session/list/download routes); protected routes redirect when unauthenticated.

---

## Verification (per phase, when implemented)

- **Phase 1:** `npm run dev`; `/` renders; visiting `/app` while logged out redirects to Auth0
  login; after login `/app` renders the shell; logout clears session.
- **Phase 2:** `prisma migrate dev` succeeds against Neon; create/edit/delete a clothing item;
  confirm rows are scoped to the logged-in user; manual image appears from Cloudinary.
- **Phase 3:** trigger import; complete Google picker in a new tab; confirm bytes land in
  Cloudinary and DRAFT items appear with `imageSource = google_photos`; confirm the Google
  token is not persisted and the picker session is deleted.
- **Cross-cutting:** Playwright suite green; Storybook builds; second user cannot see the first
  user's items (authorization check).

---

## CV goal

> "Designed and built Wardrobe Whimsy, a full-stack wardrobe management and outfit collage app
> using Next.js, React, TypeScript, Auth0, Prisma, PostgreSQL, Cloudinary, and the Google Photos
> Picker API. Implemented authenticated user wardrobes, manual and Google Photos image imports,
> Cloudinary-backed media storage, drag-and-drop outfit collage creation, outfit tracking,
> reusable UI components, Storybook documentation, and Playwright-tested user flows."

---

## Progress tracker

- [ ] Phase 1 — Foundation (Next.js, Tailwind, shadcn, app shell, landing, Auth0)
- [ ] Phase 2 — Data + manual Cloudinary upload
- [ ] Phase 3 — Google Photos Picker import
- [ ] Phase 4 — Outfits
- [ ] Phase 5 — Collage builder
- [ ] Phase 6 — Dashboard / wear logs / stats
- [ ] Phase 7 — AI suggestions placeholder
- [ ] Phase 8 — Storybook / Playwright / README / deploy
