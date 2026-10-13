# SkillJacked

## Project Overview

SkillJacked extracts executable AI skills from YouTube videos. A user pastes a URL and gets up to 10 structured `.md` skill files usable in Claude Code, Cursor, or Windsurf. The companion product ContentJacked (planned) extracts viral content patterns from the same infrastructure.

---

## Monorepo Layout

```
packages/
  core/     — Extraction, transformation, and formatting pipeline (shared library)
  cli/      — npm CLI: `skilljacked` binary
  web/      — Next.js web app (auth, API, dashboard, billing)
skills/     — Extracted skill packs (content, not code)
specs/      — Product specs and planning docs
.claude/
  commands/ — Slash commands: /publish, /release
  skills/   — Skill: /teamcheck
```

Package manager: **pnpm** with workspaces (`pnpm-workspace.yaml`). All packages build to ESM. CI and Vercel use pnpm 10; the workspace file also carries pnpm 11+'s `allowBuilds` so a fresh `npm i -g pnpm` (latest) can install too — keep `onlyBuiltDependencies` and `allowBuilds` in sync.

---

## Core Pipeline (`packages/core`)

The extraction pipeline has three stages composed in sequence:

```
extract(url) → RawContent
  └─ segmentTranscript(RawContent) → SkillPlan
       └─ generateSkillsFromPlan(RawContent, SkillPlan) → StructuredSkill[]
            └─ format(skill, outputFormat) → FormattedOutput
```

### Source layout

```
core/src/
  extractor/
    index.ts          — Entry: extract(url, options) → RawContent
    youtube.ts        — Transcript acquisition; runs the 5-stage fallback chain
    fallbacks.ts      — Supadata API, yt-dlp, Whisper ASR, metadata-only fallbacks
    vtt-parser.ts     — Parse .vtt subtitle files
    types.ts          — RawContent, ExtractionOptions
  transformer/
    index.ts          — transform(rawContent) → StructuredSkill (single-skill path)
    segmenter.ts      — segmentTranscript() — LLM call that splits transcript into skill topics
    skill-generator.ts — generateSkillsFromPlan() — concurrent per-segment LLM calls
    frontmatter.ts    — sanitizeSkillName() / setFrontmatterName() / dedupeSkillNames() — keep `name:` equal to a unique folder
    frontmatter.test.ts — Unit tests for frontmatter.ts
    validators/skill-md.ts — validateSkillMarkdown() — check output has required sections
    write-skill-pack.ts — Write skills + INDEX.md to disk
    write-skill-pack.test.ts — Unit tests for INDEX.md segment → directory linking
    normalize-transcript.ts — Pre-process transcript text before sending to LLM
    prompts.ts        — SKILL_EXTRACTION_PROMPT (v1 single-skill prompt)
    runtime-prompts.ts — SEGMENTER_SYSTEM_PROMPT, SEGMENTER_REPAIR_SYSTEM_PROMPT (v2)
    types.ts          — StructuredSkill, SkillPlan, SkillSegment
  formatter/
    index.ts          — format(skill, format) → FormattedOutput
    claude-skill.ts   — Output as Claude SKILL.md
    cursor-rules.ts   — Output as .cursorrules
    windsurf-rules.ts — Output as .windsurfrules
    types.ts          — OutputFormat, FormattedOutput
  utils/
    errors.ts         — Error hierarchy
    retry.ts          — withRetry() — exponential backoff for LLM calls
    concurrency.ts    — createLimiter() — cap concurrent API calls
    dedup.ts          — dedupSegments() — remove overlapping segments
    url-parser.ts     — parseUrl() — extract YouTube video ID; returns a canonical watch URL (drops `si` tracking)
    url-parser.test.ts — Unit tests for parseUrl()
```

### Key types

