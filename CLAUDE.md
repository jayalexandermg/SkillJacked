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

Package manager: **pnpm** with workspaces (`pnpm-workspace.yaml`). All packages build to ESM.

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
    youtube.ts        — YouTube transcript fetching via youtube-transcript-plus
    fallbacks.ts      — VTT fallback extraction
    vtt-parser.ts     — Parse .vtt subtitle files
    types.ts          — RawContent, ExtractionOptions
  transformer/
    index.ts          — transform(rawContent) → StructuredSkill (single-skill path)
    segmenter.ts      — segmentTranscript() — LLM call that splits transcript into skill topics
    skill-generator.ts — generateSkillsFromPlan() — concurrent per-segment LLM calls
    skill-md.ts (validators/) — validateSkillMarkdown() — check output has required sections
    write-skill-pack.ts — Write skills + INDEX.md to disk
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
    url-parser.ts     — parseUrl() — extract YouTube video ID
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
  transcriptMethod?: string;
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
  name: string;
  content: string;       // Raw markdown of the skill
  sourceTitle: string;
  sourceUrl: string;
  generatedAt: string;
}

// After format()
interface FormattedOutput {
  content: string;
  filename: string;
  format: OutputFormat;  // 'claude-skill' | 'cursor-rules' | 'windsurf-rules'
}
```

### LLM model

All Claude calls use `claude-sonnet-4-20250514` with a 90-second timeout and up to 3 retries (exponential backoff with jitter). Retryable statuses: 429, 529, 5xx, timeout/abort.

---

## CLI (`packages/cli`)

**Binary:** `skilljacked` (published to npm as `skilljacked`)  
**Entry:** `packages/cli/src/index.ts`  
**Build tool:** tsup (ESM output, bundles `@skilljack/core`, externalizes `@anthropic-ai/sdk` and `youtube-transcript-plus`)

### Commands

| Command | Description |
|---------|-------------|
| `skilljacked <url>` | Fast-path: routes to `ingest --multi --max 10` |
| `skilljacked ingest <url>` | v2 pipeline: segment → generate N skills |
| `skilljacked ingest <url> --multi --max N` | Generate up to N skills (default preview = 3) |
| `skilljacked ingest <url> --transcript-file <path>` | Use local transcript file instead of fetching |
| `skilljacked jack <url>` | v1 pipeline: single skill extraction |
| `skilljacked config set-key <key>` | Save Anthropic API key locally |
| `skilljacked config status` | Show current config |
| `skilljacked config unset-key` | Remove saved key |
| `skilljacked init` | Re-run setup wizard |
| `skilljacked doctor` | Check API key, config, dependencies |
| `skilljacked library` | List saved skills |
| `skilljacked open` | Open skills folder |
| `skilljacked version` | Print CLI version |

### API key resolution

`resolveApiKey()` in `utils/api-key.ts` — checks `ANTHROPIC_API_KEY` env var first, then falls back to the saved local config. Config stored using `env-paths` in a platform-appropriate user config directory.

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
    dashboard/page.tsx          — Authenticated skill library
    sign-in/[[...sign-in]]/     — Clerk sign-in page
    sign-up/[[...sign-up]]/     — Clerk sign-up page
    api/
      jack/route.ts             — POST: extract skills from YouTube URL
      skills/route.ts           — GET: list user's skills
      skills/[id]/route.ts      — GET/PUT/DELETE: single skill
      usage/route.ts            — GET: current usage stats
      checkout/route.ts         — POST: create Stripe Checkout session
      billing/portal/route.ts   — POST: create Stripe Customer Portal session
      webhooks/clerk/route.ts   — POST: Clerk user lifecycle webhooks
      webhooks/stripe/route.ts  — POST: Stripe payment webhooks
  components/
    hero.tsx, url-input.tsx     — Landing page UI
    skill-card.tsx, skill-preview.tsx — Skill display
    format-toggle.tsx           — Claude/Cursor/Windsurf format switcher
    download-bar.tsx, loading-state.tsx
    how-it-works.tsx, install-guide.tsx
    footer.tsx, coming-soon.tsx
  lib/
    supabase.ts    — Lazy-initialized server Supabase client (service role)
    stripe.ts      — Lazy-initialized Stripe client
    storage.ts     — Skill persistence helpers
    usage-tracker.ts — Jack usage counter
    api-client.ts  — Browser-side API fetch helpers
    client-formatter.ts — Client-side format conversion
  middleware.ts    — Clerk auth middleware (protects /dashboard)
  styles/globals.css
```

### API: `/api/jack` (POST)

Main extraction endpoint. Flow:
1. IP-based rate limiting (5 requests / 15 min per IP, in-memory)
2. Body size cap (1 KB)
3. Validate URL input and format
4. If user is authenticated (Clerk): check monthly jack limit, return 402 if exceeded
5. Run `jackSkills()` from `@skilljack/core` with `count: 10, concurrency: 3`
6. If authenticated: increment `usage.jacks_used` in Supabase (non-fatal if this fails)
7. Return array of `{ skill, formatted }` objects

### Database schema (Supabase)

```
users
  id              uuid (PK)
  clerk_id        text (unique)
  email           text
  tier            text  ('free' | 'pro' | 'unlimited')
  stripe_customer_id  text (nullable)
  created_at      timestamptz

skills
  id              uuid (PK)
  user_id         uuid (FK → users.id)
  name            text
  slug            text
  description     text
  content         text
  source_title    text
  source_url      text
  source_video_id text
  format          text  ('claude-skill' | 'cursor-rules' | 'windsurf-rules')
  is_edited       boolean
  created_at      timestamptz
  updated_at      timestamptz

usage
  id              uuid (PK)
  user_id         uuid (FK → users.id)
  jacks_used      integer
  jacks_limit     integer
  period_start    timestamptz
  period_end      timestamptz
```

### Tier limits

| Tier | Jacks/month |
|------|-------------|
| free | 3 |
| pro  | 50 |
| unlimited | ∞ (no limit check) |

### Environment variables

Copy `packages/web/env-template.txt` to `packages/web/.env.local`:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
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
| 10 | Bulk Export | Planned |
| 11 | Skill Editing | Planned |
| 12 | Prompt Optimization | Planned |
| 13 | Pricing Page | Planned |
| 14 | Account Settings | Planned |
| 15–21 | ContentJacked, Universal Credits, Affiliates, Waitlist | Planned |

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
