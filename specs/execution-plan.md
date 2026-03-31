# SkillJacked Execution Plan

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Auth provider | Clerk | Hosted UI, magic link built-in, fastest to ship |
| Database | Supabase Postgres | MCP tools available, Postgres + RLS, generous free tier |
| Waitlist | Skip | Tool already works, go straight to monetization |
| ContentJacked | Phase 5 | Ship SkillJacked revenue first |
| MVP definition | Phases 1-2 | Auth + DB + Gated Preview + Stripe + Usage + Pricing |

---

## Phase 1: Foundation (Auth + Database)

**Goal**: Users can sign up, log in, and skills persist across sessions.

**Estimated sessions**: 2-3

### 1A. Clerk Auth Setup
- Install `@clerk/nextjs`
- Add Clerk provider to app layout
- Create sign-in/sign-up pages (Clerk hosted components)
- Magic link configuration in Clerk dashboard
- Auth middleware for protected routes
- Header: show user email + sign out (replace current auth modal)
- **Files**: `layout.tsx`, `middleware.ts`, new `app/sign-in/`, `app/sign-up/`, `components/header.tsx`

### 1B. Supabase Database + Skill Persistence
- Create Supabase project
- Users table (synced from Clerk via webhook):
  ```
  id, clerk_id, email, tier, stripe_customer_id, is_founder, created_at
  ```
- Skills table:
  ```
  id, user_id, name, slug, description, content, source_title, source_url,
  source_video_id, format, metadata (jsonb), is_edited, original_content,
  created_at, updated_at
  ```
- API routes: GET/PUT/DELETE `/api/skills`
- Migrate dashboard from localStorage to Supabase
- Clerk webhook endpoint to sync user creation
- **Files**: Supabase migrations, `lib/supabase.ts`, `app/api/skills/route.ts`, `app/api/webhooks/clerk/route.ts`, update `dashboard/page.tsx`

### 1C. Gated Preview
- Extraction works without auth (no change to `/api/jack`)
- After extraction: show skill names + first 3 lines, blur the rest
- CTA overlay: "Sign up free to unlock"
- After signup: full skills visible, download/copy buttons appear
- Store extraction result in localStorage for restore after signup
- **Files**: update `page.tsx`, new `components/gated-skill-preview.tsx`

---

## Phase 2: Monetization (Stripe + Usage + Pricing)

**Goal**: Users can pay. Free tier limited to 3 jacks. Pro/Unlimited tiers work.

**Estimated sessions**: 2-3

### 2A. Stripe Integration
- Create Stripe products/prices (Pro $12, Unlimited $29, top-ups)
- `POST /api/checkout` — create Checkout session
- `POST /api/webhooks/stripe` — handle events:
  - `checkout.session.completed` → update tier / add jacks
  - `customer.subscription.updated` → handle upgrades/downgrades
  - `customer.subscription.deleted` → downgrade to free
  - `invoice.paid` → reset monthly usage
- `POST /api/billing/portal` — Stripe Customer Portal
- **Files**: `lib/stripe.ts`, `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/billing/portal/route.ts`

### 2B. Usage Tracking
- Usage table:
  ```
  id, user_id, jacks_used, jacks_limit, bonus_jacks, chains_used,
  chains_limit, period_start, period_end
  ```
- Increment jacks_used on each extraction (update `/api/jack`)
- Check limit before extraction, return 402 if exceeded
- Header displays "X jacks remaining"
- **Files**: Supabase migration, update `app/api/jack/route.ts`, `lib/usage.ts`, update header component

### 2C. Top-Up + Limit Modal
- When at limit: modal with 3 pack options + upgrade CTA
- Stripe Checkout for one-time top-up payments
- Bonus jacks added on purchase (never expire)
- **Files**: new `components/limit-modal.tsx`, update `page.tsx`

### 2D. Pricing Page
- Three-column layout: Free / Pro ($12) / Unlimited ($29)
- Bundle section below
- FAQ section
- CTA buttons → Stripe Checkout
- **Files**: new `app/pricing/page.tsx`

### 2E. Account Settings
- Profile section (email, current plan)
- Usage display with progress bar
- Manage subscription → Stripe Portal
- Delete account
- **Files**: new `app/settings/page.tsx`, `app/api/user/route.ts`

---

## Phase 3: Product Polish

**Goal**: Better extraction quality, better library UX.

**Estimated sessions**: 2

### 3A. Prompt Optimization
- Update segmenter prompt: target 4-8 segments, skip fluff, quality scoring
- Update skill generator prompt: IF/THEN format, preserve voice, 50-100 lines
- **Files**: `packages/core/src/transformer/runtime-prompts.ts`

### 3B. Skill Search + Filter
- Search bar on library page (client-side)
- Filter pills: All / Claude / Cursor / Windsurf
- Matches skill name, description, source title
- **Files**: update `app/dashboard/page.tsx` or `app/library/page.tsx`