```typescript
// What comes out of extraction
interface RawContent {
  title: string;
  transcript: string;
  duration: string;
  sourceUrl: string;
  platform: 'youtube';
  channel?: string;      // oEmbed author_name; shown under the video title on the web
  transcriptMethod?: 'captions' | 'supadata' | 'yt-dlp' | 'whisper' | 'metadata';
}

// One segment identified by the segmenter
interface SkillSegment {
  proposed_slug: string;
  proposed_name: string;
  priority: 1 | 2 | 3;
  // ...other metadata
}

// The segmenter's full plan
interface SkillPlan {
  video: { title: string; sourceUrl: string };
  segments: SkillSegment[];
}

// A generated skill (pre-formatting)
interface StructuredSkill {
  name: string;          // Generator-chosen slug; also the skill's output directory
  segmentSlug?: string;  // The segment's proposed_slug — how INDEX.md links a segment to its directory
  content: string;       // Raw markdown of the skill
  sourceTitle: string;
  sourceUrl: string;
  sourceChannel?: string;
  generatedAt: string;
}

// After format()
interface FormattedOutput {
  content: string;
  filename: string;
  format: OutputFormat;  // 'claude-skill' | 'cursor-rules' | 'windsurf-rules'
}
```

### Transcript acquisition

`extractYouTube()` walks a 5-stage fallback chain, taking the first stage that
returns at least `MIN_TRANSCRIPT_WORDS`. Video metadata (title) is fetched first
and a failure there aborts immediately with an `ExtractionError`.

| Stage | Method | `transcriptMethod` | Requires |
|-------|--------|--------------------|----------|
| 1 | YouTube caption tracks (manual + auto/ASR) via `youtube-caption-extractor` | `captions` | — |
| 2 | Supadata managed API (their own ASR for caption-less videos) | `supadata` | `SUPADATA_API_KEY` (skipped if unset) |
| 3 | `yt-dlp` subtitle download, parsed by `vtt-parser.ts` | `yt-dlp` | `yt-dlp` on PATH |
| 4 | Whisper transcription | `whisper` | `OPENAI_API_KEY` |
| 5 | Video description / metadata only | `metadata` | — |

