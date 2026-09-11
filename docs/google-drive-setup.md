# Google Drive setup

Wardrobe Whimsy stores clothing photos in **the user's own Google Drive**, using per-user
OAuth. The app creates a folder called `Wardrobe Whimsy — <wardrobe name>` in their Drive
and only ever touches files it created there.

## Why not a service account

A service account was tried first and cannot work for this design. Service accounts have no
Drive storage quota of their own, so any file they create is owned by an account with 0 bytes
available and the upload fails:

```
403 storageQuotaExceeded
Service Accounts do not have storage quota. Leverage shared drives, or use OAuth delegation.
```

Reads and folder listings succeed, which makes the problem easy to miss until the first
upload. The documented escapes — a Shared Drive, or domain-wide delegation — both require
Google Workspace, so neither is available on a personal Gmail account.

With user OAuth the uploaded file is owned by the user and counts against their own 15 GB.

## Scope

The only scope requested is:

```
https://www.googleapis.com/auth/drive.file
```

`drive.file` grants access **only to files and folders the app itself created**. It is a
non-sensitive scope, so it needs no Google verification and no CASA security assessment.

This is also why the app creates the folder rather than accepting a pasted folder link — under
`drive.file` the app cannot touch a pre-existing folder it did not create.

## Google Cloud Console steps

The console renamed "APIs & Services → OAuth consent screen" to **Google Auth Platform**. Both
names are given below; the direct links work either way. Sign in as the Google account that owns
the Drive folder (`plaaschick@gmail.com`).

### Step 0 — Select the right project

Open <https://console.cloud.google.com/>. In the blue bar at the top, click the **project picker**
(the dropdown left of the search box) and choose **wardrobe-whimsy-personal**.

Every link below is project-scoped, so if the picker shows the wrong project nothing else will
line up.

### Step 1 — Enable the Drive API

Go to <https://console.cloud.google.com/apis/library/drive.googleapis.com>

Click **Enable**. If it already says "API Enabled", move on.

*(Menu path: **APIs & Services → Library**, search "Google Drive API".)*

### Step 2 — Configure the consent screen, then add yourself as a test user

Go to <https://console.cloud.google.com/auth/audience>

**If the page says "Google Auth Platform not configured yet"**, there is no consent screen in this
project and no Test users field exists yet. Click **Get started** and complete the wizard:

| Screen | What to enter |
| --- | --- |
| App Information | App name `Wardrobe Whimsy`; User support email — your account |
| Audience | **External** |
| Contact Information | Your email address |
| Finish | Tick *"I agree to the Google API Services: User Data Policy"* → **Create** |

Then return to **Audience** in the left nav. The page now shows **Publishing status**, **User
type** and **Test users**.

- Under **Test users** click **+ Add users** → enter `plaaschick@gmail.com` and any other account
  that will sign in. **Any account not listed here gets `access_denied`** at the consent screen.

*(Menu path: **Google Auth Platform → Audience**. Older console: **OAuth consent screen → Test users**.)*

### Step 3 — Publish the app (defer this until you deploy)

On the same **Audience** page, find **Publishing status**.

While status is **Testing**, Google expires every refresh token after **7 days**, so the Drive
connection drops roughly weekly and has to be redone. Publishing removes that expiry, and because
`drive.file` is non-sensitive it needs **no verification and no security review**.

