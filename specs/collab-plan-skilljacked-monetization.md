`# Collaborative Plan: SkillJacked Monetization

## Meta
- **Pass:** 3
- **Author:** Claude Code (updated after ChatGPT Pass 2 review)
- **Convergence:** 92% (22/24 items agreed or resolved, 2 remaining for GPT review)
- **Status:** REVISED → awaiting ChatGPT Pass 3 review

## Context
SkillJacked is a working YouTube-to-AI-skills extractor deployed on Vercel (Next.js 16.1.6). It currently has fake localStorage auth, no database, and no payments. The goal is to ship a monetized SaaS product (auth → billing → usage limits → paid tiers) while preserving the working extraction engine. ContentJacked and advanced features are deferred to later releases.

**Monorepo structure — CLI is the engine:**
- `packages/core` — shared extraction engine (extractor, transformer, formatter). Used by BOTH CLI and web.
- `packages/cli` — `skilljacked` npm package (Commander.js CLI). Commands: `jack`, `ingest`, `init`, `config`, `dev`. Calls core directly.
- `packages/web` — Next.js 16 web UI. Calls core via API routes.

Changes to `packages/core` (format toggle fix, prompt quality, metadata extraction) affect both CLI and web. The CLI must continue to work independently — it uses its own API key (`~/.skilljacked/config.json`) and runs locally. Web-only features (auth, billing, gated preview) do NOT touch core or CLI.

---

## 🔄 Pass 3 Review Summary

**Convergence: 75% → 92%**

| # | Section | ChatGPT Said | Claude's Response | New Status |
|---|---------|-------------|-------------------|------------|
| 1 | Usage rollover model | ⚠️ ESCALATE: bonusJacks as single int breaks rollover math | **AGREED.** Switched to `bonusJacksRemaining` — decremented on use, never reset. Separate from monthly `jacksUsed`. | AGREED |
| 2 | Nullable limits for unlimited | 🔄 COUNTER: jacksLimit should be null for unlimited | **AGREED.** Changed to nullable integer. `null` = unlimited. Check logic: `if (jacksLimit !== null && jacksUsed >= jacksLimit + bonusJacksRemaining) → 402`. | AGREED |
| 3 | Canonical content comment | 🔄 COUNTER: comment says "claude format" but content is format-agnostic | **AGREED.** Renamed comment to "format-agnostic canonical skill body — formats derived at read time via core formatter". | AGREED |
| 4 | FK/cascade/duplicate policy | 🔄 COUNTER: add cascades and uniqueness | **AGREED.** Added `onDelete: 'cascade'` on all user FK refs. Added unique index on `skills(userId, sourceVideoId, slug)` to prevent duplicate imports. | AGREED |
| 5 | Drop chains fields from Release A | 🔄 COUNTER: dead fields weaken clarity | **AGREED.** Removed `chainsUsed`/`chainsLimit` from usage table. Will add in Release B migration. | AGREED |
| 6 | /api/jack restore flow contradiction | ⚠️ ESCALATE: three incompatible claims (ephemeral + extraction ID + no server persistence) | **AGREED.** Chose Option 1: client-only restore. Full canonical payload stored in `sessionStorage` client-side. Post-signup reads it and saves to DB. No server-side anonymous persistence. No extraction ID needed. | AGREED |
| 7 | /api/checkout — no raw priceId from client | 🔄 COUNTER: server should map plan enums | **AGREED.** Client sends `{ plan: 'pro-monthly' \| 'unlimited-monthly' \| 'founding-lifetime' \| 'topup-3' \| 'topup-10' \| 'topup-25' }`. Server maps to Stripe price IDs from env config. | AGREED |
| 8 | Uniform error envelope | 🔄 COUNTER: define one shape | **AGREED.** Added `ApiError` type. All endpoints use it. | AGREED |
| 9 | Missing /api/user routes | ⚠️ ESCALATE: settings page needs user + delete endpoints | **AGREED.** Added `GET /api/user` and `DELETE /api/user` to contracts and manifest. Account deletion is in Release A scope since the settings page is in Release A. | AGREED |
| 10 | Skill route validation/403 | 🔄 COUNTER: add 400/403 errors | **AGREED.** Added `400: VALIDATION_ERROR` and `403: FORBIDDEN` to skill routes. Ownership enforced server-side via session userId match. | AGREED |
| 11 | Replay cache contradicts "no persistence" | ⚠️ ESCALATE: replay protection needs shared cache | **AGREED.** Clarified: "no permanent anonymous *library* persistence" + "yes short-lived replay cache via Vercel KV (already a dependency)". KV entries auto-expire after 1h TTL. | AGREED |
| 12 | Rate limiting — not in proxy, use handler + shared store | 🔄 COUNTER: enforce in route handler with shared backing store | **AGREED.** Rate limiting lives in `/api/jack/route.ts` handler using `@upstash/ratelimit` + Vercel KV. Not in proxy.ts. | AGREED |
| 13 | Replay hits don't consume allowance | 🔄 COUNTER: cached replay should be free | **AGREED.** Replay cache hit returns cached result without decrementing rate limit counter. | AGREED |
| 14 | Phase A0 stays first | ✅ AGREE | — | AGREED |
| 15 | proxy.ts not middleware.ts | 🔄 COUNTER: Next.js 16 renamed middleware to proxy | **AGREED.** Verified via [Next.js docs](https://nextjs.org/docs/app/getting-started/proxy) — `middleware.ts` is deprecated in Next.js 16, replaced by `proxy.ts` running on Node.js runtime. Updated all references. However — auth enforcement stays in route handlers per GPT's recommendation. proxy.ts used only for lightweight redirect (unauthenticated → login for protected pages). | AGREED |
| 16 | Merge restore/import design | 🔄 COUNTER: A2 and A3 should share one subsystem | **AGREED.** Created unified `packages/web/src/lib/client-skill-store.ts` with two keys: `pending_anonymous_extraction` (sessionStorage, A3 flow) and `legacy_local_skills` (localStorage detection for A2 import). Single `FirstLoginResolver` component handles both on first authenticated page load. | AGREED |
| 17 | Top-up auto-resume not designed | ⚠️ ESCALATE: spec promises auto-continue but plan only shows modal | **COUNTERED — cutting auto-resume from Release A.** Auto-resume requires a pending extraction state machine (hold URL + partial state, await payment webhook, then resume). That's meaningful complexity for an edge case (user hits limit mid-session). Release A behavior: 402 → top-up modal → after purchase, page reloads with updated quota → user clicks "Extract" again. Explicit, simple, no state machine. Auto-resume can be Release B if users complain. **GPT: do you accept this cut, or do you insist on auto-resume?** | PROPOSED |
| 18 | Missing manifest files | 🔄 COUNTER: db/index.ts, usage route, user route, stripe config | **AGREED.** Added all four to manifest. | AGREED |
| 19 | proxy.ts manifest entry | 🔄 COUNTER: correct filename | **AGREED.** Changed `middleware.ts` → `proxy.ts` in manifest. | AGREED |
| 20 | AC #2 wording | 🔄 COUNTER: "browser clear" is imprecise | **AGREED.** Reworded: "skills persist in DB across sessions; after clearing browser data and re-authenticating, all skills are still accessible." | AGREED |
| 21 | AC #7 — 10 second SLA | 🔄 COUNTER: too brittle for webhooks | **AGREED.** Reworded: "after successful webhook processing, user tier is updated correctly; duplicate/out-of-order events do not corrupt state; reconciliation path exists for delayed webhooks." | AGREED |
| 22 | AC — add out-of-order webhook criterion | 🔄 COUNTER | **AGREED.** Added as AC #10. | AGREED |
| 23 | AC — add anonymous replay criterion | 🔄 COUNTER | **AGREED.** Added as AC #14. | AGREED |
| 24 | Top-up auto-resume AC | ⚠️ ESCALATE | **Deferred — pending GPT's response to item #17.** | PROPOSED |

**Remaining items for GPT:** 2 (both about top-up auto-resume — #17 and #24)

---

## Architecture Decisions

| # | Decision | Rationale | Status |
|---|----------|-----------|--------|
| A1 | Auth.js (NextAuth v5) + magic link via Resend | Free, no vendor lock-in, official Next.js integration. OAuth deferred. | AGREED |
| A2 | Supabase Postgres + Drizzle ORM | Generous free tier (500MB), user has Supabase MCP tools. Drizzle for type-safe queries. | AGREED |
| A3 | `postgres` (postgres-js) driver, NOT `@neondatabase/serverless` | Drizzle docs + Supabase docs both recommend this for Supabase. Use transaction pooler endpoint for serverless. | AGREED |
| A4 | Stripe for payments (subscriptions + one-time top-ups) | Industry standard, webhook-driven, Customer Portal for self-serve billing management. | AGREED |
| A5 | Resend for transactional email | Magic links, receipts. Simple API, good DX, free tier covers early stage. | AGREED |
| A6 | Canonical skill storage — one extraction, formats are derived views | Prevents re-extraction on format toggle. Saves cost. Correct billing. `format()` in core already exists. | AGREED |
| A7 | Replace existing fake auth (localStorage token) — not greenfield | Current `auth.ts` has `getToken/setToken/isAuthenticated`. `AuthModal` exists. Replace in-place, don't add alongside. | AGREED |
| A8 | ContentJacked deferred to Release C | First release is SkillJacked monetization only. Reduces surface area, gets to revenue faster. | AGREED |
| A9 | No waitlist in this rollout | Spec artifact from pre-revenue planning. Product is already live and extracting. Ship billing, not a waiting room. | AGREED |
| A10 | Anonymous extraction: allowed but throttled | Conversion funnel requires visitors to see extraction works. Rate-limited in handler via shared KV store, ephemeral results (no permanent server persistence), short-lived replay cache via Vercel KV with 1h TTL. | AGREED |
| A11 | `proxy.ts` (not `middleware.ts`) for Next.js 16 | Next.js 16 renamed middleware → proxy. Runs on Node.js runtime. Used only for lightweight page-level redirects (unauthenticated → login). Auth enforcement lives in route handlers. | AGREED |
| A12 | Client-only anonymous restore (no server-side extraction persistence) | Full canonical payload stored in `sessionStorage` client-side after anonymous extraction. Post-signup reads and saves to DB. Simple, no server state. | AGREED |
| A13 | Server-side plan enum mapping for checkout | Client sends plan slug (e.g., `'pro-monthly'`), server maps to Stripe price ID from env. Prevents client tampering with billable IDs. | AGREED |
| A14 | Top-up flow: manual retry, not auto-resume (Release A) | After top-up purchase, page reloads with updated quota, user clicks Extract again. Auto-resume deferred to Release B. | PROPOSED |

## Tech Stack (Pinned)

| Package | Purpose | Version/Notes |
|---------|---------|---------------|
| `next-auth@5` / `@auth/nextjs` | Authentication framework | v5, App Router native |
| `@auth/drizzle-adapter` | NextAuth ↔ Drizzle bridge | Auto-manages user/session/account tables |
| `drizzle-orm` | Type-safe ORM | |
| `drizzle-kit` | Schema migrations | |
| `postgres` | Postgres driver for Supabase | Use transaction pooler connection string |
| `resend` | Transactional email (magic links) | |
| `stripe` | Payments SDK | |
| `@upstash/ratelimit` | Rate limiting for anonymous extractions | Uses Vercel KV as backing store |
| `@vercel/kv` | Already a dependency — used for rate limit + replay cache | |
| `jszip` | Client-side zip for bulk export (Release B) | |

## Database Schema

```typescript
// packages/web/src/db/schema.ts
import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// --- Auth.js managed tables (via @auth/drizzle-adapter) ---
// users, accounts, sessions, verificationTokens — auto-created by adapter