Every stage — including stage 5 — is gated on the same minimum word count, so a
video with no real spoken content fails loudly rather than producing one or two
junk skills. `ExtractionOptions.skipFallbacks` stops the chain after stage 1
(used where stages 3–4 can't run). Stage 3 and 4 shell out to local binaries and
so are effectively no-ops on Vercel serverless; stages 1, 2, and 5 are the
production path.

### LLM model

All Claude calls use `claude-sonnet-5` (the `ANTHROPIC_MODEL` constant, declared in both `segmenter.ts` and `skill-generator.ts`) with up to 3 retries (exponential backoff with jitter). Retryable statuses: 429, 529, 5xx, timeout/abort.

Per-call abort budgets differ:

| Call | Timeout | Notes |
|------|---------|-------|
| `segmentTranscript()` | 90s | Streamed with a large max-token budget so the JSON plan isn't truncated |
| `generateSkillsFromPlan()` | 60s per segment | Runs at the configured concurrency |

---

## CLI (`packages/cli`)

**Binary:** `skilljacked` (published to npm as `skilljacked`)  
**Entry:** `packages/cli/src/index.ts`  
**Build tool:** tsup (ESM output, bundles `@skilljack/core`, externalizes `@anthropic-ai/sdk` and `youtube-caption-extractor`)

### Commands

| Command | Description |
|---------|-------------|
| `skilljacked <url>` | Fast-path: routes to `ingest --multi --max 10` |
| `skilljacked ingest <url>` | v2 pipeline: segment → generate skills (preview mode: 3) |
| `skilljacked ingest <url> --multi --max N` | Generate up to N skills (`--max` defaults to 12; >10 warns about overlap) |
| `skilljacked ingest <url> --transcript-file <path>` | Use local transcript file instead of fetching |
| `skilljacked jack <url>` | v1 pipeline: single skill extraction |
| `skilljacked config set-key <key>` | Save Anthropic API key locally |
| `skilljacked config status` | Show current config |
| `skilljacked config unset-key` | Remove saved key |
| `skilljacked init` | Re-run setup wizard |
| `skilljacked doctor` | Check API key, config, dependencies |
| `skilljacked library` | List saved skills |
| `skilljacked open` | Open skills folder |
| `skilljacked commands` | Show all available commands |
| `skilljacked version` | Print CLI version |

### API key resolution

`resolveApiKey()` in `utils/api-key.ts` — checks `ANTHROPIC_API_KEY` env var first, then falls back to the saved local config. Config stored using `env-paths` in a platform-appropriate user config directory.

Other `ingest` flags: `--concurrency <n>` (default 1), `--retries <n>` (default 3), `--debug`, `-o, --output <dir>` (default `.`).

### Ingest command flow

1. Fetch transcript (or read from file)
2. `segmentTranscript()` → plan with N topics
3. `dedupSegments()` → remove overlapping topics
4. `generateSkillsFromPlan()` with configured concurrency
5. `writeSkillPack()` → writes `<slug>.md` files + `INDEX.md` to output directory

### Output files

Skills are written to the current directory by default (`-o` flag to override). Each extraction creates a named folder like `<video-slug>/` with individual skill `.md` files and an `INDEX.md` summary.

---

## Web App (`packages/web`)

**Framework:** Next.js (App Router)  
**Auth:** Clerk (`@clerk/nextjs`)  
**Database:** Supabase (PostgreSQL via `@supabase/supabase-js`, service-role key, bypasses RLS)  
**Payments:** Stripe  
**Styling:** Tailwind CSS  
**Deployment:** Vercel

### Source layout

```
web/src/
  app/
    page.tsx                    — Landing page (hero, URL input, skill preview)
    layout.tsx                  — Root layout with Clerk provider
    opengraph-image.tsx         — Generated OG image
    dashboard/page.tsx          — Library: Recent jacks strip, skills grouped by video, sharing, Pro bulk export
    settings/page.tsx           — Account settings: plan, usage, billing portal, sign out
    pricing/page.tsx            — Free / Pro pricing page
    checkout/success/page.tsx   — Post-Stripe-checkout success
    checkout/cancel/page.tsx    — Post-Stripe-checkout cancel
    sign-in/[[...sign-in]]/     — Clerk sign-in page
    sign-up/[[...sign-up]]/     — Clerk sign-up page
    j/[shareId]/page.tsx        — Public, unauthenticated permalink for one shared extraction
    terms/, privacy/, refunds/, contact/ — Legal pages (see Legal pages below)
    api/
      jack/route.ts             — POST: run a jack, store it (jacks + jack_skills), return a gated view
      jacks/route.ts            — GET: recent jacks that still have unsaved skills (summaries only)
      jacks/[id]/route.ts       — GET: one of the user's jacks, every skill in full
      jacks/[id]/claim/route.ts — POST: attach a signed-out jack to the account that just signed up
      jacks/[id]/save/route.ts  — POST: copy chosen jack skills into the library (skills rows)
      skills/route.ts           — GET: list user's library (with each skill's channel)
      skills/[id]/route.ts      — DELETE: remove a skill; PATCH: edit content or reset (Pro-only)
      share/route.ts            — POST: publish/unpublish an extraction (sets is_public)
      usage/route.ts            — GET: current usage stats
      account/route.ts          — GET: plan, price, renewal date, usage, library count for /settings
      checkout/route.ts         — POST: create Stripe Checkout session
      billing/portal/route.ts   — POST: create Stripe Customer Portal session
      webhooks/clerk/route.ts   — POST: Clerk user lifecycle webhooks
      webhooks/stripe/route.ts  — POST: Stripe webhooks (checkout.session.completed,
                                  customer.subscription.updated/deleted, invoice.paid)
  components/
    hero.tsx, url-input.tsx     — Landing page UI
    jack-results.tsx            — Results grid (select, save, download) + the Preview & export modal
    library-detail.tsx          — Library detail modal: sidebar, reader, Copy/Download/Edit/Delete
    skill-reader.tsx            — One skill: install-target tabs, install path + unzip commands, coloured SKILL.md
    skill-tile.tsx              — Grid tile used by results and library (checkbox, tier/badge)
    skill-lines.tsx             — SKILL.md line colouring shared by the reader and skill-preview
    skill-preview.tsx           — Partial-preview card used by the public share page
    video-header.tsx            — Thumbnail (from i.ytimg.com) + title + channel
    modal.tsx, copy-button.tsx  — Dialog shell; copy button + shared button classes
    skill-edit-modal.tsx        — Edit one skill's content (Pro-only; textarea, save/reset)
    share-toggle.tsx            — Publish/unpublish + copy-link control for one video's saved skills
    loading-state.tsx, how-it-works.tsx
    footer.tsx, coming-soon.tsx — Footer (links to pricing + legal pages); "What's next"
    legal-page.tsx              — Shared layout for the legal pages
  lib/
    supabase.ts    — Lazy-initialized server Supabase client (service role)
    legal.ts       — Operator, governing state, contact email, last-updated date for the legal pages
    stripe.ts      — Lazy-initialized Stripe client
    usage-tracker.ts — Tier limits + videosLeft(): the one user-facing usage wording ("2 of 3 videos left this month")
    usage-server.ts — currentPeriod(), tierLimit(), ensureUsageRow(), reserveJack()/refundJack() (atomic, via SQL functions)
    users.ts       — getOrCreateUser(): users row for a Clerk id, created inline if the webhook hasn't landed
    jack-view.ts   — Pure: tierFor()/viewSkill() signed-out gating, skillDescription(), videoIdFromUrl(), thumbnailUrl()
    jack-view.test.ts — Unit tests for jack-view.ts
    jacks-server.ts — getJack()/getOwnedJack()/getJackSkills()/toJackView()
    claim-token.ts — newClaimToken()/hashClaimToken()/claimTokenMatches() for signed-out jacks
    claim-token.test.ts — Unit tests for claim-token.ts
    install-targets.ts — Claude Code / Codex / Cursor / Gemini CLI tabs, Hermes under More: folder, path, unzip commands
    install-targets.test.ts — Unit tests for install-targets.ts
    api-client.ts  — Browser-side API helpers (runJack, getJack, claimJack, saveJackSkills, getRecentJacks)
    jack-session.ts — sessionStorage for the jack on screen, its claim token, and skills to save after sign-up
    share-id.ts     — generateShareId() / isValidShareId() — 10-char, 64-symbol, 60-bit ids
    share-id.test.ts — Unit tests for share-id.ts
    skill-package.ts — skillFolderName() / packageSkills() / exportEntries() — `<name>/SKILL.md` layout, collision-safe
    skill-package.test.ts — Unit tests for skill-package.ts
    export-zip.ts    — buildSkillsZip() / downloadSkill() / downloadBlob() — client-side ZIP downloads
    export-zip.test.ts — Round-trips a built ZIP to check its folder layout
    source-url.ts    — cleanSourceUrl() — strips `si` from links stored before URLs were canonical
    source-url.test.ts — Unit tests for source-url.ts
  middleware.ts    — Clerk auth middleware (protects /dashboard, /settings)
  styles/globals.css
```

### API: `/api/jack` (POST)

Main extraction endpoint. `maxDuration = 280` (Vercel serverless budget covering the segmenter call plus up to 10 concurrent generations and one whole-pass retry).

Flow:
1. IP-based rate limiting (5 requests / 15 min per IP, in-memory)
2. Body size cap (1 KB), then validate the URL
3. Signed in: `getOrCreateUser()` → `ensureUsageRow()` → `reserveJack()`, one conditional SQL UPDATE
   (`reserve_jack`) so parallel requests can't overshoot the limit. 402 with `upgrade: true` if none left
4. Run `jackSkills()` from `@skilljack/core` with `count: 10, concurrency: 3`. If the first segment+generate pass yields zero skills, `jackSkills()` retries once with a fresh segmenter call
5. `refundJack()` on every failure after the reservation: missing API key, a thrown extraction, zero
   skills (returns `{ jack: null }`), or a failed store. A zero-skill jack is never charged. Known gap:
   a Vercel hard kill mid-jack keeps the charge (nothing is left running to refund it)
6. Store one `jacks` row (new `share_id`, and for signed-out visitors the SHA-256 of a fresh claim
   token) plus one `jack_skills` row per skill, then delete unclaimed signed-out jacks older than 7 days
7. Return `{ jack }`: a `JackView` gated by `viewSkill()`, plus `claimToken` for signed-out visitors

### Jacks, saving and claiming

Every jack is stored; saving to the library is opt-in, so a user never loses a paid-for jack by not
clicking Save. Unsaved skills stay reachable from the library's **Recent jacks** strip (`GET /api/jacks`),
which opens `/?jack=<id>` on the landing page.

Signed-out gating is server-side (`lib/jack-view.ts`): skill 1 in full, skills 2–4 as name +
description, the rest name only. The browser never receives content it can't show, so blurring is
cosmetic, not the protection. A signed-out visitor can download or copy only the unlocked skill.

Claiming: the signed-out response carries a claim token, kept in sessionStorage (`lib/jack-session.ts`);
the database holds only its hash. After sign-up the landing page calls `POST /api/jacks/:id/claim`,
which sets `user_id` (conditional on it still being null) and returns every skill. A claim doesn't use
one of the month's videos. If the visitor ticked skills and clicked "Sign up to save", those ids ride
along in sessionStorage and are saved right after the claim.

Saving (`POST /api/jacks/:id/save`) copies each chosen `jack_skills` row into `skills` (one insert per
skill, then a conditional link back via `jack_skills.saved_skill_id`, so a double-click can't save
twice). Saved rows carry the jack's `share_id` and inherit that video's current `is_public`. Deleting a
library skill nulls `saved_skill_id` (FK `on delete set null`), so the skill returns to Recent jacks.

### Public share links (`/j/[shareId]`)

Every jack mints one `share_id` (via `lib/share-id.ts`, 10 chars from a 64-symbol alphabet, 60 bits
of entropy), stored on `jacks` and copied onto every `skills` row saved from it — so `share_id` groups
one video's saved skills, both in the library and for sharing (rows saved before jacks existed got one
per save). Minting is unconditional; it does not by itself publish anything. A share link shows only
saved skills.

