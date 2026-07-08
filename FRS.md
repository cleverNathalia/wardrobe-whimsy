# Functional Requirements Specification — Wardrobe Whimsy

| | |
|---|---|
| **Document** | Functional Requirements Specification (FRS) |
| **Product** | Wardrobe Whimsy |
| **Author** | Danielle Groenewald |
| **Status** | Draft v1.1 |
| **Date** | 2026-07-02 |
| **Related document** | `PROJECT_PLAN.md` (technical design & phased build plan) |

---

## 1. Purpose

This document specifies **what** Wardrobe Whimsy must do, from the perspective of the people using it. It defines required behavior, inputs, outputs, and acceptance criteria for every feature, independent of implementation detail.

It does not specify **how** the system is built — technology choices, database schema, folder structure, and infrastructure decisions are covered in `PROJECT_PLAN.md`. Where a requirement below depends on a technical constraint (e.g. a token expiring after 60 minutes), that constraint is stated because it shapes user-visible behavior, not as a design decision in its own right.

**Intended audience:** engineers building or reviewing the system, and anyone assessing this project as a portfolio piece who wants to understand the product's scope without reading code.

---

## 2. Scope

Wardrobe Whimsy is a web application that lets an authenticated user catalogue clothing items, organize them into outfits, arrange outfits visually as drag-and-drop collages, log when outfits are worn, and (in a later phase) receive outfit suggestions generated from their own wardrobe.

This FRS covers the full product vision, corresponding to Phases 1–8 of the project plan:

1. Authentication & session management
2. Wardrobe management (manual image upload)
3. Google Photos import (an alternate image source for wardrobe items)
4. Outfit management
5. Collage builder
6. Dashboard & wear logging
7. AI outfit suggestions (interface/placeholder only — see §6.7 and §8)
8. Cross-cutting quality requirements (testing, documentation) — see §7 and §9

Requirements are organized by **feature area**, not by build phase. §10 maps each requirement back to its originating phase for traceability against the project plan.

---

## 3. Definitions & Glossary

| Term | Meaning |
|---|---|
| **User** | A person who has signed in via Clerk. The only actor in this system (see §4). |
| **Clothing Item** | A single wardrobe entry: one garment/accessory, one image, a set of descriptive attributes. |
| **DRAFT status** | A Clothing Item that has an image but incomplete/unconfirmed metadata. Not yet usable in outfits. |
| **ACTIVE status** | A Clothing Item whose metadata has been confirmed by the user. Fully usable. |
| **Image source** | How a Clothing Item's photo entered the system: `manual` (device upload) or `google_photos` (Picker import). |
| **Web app** | The primary product: a responsive web app (Next.js), distributed via a web URL, with full feature coverage. |
| **Mobile app** | A companion native app (Expo/React Native) for iOS and Android, sharing the same backend and user accounts as the web app, covering core flows (see NFR-4.4 for scope). |
| **Picker session** | A short-lived Google Photos Picker API session representing one import attempt. |
| **Outfit** | A named collection of Clothing Items, optionally arranged as a visual collage. |
| **Collage** | The visual, drag-and-drop arrangement of an Outfit's items (position, scale, rotation, layering). |
| **Wear Log** | A record that an Outfit was worn on a specific date. |
| **Draft-then-fill flow** | The pattern where an image is imported first (as a DRAFT item), then metadata is filled in afterward, rather than requiring all fields up front. |

---

## 4. Actors

Wardrobe Whimsy has a single actor:

- **Authenticated User** — a person signed in via Clerk. Every Clothing Item, Outfit, and Wear Log belongs to exactly one User. A User can only ever see and act on their own data (see NFR-1.2).

There is no admin role, no guest/viewer role, and no shared or team wardrobe concept in this version. The public marketing page (`/`) is viewable without authentication but has no functional requirements beyond static content and a call-to-action to sign in.

---

## 5. Requirement Notation

