# Planning Review — Wardrobe Whimsy

**Date:** 2026-07-07
**Reviewed:** `README.md`, `PROJECT_PLAN.md`, `FRS.md`, `Wardrobe Whimsy Design System.md`, `claude-design-system-prompt.md`, `WardrobeWhimseyAppClaudeDesign.html`.
**Repo state:** docs-only, no application code yet (2 commits: initial + plan/FRS). This review is a critique of the plan itself, before Phase 1 starts.

**Update (same day, after discussion):** the design-system/stack mismatch below led to an
architecture decision — see the resolution notes inline. `PROJECT_PLAN.md` and `FRS.md`
have been rewritten to a two-app model (Next.js web + Expo mobile, one shared backend).
That rewrite also closed several of the moderate items in §2 (native camera capture,
OAuth CSRF `state`, the Google-token session mechanism, missing unit tests, missing
Clerk webhook signature verification) — each is marked **Resolved** below rather than
removed, so the reasoning stays visible.

---

## 1. Critical — resolve before writing code

**Design system targets the wrong component stack.** The design system and its HTML mockup are built on shadcn/ui + Tailwind CSS + Radix primitives + CSS variables (`hsl(var(--primary))`, `backdrop-filter: blur`, etc.) — a web/Next.js paradigm. `PROJECT_PLAN.md` commits to Expo + NativeWind v4 + Gluestack UI for a universal (iOS/Android/web) app. shadcn/ui and Radix don't run on React Native: there's no DOM, no CSS variables, no `backdrop-filter`, and Dialog/DropdownMenu/Tooltip need RN-native implementations (Modal, Portal, gesture-based popovers). Every component in the design system doc will need to be re-expressed in Gluestack UI + NativeWind tokens before it's usable as a build reference, not just "implemented" from it. Worth deciding now whether to regenerate the design system against the real stack, or treat the current one purely as a token/copy/palette reference and design components fresh in Gluestack.

> **Resolved:** rather than forcing everything into one Expo/Gluestack codebase, the
> project is now two clients — a Next.js web app (where shadcn/ui applies exactly as
> designed) and a lighter Expo mobile app (NativeWind, sharing colour/spacing tokens
> with web via a `packages/design-tokens` package) — sharing one Prisma/Postgres backend.
> This keeps the existing shadcn design system fully usable for web instead of needing a
> full Gluestack re-derivation, and gives a clearer backend story ("one API, two
> clients"). See `PROJECT_PLAN.md`'s "Architecture decision" section.

**Google Photos Picker requires OAuth app verification — this isn't optional.** Google's own docs state: *"If your application accesses the Google Photos APIs, it must pass the OAuth verification review... If you see unverified app on the screen when testing, you must submit a verification request to remove it."* `PROJECT_PLAN.md` only says "add test users while unverified," which caps the app at manually-added test accounts (Google limits this to 100) and shows a scary warning screen to everyone else. For the app to be usable by anyone besides Danielle's own test accounts (e.g. a recruiter clicking around), verification is required, which needs a live privacy policy and (depending on whether `photospicker.mediaitems.readonly` is classed as sensitive vs. restricted) possibly a demo video and security review. This should be scoped as an explicit Phase 8 (or earlier) task, not an afterthought — worth deciding upfront whether the portfolio demo will just live with "test users only" or go through verification.

**Native Google Photos flow is underspecified.** The documented flow ("UI opens `pickerUri` in a new tab; client polls") is web-shaped. On iOS/Android there's no "new tab" — this needs an in-app browser (`expo-web-browser`'s `openAuthSessionAsync` or similar) and a defined way to resume/poll while that browser session is open or after it closes. Not addressed anywhere in the architecture section.

