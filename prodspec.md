# SkillJacked + ContentJacked Technical Specification
## For Claude Code Implementation

---

## PRODUCT OVERVIEW

**SkillJacked** — Extracts executable AI skills from YouTube videos. User pastes URL, gets 10 Claude-ready skill files.

**ContentJacked** — Extracts viral content patterns from YouTube videos. Same workflow, different extraction lens. Outputs templates instead of skills.

**Relationship:** Shared infrastructure, shared auth, separate URLs (skilljacked.com, contentjacked.com), different accent colors (gold vs cyan).

---

## CURRENT STATE (Already Built)

- Landing page at skilljacked.com
- YouTube URL input → transcript fetch → Claude API extraction
- Skill generation (10 per video, ~$0.17-0.21 per extraction)
- Skill preview modal with format toggle (Claude/Cursor/Windsurf)
- Download individual skill / Download all
- Copy to clipboard
- Your Skills library (grid view)

---

## FEATURES TO BUILD

---

### User Authentication

**Goal**: Enable accounts for saving skills, enforcing limits, and billing.

**User-facing behavior**:
1. Visitor lands on site → can paste URL and run extraction
2. Extraction completes → skills shown blurred/truncated (first 3 lines visible, rest blurred)
3. CTA appears: "Sign up free to unlock"
4. Click → signup modal with email input
5. Magic link sent to email
6. User clicks link → logged in, skills fully visible
7. Logged-in state persists across sessions
8. Header shows: user email/avatar + "Sign out" link
9. Settings page accessible from header dropdown

**Backend requirements**:
- Auth provider: NextAuth or Clerk
- User table: `{ id, email, tier, createdAt, stripeCustomerId }`
- Session management (JWT or database sessions)
- Magic link email sending (Resend or similar)
- Middleware to check auth state on protected routes

**Dependencies**: None — this is foundational.

**Open questions**:
- OAuth providers (Google, GitHub) in addition to magic link?
- Decision: Start with magic link only, add OAuth later if needed.

---

### User Database + Skill Persistence

**Goal**: Store users, skills, and usage data permanently.

**User-facing behavior**:
1. User extracts skills → skills auto-save to their library
2. User visits "Your Skills" → sees all saved skills across sessions
3. Skills persist even if browser cleared
4. User can delete skills from library

**Backend requirements**:
- Database: Vercel Postgres or Supabase
- Skills table:
```typescript
{
  id: string
  userId: string
  name: string
  slug: string
  description: string
  content: string
  sourceTitle: string
  sourceUrl: string
  sourceVideoId: string
  format: 'claude' | 'cursor' | 'windsurf'
  metadata: {
    triggers: string[]
    capabilities: string[]
    outputs: string[]
    phase: 'planning' | 'execution' | 'review' | 'learning'
    pairsWith: string[]
  }
  isEdited: boolean
  createdAt: Date
  updatedAt: Date
}
```
- API endpoints:
  - `GET /api/skills` — list user's skills
  - `GET /api/skills/:id` — get single skill
  - `PUT /api/skills/:id` — update skill
  - `DELETE /api/skills/:id` — delete skill

**Dependencies**: User Authentication

**Open questions**: None.

---

### Usage Tracking + Tier Limits

**Goal**: Track jacks per user, enforce tier limits, enable monetization.

**User-facing behavior**:
1. User sees remaining jacks in header: "32 jacks remaining"
2. User attempts extraction when at limit → modal appears (not hard block)
3. Modal shows three options:
   - 3 jacks — $1.99
   - 10 jacks — $4.99
   - Upgrade to Pro — $12/mo
4. User can purchase top-up or upgrade
5. After purchase, extraction continues automatically

**Backend requirements**:
- Usage table:
```typescript
{
  id: string
  userId: string
  jacksUsed: number
  jacksLimit: number // 3 for free, 50 for pro, null for unlimited
  chainsUsed: number
  chainsLimit: number // 0 for free, 10 for pro, null for unlimited
  periodStart: Date
  periodEnd: Date
}
```
- Increment `jacksUsed` on each extraction
- Check limit before extraction, return error if exceeded
- Reset usage on subscription renewal (webhook from Stripe)
- API endpoints:
  - `GET /api/usage` — get current usage
  - `POST /api/usage/increment` — internal, called after extraction