Extractions are **private by default**. `POST /api/share` (auth required) is the only thing
that ever sets `is_public true`, scoped to `share_id AND user_id` so one user's share id
cannot be used to toggle another user's extraction — the Supabase client uses the service-role
key and bypasses RLS, so ownership is enforced in the query itself. `dashboard/page.tsx` groups
skills by `share_id` (legacy rows saved before this shipped have none, and get no share
control) and renders `<ShareToggle>` on each video's header.

`GET /j/[shareId]` (public page, no auth) looks up rows by `share_id AND is_public = true` in
one query — an id that doesn't exist and one that exists but isn't public both 404 identically,
so probing ids reveals nothing. It renders in partial-preview mode with a sign-up CTA, generates
OG/Twitter metadata from the source video, and is dynamically rendered (no caching) so unsharing
takes effect immediately.

### Skill editing & bulk export (Pro)

`PATCH /api/skills/:id` (`skill-edit-modal.tsx`) edits one skill's `content`, gated on
`tier === 'pro'` read from Supabase (the Stripe webhook's write target, and the only source of
truth for tier — never Clerk metadata). The pre-edit text is captured into `original_content`
on the *first* edit only, so a second edit doesn't overwrite it as "previous version" — this is
what makes `{ reset: true }` restore the originally generated skill rather than the last edit.
`is_edited` and `updated_at` are stamped on every write.