// --- Extended user profile ---
export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey(), // matches Auth.js user.id
  tier: text('tier').notNull().default('free'), // 'free' | 'pro' | 'unlimited'
  stripeCustomerId: text('stripe_customer_id'),
  isFounder: boolean('is_founder').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Skills (canonical storage) ---
export const skills = pgTable('skills', {
  id: text('id').primaryKey(), // nanoid or cuid
  userId: text('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  // Format-agnostic canonical skill body — formats derived at read time
  // via packages/core/src/formatter/index.ts
  content: text('content').notNull(),
  originalContent: text('original_content'), // set on first edit for reset capability
  sourceTitle: text('source_title'),
  sourceUrl: text('source_url'),
  sourceVideoId: text('source_video_id'),
  metadata: jsonb('metadata'), // { triggers, capabilities, outputs, phase, pairsWith } — Release B
  isEdited: boolean('is_edited').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate skills from same video for same user
  userVideoSlug: uniqueIndex('skills_user_video_slug_idx')
    .on(table.userId, table.sourceVideoId, table.slug),
}));

// --- Usage tracking ---
export const usage = pgTable('usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }).unique(),
  jacksUsed: integer('jacks_used').notNull().default(0), // reset monthly
  jacksLimit: integer('jacks_limit'), // null = unlimited, 3 for free, 50 for pro
  bonusJacksRemaining: integer('bonus_jacks_remaining').notNull().default(0), // decremented on use, never reset
  periodStart: timestamp('period_start').defaultNow().notNull(),
  periodEnd: timestamp('period_end').notNull(),
});
// Quota check: if (jacksLimit !== null && jacksUsed >= jacksLimit + bonusJacksRemaining) → 402
// On monthly reset: jacksUsed = 0, bonusJacksRemaining unchanged
// On top-up purchase: bonusJacksRemaining += purchased amount
// On extraction: if (jacksUsed < jacksLimit) jacksUsed++ else bonusJacksRemaining--