**Dependencies**: User Authentication, Payment System

**Open questions**: None.

---

### Payment System (Stripe)

**Goal**: Enable subscriptions (Pro, Unlimited) and one-time top-up purchases.

**User-facing behavior**:
1. User clicks "Upgrade" → redirected to Stripe Checkout
2. User completes payment → redirected back, tier updated immediately
3. User clicks top-up pack → Stripe Checkout for one-time payment
4. User can manage subscription in account settings (via Stripe Customer Portal)
5. User sees current plan and billing info in account page

**Backend requirements**:
- Stripe products/prices:
  - Pro Monthly: $12/mo
  - Unlimited Monthly: $29/mo
  - Pro Bundle Monthly: $19/mo
  - Unlimited Bundle Monthly: $49/mo
  - Founding Lifetime: $99 one-time
  - Top-up 3 jacks: $1.99 one-time
  - Top-up 10 jacks: $4.99 one-time
  - Top-up 25 jacks: $9.99 one-time
- API endpoints:
  - `POST /api/checkout` — create Stripe Checkout session
  - `POST /api/webhook/stripe` — handle Stripe webhooks
  - `POST /api/billing/portal` — create Customer Portal session
- Webhook handlers:
  - `checkout.session.completed` — update user tier, add jacks
  - `customer.subscription.updated` — handle upgrades/downgrades
  - `customer.subscription.deleted` — downgrade to free
  - `invoice.paid` — reset monthly usage

**Dependencies**: User Authentication

**Open questions**:
- Founding Lifetime purchasers: store as `tier: 'founding'` or `tier: 'unlimited'` with `isFounder: true` flag?
- Decision: Use `tier: 'unlimited'` with `isFounder: true` flag for flexibility.

---

### Gated Preview for Visitors

**Goal**: Let visitors see extraction works, but require signup to access full skills.

**User-facing behavior**:
1. Visitor (no account) pastes URL → extraction runs
2. Extraction completes → 10 skill cards shown
3. Each card shows: skill name + first 2-3 lines of description
4. Rest of card is blurred with overlay
5. Overlay has CTA: "Sign up free to unlock"
6. Click → signup flow
7. After signup → page refreshes, full skills visible
8. Download/copy buttons only appear after login

**Backend requirements**:
- Extraction works without auth (no backend change)
- Frontend: conditional rendering based on auth state
- Skills returned in full from API, truncation is client-side only
- No need to store visitor extractions (they sign up to save)

**Dependencies**: User Authentication

**Open questions**:
- Store visitor extractions temporarily (localStorage) to restore after signup?
- Decision: Yes, store extraction result ID in localStorage, fetch after signup.

---

### Skill Metadata Extraction

**Goal**: Auto-generate metadata per skill for Skill Chains routing.

**User-facing behavior**:
1. User extracts skills → metadata auto-generated (no user action)
2. User views skill details → can see metadata tags (optional, low priority)
3. Skill Chains uses metadata behind the scenes

**Backend requirements**:
- After skill content is generated, make secondary Claude call:
```
Given this skill content, extract:
- triggers: string[] — phrases/situations that activate this skill
- capabilities: string[] — what this skill enables
- outputs: string[] — what this skill produces
- phase: 'planning' | 'execution' | 'review' | 'learning'
- pairsWith: string[] — skill types this chains well with

Return as JSON only.
```
- Store metadata in skill record
- Run on skill creation, not retroactively (or batch backfill once)

**Dependencies**: None (can ship before Skill Chains, enables it)

**Open questions**:
- Batch backfill existing skills or only new skills?
- Decision: New skills only. Backfill as separate migration if needed.

---

### Skill Chains

**Goal**: User enters goal, system picks + orders relevant skills, generates execution prompt.

**User-facing behavior**:
1. User navigates to /chains (new nav item)
2. Sees input: "What are you trying to accomplish?"
3. Types goal: "Build a content automation system using Claude plugins"
4. Clicks "Generate Chain →"
5. Loading state while processing
6. Result shows:
   - Goal displayed at top
   - Vertical chain of skill cards (numbered 1, 2, 3...)
   - Each card: number, skill name, one-line description
   - Cards connected by vertical lines/arrows
   - Click card to expand and see more detail