### 3C. Bulk Export
- Checkbox selection on skill cards
- Floating action bar: "X selected" + "Download All"
- Client-side zip via JSZip
- **Files**: update library page, add `lib/export.ts`

### 3D. Skill Editing
- Editable skill content in preview modal
- Save changes + reset to original
- "Edited" badge on cards
- **Files**: update skill preview component, update `/api/skills/:id`

### 3E. Skill Metadata Extraction
- Secondary Claude call after skill generation
- Extract: triggers, capabilities, outputs, phase, pairsWith
- Store in skill metadata jsonb column
- **Files**: new `packages/core/src/transformer/metadata-extractor.ts`, update skill-generator pipeline

---

## Phase 4: Skill Chains

**Goal**: User enters goal, system builds execution chain from their skills.

**Estimated sessions**: 2-3

### 4A. Chain Builder API
- `POST /api/chains/build` — goal in, chain + prompt out
- Chain logic: fetch skills with metadata → Claude picks 2-5 → orders by dependency → detects gaps → generates execution prompt
- Chains table in Supabase
- `POST /api/chains/save`, `GET /api/chains`, `DELETE /api/chains/:id`
- **Files**: `app/api/chains/route.ts`, `lib/chain-builder.ts`, Supabase migration

### 4B. Chain UI
- `/chains` page with goal input
- Result: vertical chain of skill cards with connecting lines
- "Why this chain" explanation
- Gap detection with alert boxes
- Execution prompt in code block (copy/download)
- Saved chains tab
- **Files**: `app/chains/page.tsx`, `components/chain-view.tsx`, `components/chain-card.tsx`

---

## Phase 5: ContentJacked

**Goal**: Second product — extract viral content patterns from YouTube videos.

**Estimated sessions**: 3-4

### 5A. Theme System + Landing Page
- Route-based theming: `/content` path gets cyan accent
- Same layout, different copy and colors
- Theme provider based on route
- **Files**: `lib/theme.ts`, `app/content/page.tsx`, shared components with theme props

### 5B. Content Extraction API
- `POST /api/analyze` — YouTube URL in, content analysis out
- New extraction prompt (hook, structure, retention plays, template)
- Templates table in Supabase
- **Files**: `app/api/analyze/route.ts`, new `packages/core/src/transformer/content-analyzer.ts`, Supabase migration

### 5C. Analysis Result Page
- Video metadata header
- Collapsible sections: Hook / Structure / Retention / Why It Worked / Template
- Copy/download/save actions
- **Files**: `app/content/result/page.tsx`, `components/content-analysis.tsx`

### 5D. Templates Library
- Grid view of saved templates
- Search + filter by pattern type
- **Files**: `app/content/templates/page.tsx`

---

## Phase 6: Platform Features

**Goal**: Cross-product features, growth tools.

**Estimated sessions**: 2-3

### 6A. Universal Credits (Bundle)
- Single usage record serves both products
- Both `/api/jack` and `/api/analyze` decrement same counter
- Tier flags: hasSkillJacked, hasContentJacked, isBundle
- **Files**: update usage tracking, update Supabase user schema

### 6B. Dual Mode Extraction
- Toggle on extraction page (Unlimited only): Skills / Patterns / Both
- Parallel extraction, tabbed result
- 2 jacks for dual mode
- **Files**: update extraction UI, update `/api/jack` route

### 6C. Affiliate System
- `/affiliate` page with referral code + dashboard
- Track `?ref=` param via cookie (60 days)
- Credit affiliate on first payment (30% recurring)
- Affiliates + referrals tables
- **Files**: `app/affiliate/page.tsx`, `app/api/affiliate/route.ts`, Supabase migration, update Stripe webhook

---

## Execution Strategy

| Phase | Strategy | Why |
|-------|----------|-----|
| 1A (Auth) | Single session | Sequential Clerk wiring |
| 1B (DB) | Single session | Sequential migrations + API routes |
| 1C (Gated) | Single session | Small, depends on 1A |
| 2A-2E | Subagents | Stripe, usage, pricing page can partially parallel |
| 3A-3E | Subagents | All independent, high parallelism |
| 4A-4B | Single session | Tightly coupled API + UI |
| 5A-5D | Subagents | Theme, API, UI can parallel |
| 6A-6C | Sequential | Each builds on previous |

---

## Critical Path to Revenue

```
Phase 1A (Auth) → Phase 1B (DB) → Phase 2A (Stripe) → Phase 2B (Usage) → LAUNCH
                → Phase 1C (Gated Preview) ────────────────────────────────↗
```

Everything in Phase 3+ can ship post-launch as incremental improvements.

**Minimum viable launch = Phases 1 + 2 ≈ 4-6 sessions.**