Download-all on the results screen is free; bulk export across the library is Pro. Both are
entirely client-side: `lib/export-zip.ts` builds a ZIP in the browser
(`buildSkillsZip()`, dynamic `jszip` import) from skills already in memory on the dashboard —
no server route, since uploading content only to receive it back would waste the serverless
budget. Both features are Pro-gated in `dashboard/page.tsx`'s UI (selection
checkboxes and the edit button are only wired up when `tier === 'pro'`); free users see an
upgrade prompt in place of the bulk-export control, and a locked Edit button with a PRO badge that
links to `/pricing`.

### Skill downloads

Claude Code (and every Agent Skills tool) only loads a skill from `<name>/SKILL.md`, where the
folder equals the frontmatter `name:` — a loose `<name>.md` is silently ignored. So every web
download is a ZIP of folders: a single skill downloads as `<name>.zip` holding `<name>/SKILL.md`
(`downloadSkill()`), and multi-skill downloads use the same layout. The SKILL.md is the same for every
tool; `skill-reader.tsx` tabs (from `lib/install-targets.ts`) only change the folder shown:
`~/.claude/skills`, `~/.codex/skills`, `~/.cursor/skills`, `~/.gemini/skills`, and Hermes
`~/.hermes/skills` under More. The chosen tab is remembered in localStorage. There is no format toggle.
`lib/skill-package.ts` decides the folder: the frontmatter `name:` if present (a Pro edit may have
changed it), else the slug, kebab-cased and capped at 64 chars; collisions get `-2`, `-3`, and the
suffix is written back into `name:` so folder and name never disagree. Core enforces the same rule
at generation time (`transformer/frontmatter.ts`: `setFrontmatterName()`, plus `dedupeSkillNames()`
so one run never produces two skills with the same folder), so new skills already match; the web
layer re-enforces it for edited and pre-fix library rows. Library rows whose `format` is
`cursor-rules`/`windsurf-rules` hold rules text, not a SKILL.md (early builds saved formatted
content), so `exportEntries()` exports them as flat `<slug>.cursorrules`/`.windsurfrules` files. The library shows them without install
tabs or Edit. Copy-to-clipboard copies the SKILL.md text only.