7. Below chain: "Why this chain" — 2-sentence explanation
8. If gap detected: yellow alert box
   - "Gap detected: No distribution skill for pushing to social channels"
   - Two buttons: "Search my library" | "Extract from YouTube"
9. Execution prompt section:
   - Dark code block with generated prompt
   - Full prompt is: instructions + skill contents + handoff prompts
10. Three action buttons:
    - "Copy Prompt" (gold/primary)
    - "Download .md" (outline)
    - "Save Chain" (outline)
11. Saved chains appear in a "Saved Chains" tab on /chains page

**Backend requirements**:
- API endpoints:
  - `POST /api/chains/build` — input: goal, output: chain + execution prompt
  - `POST /api/chains/save` — save chain for reuse
  - `GET /api/chains` — list saved chains
  - `DELETE /api/chains/:id` — delete saved chain
- Chain builder logic:
```
1. Fetch user's skills with metadata
2. Build skill index: { skillId, name, triggers, capabilities, outputs, phase }
3. Call Claude API with:
   - User's goal
   - Skill index
   - Prompt: "Select 2-5 skills that accomplish this goal. Order by dependency. Explain why."
4. Parse response: ordered skill IDs + rationale
5. Detect gaps: check if workflow has missing steps
6. Generate execution prompt:
   - Template header
   - Each skill content in order
   - Handoff instructions between skills
   - Goal reminder at end
```
- Chains table:
```typescript
{
  id: string
  userId: string
  name: string
  goal: string
  skillIds: string[]
  executionPrompt: string
  rationale: string
  gaps: string[]
  createdAt: Date
}
```

**Dependencies**: User Authentication, Skill Metadata Extraction

**Open questions**:
- Max skills per chain?
- Decision: 2-5 skills. Router prompt enforces this.

---

### Skill Search + Filter

**Goal**: Find skills quickly as library grows.

**User-facing behavior**:
1. User on /library page sees search bar at top
2. Placeholder: "Search skills..."
3. User types → real-time filtering
4. Below search: filter pills — "All" | "Claude" | "Cursor" | "Windsurf"
5. Active filter has gold background
6. Filters combine with search (AND logic)
7. If no results: "No skills found" with suggestion to extract more
8. Search matches: skill name, description, source video title

**Backend requirements**:
- Client-side filtering (skills already loaded)
- If library exceeds ~100 skills, switch to server-side:
  - `GET /api/skills?q=search&format=claude`
- For now: client-side is fine

**Dependencies**: None

**Open questions**: None.

---

### Bulk Export

**Goal**: Download multiple skills as a zip file.

**User-facing behavior**:
1. User on /library page
2. Each skill card has checkbox in top-left corner
3. Checkbox hidden by default, appears on hover (ghost state)
4. User clicks checkbox → card selected (checkbox stays visible)
5. "Select All" checkbox in header area
6. When any selected, floating action bar appears at bottom:
   - "X skills selected"
   - "Download All" button (gold)
   - "Clear Selection" link
7. Click "Download All" → zip file downloads
8. Zip contains one .md file per skill, named by slug

**Backend requirements**:
- Client-side zip generation (JSZip library)
- No backend needed — skills already in client memory
- Generate zip in browser, trigger download

**Dependencies**: None

**Open questions**: None.

---

### Skill Editing

**Goal**: Edit skill content before saving or after.

**User-facing behavior**:
1. User opens skill preview modal
2. Skill content area is now editable (textarea or contenteditable)
3. User makes changes
4. "Save Changes" button appears (gold)
5. "Reset" link appears to revert to original
6. User saves → skill updated in library
7. Skill card shows small "Edited" badge after editing
8. Original content stored so user can reset anytime

**Backend requirements**:
- `PUT /api/skills/:id` already exists
- Add `originalContent` field to skills table (or store on first edit)
- Update `isEdited: true` flag
- Update `updatedAt` timestamp

**Dependencies**: User Authentication (skills must be saved to edit)

**Open questions**: None.

---

### Prompt Optimization (Segmenter)

**Goal**: Improve segment quality — fewer, better segments.

**User-facing behavior**:
1. No visible change — same flow
2. Result: 4-8 high-quality segments instead of 6-12 mixed quality