Each functional requirement has a unique ID (`FR-<area>.<number>`), a "shall" statement describing required behavior, and acceptance criteria that define when the requirement is satisfied. Non-functional requirements follow the same pattern under `NFR-<area>.<number>`.

---

## 6. Functional Requirements

### 6.1 Authentication & Session Management

**FR-1.1** — The system shall require a User to authenticate via Clerk before accessing any route under the authenticated app area.
*Acceptance criteria:* An unauthenticated request to any protected route is redirected to the Clerk sign-in page; upon successful sign-in the user is returned to their originally requested route.

**FR-1.2** — The system shall establish a session for the User upon successful Clerk sign-in and persist a corresponding User record on first sign-in.
*Acceptance criteria:* First-time sign-in creates exactly one User record keyed to the Clerk user ID; subsequent sign-ins reuse the same record without duplication.

**FR-1.3** — The system shall allow a signed-in User to sign out, terminating their session.
*Acceptance criteria:* After sign-out, previously accessible protected routes redirect to sign-in again.

**FR-1.4** — The system shall keep Google Photos authorization entirely separate from app sign-in. Signing in with Clerk shall never itself request Google Photos permissions.
*Acceptance criteria:* Completing Clerk sign-in grants no Google scopes; the Google consent screen only appears when the User explicitly starts an import (§6.3).

### 6.2 Wardrobe Management (Manual Upload & Item CRUD)

**FR-2.1** — The system shall allow a User to add a new Clothing Item by uploading an image from their device, and on mobile, by capturing a photo directly via the device camera.
*Acceptance criteria:* Selecting a valid image file (common formats: JPG, PNG, WEBP, HEIC) results in a new Clothing Item with `imageSource = manual` and `status = DRAFT`, owned by the User. On a mobile browser (Android Chrome, iOS Safari), the same control also offers a "Take Photo" option that opens the device camera. On the native mobile app, the same control offers both "Choose from library" and "Take Photo", backed by the device's native camera/photo-library permission prompts.

**FR-2.2** — The system shall allow a User to complete or edit a Clothing Item's metadata (name, category, subcategory, colour, season, occasion, brand, size, notes, favourite flag).
*Acceptance criteria:* Only `name` and `category` are required to promote an item; all other fields are optional. Invalid input (e.g. empty required field) is rejected with a clear validation message before submission succeeds.

**FR-2.3** — The system shall promote a Clothing Item from DRAFT to ACTIVE when the User saves valid required metadata.
*Acceptance criteria:* Saving with `name` and `category` present sets `status = ACTIVE`; the item then appears in the main wardrobe grid and becomes eligible for use in Outfits (FR-4.2).

**FR-2.4** — The system shall display a User's ACTIVE Clothing Items in a browsable wardrobe grid, and their DRAFT items in a distinct pending/incomplete state.
*Acceptance criteria:* DRAFT items are visually distinguishable and prompt the user to finish metadata; they are excluded from outfit-building item pickers.

**FR-2.5** — The system shall allow a User to edit or delete any Clothing Item they own, in either status.
*Acceptance criteria:* Deleting an item removes it from the wardrobe grid and from any Outfit it belonged to (see FR-4.5); a confirmation step is required before deletion.

**FR-2.6** — The system shall show a distinct empty state when a User has no Clothing Items, with a clear call-to-action to add their first item.
*Acceptance criteria:* A new User's first visit to the wardrobe page shows the empty state, not an empty grid.

### 6.3 Google Photos Import

**FR-3.1** — The system shall offer "Import from Google Photos" as an alternative to manual upload when adding a Clothing Item.
*Acceptance criteria:* The add-item source selection screen presents both options with equal visual weight.

**FR-3.2** — The system shall request Google authorization scoped to `photospicker.mediaitems.readonly` only, and only at the moment a User initiates an import.
*Acceptance criteria:* No Google OAuth prompt occurs anywhere else in the app; the consent screen (on first import, or when a prior grant has expired) requests no scope beyond the picker scope.