> **Resolved:** the whole Google OAuth + Picker flow stays web-hosted (it's a web page,
> there's no native picker). Mobile opens that same flow in an in-app browser
> (`expo-web-browser`'s `openAuthSessionAsync`) and gets handed back via a custom URL
> scheme deep link when it completes — see "Mobile handoff" in `PROJECT_PLAN.md`.

**The "encrypted server session" for the Google token has no defined mechanism.** Expo API routes on Vercel are stateless serverless functions. Holding a short-lived token in "an encrypted server session (not the DB)" between the OAuth callback and the later download/upload steps needs a concrete store — signed/encrypted cookie, or a short-TTL KV store (Vercel KV/Upstash Redis) — plus an OAuth `state` parameter for CSRF protection. Currently unspecified; this is a real security-relevant design decision, not an implementation detail to defer.

> **Resolved:** the token is held in a short-lived, encrypted, signed cookie scoped to
> the import flow (KV store noted as the fallback if cookie size becomes a constraint),
> and the OAuth request now includes a `state` parameter for CSRF protection. See the
> Clerk/Google OAuth section and env vars (`IMPORT_COOKIE_SECRET`) in `PROJECT_PLAN.md`.

**No webhook signature verification planned for the Clerk sync.** `PROJECT_PLAN.md` describes `api/webhooks/clerk` syncing `User` records on `user.created`, but the env var list has no `CLERK_WEBHOOK_SIGNING_SECRET`. Without verifying the Svix signature, that endpoint would accept forged "user created" payloads from anyone who finds the URL.

> **Resolved:** `CLERK_WEBHOOK_SIGNING_SECRET` is now in the env var list and Phase 2
> explicitly calls out verifying the Svix signature before trusting the payload.

**Account/data deletion isn't covered.** NFR-3.3 requires cascading deletes with no orphaned rows, but the only webhook mentioned is `user.created`. There's no `user.deleted` handling — if a user deletes their Clerk account, their `ClothingItem`/`Outfit`/`WearLog` rows have no defined path to being removed.

> **Clarification:** Clerk deletes its own identity/session record and *fires* a
> `user.deleted` webhook event when that happens — but it has no knowledge of this app's
> Postgres tables, so it can't cascade into them on its own. The app has to listen for
> that event itself.
>
> **Resolved:** Phase 2 now explicitly handles `user.deleted` by deleting the
> corresponding `User` row, which cascades to `ClothingItem`/`Outfit`/`OutfitItem`/
> `WearLog` via the schema's existing `onDelete: Cascade` foreign keys — no new schema
> change needed, just the webhook handler.

---

## 2. Worth deciding now (moderate)

- **Cloudinary's free tier is not what's documented.** It's now a shared pool of **25 credits/month**, where 1 credit = 1 GB storage *or* 1 GB bandwidth *or* 1,000 transformations — not a flat "25 GB storage + 25 GB bandwidth" as stated in `PROJECT_PLAN.md`. Since the plan also relies on Cloudinary's automatic format conversion/resizing (transformations draw from the same pool), real headroom is smaller than assumed. Worth re-checking this is still sufficient once resizing is in use.
- **Native camera/photo capture isn't in the architecture.** FR-2.1 requires camera capture and "Take Photo" on mobile — the plan lists this for mobile *browsers* but the architecture section never mentions `expo-image-picker`/`expo-camera` or the associated iOS/Android permission entries (`Info.plist` / `AndroidManifest`) needed for the native builds NFR-4.4/4.5 require.
  > **Resolved:** Phase 3b now specifies `expo-image-picker` for both camera and library
  > access, with the iOS/Android permission strings declared in `app.config.ts`; FR-2.1
  > in `FRS.md` was updated to cover the native app explicitly, not just mobile browsers.
- **No image/video filtering in the Picker flow.** Google Photos libraries contain videos as well as photos; the Picker API can return either. Nothing in FR-3.x or the architecture restricts the picker to images or defines what happens if a user picks a video.
  > **Resolved:** Phase 3 in `PROJECT_PLAN.md` now filters out video media items during
  > the `mediaItems.list` step and reports it to the user rather than importing it as a
  > broken clothing-item image. (FR-3.x in `FRS.md` could still use an explicit
  > acceptance criterion for this — worth a follow-up edit if you want it spelled out
  > there too.)
- **HEIC isn't in the accepted-format list.** FR-2.1 lists JPG/PNG/WEBP; iPhones default to HEIC. Given NFR-4.4 targets a native iOS app, this format should be explicitly handled (Cloudinary can auto-convert, but the requirement should say so).
- **No stated limits on file size/dimensions**, for manual upload or Google import — worth a requirement rather than leaving it implicit.
- **Import batch size is only a performance assumption, not a requirement.** NFR-2.1 assumes "up to 30 photos" but nothing defines what happens if a user selects more in the Picker (Google's picker itself doesn't cap selection count).
- **No rate limiting** on the OAuth/import/upload API routes — worth at least a stated intent given they touch billable third-party quotas.
- **Prisma + serverless runtime.** Standard Prisma Client needs the Node.js runtime, not Vercel's Edge runtime — worth an explicit note that the `api/` routes using Prisma run on Node, especially since Expo Router's web output defaults aren't obviously one or the other.

---

## 3. Minor / polish gaps

- No unit test framework (Jest/Vitest) is mentioned anywhere — Phase 8 only lists Storybook, Detox, and Playwright, which cover components and E2E but not service-module logic (`google-photos.ts`, Zod schemas, etc.).
  > **Resolved:** Vitest is now in Phase 8's test coverage, specifically for the shared
  > `packages/api-client` Zod schemas and the `google-photos.ts`/`cloudinary.ts` service
  > logic. Playwright stays scoped to web E2E and Detox to native E2E — Playwright isn't
  > a good fit for fast, isolated unit tests since every test needs a real browser or
  > server running.
- No CI pipeline (lint/typecheck/test-on-PR) is mentioned before EAS/Vercel deployment.
- No error monitoring/logging tool (e.g. Sentry) for production.
- NFR-4.1 covers touch targets and reflow but not a keyboard alternative for the collage drag-and-drop — WCAG 2.1 (2.1.1) expects a non-drag way to reposition/scale/rotate items for keyboard-only users on web.
- Phase 8 says "EAS Build submission" but doesn't scope store-listing requirements that verification/submission actually needs: a hosted privacy policy, app icons/splash assets, screenshots, and Google Play's Data Safety form (relevant here since the app touches Google Photos, Cloudinary, and Clerk-held data).
- Env var list is missing a base API URL variable (e.g. `EXPO_PUBLIC_API_BASE_URL`) that native builds would need to reach the deployed web API routes, since Prisma/server logic only runs in the web-hosted `api/` routes.
  > **Resolved:** `EXPO_PUBLIC_API_BASE_URL` (and `EXPO_PUBLIC_APP_SCHEME` for the deep-link
  > handoff) are now in `PROJECT_PLAN.md`'s env var list under "Cross-app wiring" — a
  > natural consequence of `apps/mobile` being a pure API client of the deployed web app.

---

## 4. What's solid (no changes needed)

- The Clerk-vs-Google-OAuth separation and its rationale (incremental authorization, no long-lived Google tokens) is sound and clearly justified.
- The Prisma schema is internally consistent — cascades and indexes are applied uniformly across `ClothingItem`, `Outfit`, `OutfitItem`, and `WearLog`.
- FRS §10 traceability table cleanly maps every FR/NFR to a phase, so there's no orphaned requirement.
- §8 Out of Scope is specific enough to prevent scope creep (multi-user, social, ML, offline, push are all explicitly excluded with reasons).
- The DRAFT→ACTIVE draft-then-fill pattern is consistently threaded through FRS, schema, and design system (dashed-gold DRAFT treatment).

---

## Suggested next step

With the architecture decided, what's left open (not resolved by the rewrite) is mostly
§2/§3 detail rather than structural risk: whether to pursue Google OAuth verification or
stay in test-user mode for the portfolio demo, HEIC/file-size/dimension limits, behaviour
above the ~30-photo import batch assumption, rate limiting, the Prisma/Node-runtime note,
CI, error monitoring, the collage keyboard-alternative (WCAG), and store-submission
assets. None of these block starting Phase 1 — they're worth picking up as each phase
gets built, rather than resolving all upfront.

Sources:
- [Authorization scopes — Google Photos APIs](https://developers.google.com/photos/overview/authorization)
- [Sensitive scope verification — Google for Developers](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Cloudinary Pricing](https://cloudinary.com/pricing)
- [gluestack-ui releases](https://github.com/gluestack/gluestack-ui/releases)