**Backend requirements**:
- Update segmenter prompt:
```
TARGET: 4-8 segments. Quality over quantity.

SKIP:
- Intros and outros
- Tangents and stories without actionable content
- Q&A sections
- Promotional content
- Repeated points

PRIORITY:
- High: Core frameworks, step-by-step processes, unique insights
- Medium: Supporting examples, case studies
- Low: Context setting, background info

Each segment must contain teachable, actionable content.
```

**Dependencies**: None

**Open questions**: None.

---

### Prompt Optimization (Skill Generator)

**Goal**: Higher quality skill output — denser, more instructive.

**User-facing behavior**:
1. No visible change — same flow
2. Result: Skills are 50-100 lines, use IF/THEN format, preserve source voice

**Backend requirements**:
- Update skill generator prompt:
```
You are SkillJack. Convert transcript excerpt into a Claude skill file.

RULES:
1. INSTRUCT, don't describe. Write commands to Claude, not documentation.
2. PRESERVE VOICE. Include 3-5 exact quotes from source.
3. 50-100 lines max. Every line must change behavior.
4. Description: "Use when [X]. Triggers: [a], [b], [c]"
5. Quick Start = 80% of value in 2 sentences.
6. Workflow = IF/THEN decision tree, not prose steps.
7. Anti-patterns = only real warnings from source, not generic advice.
8. No hallucinated files or resources.

STRUCTURE:
---
name: [slug]
description: "Use when [X]. Triggers: [a], [b], [c]"
---

# [Name]

## Quick Start
[2 sentences — what this does and when to use it]

## Mode
[3-4 lines — voice, energy, persona to adopt]

## Workflow
[IF/THEN decision tree]

## Key Phrases
[3-5 exact quotes from source that capture the essence]

## Anti-Patterns
[Only real warnings from the source]

## Recovery
[IF/THEN for objections or stuck states]

## Success
[2-3 lines — how Claude knows it's done]

## Example
[One concrete example of the skill in action]
```

**Dependencies**: None

**Open questions**: None.

---

### ContentJacked — Landing Page

**Goal**: Launch page for second product.