**FR-3.3** — The system shall open Google's official Picker UI for the User to select one or more photos from their Google Photos library.
*Acceptance criteria:* The picker opens in a new browser tab/window (never an iframe, per Google policy); the User can select multiple photos in one session.

**FR-3.4** — The system shall detect when the User has finished selecting photos in the Picker and retrieve the selected media items automatically, without requiring the User to manually confirm completion in the app.
*Acceptance criteria:* The app polls session status at the interval Google's API specifies and proceeds automatically once selection is complete; the User sees a loading/progress state while this happens.

**FR-3.5** — The system shall copy every selected photo's bytes into permanent storage before the Google-provided image link expires.
*Acceptance criteria:* All selected photos are successfully retrieved and stored within Google's ~60-minute link validity window; if any single photo fails to transfer, that failure is isolated (see FR-3.7) and does not block the others.

**FR-3.6** — The system shall create one DRAFT Clothing Item per successfully imported photo, tagged with `imageSource = google_photos`, and present them to the User for metadata entry (draft-then-fill flow, same as FR-2.2–2.3).
*Acceptance criteria:* After import completes, the User sees one draft card per successfully imported photo, each ready to be completed and promoted to ACTIVE.

**FR-3.7** — The system shall show a clear, specific error state if an import fails (partially or fully), distinguishing between: the User cancelling the picker, an individual photo failing to transfer, and the picker session/token expiring.
*Acceptance criteria:* Each failure mode has distinct, human-readable messaging; a fully failed import leaves no orphaned DRAFT items.

**FR-3.8** — The system shall not retain the Google access token or Picker session beyond the completion of a single import.
*Acceptance criteria:* The picker session is explicitly closed after use; no Google Photos token is present in persistent storage (database) at any point — see NFR-1.3.

### 6.4 Outfit Management

**FR-4.1** — The system shall allow a User to create an Outfit with a name and optional occasion, season, notes, and tags.
*Acceptance criteria:* A new Outfit requires only a name; it can be created with zero items initially.

**FR-4.2** — The system shall allow a User to add or remove ACTIVE Clothing Items (that they own) from an Outfit.
*Acceptance criteria:* Only ACTIVE items owned by the current User are selectable; removing an item from an Outfit does not delete the underlying Clothing Item.

**FR-4.3** — The system shall allow a User to browse a gallery of their Outfits.
*Acceptance criteria:* Each Outfit in the gallery shows its name and a representative cover image (if set) or a fallback placeholder.

**FR-4.4** — The system shall allow a User to edit or delete an Outfit they own.
*Acceptance criteria:* Deleting an Outfit removes its item associations and its Wear Log history; it does not delete the Clothing Items themselves.

**FR-4.5** — The system shall automatically remove a Clothing Item from any Outfit it belongs to when that item is deleted (FR-2.5).
*Acceptance criteria:* No Outfit ever references a deleted Clothing Item; the Outfit remains intact with the remaining items.

### 6.5 Collage Builder

**FR-5.1** — The system shall allow a User to arrange an Outfit's items visually on a canvas via drag-and-drop.
*Acceptance criteria:* Each item can be repositioned by dragging; position updates are reflected immediately in the UI.

**FR-5.2** — The system shall allow a User to scale, rotate, and reorder (layer/z-index) individual items within a collage.
*Acceptance criteria:* Each item's scale, rotation, and stacking order can be adjusted independently of the others.

**FR-5.3** — The system shall persist a collage's layout (position, scale, rotation, layer order) per item, per Outfit, so it is unchanged when the User returns.
*Acceptance criteria:* Reloading the collage page for an Outfit reproduces the exact same arrangement last saved.