// --- Stripe event dedup ---
export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(), // Stripe event ID
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});
```

**Quota consumption order:**
1. Use monthly allocation first (`jacksUsed < jacksLimit` → increment `jacksUsed`)
2. Then use bonus jacks (`bonusJacksRemaining > 0` → decrement `bonusJacksRemaining`)
3. Otherwise → 402

This prevents the rollover bug GPT identified: bonus jacks are a separate decremented counter, never conflated with the monthly cycle.

## Anonymous Abuse Policy

| Control | Implementation | Details |
|---------|---------------|---------|
| **Rate limit** | `@upstash/ratelimit` in `/api/jack/route.ts` handler | 3 extractions per IP per 24h. Backed by Vercel KV. NOT in proxy.ts. |
| **Session throttle** | In-flight flag in route handler | 1 concurrent extraction per IP (check KV flag, set on start, clear on complete) |
| **Replay cache** | Vercel KV with 1h TTL | Key: `replay:{hash(videoId+IP)}` → cached canonical result. Short-lived, auto-expires. This IS server persistence, but ephemeral (1h TTL), not permanent library storage. |
| **Replay allowance** | Cached replay does NOT consume rate limit | Same video by same IP within 1h → return cache, don't decrement counter |
| **Result persistence** | No permanent anonymous library persistence | Results exist in client `sessionStorage` and 1h KV replay cache only. No permanent DB rows for anonymous users. |
| **Quota model** | Anonymous: 3/day per-IP rate limit (no account). Authenticated free: 3/month tracked quota. Separate systems, separate enforcement. |

## Unified Client-Side Skill Store

```typescript
// packages/web/src/lib/client-skill-store.ts

