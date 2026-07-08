# Wardrobe Whimsy — Design System Reference

A living style guide for **Wardrobe Whimsy**, a wardrobe-management and outfit-collage web app. A user catalogues clothing items, organises them into outfits, arranges those outfits as drag-and-drop visual collages, and logs when they were worn.

Built on **shadcn/ui conventions + Tailwind-style CSS variables + lucide-react icons**. Aesthetic: **"editorial closet"** — the calm, spacious bones of a modern SaaS product (Linear/Notion) wrapped in the warmth of a fashion editorial. Soft rounded cards with a gentle polaroid lift; warm neutrals instead of cold grays. Sunlight through a closet window, not a tech dashboard.

> **Source:** authored from a greenfield, spec-only brief (`FRS.md`, `PROJECT_PLAN.md`, design brief). No implementation, logo, or font files were supplied — see notes at the end.

---

## 1. Content fundamentals

- **Voice:** warm, personal, unfussy. Talks to the user as **"you"** — **"your closet" / "your wardrobe"**, never "the account" or "the user".
- **Tone:** calm and reassuring, especially around unfinished work — the draft-then-fill flow is framed as helpful, not nagging ("Finish the details", "Awaiting details").
- **Casing:** **sentence case** everywhere — headings, buttons, labels ("Add item", "Suggest outfit", "Your wardrobe"). Uppercase only for tiny eyebrow/caption labels and the DRAFT / ACTIVE status words (tracked +0.06em).
- **Spelling:** **British English** — "favourite", "colour", "organise".
- **Buttons are verbs:** "Add item", "Save to closet", "Save collage", "Set as cover".
- **Empty & error states are kind:** a clear next step; import errors explain what happened and offer a retry, never a silent failure.
- **Numbers are concrete, not decorative:** "128 pieces catalogued", "Worn 12 times", "+6 this week".
- **Emoji:** none. Warmth comes from the serif, palette, and copy.
- **Domain vocabulary:** *item / clothing item, outfit, collage, wear log, draft, closet, favourite, cover image*.

---

## 2. Colour tokens

Colours are stored as **raw HSL channels** so they compose with alpha: `hsl(var(--primary) / 0.12)`. shadcn variable naming.

### Light mode

| Token | HSL | Hex | Use |
|---|---|---|---|
| `--background` | `30 33% 97%` | `#FAF6F0` | page background, warm ivory |
| `--foreground` | `20 14% 16%` | `#2B2521` | body text, charcoal ink |
| `--card` | `0 0% 100%` | `#FFFFFF` | cards on ivory |
| `--primary` | `15 55% 45%` | `#C1653A` | primary buttons, active nav, key CTAs (terracotta/rust) |
| `--primary-foreground` | `30 40% 98%` | `#FDF9F5` | text on primary |
| `--secondary` | `350 40% 88%` | `#F1D7DA` | secondary buttons, soft highlights (dusty rose) |
| `--secondary-foreground` | `350 30% 25%` | `#4A2A2E` | text on secondary |
| `--accent` | `82 20% 42%` | `#6F7A4C` | tags, categories, success/active (sage/olive) |
| `--accent-foreground` | `30 40% 98%` | `#FDF9F5` | text on accent |
| `--muted` | `30 20% 92%` | `#EDE6DC` | subtle backgrounds, dividers |
| `--muted-foreground` | `25 10% 45%` | `#7A716A` | secondary text, placeholders |
| `--border` / `--input` | `30 15% 88%` | `#E4DCD1` | card borders, dividers, field borders |
| `--ring` | `15 55% 45%` | `#C1653A` | focus ring (= primary) |
| `--destructive` | `5 65% 50%` | `#D1493A` | delete actions, errors |
| `--destructive-foreground` | `30 40% 98%` | `#FDF9F5` | text on destructive |
| `--success` | `82 20% 42%` | `#6F7A4C` | confirmations (= sage) |
| `--gold` | `40 70% 55%` | `#E0A93F` | favourite flag, highlights |

Chart seeds: `--chart-1` terracotta, `--chart-2` sage, `--chart-3` gold, `--chart-4` rose, `--chart-5` clay.

### Dark mode (`.dark` scope) — lamp-lit closet, never cold slate