**FR-5.4** — The system shall allow a User to designate a collage snapshot (or the arrangement itself) as the Outfit's cover image.
*Acceptance criteria:* The designated cover image is what appears in the Outfit gallery (FR-4.3).

**FR-5.5** — The system shall support the same collage interactions (drag to reposition, scale, rotate, reorder) via touch on mobile/tablet screens as via mouse on desktop, with no functionality lost on a touch-only device.
*Acceptance criteria:* On a touchscreen device, a User can complete every action in FR-5.1–5.3 using touch gestures or on-screen controls, without needing a mouse; touch targets for handles/controls are large enough to use reliably on a phone-sized screen (minimum ~44×44px).

### 6.6 Dashboard & Wear Logging

**FR-6.1** — The system shall allow a User to log that an Outfit was worn on a given date, with optional notes.
*Acceptance criteria:* A Wear Log entry is created with a date (defaulting to today) and is associated with exactly one Outfit and one User.

**FR-6.2** — The system shall present a dashboard summarizing the User's wardrobe activity, including at minimum: total items, total outfits, and recent/frequency of wear.
*Acceptance criteria:* Dashboard figures match the underlying data at time of viewing (no stale cached counts beyond a reasonable refresh point).

**FR-6.3** — The system shall allow a User to view Wear Log history for a given Outfit.
*Acceptance criteria:* All Wear Log entries for an Outfit are listed in reverse-chronological order by default.

### 6.7 AI Outfit Suggestions (Interface/Placeholder)

**FR-7.1** — The system shall expose a defined interface/contract for an outfit-suggestion service (e.g. "given a User's ACTIVE items, return a ranked list of suggested Outfits or item combinations"), without requiring a real suggestion algorithm to be implemented in this version.
*Acceptance criteria:* The interface is documented and callable; a stub/placeholder implementation returns a well-formed (if non-intelligent) response, so the surrounding UI can be built and tested against it.

**FR-7.2** — The system shall present a UI entry point for outfit suggestions (e.g. a "Suggest an outfit" action) that calls the interface from FR-7.1 and displays its result.
*Acceptance criteria:* The entry point is visible and functional against the placeholder implementation; swapping in a real algorithm later requires no UI changes.

> **Note:** No machine learning model, training pipeline, or third-party AI API integration is in scope for this version. See §8 (Out of Scope).

---

## 7. Non-Functional Requirements

### 7.1 Security

**NFR-1.1** — The system shall never expose Cloudinary or Google OAuth client secrets to the browser; all calls requiring secrets shall be server-side only.

**NFR-1.2** — The system shall scope every data read/write to the currently authenticated User; a User shall never be able to view, modify, or delete another User's Clothing Items, Outfits, or Wear Logs, regardless of guessed or manipulated IDs.

**NFR-1.3** — The system shall not persist Google Photos OAuth tokens in the database or any long-term store. Tokens exist only for the duration of a single import (see FR-3.8).

**NFR-1.4** — The system shall validate all user-supplied input server-side (not relying on client-side validation alone) before it reaches the database.

### 7.2 Performance

**NFR-2.1** — The system shall complete the full Google Photos import pipeline (session creation → picker selection → media retrieval → Cloudinary upload → DRAFT item creation) within Google's ~60-minute media link validity window for any reasonable batch of selected photos (assume up to 30 photos in a single import).

**NFR-2.2** — The system shall poll Google Picker session status at the interval Google's API specifies for that session (`pollingConfig.pollInterval`), rather than a fixed hard-coded interval, to avoid unnecessary API load.

**NFR-2.3** — The wardrobe grid and outfit gallery shall remain responsive (perceived load under ~2 seconds on a typical broadband connection) for a User with up to several hundred items.

### 7.3 Reliability

**NFR-3.1** — A partial failure during Google Photos import (e.g. one of several photos fails to transfer) shall not roll back or corrupt the successfully imported items.