**User-facing behavior**:
1. User visits contentjacked.com
2. Sees same layout as SkillJacked but:
   - Headline: "Stop guessing. Start winning."
   - Subhead: "Extract the patterns behind viral content"
   - Input: "Paste YouTube URL to analyze"
   - Button: "Analyze →" (cyan instead of gold)
   - Accent color: cyan (#06b6d4) throughout
3. How it works section:
   - Paste — "Drop any top-performing video URL"
   - Extract — "AI analyzes hooks, structure, and retention plays"
   - Apply — "Get templates you can use for your own content"
4. What you get section:
   - Hook Analysis
   - Structure Breakdown
   - Retention Plays
   - Reusable Templates
5. Footer: "From the makers of SkillJacked" with link

**Backend requirements**:
- Can be same Next.js app with route-based theming
- Or separate deployment pointing to same backend
- Decision: Same app, theme based on domain/route

**Dependencies**: None (can build in parallel)

**Open questions**:
- Same repo or separate?
- Decision: Same repo, same app, route-based (/content or subdomain).

---

### ContentJacked — Extraction Prompt

**Goal**: Extract viral content patterns instead of skills.

**User-facing behavior**:
1. User pastes URL on ContentJacked
2. Clicks "Analyze →"
3. Loading state
4. Result shows extracted patterns (see next feature)

**Backend requirements**:
- New extraction prompt:
```
You are ContentJack. Analyze this video transcript to extract what makes it work.

OUTPUT STRUCTURE:

## Hook (0:00-0:30)
- Exact words: "[Quote the first 2-3 sentences]"
- Pattern type: [Contrarian / Curiosity Gap / Challenge / Story / Shock / Question]
- Why it works: [1-2 sentences]

## Structure
Timeline breakdown:
- [0:00-0:15] Hook — [purpose]
- [0:15-1:00] Setup — [purpose]
- [etc.]

## Retention Plays
List each technique:
- [Timestamp] — [Technique]: "[Quote or description]"
Techniques: Open loop, Pattern interrupt, Payoff, Tease, Recap, Visual change

## Why This Worked
3-4 bullet summary of success factors.

## Template For Your Use
Fill-in-the-blank version:
"[Your hook following same pattern]
[Your setup following same structure]
..."
```
- API endpoint:
  - `POST /api/analyze` — input: YouTube URL, output: analysis
- Templates table:
```typescript
{
  id: string
  userId: string
  name: string
  sourceTitle: string
  sourceUrl: string
  sourceVideoId: string
  sourceViews: number
  hook: string
  hookPattern: string
  structure: { timestamp: string, section: string, purpose: string }[]
  retentionPlays: { timestamp: string, technique: string, description: string }[]
  whyItWorked: string
  template: string
  createdAt: Date
}
```

**Dependencies**: User Authentication (for saving)

**Open questions**: None.

---

### ContentJacked — Analysis Result Page

**Goal**: Display extracted content patterns.

**User-facing behavior**:
1. After extraction, user sees result page
2. Header:
   - Video thumbnail (small)
   - Video title
   - View count + channel name
   - "Analyzed" timestamp
3. Collapsible sections:
   - HOOK ANALYSIS (expanded by default)
     - Exact quote
     - Pattern type badge
     - "Why it works" explanation
   - STRUCTURE
     - Timeline breakdown with timestamps
   - RETENTION PLAYS
     - List of techniques with timestamps
   - WHY THIS WORKED
     - Bullet summary
   - TEMPLATE FOR YOUR USE
     - Code block style, copyable
4. Action buttons:
   - "Copy Template" (cyan/primary)
   - "Download .md" (outline)
   - "Save to Library" (outline)

**Backend requirements**:
- Frontend only — data from extraction API

**Dependencies**: ContentJacked Extraction

**Open questions**: None.

---

### ContentJacked — Templates Library

**Goal**: Save and manage extracted templates.

**User-facing behavior**:
1. User navigates to /templates (ContentJacked nav)
2. Grid of saved templates
3. Each card shows:
   - Template name
   - Source video title (truncated)
   - Pattern type badge (Contrarian, Curiosity Gap, etc.)
   - Date saved
   - "Copy" and "View" buttons
4. Search bar: "Search templates..."
5. Filter pills: "All" | "Hooks" | "Structures" | "Full Templates"
6. Empty state: "No templates yet. Analyze a video to get started."

**Backend requirements**:
- `GET /api/templates` — list user's templates
- `GET /api/templates/:id` — get single template
- `DELETE /api/templates/:id` — delete template
- Same patterns as skills library

**Dependencies**: User Authentication, ContentJacked Extraction

**Open questions**: None.

---

### Shared Auth (Both Products)

**Goal**: One account works on both SkillJacked and ContentJacked.

**User-facing behavior**:
1. User signs up on SkillJacked
2. User visits ContentJacked → already logged in
3. Same email, same account, same billing
4. Account page shows usage for both products

**Backend requirements**:
- Single users table serves both
- Auth cookies/sessions work across both domains
- If same domain (skilljacked.com/content), automatic
- If separate domains, need shared auth:
  - Same Clerk/NextAuth project
  - Or custom token validation

**Dependencies**: User Authentication

**Open questions**:
- Same domain or separate?
- Decision: Start with same domain (skilljacked.com + skilljacked.com/content), migrate to separate domains later if needed.

---

### Universal Credit Pool (Bundle Users)

**Goal**: Bundle subscribers share jacks across both products.

**User-facing behavior**:
1. User has Pro Bundle or Unlimited Bundle
2. Usage counter shows: "32 jacks remaining"
3. Same counter on both SkillJacked and ContentJacked
4. 1 jack = 1 skill extraction OR 1 content analysis
5. Top-ups work on both products

**Backend requirements**:
- Single `usage` record per user, not per product
- Both `/api/extract` (skills) and `/api/analyze` (content) decrement same counter
- Tier flags:
  - `hasSkillJacked: boolean`
  - `hasContentJacked: boolean`
  - `isBundle: boolean`

**Dependencies**: User Authentication, Payment System, ContentJacked

**Open questions**: None.

---

### Dual Mode Extraction

**Goal**: Extract skills AND content patterns in one jack (Unlimited tier only).

**User-facing behavior**:
1. Unlimited user sees toggle on extraction page:
   - ○ Skills only (1 jack)
   - ○ Content patterns only (1 jack)
   - ● Both (1.5 jacks) ✨
2. User selects "Both" and extracts
3. Result page has two tabs: "Skills" | "Patterns"
4. User can save from either tab

**Backend requirements**:
- Check tier before allowing dual mode
- Run both extraction prompts (can parallelize)
- Return combined result
- Charge 1.5 jacks (round up to 2 for simplicity?)
- Decision: Charge 2 jacks for dual mode (cleaner math)

**Dependencies**: ContentJacked, Usage Tracking

**Open questions**:
- 1.5 or 2 jacks?
- Decision: 2 jacks (cleaner, still a deal vs. 2 separate extractions).

---

### Affiliate System

**Goal**: Enable referral tracking and payouts for organic growth.

**User-facing behavior**:
1. Logged-in user visits /affiliate
2. Sees their unique referral code and link
3. Dashboard shows:
   - Total referrals
   - Conversions (paid signups)
   - Earnings (pending + paid)
4. Payout request button (if balance > $50)
5. Referred user sees "Referred by [name]" during signup
6. Referred user gets nothing extra (or small discount — TBD)

**Backend requirements**:
- Affiliates table:
```typescript
{
  id: string
  userId: string
  code: string // unique code like "ALEX20"
  referralLink: string // skilljacked.com?ref=ALEX20
  clicks: number
  signups: number
  conversions: number
  earningsTotal: number
  earningsPending: number
  earningsPaid: number
  createdAt: Date
}
```
- Referrals table:
```typescript
{
  id: string
  affiliateId: string
  referredUserId: string
  status: 'signed_up' | 'converted' | 'churned'
  conversionAmount: number
  commission: number // 30% of conversionAmount
  createdAt: Date
}
```
- Track `?ref=` param in URL, store in cookie (60 days)
- On conversion (first payment), credit affiliate
- Commission: 30% recurring
- API endpoints:
  - `GET /api/affiliate` — get affiliate stats
  - `POST /api/affiliate/payout` — request payout
- Payout process: Manual via PayPal/Stripe Transfer (automate later)

**Dependencies**: User Authentication, Payment System

**Open questions**:
- Do referred users get a discount?
- Decision: Not at launch. Add later if needed.

---

### Pricing Page

**Goal**: Clear comparison of tiers to drive upgrades.

**User-facing behavior**:
1. User visits /pricing
2. Three-column layout:
   - Free | Pro ($12/mo) | Unlimited ($29/mo)
3. Each column shows:
   - Price
   - Feature list with checkmarks
   - CTA button
4. Bundle section below:
   - Pro Bundle ($19/mo) — both products
   - Unlimited Bundle ($49/mo) — both products
5. FAQ section at bottom
6. "Founding Member" badge/callout for lifetime deal (if still available)

**Backend requirements**:
- Static page, no backend
- CTA buttons link to Stripe Checkout

**Dependencies**: Payment System

**Open questions**: None.

---

### Account Settings Page

**Goal**: Central place for user to manage account.

**User-facing behavior**:
1. User clicks profile → "Settings"
2. Sections:
   - Profile: Email (read-only), change password (if applicable)
   - Plan: Current tier, usage this month, upgrade button
   - Billing: Manage subscription (links to Stripe Portal)
   - Danger Zone: Delete account
3. Usage display:
   - "23 of 50 jacks used this month"
   - Progress bar
   - "Resets in 12 days"

**Backend requirements**:
- `GET /api/user` — return user profile + usage
- `POST /api/billing/portal` — create Stripe Customer Portal session
- `DELETE /api/user` — delete account (with confirmation)

**Dependencies**: User Authentication, Payment System

**Open questions**: None.

---

### Top-Up Purchase Flow

**Goal**: Let users buy extra jacks when at limit.

**User-facing behavior**:
1. User hits limit during extraction
2. Modal appears (not hard block):
   - "You've used all 50 jacks this month"
   - Three cards:
     - 3 jacks — $1.99 (~$0.66/jack)
     - 10 jacks — $4.99 (~$0.50/jack)
     - 25 jacks — $9.99 (~$0.40/jack)
   - Or: "Upgrade to Unlimited — $29/mo"
   - Small text: "Resets in X days"
3. User clicks pack → Stripe Checkout (one-time payment)
4. After payment → jacks added, extraction continues

**Backend requirements**:
- Stripe one-time products for each pack
- On checkout complete, add jacks to user's `jacksUsed` allowance (or add to `bonusJacks` field)
- Bonus jacks don't reset monthly
- Check: `jacksUsed < jacksLimit + bonusJacks`

**Dependencies**: Payment System, Usage Tracking

**Open questions**:
- Do bonus jacks roll over or expire?
- Decision: Roll over (never expire). Simpler, more user-friendly.

---

### Waitlist Mode (Pre-Launch)

**Goal**: Collect emails before full launch.

**User-facing behavior**:
1. Landing page shows:
   - Same hero content
   - Instead of "Paste URL", show:
     - "Join 247 builders on the waitlist" (live counter)
     - Email input
     - "Join Waitlist" button
   - "Be first to get Skill Chains + founding member pricing"
2. After signup:
   - "You're on the list! We'll email you when it's your turn."
   - Optional: "Move up the list by sharing" (referral program)

**Backend requirements**:
- Waitlist table:
```typescript
{
  id: string
  email: string
  referralCode: string
  referredBy: string | null
  position: number
  status: 'waiting' | 'invited' | 'converted'
  createdAt: Date
}
```
- API endpoints:
  - `POST /api/waitlist` — join waitlist
  - `GET /api/waitlist/count` — get total count
- Email sending for invite batches (manual trigger)

**Dependencies**: None

**Open questions**:
- Build this or go straight to launch?
- Decision: Build this FIRST for initial traction, then switch to full launch mode.

---

## PRICING REFERENCE

### Tiers

| Tier | Price | Jacks/mo | Library | Chains | Formats |
|------|-------|----------|---------|--------|---------|
| Free | $0 | 3 | 10 max | 0 | Claude only |
| Pro | $12/mo | 50 | ∞ | 10/mo | All |
| Unlimited | $29/mo | ∞ | ∞ | ∞ | All + Dual |

### Bundles

| Tier | Price | Products | Jacks |
|------|-------|----------|-------|
| Pro Bundle | $19/mo | Both | 50 universal |
| Unlimited Bundle | $49/mo | Both | ∞ + Dual mode |
| Founding Lifetime | $99 once | Both | ∞ forever |

### Top-Ups

| Pack | Price | Per Jack | Margin |
|------|-------|----------|--------|
| 3 jacks | $1.99 | $0.66 | 70% |
| 10 jacks | $4.99 | $0.50 | 60% |
| 25 jacks | $9.99 | $0.40 | 50% |

---

## BUILD ORDER

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|--------------|
| 1 | User Authentication | M | None |
| 2 | User Database | M | Auth |
| 3 | Gated Preview | S | Auth |
| 4 | Payment System (Stripe) | M | Auth |
| 5 | Usage Tracking | S | Auth, Payments |
| 6 | Top-Up Flow | S | Payments, Usage |
| 7 | Skill Metadata Extraction | M | None |
| 8 | Skill Chains | L | Auth, Metadata |
| 9 | Skill Search/Filter | S | None |
| 10 | Bulk Export | S | None |
| 11 | Skill Editing | S | Auth |
| 12 | Prompt Optimization | M | None |
| 13 | Pricing Page | S | Payments |
| 14 | Account Settings | S | Auth, Payments |
| 15 | ContentJacked Landing | M | None |
| 16 | ContentJacked Extraction | M | Auth |
| 17 | ContentJacked Library | S | Auth, CJ Extraction |
| 18 | Universal Credits | S | CJ, Usage |
| 19 | Dual Mode | S | CJ, Unlimited tier |
| 20 | Affiliate System | M | Auth, Payments |
| 21 | Waitlist Mode | S | None |

**Effort:** S = 1-2 days, M = 3-5 days, L = 1-2 weeks

---

## DESIGN SYSTEM REFERENCE

### SkillJacked

| Element | Value |
|---------|-------|
| Background | #0a0a0f |
| Surface/cards | #141419 |
| Borders | #2a2a35 |
| Accent | #e0c866 (gold) |
| Text primary | #f8fafc |
| Text secondary | #8a8a9a |

### ContentJacked

| Element | Value |
|---------|-------|
| Background | #0a0a0f |
| Surface/cards | #141419 |
| Borders | #2a2a35 |
| Accent | #06b6d4 (cyan) |
| Text primary | #f8fafc |
| Text secondary | #8a8a9a |

---

## END OF SPEC