| Token | HSL | Hex |
|---|---|---|
| `--background` | `24 12% 9%` | `#1B1714` |
| `--foreground` | `30 20% 92%` | `#EDE6DC` |
| `--card` | `24 11% 13%` | `#26211D` |
| `--primary` | `15 62% 57%` | `#D27A50` (glowing terracotta) |
| `--secondary` | `350 18% 30%` | `#5C4247` (muted rose) |
| `--accent` | `82 22% 56%` | `#96A16C` (lifted sage) |
| `--muted` | `24 9% 19%` | `#332E29` |
| `--muted-foreground` | `30 12% 66%` | `#ADA298` |
| `--border` / `--input` | `24 9% 23%` | `#3D362F` |
| `--destructive` | `5 62% 56%` | — |
| `--gold` | `40 75% 62%` | — |

**Accessibility:** `#FDF9F5` on `#C1653A` ≈ 4.6:1 (AA for UI text). Ink `#2B2521` on ivory `#FAF6F0` ≈ 13:1 (AAA). Keep sage/gold for fills or large text; pair with ink for small text.

---

## 3. Typography

Fonts (Google Fonts, chosen to match the brief — no files supplied):

| Token | Family | Role |
|---|---|---|
| `--font-serif` | **Newsreader** | display, H1, outfit names, dialog titles |
| `--font-sans` | **Figtree** (warm humanist sans) | all UI text |
| `--font-mono` | **IBM Plex Mono** | token values / code |

### Type scale

| Step | Family | Size | Line-height | Weight | Token |
|---|---|---|---|---|---|
| Display | serif | 56px / 3.5rem | 1.04 | 500 | `--text-display` |
| H1 | serif | 36px / 2.25rem | 1.15 | 500 | `--text-h1` |
| H2 | sans | 28px / 1.75rem | 1.22 | 600 | `--text-h2` |
| H3 | sans | 22px / 1.375rem | 1.30 | 600 | `--text-h3` |
| H4 | sans | 18px / 1.125rem | 1.40 | 600 | `--text-h4` |
| Body | sans | 16px / 1rem | 1.60 | 400 | `--text-body` |
| Small | sans | 14px / 0.875rem | 1.50 | 400 | `--text-small` |
| Caption | sans | 12px / 0.75rem | 1.35 | 500 | `--text-caption` |

Tracking: `--tracking-tight -0.02em`, `--tracking-caps 0.08em` (uppercase eyebrow labels). Serif for the romance, sans for the work.

---

## 4. Spacing, radius, elevation