**NFR-3.2** — If a Google Picker session or token expires mid-import, the system shall fail gracefully with a message that lets the User retry, rather than leaving orphaned sessions or partial DRAFT items with broken image references.

**NFR-3.3** — Deleting a Clothing Item, Outfit, or User shall cascade correctly to dependent records (Outfit-item links, Wear Logs) with no orphaned rows left behind.

### 7.4 Usability

**NFR-4.1** — The application shall be usable on both desktop and mobile-width viewports (minimum ~360px wide) for all core flows (add item, build outfit, view dashboard, collage builder), with no horizontal scrolling and touch targets sized appropriately for finger input (minimum ~44×44px). On web, the layout shall reflow fluidly as the viewport is resized — not only at fixed breakpoints — so the app remains usable at any intermediate width.

**NFR-4.2** — Every asynchronous action with a perceptible delay (import, upload, save) shall show a loading state; every failure shall show an explanatory error state rather than a silent failure.

**NFR-4.3** — The draft-then-fill flow (FR-2.2/2.3, FR-3.6) shall never block a User from returning later to finish incomplete DRAFT items — drafts persist indefinitely until completed or deleted.

**NFR-4.4** — The application shall be distributable as a responsive web app (full feature set) and as a companion native app on iOS (App Store) and Android (Google Play) via Expo, sharing one backend and user base. The mobile app is not required to reach full feature parity with web at every phase (see `PROJECT_PLAN.md` for which features are web-first), but core flows (sign-in, wardrobe management, manual and Google Photos import, viewing outfits) shall work natively on both platforms.
*Acceptance criteria:* The web app builds and deploys with no layout regressions; an Expo production build (`eas build`) succeeds for iOS and Android and covers the core flows listed above.

**NFR-4.5** — The native iOS and Android builds shall use platform-native navigation and gestures (back swipe, tab bar, etc.) appropriate to each platform, so the app feels native rather than a wrapped website.

---

## 8. Out of Scope

The following are explicitly **not** part of this version of Wardrobe Whimsy:

- **Offline data functionality.** The app requires a network connection to load wardrobe data, save changes, and import photos. The native shell (Expo) handles offline gracefully (no crash), but no data is available without a connection and no sync queue is maintained.
- **Multi-user/team/shared wardrobes.** Every Clothing Item, Outfit, and Wear Log belongs to exactly one User.
- **Social features** — following other users, publicly sharing outfits, or any public-facing profile beyond the static marketing landing page.
- **Machine learning or third-party AI API integration.** Phase 7 defines a placeholder interface only; no real suggestion algorithm is implemented in this version.
- **Push notifications.** The app does not send any alerts or reminders in this version.

---

## 9. Future Considerations

The following are out of scope now but are plausible candidates for a future version:

- Real AI-powered outfit suggestions, replacing the Phase 7 placeholder with a model or third-party API call.
- Push notifications (e.g. "you haven't logged a wear in two weeks").
- Shared wardrobes or outfit inspiration from other users.
- Barcode/tag scanning to identify garments.
- Outfit scheduling — plan what to wear on a specific future date.

---

## 10. Requirements Traceability

| Requirement | Phase |
|---|---|
| FR-1.1 – FR-1.4 | Phase 1 |
| FR-2.1 – FR-2.6 | Phase 2 |
| FR-3.1 – FR-3.8 | Phase 3 |
| FR-4.1 – FR-4.5 | Phase 4 |
| FR-5.1 – FR-5.5 | Phase 5 |
| FR-6.1 – FR-6.3 | Phase 6 |
| FR-7.1 – FR-7.2 | Phase 7 |
| NFR-1.1 – NFR-1.4 | Cross-cutting (enforced from Phase 2 onward) |
| NFR-2.1 – NFR-2.3 | Cross-cutting |
| NFR-3.1 – NFR-3.3 | Cross-cutting |
| NFR-4.1 – NFR-4.5 | Phase 1 (shell/navigation), Phase 8 (audit/polish) |