**But you probably cannot publish yet.** Publishing an External app requires an application home
page, privacy policy URL, terms of service URL, and an authorized domain on the
[Branding page](https://console.cloud.google.com/auth/branding) — none of which exist while the
app only runs on `localhost`. If **Publish app** is greyed out, that is why.

That is fine for development. Leave it in Testing, accept reconnecting about once a week, and
publish once the app is deployed on a real domain.

The code handles this gracefully: an expired refresh token is detected via `isInvalidGrantError`
in `lib/google-oauth.ts` and mapped to `GOOGLE_NOT_CONNECTED`, so the UI shows the reconnect flow
instead of a 500.

### Step 4 — Add the scopes

Go to <https://console.cloud.google.com/auth/scopes>

Click **Add or remove scopes**, paste **both** of these into the *manually add scopes* box, click
**Add to table**, then **Update** and **Save**:

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/photospicker.mediaitems.readonly
```

The second scope is for the Phase 3 Google Photos import. `components/wardrobe/google-photos-picker.tsx`
requests it in the browser using the same `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, so it has to be declared
on the same consent screen.

Also enable the Photos Picker API:
<https://console.cloud.google.com/apis/library/photospicker.googleapis.com> → **Enable**.

*(Menu path: **Google Auth Platform → Data access**. Older console: **OAuth consent screen → Scopes**.)*

### Step 5 — Create the OAuth client

Go to <https://console.cloud.google.com/auth/clients>

The Clients list in `wardrobe-whimsy-personal` is empty. The client ID currently in `.env.local`
(`742108974869-…`) belongs to project **742108974869** — the numeric prefix of a client ID is
always the project number that owns it — so it was created in a different project, the one
originally set up for the Google Photos picker.

Rather than splitting configuration across two projects, create a new client here. The consent
screen, test user and scopes are already configured in this project, so this consolidates
everything into one place. The old client can be left alone.

Click **+ Create client** and fill in:

| Field | Value |
| --- | --- |
| Application type | **Web application** |
| Name | `Wardrobe Whimsy Web` |
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/google/callback` |

Click **Create**.

> **Both** fields matter, for different flows. The redirect URI is for the server-side Drive OAuth
> in `/api/auth/google/callback`. The JavaScript origin is for the Google Photos picker, which
> requests its token in the browser via Google Identity Services and is rejected without a
> matching origin.
>
> Values must match **character for character** — `http` not `https` on localhost, no trailing
> slash, port `3000`. A mismatch gives `Error 400: redirect_uri_mismatch`.

When you deploy, add the production equivalents to the same client:

```
https://<your-deployed-domain>
https://<your-deployed-domain>/api/auth/google/callback
```

### Step 6 — Copy the client ID and secret

The **Client ID** and **Client secret** are shown as soon as the client is created — copy both now.
If you navigate away, reopen the client from the Clients list; if the secret cannot be revealed
again, click **Add secret** to generate a new one (the old one keeps working until you delete it).

Because this is a **new** client, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local` must be replaced
with the new ID — the old `742108974869-…` value will no longer be valid for this project's
consent screen.

## Environment variables

Open `apps/web/.env.local`. **Replace** the existing `NEXT_PUBLIC_GOOGLE_CLIENT_ID` value with the
new client ID from step 6, and add the two new lines:

```dotenv
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<the NEW client id from step 6>
GOOGLE_CLIENT_SECRET=<the client secret from step 6>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

While you are in the file, delete `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`. The service account was
removed in this refactor, and the value is a live private key — also revoke it under
**IAM & Admin → Service Accounts** in the Cloud Console.

`NEXT_PUBLIC_APP_URL` is what builds the redirect URI, so it must match step 5 exactly. On
deploy, set it to the deployed origin with no trailing slash.

Restart the dev server afterwards — Next.js reads `.env.local` only at startup.

## Verify it works

```bash
pnpm --filter ./apps/web dev
```

1. Open <http://localhost:3000/wardrobe>.
2. You should see **Connect Google Drive**. Click it.
3. Google shows a consent screen asking to "see, edit, create and delete only the specific Google
   Drive files you use with this app". Click **Continue**.
4. You land back on `/wardrobe`, the folder is created automatically, and the wardrobe grid loads.
5. Check <https://drive.google.com/> — a folder named **Wardrobe Whimsy — My Wardrobe** should
   now exist, owned by you.
6. Add an item with a photo and confirm the file appears inside that folder.

### If something goes wrong

| What you see | Cause | Fix |
| --- | --- | --- |
| `Error 400: redirect_uri_mismatch` | URI in step 5 differs from `NEXT_PUBLIC_APP_URL` | Make them identical, character for character |
| `access_denied` on the consent screen | Account is not a test user, and the app is still in Testing | Step 2, or publish in step 3 |
| `GOOGLE_CLIENT_SECRET is not set` | Secret missing, or dev server not restarted | Add it, then restart |
| Reconnect prompt roughly weekly | Publishing status is still Testing — expected in dev | Publish once deployed (step 3) |
| "That sign-in link expired" | State cookie older than 10 minutes | Just click Connect again |

Optional overrides:

- `GOOGLE_CLIENT_ID` — set if the server should use a different client from the browser one.
- `GOOGLE_OAUTH_REDIRECT_URI` — set the full callback URL directly instead of deriving it
  from `NEXT_PUBLIC_APP_URL`.

`GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` is no longer read by anything and can be deleted.

## Connect flow

1. User lands on `/wardrobe` with no folder connected → sees **Connect Google Drive**.
2. Button hits `/api/auth/google/start`, which sets a signed state cookie and redirects to
   Google's consent screen.
3. Google redirects to `/api/auth/google/callback`, which verifies the state, exchanges the
   code, and stores the **refresh token** on the `users` row.
4. The page reloads and automatically calls `/api/wardrobes/<id>/connect`, which creates the
   Drive folder and saves its id on the wardrobe.

`access_type=offline` and `prompt=consent` are both set deliberately: Google only returns a
refresh token on first consent, so without forcing the prompt a reconnect yields an access
token that silently expires after an hour.