**Spacing** (4/8px base): `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48 · `--space-16` 64. Minimum touch target `--touch-target: 44px`. Layout: `--container-max 1200px`, `--sidebar-width 248px`.

**Radius** (softer than default shadcn): `--radius-sm` 6px (chips) · `--radius-md` 10px (inputs, buttons) · `--radius-lg` 14px (cards) · `--radius-xl` 20px (modals) · `--radius-full` 9999px. `--radius` aliases `--radius-lg` for shadcn compat.

**Elevation** — soft, warm-tinted (`hsl(20 14% 16% / …)`, never pure black):

| Token | Use | Value |
|---|---|---|
| `--shadow-flat` | resting flat | `none` |
| `--shadow-card` | resting cards | `0 1px 2px /.04, 0 2px 8px /.05` |
| `--shadow-raised` | hover / emphasis | `0 2px 4px /.05, 0 6px 16px /.09` |
| `--shadow-floating` | modals, toasts | `0 4px 8px /.06, 0 16px 40px /.14` |
| `--shadow-ring` | focus | `0 0 0 3px hsl(var(--ring) / 0.35)` |

Dark mode deepens shadow alpha with pure black.

---

## 5. Motion & interaction

- **Transitions:** 120–180ms ease on hover/focus/press. No bounce, parallax, or decorative loops.
- **Hover:** buttons darken (`brightness(0.94)`); cards lift `translateY(-2px)` to the `raised` shadow; nav items get a warm muted fill; active nav gets a soft terracotta wash.
- **Press:** subtle scale-down (0.98) on buttons.
- **Focus:** always-visible 3px terracotta ring (`--shadow-ring`).
- **Transparency/blur:** used sparingly — sticky top bar and over-image chips use `hsl(… / 0.86)` + small `backdrop-filter: blur`. Dialog scrim = warm charcoal at 42% + a whisper of blur.

---

## 6. Iconography

- **Set:** **lucide** (`lucide-react`). Consistent **1.5–1.8px** stroke, rounded caps/joins.
- **Sizes:** 16px (dense/inline), 20px (buttons, nav, stat medallions), 24px (feature).
- **Colour:** follows context — terracotta for emphasis, ink for neutral, muted-foreground for quiet.
- **No emoji, no unicode glyphs as icons.** A few tiny inline SVGs are intrinsic component chrome only (favourite star, checkbox tick, collage handles).
- **No logo supplied:** render the brand as a Newsreader wordmark — terracotta "Wardrobe", ink "Whimsy" — with a "W" tile as a compact mark. Do not invent a logo.

---

## 7. Components

All are React, styled with the CSS variables, exported under `window.WardrobeWhimsyDesignSystem_*`. Props marked with a type union list the allowed values; `@default` noted where relevant.

### Button
The main clickable control — CTAs to inline links.
```jsx
<Button variant="primary" size="md" iconLeft={<Plus size={16} />}>Add item</Button>
```
- `variant`: `primary` (terracotta) | `secondary` (dusty rose) | `outline` | `ghost` | `destructive` | `link` — default `primary`
- `size`: `sm | md | lg` — default `md`
- `loading` (spinner + blocks), `disabled`, `iconLeft`, `iconRight`

### Badge
Compact status / category / metadata pill.
```jsx
<Badge variant="category">Knitwear</Badge>
<Badge variant="active">Active</Badge>
<Badge variant="draft">Draft</Badge>
<Badge variant="gold" iconLeft={<Star size={12} fill="currentColor" />}>Favourite</Badge>
```
- `variant`: `default | category | active | draft | primary | secondary | destructive | gold | solid`
- `size`: `sm | md`; `iconLeft`
- `active` & `draft` render uppercase; `draft` uses a dashed gold border

### Card
Base white surface — soft border, `--radius-lg`, warm polaroid shadow.
```jsx
<Card interactive selected>…</Card>
```
- `interactive` (hover-lift + pointer), `selected` (terracotta ring)
- `elevation`: `flat | card | raised | floating` — default `card`
- `padding` (px, default 20)

### Form fields — Input, Textarea, Select, Checkbox
All share `label` / `helper` / `error` and default/focus/error/disabled states. Focus draws a terracotta ring.
```jsx
<Input label="Item name" placeholder="Camel wool coat" iconLeft={<Search size={16}/>} />
<Input label="Name" error="Name is required" />
<Select label="Category" placeholder="Choose…" options={['Outerwear','Knitwear','Denim']} />
<Textarea label="Notes" rows={3} />
<Checkbox label="Mark as favourite" checked={fav} onChange={…} />
```
- **Input:** `label`, `helper`, `error` (string → invalid + aria-invalid), `iconLeft`
- **Select:** `options` accepts `string[]` or `{value,label}[]`, `placeholder`
- **Textarea:** `rows`, same label/helper/error
- **Checkbox:** `label`, `checked`, `error` (boolean)
- Wardrobe rule: only `name` + `category` are required to promote a DRAFT.

### Navigation — NavItem, Tabs
```jsx
<NavItem active icon={<Shirt size={18}/>} badge={128}>Wardrobe</NavItem>
<Tabs tabs={[{value:'all',label:'All',count:128},{value:'draft',label:'Drafts',count:4}]} defaultValue="all" />
```
- **NavItem:** `active` (soft terracotta wash + colored icon), `icon`, `badge` (count pill), `as` (default `a`); 44px tall touch target
- **Tabs:** `tabs` (`string[]` or `{value,label,count}[]`), controlled `value` or uncontrolled `defaultValue`, `onChange`; terracotta active underline

### Overlays — Dialog, DropdownMenu, Tooltip
```jsx
<Dialog open={open} onClose={close} title="Delete this item?"
  description="This removes it from your wardrobe and any outfits."
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="destructive">Delete</Button></>} />
<DropdownMenu items={[{label:'Edit', icon:<Pencil size={16}/>},{divider:true},{label:'Delete', danger:true}]} />
<Tooltip label="Mark as favourite"><Button variant="ghost">★</Button></Tooltip>
```
- **Dialog:** `open`, `onClose`, `title` (serif), `description`, `footer`, `width`, `inline` (position within parent instead of viewport); scrim = warm charcoal, not black
- **DropdownMenu:** `items` entries take `label`, `icon`, `shortcut`, `danger`, `onClick`, `divider`, `header`; `width`
- **Tooltip:** `label`, `side` (`top | bottom | left | right`) — dark warm bubble on hover/focus

### Feedback — Alert, Toast, Skeleton, Progress, EmptyState
```jsx
<Alert variant="success" title="Item saved" icon={<Check size={18}/>}>Camel wool coat is now active.</Alert>
<Toast variant="error" title="Import failed" icon={<AlertCircle size={18}/>}>The picker session expired.</Toast>
<Skeleton width={180} height={20} />  <Skeleton circle width={40} />
<Progress label="Importing photos" value={7} max={12} showValue tone="primary" />
<EmptyState icon={<Shirt size={28}/>} title="Your closet is empty"
  description="Add your first item to start building outfits."
  action={<Button iconLeft={<Plus size={16}/>}>Add item</Button>} />