### Legal pages

`/terms`, `/privacy`, `/refunds` and `/contact` are public server pages built on
`components/legal-page.tsx`. The facts they depend on (operator, governing state, contact email,
last-updated date) live in `lib/legal.ts`, so incorporating means editing one file. The Privacy Policy
makes factual claims about the code: no analytics, transcripts not stored, IPs only held in memory,
the list of processors (Clerk, Supabase, Stripe, Anthropic, Supadata, Vercel), every jack's results
stored, signed-out results deleted after 7 days, and thumbnails loaded from YouTube (i.ytimg.com). **Any change to data
handling must update `privacy/page.tsx` in the same PR.** Account deletion is by email request (there is
no in-app flow, and the Clerk webhook does not cascade deletes), and the policy promises it within 30 days.

### Account settings (`/settings`)

`GET /api/account` (auth required) returns plan, live Stripe price and renewal date (Pro only,
and only when `stripe_customer_id` is set — free users never touch Stripe), current-period jack
usage, and library skill count in one round trip. `current_period_end` is read from the
subscription item first (Stripe moved it there from the subscription object), falling back to
the subscription-level field. A Stripe failure degrades to a missing renewal date rather than
failing the page, since tier itself already comes from Supabase. The page reuses the existing
`/api/billing/portal` route rather than a separate one, and has no library cap — none is
enforced anywhere in the codebase.

### Database schema (Supabase)

```
users
  id              uuid (PK)
  clerk_id        text (unique)
  email           text
  tier            text  ('free' | 'pro')
  stripe_customer_id  text (nullable)
  created_at      timestamptz

skills
  id                uuid (PK)
  user_id           uuid (FK → users.id)
  name              text
  slug              text
  description       text
  content           text
  original_content  text     (nullable; set on first edit — see Skill editing above)
  source_title      text
  source_url        text
  source_video_id   text
  format            text     ('claude-skill' | 'cursor-rules' | 'windsurf-rules')
  is_edited         boolean
  share_id          text     (nullable; the jack's share_id — one per video)
  is_public         boolean  (default false — see Public share links above)
  jack_id           uuid     (nullable; FK → jacks.id, on delete set null)
  created_at        timestamptz
  updated_at        timestamptz

jacks                          (every extraction, saved or not)
  id                uuid (PK)
  user_id           uuid     (nullable until claimed; FK → users.id, on delete cascade)
  claim_token_hash  text     (SHA-256 of the signed-out claim token; cleared on claim)
  share_id          text     (unique)
  source_title, source_url, source_video_id, source_channel  text
  created_at        timestamptz

jack_skills
  id                uuid (PK)
  jack_id           uuid     (FK → jacks.id, on delete cascade)
  position          integer  (unique per jack; drives signed-out gating)
  name, description, content  text
  saved_skill_id    uuid     (nullable; FK → skills.id, on delete set null)

usage
  id              uuid (PK)
  user_id         uuid (FK → users.id)
  jacks_used      integer
  jacks_limit     integer
  period_start    timestamptz
  period_end      timestamptz
```