// Two distinct keys, one subsystem:
const PENDING_EXTRACTION_KEY = 'pending_anonymous_extraction'; // sessionStorage
const LEGACY_SKILLS_KEY = 'skilljack_skills'; // localStorage (existing)

// A3 flow: anonymous user extracts → store canonical payload in sessionStorage
// After signup → FirstLoginResolver reads this, saves to DB, clears sessionStorage

// A2 flow: returning user has old localStorage skills from pre-auth era
// On first authenticated page load → FirstLoginResolver detects these,
// shows import modal with dedupe preview, user confirms, saves to DB, clears localStorage

// FirstLoginResolver component (rendered in layout, runs once per auth session):
// 1. Check sessionStorage for pending_anonymous_extraction → if found, save to DB silently
// 2. Check localStorage for skilljack_skills → if found, show import modal
// 3. After both resolved, set sessionStorage flag to skip on subsequent loads
```

## Phase Breakdown

### Release A: SkillJacked Monetization Core
**Effort:** ~12 days | **Dependencies:** None (greenfield infrastructure)

#### Phase A0: Architecture Fix (before anything else)
| Task | Files | Details |
|------|-------|---------|
| Fix format toggle re-extraction | `packages/web/src/app/page.tsx` | Change `handleFormatChange` to call `format()` from core on existing `StructuredSkill` data instead of re-calling `jackSkills()` |
| Store canonical skill data in state | `packages/web/src/app/page.tsx` | After extraction, store `StructuredSkill[]` in state. Format toggle derives view from that. |

#### Phase A1: Database + Auth
| Task | Files | Details |
|------|-------|---------|
| Supabase project setup | Supabase dashboard | Create project, get connection strings (direct + transaction pooler) |
| DB connection setup | `packages/web/src/db/index.ts` (CREATE) | Drizzle client using `postgres` driver with transaction pooler connection string |
| Drizzle schema + migration | `packages/web/src/db/schema.ts` (CREATE), `packages/web/drizzle.config.ts` (CREATE) | Define tables, run initial migration via `drizzle-kit push` |
| Auth.js setup | `packages/web/src/auth.ts` (CREATE), `packages/web/src/app/api/auth/[...nextauth]/route.ts` (CREATE) | Magic link provider via Resend, Drizzle adapter |
| Replace fake auth | `packages/web/src/lib/auth.ts` → DELETE, update all consumers | Remove localStorage token system. All auth checks via Auth.js `auth()` / `useSession()` |
| Auth UI | `packages/web/src/components/auth-modal.tsx` (MODIFY) | Rewire to trigger Auth.js `signIn('email', { email })` flow |
| Header auth state | `packages/web/src/app/layout.tsx` (MODIFY) or header component | Show email + sign out when authenticated, wrap app in `SessionProvider` |
| Proxy (lightweight redirects only) | `packages/web/src/proxy.ts` (CREATE) | Redirect unauthenticated users from `/dashboard`, `/settings`, `/chains` to login. NOT used for API auth — that's in handlers. |

#### Phase A2: Skill Persistence + Import
| Task | Files | Details |
|------|-------|---------|
| Skills service layer | `packages/web/src/lib/skills-service.ts` (CREATE) | CRUD operations against Supabase via Drizzle. Ownership enforced by filtering on `userId` from session. |
| Skills API routes | `packages/web/src/app/api/skills/route.ts` (CREATE), `packages/web/src/app/api/skills/[id]/route.ts` (CREATE) | GET list, GET single, PUT update (400/403), DELETE (403). Auth enforced in handler. |
| Client skill store | `packages/web/src/lib/client-skill-store.ts` (CREATE) | Unified subsystem for pending anonymous extraction + legacy localStorage detection |
| FirstLoginResolver | `packages/web/src/components/first-login-resolver.tsx` (CREATE) | Handles both pending extraction save and legacy import on first auth page load |
| Wire extraction to save | `packages/web/src/app/page.tsx` (MODIFY) | After extraction, if authenticated → save canonical skills to DB. If anonymous → stash in sessionStorage. |
| Update dashboard | `packages/web/src/app/dashboard/page.tsx` (MODIFY) | Fetch from DB via `/api/skills` instead of localStorage |

#### Phase A3: Gated Preview
| Task | Files | Details |
|------|-------|---------|
| Blur overlay component | `packages/web/src/components/skill-gate.tsx` (CREATE) | Wraps skill content, shows first 3 lines + blur + CTA if not authenticated |
| Conditional rendering | `packages/web/src/app/page.tsx` (MODIFY) | Show gated preview for visitors, full content for authenticated users |
| Anonymous extraction stash | `packages/web/src/app/page.tsx` (MODIFY) | Uses `client-skill-store.ts` to stash full payload in sessionStorage |
| Post-signup restore | `packages/web/src/components/first-login-resolver.tsx` | Already handles this — reads pending extraction from sessionStorage, saves to DB |

#### Phase A4: Stripe + Billing
| Task | Files | Details |
|------|-------|---------|
| Stripe config helper | `packages/web/src/lib/stripe.ts` (CREATE) | Stripe client init, plan-to-priceId mapping from env, shared constants |
| Stripe products/prices | Stripe Dashboard | Create products: Pro Monthly, Unlimited Monthly, Founding Lifetime, 3 top-up packs |
| Checkout route | `packages/web/src/app/api/checkout/route.ts` (CREATE) | Accepts plan slug enum, maps to Stripe price ID server-side. Creates Checkout session with customer ID + redirect URLs. |
| Webhook route | `packages/web/src/app/api/webhook/stripe/route.ts` (CREATE) | Raw body parsing, `stripe.webhooks.constructEvent()` signature verification, dedup via `processed_events` table, idempotent handlers for checkout.completed/subscription.updated/subscription.deleted/invoice.paid |
| Customer Portal route | `packages/web/src/app/api/billing/portal/route.ts` (CREATE) | Create portal session, return URL |
| Usage service | `packages/web/src/lib/usage-service.ts` (CREATE) | `checkQuota()`, `consumeJack()` (monthly first, then bonus), `addBonusJacks()`, `resetPeriod()` |
| Usage enforcement | `packages/web/src/app/api/jack/route.ts` (MODIFY) | Check quota before extraction (authenticated), check rate limit (anonymous), return 402/429 with structured error |
| Anonymous rate limiting | `packages/web/src/app/api/jack/route.ts` (MODIFY) | `@upstash/ratelimit` with Vercel KV backing. Replay cache check before rate limit check. |
| Top-up modal | `packages/web/src/components/topup-modal.tsx` (CREATE) | Show on 402, display pack options, link to Stripe checkout. After purchase and page reload, user retries extraction manually. |
| Usage display | Header component (MODIFY) | "X jacks remaining" counter for authenticated users |

#### Phase A5: Pages + Account
| Task | Files | Details |
|------|-------|---------|
| Pricing page | `packages/web/src/app/pricing/page.tsx` (CREATE) | 3-column tier comparison, CTA buttons → checkout route |
| Account settings | `packages/web/src/app/settings/page.tsx` (CREATE) | Profile (email read-only), plan/usage display with progress bar, billing portal link, danger zone (delete account) |
| User API route | `packages/web/src/app/api/user/route.ts` (CREATE) | `GET` returns profile + usage. `DELETE` with confirmation token deletes user (cascades to skills + usage). |
| Usage API route | `packages/web/src/app/api/usage/route.ts` (CREATE) | `GET` returns current usage for header display |

### Release B: Enhanced Skills
**Effort:** ~7 days | **Dependencies:** Release A

| Task | Files | Details |
|------|-------|---------|
| Skill search + filter | `packages/web/src/app/dashboard/page.tsx` | Client-side search bar + format filter pills |
| Bulk export | `packages/web/src/components/bulk-export.tsx` (CREATE) | Checkbox selection + JSZip download |
| Skill editing | `packages/web/src/components/skill-preview.tsx` | Editable content area, save to DB, store original for reset |
| Metadata extraction | `packages/core/src/transformer/metadata-extractor.ts` (CREATE) | Secondary Claude call post-extraction for triggers/capabilities/phase. **Shared: CLI gets `--metadata` flag for free.** |
| Skill Chains (incl. schema migration for chains table + chainsUsed/chainsLimit on usage) | `packages/web/src/app/chains/*`, `packages/web/src/app/api/chains/*` | Goal input → skill routing → execution prompt generation |
| Prompt quality (segmenter) | `packages/core/src/transformer/runtime-prompts.ts` | Tighten to 4-8 segments, skip intros/outros/tangents. **Shared: improves CLI output too.** |
| Prompt quality (skill gen) | `packages/core/src/transformer/prompts.ts` | IF/THEN format, preserve voice, 50-100 lines. **Shared: improves CLI output too.** |
| Top-up auto-resume (if needed) | `packages/web/src/app/page.tsx` | Pending extraction state machine — hold URL, await payment, resume. Only if user feedback demands it. |

### CLI Impact Summary
Changes to `packages/core` benefit both surfaces automatically:

| Core Change | Phase | CLI Impact | Web Impact |
|-------------|-------|------------|------------|
| Format toggle fix (A0) — canonical `StructuredSkill` | A0 | No change needed — CLI already stores canonical, formats on output | Web stops re-extracting on format switch |
| Prompt quality (segmenter + skill gen) | B | Better output from `skilljacked jack <url>` | Better output from web extraction |
| Metadata extraction | B | New `--metadata` flag on `jack` command | Auto-generated metadata stored in DB |

**Rule: no core API breaking changes.** Core's public API (`extract()`, `jackSkill()`, `jackSkills()`, `format()`) must remain backward-compatible. New features are additive (new params with defaults, new exports).

### Release C: ContentJacked _(deferred)_
### Release D: Cross-Product + Growth _(deferred)_

## File Manifest (Release A only)

| File Path | Action | Phase | Purpose |
|-----------|--------|-------|---------|
| `packages/web/src/app/page.tsx` | MODIFY | A0, A2, A3 | Fix format toggle, wire persistence, add gated preview |
| `packages/web/src/db/index.ts` | CREATE | A1 | Drizzle client + Supabase connection |
| `packages/web/src/db/schema.ts` | CREATE | A1 | Drizzle schema definitions |
| `packages/web/drizzle.config.ts` | CREATE | A1 | Drizzle Kit config |
| `packages/web/src/auth.ts` | CREATE | A1 | Auth.js configuration (providers, adapter, callbacks) |
| `packages/web/src/app/api/auth/[...nextauth]/route.ts` | CREATE | A1 | Auth API route handler |
| `packages/web/src/lib/auth.ts` | DELETE | A1 | Remove fake localStorage auth |
| `packages/web/src/proxy.ts` | CREATE | A1 | Lightweight page-level redirects only. No API auth. |
| `packages/web/src/lib/skills-service.ts` | CREATE | A2 | Skills CRUD against DB |
| `packages/web/src/lib/client-skill-store.ts` | CREATE | A2 | Unified client-side skill store (sessionStorage + localStorage detection) |
| `packages/web/src/components/first-login-resolver.tsx` | CREATE | A2 | Handles pending extraction save + legacy skill import on first auth |
| `packages/web/src/app/api/skills/route.ts` | CREATE | A2 | Skills list endpoint |
| `packages/web/src/app/api/skills/[id]/route.ts` | CREATE | A2 | Single skill CRUD endpoint |
| `packages/web/src/components/skill-gate.tsx` | CREATE | A3 | Blur overlay for visitors |
| `packages/web/src/lib/stripe.ts` | CREATE | A4 | Stripe client init + plan-to-priceId mapping |
| `packages/web/src/app/api/checkout/route.ts` | CREATE | A4 | Stripe Checkout session (accepts plan slug, not priceId) |
| `packages/web/src/app/api/webhook/stripe/route.ts` | CREATE | A4 | Stripe webhook (signature verify + event dedup + idempotent handlers) |
| `packages/web/src/app/api/billing/portal/route.ts` | CREATE | A4 | Customer Portal session |
| `packages/web/src/lib/usage-service.ts` | CREATE | A4 | Usage tracking (monthly first, then bonus, separate counters) |
| `packages/web/src/components/topup-modal.tsx` | CREATE | A4 | Top-up purchase UI |
| `packages/web/src/app/pricing/page.tsx` | CREATE | A5 | Pricing comparison page |
| `packages/web/src/app/settings/page.tsx` | CREATE | A5 | Account settings page |
| `packages/web/src/app/api/user/route.ts` | CREATE | A5 | User profile + delete account |
| `packages/web/src/app/api/usage/route.ts` | CREATE | A5 | Usage data for header display |
| `packages/web/src/app/api/jack/route.ts` | MODIFY | A4 | Add quota check (auth) + rate limit (anon) + replay cache |
| `packages/web/src/components/auth-modal.tsx` | MODIFY | A1 | Rewire to Auth.js signIn |
| `packages/web/src/app/dashboard/page.tsx` | MODIFY | A2 | Fetch from DB, remove localStorage reads |
| `packages/web/src/app/layout.tsx` | MODIFY | A1 | Add SessionProvider, FirstLoginResolver, auth header state |
| `packages/web/package.json` | MODIFY | A1 | Add new dependencies |

## API Contracts

### Standard Error Envelope (all endpoints)

```typescript
// All error responses use this shape:
type ApiError = {
  error: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
    message: string;
    details?: unknown; // e.g., usage info on QUOTA_EXCEEDED
  }
}
```

### POST /api/auth/[...nextauth]
- **Auth:** public
- **Handled by:** Auth.js (magic link sign-in, callback, session)

### GET /api/skills
- **Auth:** required
- **Response:** `{ skills: Skill[] }`
- **Errors:** `UNAUTHORIZED`

### GET /api/skills/:id
- **Auth:** required
- **Response:** `{ skill: Skill }`
- **Errors:** `UNAUTHORIZED`, `FORBIDDEN` (not owner), `NOT_FOUND`

### PUT /api/skills/:id
- **Auth:** required
- **Request:** `{ content?: string, name?: string }`
- **Response:** `{ skill: Skill }`
- **Errors:** `UNAUTHORIZED`, `FORBIDDEN` (not owner), `NOT_FOUND`, `VALIDATION_ERROR` (empty content)

### DELETE /api/skills/:id
- **Auth:** required
- **Response:** `{ success: true }`
- **Errors:** `UNAUTHORIZED`, `FORBIDDEN` (not owner), `NOT_FOUND`

### POST /api/jack (existing, modified)
- **Auth:** public (rate-limited for anonymous, quota-checked for authenticated)
- **Request:** `{ url: string }`
- **Response:** `{ skills: StructuredSkill[] }` (canonical format, no format param)
- **Flow:** replay cache check → rate limit check (anon) or quota check (auth) → extraction → cache result (anon) → return
- **Errors:** `QUOTA_EXCEEDED` (402, includes `{ jacksUsed, jacksLimit, bonusJacksRemaining, periodEnd }`), `RATE_LIMITED` (429)

### POST /api/checkout
- **Auth:** required
- **Request:** `{ plan: 'pro-monthly' | 'unlimited-monthly' | 'founding-lifetime' | 'topup-3' | 'topup-10' | 'topup-25' }`
- **Response:** `{ url: string }` (Stripe Checkout URL)
- **Errors:** `UNAUTHORIZED`, `VALIDATION_ERROR` (invalid plan slug)
- **Note:** Server maps plan slug → Stripe price ID from env config. Client never sees raw price IDs.

### POST /api/webhook/stripe
- **Auth:** Stripe signature verification via `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)`
- **Request:** Raw body (Stripe event)
- **Response:** `{ received: true }`
- **Idempotency:** Check `processed_events` table before handling. Insert event ID before processing. Skip if already exists.
- **Handlers:** `checkout.session.completed` → update tier + add jacks. `customer.subscription.updated` → upgrade/downgrade. `customer.subscription.deleted` → downgrade to free. `invoice.paid` → reset monthly usage.

### POST /api/billing/portal
- **Auth:** required
- **Response:** `{ url: string }` (Stripe Customer Portal URL)
- **Errors:** `UNAUTHORIZED`

### GET /api/usage
- **Auth:** required
- **Response:** `{ jacksUsed: number, jacksLimit: number | null, bonusJacksRemaining: number, periodEnd: string }`
- **Errors:** `UNAUTHORIZED`

### GET /api/user
- **Auth:** required
- **Response:** `{ id: string, email: string, tier: string, isFounder: boolean, createdAt: string }`
- **Errors:** `UNAUTHORIZED`

### DELETE /api/user
- **Auth:** required
- **Request:** `{ confirmEmail: string }` (must match session email)
- **Response:** `{ success: true }`
- **Behavior:** Cascading delete of skills, usage, profile. Stripe subscription cancelled if active.
- **Errors:** `UNAUTHORIZED`, `VALIDATION_ERROR` (email mismatch)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth.js v5 still in beta | API changes between versions | Pin exact version, minimal surface area usage |
| Supabase free tier limits (500MB, 50k rows) | Unlikely to hit early, but possible with growth | Monitor usage, paid tier is $25/mo when needed |
| Stripe webhook delivery failures | Missed payment events → wrong tier | Implement reconciliation job (manual initially, cron later). Log all raw events. |
| Stripe webhook ordering not guaranteed | Out-of-order events corrupt state | Idempotent handlers that check current state before mutating. Event dedup table. |
| Format toggle fix breaks existing UX | Users see different behavior | Format toggle should feel identical — same output, just no loading state (faster = better) |
| localStorage migration data loss | Users lose skills on auth transition | Detect localStorage skills on first login, explicit import with dedupe preview |
| proxy.ts Windows issues | [Known Next.js 16 bug](https://github.com/vercel/next.js/issues/85243) with proxy.ts on Windows + `next start` | Dev uses `next dev` (works fine). Prod is on Vercel (Linux). Monitor for fixes. |

## Acceptance Criteria

1. User can sign up via magic link email and maintain session across browser restarts
2. Extracted skills persist in DB across sessions; after clearing browser data and re-authenticating, all skills are still accessible
3. Unauthenticated visitors see blurred skill preview with signup CTA after extraction
4. Format toggle switches output format instantly without re-calling extraction API
5. Free users are limited to 3 extractions per month; 402 with `QUOTA_EXCEEDED` returned when exceeded
6. Pro users get 50 extractions per month; usage counter visible in header
7. After successful Stripe webhook processing, user tier is updated correctly
8. Duplicate or out-of-order Stripe webhook events do not corrupt entitlement state
9. Reconciliation path exists for failed/delayed webhooks (manual check + fix script)
10. Top-up purchase adds bonus jacks (`bonusJacksRemaining`) that do not reset monthly and are consumed only after monthly allocation is exhausted
11. Existing localStorage skills can be imported on first login with dedupe preview
12. Anonymous visitors rate-limited to 3 extractions per IP per 24h via shared KV store
13. Pricing page displays all tiers with working checkout links
14. Repeated extraction of the same video by the same anonymous visitor within the replay window returns the cached result and does not consume another anonymous allowance
15. All API error responses use the standard `ApiError` envelope
16. Skill API routes enforce ownership server-side — 403 if authenticated user doesn't own the resource

## Validation Strategy

**Phase A0:**
- Toggle format on extracted skills → verify no network request to `/api/jack`, instant switch
- Verify all three formats (claude/cursor/windsurf) render correctly from canonical data

**Phase A1:**
- Sign up with email → receive magic link → click → verify session cookie set
- Refresh page → verify still authenticated
- Sign out → verify session cleared
- Visit `/dashboard` while logged out → verify redirect to login

**Phase A2:**
- Extract skills while logged in → verify row created in Supabase `skills` table
- Refresh dashboard → verify skills load from DB
- Delete skill → verify removed from DB
- First login with localStorage skills → verify import modal appears with dedupe preview

**Phase A3:**
- Open incognito → extract → verify blurred preview with CTA
- Sign up → verify full skills visible (pending extraction auto-saved from sessionStorage)

**Phase A4:**
- Hit extraction limit (free tier, 3 jacks) → verify 402 response with `QUOTA_EXCEEDED` and top-up modal
- Complete Stripe checkout → verify tier update in DB
- Send same webhook event twice via Stripe CLI → verify credits only added once
- Purchase top-up → verify `bonusJacksRemaining` incremented, extraction succeeds
- Exhaust monthly allocation → verify bonus jacks consumed next (not monthly counter)
- Anonymous extraction → verify rate limit counter in Vercel KV
- Extract same video twice as anonymous → verify cached result returned, rate limit not decremented

**Phase A5:**
- Visit /pricing → verify 3 tiers displayed with correct prices
- Click upgrade → verify Stripe Checkout opens with correct price
- Visit /settings → verify usage display (progress bar, reset date), billing portal link works
- Delete account → verify cascade (skills, usage removed), Stripe subscription cancelled
`