```
- **Alert / Toast** `variant`: `success` (sage) | `error` (rust) | `info` (terracotta) | `warning` (gold); `title`, `icon`, `onClose`. Toast is the floating/elevated form with a colored status bar.
- **Skeleton:** `width`, `height`, `radius`, `circle` (shimmer placeholder)
- **Progress:** `value`, `max`, `label`, `showValue`, `tone` (`primary | accent | gold`)
- **EmptyState:** `icon`, `title` (serif), `description`, `action`

### Avatar
```jsx
<Avatar name="Danielle Groenewald" src={user.image} size={40} />   {/* falls back to "DG" on dusty rose */}
```
- `src`, `name` (initials fallback + alt), `size`

### Domain components
Wardrobe Whimsy-specific building blocks.
```jsx
<ClothingItemCard name="Camel wool coat" category="Outerwear" status="ACTIVE" favourite image={url} onToggleFavourite={…} />
<ClothingItemCard name="Draft item" status="DRAFT" />          {/* dashed gold border + "Finish details" */}
<OutfitCard name="Sunday brunch" tags={['Autumn','Casual']} itemCount={5} cover={url} />
<CollageChip image={url} label="Coat" layer={3} active rotation={-6} />
<StatCard icon={<Shirt size={20}/>} value={128} label="Items in closet" note="+6 this week" tone="primary" />
<WearLogEntry date="Sun 6 Jul" outfit="Sunday brunch" note="Coffee with Mara" cover={url} />
```
- **ClothingItemCard:** `name`, `category`, `image`, `status` (`ACTIVE | DRAFT`), `favourite`, `selected`, `onToggleFavourite`. **DRAFT vs ACTIVE is the key domain treatment** — DRAFT = dashed gold border + "Finish details" ribbon; ACTIVE = clean.
- **OutfitCard:** `name` (serif), `cover` (or soft fallback), `tags` (`string[]`), `itemCount`, `selected`
- **CollageChip:** `image`, `label`, `layer` (z-index badge, always visible), `active` (reveals drag/rotate/resize handles), `rotation`, `size`. Handles are **44×44px** touch targets.
- **StatCard:** `icon`, `value` (serif), `label`, `note`, `tone` (`primary | accent | gold | rose`)
- **WearLogEntry:** `date`, `outfit`, `note`, `cover` — compact list row

---

## 8. Responsiveness & accessibility

- Usable from **360px** mobile width up. Wardrobe grid uses `repeat(auto-fill, minmax(168px, 1fr))`; the clothing item card and nav reflow without horizontal scroll.
- All interactive elements meet **≥44×44px** touch targets (NavItem, collage handles, buttons at md/lg).
- Focus is always visible (terracotta ring). Inputs set `aria-invalid` on error. Dialog uses `role="dialog"` + `aria-modal`.

---

## 9. Repository layout

- `styles.css` — global entry point (link this one file); `@import`s only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`, `fonts.css`, `base.css`.
- `components/` — primitives grouped by concern (`buttons/ badges/ cards/ forms/ navigation/ overlays/ feedback/ data/ domain/`). Each has `<Name>.jsx`, `<Name>.d.ts`, a `*.prompt.md`, and a `*.card.html` specimen.
- `guidelines/` — foundation specimen cards.
- `ui_kits/wardrobe-app/` — interactive click-through recreation (dashboard, wardrobe grid, outfits, collage builder, wear log, add-item flow).
- `assets/placeholders/` — soft fabric-swatch tiles standing in for garment photos.

---

## 10. Notes & caveats

- **Fonts are substitutions.** The brief specified "a warm humanist sans" + "a serif display" but shipped no font files → Figtree, Newsreader, IBM Plex Mono chosen to match. Loaded via Google Fonts `@import` in `tokens/fonts.css`. Swap in brand fonts if available.
- **No logo supplied** → Newsreader wordmark (terracotta "Wardrobe" / ink "Whimsy"). Do not invent a mark.
- **Garment imagery** in the kit uses placeholder fabric swatches; production uses Cloudinary URLs.