Migrations live in `supabase/migrations/` (`0001_share_links.sql`, `0002_skill_editing.sql`,
`0003_jacks.sql`) and must be applied before the code that depends on their columns is deployed.
`0003` also defines the `reserve_jack` / `refund_jack` SQL functions `/api/jack` calls; without it
every jack fails. All are safe to re-run.

### Tier limits

| Tier | Jacks/month | Skill editing | Bulk export |
|------|-------------|----------------|-------------|
| free | 3           | —              | —           |
| pro  | 50          | ✅             | ✅          |

The jack limit is resolved as `tier === 'pro' ? 50 : 3` in `/api/jack` and `/api/usage`, with a
per-row `usage.jacks_limit` override. There is no unlimited tier. Editing and export are gated
the same way, on `users.tier` read fresh from Supabase, never cached or read from Clerk.

Every Upgrade button links to `/pricing`; the pricing page's Pro button is the only path into
Stripe Checkout, so nobody reaches payment without seeing the price. Usage is always worded with
`videosLeft()` ("N of M videos left this month"), for free and Pro users alike.

### Environment variables

`packages/web/env-template.txt` is a starting point but is not exhaustive — the full set the app reads is:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_WEBHOOK_SECRET=whsec_...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRO_PRICE_ID=price_...

# Transcript fallbacks (optional — the chain degrades gracefully without them)
SUPADATA_API_KEY=...
OPENAI_API_KEY=sk-...     # Whisper ASR fallback

# Misc
NEXT_PUBLIC_APP_URL=https://skilljacked.com   # defaults to this if unset
```

---

## Build & Development

### Commands

```bash
# Install (from repo root)
pnpm install

# Build all packages
pnpm -r build
# or
pnpm build

# Build individual package
cd packages/core && pnpm build
cd packages/cli && pnpm build

# CLI + core only — use this locally without web env vars (the web build
# needs NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to prerender and fails without it)
pnpm --filter skilljacked... build

# Web dev server
cd packages/web && pnpm dev

# Web build (also builds core first)
cd packages/web && pnpm build
```

### Smoke test CLI after build

```bash
node packages/cli/dist/index.mjs --help
node packages/cli/dist/index.mjs -V
```

### Tests

```bash
pnpm test       # or: pnpm -r test — runs every package's test script
```

Tests are plain `tsx`-run scripts (no test framework), each printing `PASS`/`FAIL` per
assertion and exiting non-zero on any failure: `packages/core` runs `url-parser.test.ts`, `write-skill-pack.test.ts` and `frontmatter.test.ts`;
`packages/web` runs `share-id.test.ts`, `skill-package.test.ts`, `export-zip.test.ts`, `source-url.test.ts`,
`install-targets.test.ts`, `jack-view.test.ts` and `claim-token.test.ts`. `.github/workflows/ci.yml` runs
on every PR and push to `main`: install (frozen lockfile) → `pnpm -r build` → `pnpm -r test` →
assert the test output actually contains passing results (so a package that silently lost its
test script still fails CI) → smoke test the built CLI. It supplies well-formed dummy env vars
(Clerk, Supabase, Stripe, Anthropic) only so the Next.js build can prerender pages that mount
Clerk's provider — no test talks to a real external service.

---

## Release Workflow

Use the `/publish` or `/release` slash commands (in `.claude/commands/`).

### `/release [patch|minor|major]`

1. Check uncommitted changes
2. Bump version in `packages/cli/package.json`
3. `pnpm -r build`
4. Smoke test CLI
5. Commit + push version bump
6. `npm publish --access public` from `packages/cli/`
7. Verify with `npx skilljacked@latest --help`

### `/publish [patch|minor|major]`

Same as release but with a dry-run pack step before publishing.

**npm OTP:** If publish fails with EOTP, ask for an npm automation token and retry.

---

## Error Handling

All errors extend `SkillJackError(message, code)`:

| Class | Code | When |
|-------|------|------|
| `ExtractionError` | `EXTRACTION_ERROR` | Transcript fetch failed |
| `TransformError` | `TRANSFORM_ERROR` | LLM call failed |
| `ValidationError` | `VALIDATION_ERROR` | Invalid input (bad URL, etc.) |
| `SegmenterParseError` | `TRANSFORM_ERROR` | Segmenter returned unparseable JSON |

In the web API: only `SkillJackError` messages are forwarded to the client. All other errors return a generic `"An unexpected error occurred."` with HTTP 500.

In the CLI: `SkillJackError` messages are shown to the user. `TransformError.details` provides debug diagnostics under `--debug`.

---

## Code Conventions

- **TypeScript strict mode** throughout; no `any` unless unavoidable
- **ESM only** — all packages output `.mjs`, no CommonJS
- **No comments by default** — only add when the WHY is non-obvious
- **Lazy initialization** — Supabase and Stripe clients initialized on first call, not at module load (avoids build-time crashes when env vars are absent)
- **Error propagation** — use the typed error hierarchy; never swallow errors silently except in non-critical post-success paths (e.g., usage increment)
- **Formatting** — 2-space indentation, single quotes, no semicolons are not enforced by a linter; follow the existing file style
- **No backwards-compatibility shims** — delete unused code outright

---

## Design System

### SkillJacked

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` |
| Surface/cards | `#141419` |
| Borders | `#2a2a35` |
| Accent | `#e0c866` (gold) |
| Text primary | `#f8fafc` |
| Text secondary | `#8a8a9a` |

### ContentJacked (planned)

Same background/surface/borders as above, accent changes to `#06b6d4` (cyan).

---

## Planned Features (from `prodspec.md`)

Priority order for upcoming work:

| # | Feature | Status |
|---|---------|--------|
| 1 | User Authentication | ✅ Done (Clerk) |
| 2 | Skill Persistence | ✅ Done (Supabase) |
| 3 | Gated Preview | ✅ Done |
| 4 | Payment System (Stripe) | ✅ Done |
| 5 | Usage Tracking | ✅ Done |
| 6 | Top-Up Purchase Flow | Planned |
| 7 | Skill Metadata Extraction | Planned |
| 8 | Skill Chains | Planned |
| 9 | Skill Search/Filter | Planned |
| 10 | Bulk Export | ✅ Done (Pro) |
| 11 | Skill Editing | ✅ Done (Pro) |
| 12 | Prompt Optimization | Planned |
| 13 | Pricing Page | ✅ Done |
| 14 | Account Settings | ✅ Done |
| 15–21 | ContentJacked, Universal Credits, Affiliates, Waitlist | Planned |

Public share links (`/j/[shareId]`) shipped as well, ahead of file upload, but are not one of
the numbered `prodspec.md` items — see **Public share links** above.

---

## Execution Strategy Guidance

When the user gives a complex or multi-part task, proactively recommend the right execution strategy BEFORE starting work:

- **Single session**: Simple, sequential, or single-file tasks. Just do it.
- **Subagents** (default for parallel work): Independent tasks that don't need inter-agent discussion. Workers do focused work and return results. Token-efficient.
- **Agent teams** (rare): Only when agents need to actively debate, challenge, or iterate on each other's findings. The collaboration IS the value. High token cost.

If unsure, default to subagents — they cover 95% of parallel work at a fraction of the token cost.

The user can run `/teamcheck` to get a scored analysis of any task.

---

## Agent Team Rules

When working as part of an agent team:

### File Ownership
- **No two teammates may edit the same file.** The lead MUST assign clear file ownership when creating tasks. Each file is owned by exactly one teammate.
- If a teammate needs changes in a file owned by another teammate, they must message that teammate to request the change — never edit it directly.
- The lead should break work into tasks with non-overlapping file sets.

### Task Dependencies
- Use `addBlockedBy` on tasks that depend on other tasks completing first.
- Teammates must NOT start work on a blocked task. Check `blockedBy` before claiming.
- Sequential work (e.g., "build the schema, then build the API that uses it") must be modeled as dependent tasks, not parallel ones.
