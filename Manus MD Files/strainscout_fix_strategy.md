# StrainScout MD — Fix Strategy and Testing Plan

**Prepared for:** Claude Code Review Handoff
**Date:** March 16, 2026
**Audit Source:** 6-Role Intensive Pre-Handoff Audit (Post-Sprint 14)
**Total Findings:** 23 (0 critical, 13 medium, 10 low)

---

## Executive Summary

This document provides a prioritized fix strategy for all 23 findings from the intensive 6-role audit of StrainScout MD. Each finding includes the root cause, the proposed fix with specific file and line references, estimated effort, and a concrete test to verify the fix. Findings are grouped into 4 implementation batches ordered by impact and dependency.

---

## Batch 1: Real Bugs (Fix First — User-Facing Impact)

### Finding #24: PriceUpdateForm Does Not Invalidate Cache After Submission

**Severity:** Medium | **Category:** Bug | **Effort:** 10 min

**Root Cause:** In `client/src/pages/PartnerPortal.tsx`, the `PriceUpdateForm` component's `submitPriceMutation` has an `onSuccess` handler that resets form state and shows a toast, but does not call `trpc.useUtils().partners.myPriceUpdates.invalidate()` or `trpc.useUtils().partners.myStats.invalidate()`. The "Recent Submissions" list in `PartnerDashboard` uses `trpc.partners.myPriceUpdates.useQuery()`, which retains stale cache data until the user manually refreshes the page.

**Fix:**
```typescript
// File: client/src/pages/PartnerPortal.tsx
// In the PriceUpdateForm component, find the submitPriceMutation definition.
// Add invalidation calls to the onSuccess handler:

const utils = trpc.useUtils();

const submitPriceMutation = trpc.partners.submitPrice.useMutation({
  onSuccess: () => {
    // ... existing toast and form reset logic ...
    utils.partners.myPriceUpdates.invalidate();
    utils.partners.myStats.invalidate();
  },
  // ... existing onError ...
});
```

**Test Plan:**
1. **Vitest:** Add a test in `server/partners.test.ts` that submits a price update and verifies the returned object has the expected shape (already exists — the DB layer is tested).
2. **Manual browser test:** Log in as a verified partner, submit a price update, and confirm the "Recent Submissions" list updates immediately without a page refresh.
3. **Regression:** Verify the toast still appears and the form resets after submission.

---

### Finding #2: Race Condition in claimDispensary() — Poor Error UX

**Severity:** Medium | **Category:** Bug | **Effort:** 15 min

**Root Cause:** `server/db.ts` function `claimDispensary()` uses a SELECT-then-INSERT pattern. The `dispensarySlug` column has a UNIQUE constraint, so duplicate claims are prevented at the database level. However, when the constraint fires, the error propagated to the client is a raw MySQL duplicate key error (e.g., `ER_DUP_ENTRY: Duplicate entry 'curaleaf-...' for key 'dispensary_partners.dispensarySlug'`), which leaks schema information and is not user-friendly.

**Fix:**
```typescript
// File: server/db.ts — claimDispensary function
// Wrap the INSERT in a try/catch that detects the duplicate key error:

export async function claimDispensary(data: Omit<InsertDispensaryPartner, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db.insert(dispensaryPartners).values(data).$returningId();
    return { id: result.id, ...data };
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
      throw new Error("This dispensary has already been claimed by another user.");
    }
    throw err;
  }
}
```

Also update the tRPC procedure in `server/routers.ts` to use a TRPCError:
```typescript
// File: server/routers.ts — partners.claim procedure
// Wrap the claimDispensary call:
try {
  const partner = await claimDispensary({ ... });
  // ... notify owner ...
  return partner;
} catch (err: any) {
  if (err.message.includes("already been claimed")) {
    throw new TRPCError({ code: "CONFLICT", message: err.message });
  }
  throw err;
}
```

**Test Plan:**
1. **Vitest:** Add a test in `server/partners.test.ts` that attempts to claim the same dispensary slug twice and asserts the second attempt throws with message "already been claimed" (not a raw MySQL error).
2. **Manual:** Attempt to claim a dispensary that's already claimed and verify the toast shows a friendly error message.

---

### Finding #3: AdminPartners expandedItem Collision (ID + 10000 Hack)

**Severity:** Low | **Category:** Bug | **Effort:** 15 min

**Root Cause:** `client/src/pages/AdminPartners.tsx` uses a single `expandedItem` state (number | null) to track which row is expanded. Partner claims use their raw `id`, and price updates use `pu.id + 10000` to avoid collisions. If a partner claim has `id > 10000`, or if `pu.id + 10000` equals a claim `id`, the expand/collapse behavior breaks.

**Fix:** Replace the single numeric state with a typed state that includes the entity type:
```typescript
// File: client/src/pages/AdminPartners.tsx
// Replace:
const [expandedItem, setExpandedItem] = useState<number | null>(null);

// With:
const [expandedItem, setExpandedItem] = useState<{ type: "claim" | "price"; id: number } | null>(null);

// Then update all toggle calls:
// For claims: setExpandedItem(prev => prev?.type === "claim" && prev.id === p.id ? null : { type: "claim", id: p.id })
// For prices: setExpandedItem(prev => prev?.type === "price" && prev.id === pu.id ? null : { type: "price", id: pu.id })

// And update all expanded checks:
// For claims: expandedItem?.type === "claim" && expandedItem.id === p.id
// For prices: expandedItem?.type === "price" && expandedItem.id === pu.id
```

**Test Plan:**
1. **Manual:** Open `/admin/partners`, expand a partner claim, then switch to the Price Updates tab and expand a price update. Verify they don't interfere with each other.
2. **Regression:** Verify expand/collapse still works correctly for both tabs.

---

## Batch 2: Code Quality and Maintainability

### Finding #4 + #26: Slugify Function Duplicated 6 Times

**Severity:** Medium | **Category:** Code Quality | **Effort:** 15 min

**Root Cause:** The same `slugify()` function is defined in 4 files as a named function and used inline in 2 places in `StrainDetail.tsx`. If the algorithm needs to change (e.g., to handle unicode dispensary names or match a different slug format), all 6 locations must be updated.

**Fix:** Extract to a shared utility:
```typescript
// File: shared/utils.ts (NEW FILE)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
```

Then update all 6 locations:
- `client/src/pages/DispensaryDirectory.tsx:19` — remove local function, import from `@shared/utils`
- `client/src/pages/DispensaryDetail.tsx:23` — remove local function, import from `@shared/utils`
- `client/src/pages/DispensaryCompare.tsx:26` — remove local function, import from `@shared/utils`
- `client/src/pages/PartnerPortal.tsx:35` — remove local function, import from `@shared/utils`
- `client/src/pages/StrainDetail.tsx:414` — replace inline `dName.toLowerCase().replace(...)` with `slugify(dName)`
- `client/src/pages/StrainDetail.tsx:452` — replace inline usage with `slugify(dName)`

**Test Plan:**
1. **Vitest:** Add a test in a new `shared/utils.test.ts` that verifies `slugify("Curaleaf - Reisterstown")` returns `"curaleaf---reisterstown"` and edge cases like empty strings, special characters, and leading/trailing hyphens.
2. **Regression:** Navigate to `/dispensaries`, `/dispensary/curaleaf-reisterstown`, `/compare/dispensaries`, `/partner`, and a strain detail page. Verify all dispensary links still resolve correctly.

---

### Finding #5: 30+ Unused Imports Across 12 Pages

**Severity:** Medium | **Category:** Code Quality | **Effort:** 20 min

**Root Cause:** Dead imports accumulated over 14 sprints as features were refactored. These include unused Lucide icons, unused type imports, and unused analytics functions that were imported but never called (meaning those user interactions are silently untracked).

**Fix:** Remove all unused imports. The complete list:

| File | Unused Imports |
|------|---------------|
| `AdminPartners.tsx` | `User`, `BadgeCheck`, `Send` |
| `Alerts.tsx` | `isEditing` (unused variable) |
| `CompareStrains.tsx` | `Beaker`, `trackPriceCompared` |
| `Deals.tsx` | `Percent`, `DollarSign`, `ArrowRight`, `CatalogStrain`, `dbLoading` |
| `DispensaryCompare.tsx` | `TrendingDown`, `Hash`, `CatalogStrain` |
| `DispensaryDetail.tsx` | `BadgeCheck`, `CatalogStrain` |
| `Home.tsx` | `CatalogStrain` |
| `MapView.tsx` | `Link`, `ExternalLink`, `Clock`, `Footer`, `trackMapInteracted` |
| `MarketDashboard.tsx` | `Legend` |
| `Moderation.tsx` | `AlertTriangle` |
| `PartnerPortal.tsx` | `ArrowRight`, `user` (from useAuth destructure) |
| `StrainDetail.tsx` | `trackOutboundLinkClicked`, `trackDispensaryClicked` |

**Important note on analytics:** `trackPriceCompared` (CompareStrains), `trackMapInteracted` (MapView), `trackOutboundLinkClicked` (StrainDetail), and `trackDispensaryClicked` (StrainDetail) are imported but never called. This means these user interactions are NOT being tracked despite the analytics functions existing. The reviewer should decide whether to:
- (a) Remove the imports (accept that these events won't be tracked), or
- (b) Wire them up to the appropriate user interactions (recommended — these are high-value events)

**Recommended approach for option (b):**
- `trackPriceCompared`: Call when user adds strains to the compare table in CompareStrains
- `trackMapInteracted`: Call on map pan/zoom/marker click events in MapView
- `trackOutboundLinkClicked`: Call when user clicks Leafly/Weedmaps links in StrainDetail
- `trackDispensaryClicked`: Call when user clicks a dispensary row in StrainDetail

**Test Plan:**
1. **TypeScript:** Run `npx tsc --noEmit --noUnusedLocals` and verify 0 warnings.
2. **Build:** Run `pnpm build` and verify bundle size decreases slightly.
3. **Regression:** Spot-check each modified page loads without errors.

---

### Finding #7: Partner Procedures Call getPartnerByUserId 3 Times

**Severity:** Medium | **Category:** Code Quality | **Effort:** 20 min

**Root Cause:** In `server/routers.ts`, the `submitPrice`, `myPriceUpdates`, and `myStats` procedures each independently call `getPartnerByUserId(ctx.user.id)`. When a user visits the partner dashboard, all three queries fire, resulting in 3 identical DB queries.

**Fix:** Create a tRPC middleware that enriches the context with the partner record:
```typescript
// File: server/routers.ts
// Add a partnerProcedure that loads the partner once:

const partnerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const partner = await getPartnerByUserId(ctx.user.id);
  return next({ ctx: { ...ctx, partner } });
});

// Then refactor submitPrice, myPriceUpdates, myStats to use partnerProcedure
// and access ctx.partner instead of calling getPartnerByUserId again.
```

**Test Plan:**
1. **Vitest:** Existing partner tests should still pass (they test the DB layer, not the middleware).
2. **Manual:** Visit `/partner` as a verified partner and verify the dashboard loads correctly with stats and price history.
3. **Performance:** Add a temporary `console.log` in `getPartnerByUserId` to count calls — should be 1 per page load instead of 3.

---

### Finding #16: ComponentShowcase.tsx Has console.log

**Severity:** Low | **Category:** Code Quality | **Effort:** 2 min

**Root Cause:** Line 197 of `client/src/pages/ComponentShowcase.tsx` has `console.log("Dialog submitted with value:", dialogInput)` — a development artifact.

**Fix:** Remove the `console.log` line.

**Test Plan:** Run `grep -rn "console.log" client/src/pages/` and verify 0 results in production pages.

---

## Batch 3: Performance Optimization

### Finding #8: Bundle Size — 919KB Main Chunk

**Severity:** Medium | **Category:** Performance | **Effort:** 30 min

**Root Cause:** The Vite build produces a single 919KB main chunk containing React, tRPC, TanStack Query, superjson, and all shared code. No manual chunk splitting is configured in `vite.config.ts`.

**Fix:** Add manual chunks to `vite.config.ts`:
```typescript
// File: vite.config.ts — inside the build.rollupOptions section:
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-trpc': ['@trpc/client', '@trpc/react-query', '@tanstack/react-query', 'superjson'],
        'vendor-ui': ['sonner', 'lucide-react'],
      },
    },
  },
},
```

**Test Plan:**
1. **Build:** Run `pnpm build` and verify the main chunk is under 500KB.
2. **Manual:** Load the site in an incognito browser and verify all pages still work (chunk loading is correct).
3. **Lighthouse:** Run a Lighthouse performance audit and compare the "Total Blocking Time" before and after.

---

### Finding #9 + #28: verifiedSlugs Query Has No staleTime

**Severity:** Medium | **Category:** Performance | **Effort:** 5 min

**Root Cause:** In `client/src/pages/StrainDetail.tsx`, `trpc.partners.verifiedSlugs.useQuery()` uses the default `staleTime` of 0. This means every time a user navigates to a strain detail page, it re-fetches all verified dispensary slugs from the server. Verified partners change rarely (admin action required), so this is wasteful.

**Fix:**
```typescript
// File: client/src/pages/StrainDetail.tsx
// Change:
const { data: verifiedSlugs } = trpc.partners.verifiedSlugs.useQuery();
// To:
const { data: verifiedSlugs } = trpc.partners.verifiedSlugs.useQuery(undefined, {
  staleTime: 5 * 60 * 1000, // 5 minutes — verified partners change rarely
});
```

Also apply the same pattern to `trpc.partners.verifiedPrices.useQuery()`:
```typescript
const { data: partnerPrices } = trpc.partners.verifiedPrices.useQuery(
  { strainId: params.id },
  { enabled: !!params.id, staleTime: 2 * 60 * 1000 } // 2 minutes
);
```

**Test Plan:**
1. **Manual:** Navigate between 3 different strain detail pages and check the Network tab — `verifiedSlugs` should only fire once (subsequent navigations use cache).
2. **Regression:** Verify partner badges still appear correctly on strain pages.

---

### Finding #10 + #27: No DB Error Handling in Most DB Helpers

**Severity:** Medium | **Category:** Performance/Security | **Effort:** 30 min

**Root Cause:** Of 54 async DB functions in `server/db.ts`, only 3 have try/catch blocks. When the database connection drops or a query fails, raw MySQL errors propagate to the tRPC error boundary and are sent to the client. These errors may contain schema information (table names, column names, constraint names).

**Fix:** Add a wrapper function that catches DB errors and returns sanitized messages:
```typescript
// File: server/db.ts — add at the top:

class DatabaseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

async function withDbErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
  try {
    return await operation();
  } catch (err: any) {
    console.error(`[DB Error] ${context}:`, err);
    if (err?.code === "ER_DUP_ENTRY") {
      throw new DatabaseError("A record with this information already exists.");
    }
    if (err?.code === "ECONNREFUSED" || err?.code === "PROTOCOL_CONNECTION_LOST") {
      throw new DatabaseError("Database connection unavailable. Please try again.");
    }
    throw new DatabaseError(`Operation failed: ${context}. Please try again.`);
  }
}
```

Then wrap the highest-risk functions (those that INSERT or UPDATE):
- `claimDispensary` (already addressed in Finding #2)
- `submitPartnerPrice`
- `submitStrainComment`
- `submitStrainVote`
- `createPriceAlert`
- `updatePriceAlert`
- `insertEmailSignup`

**Test Plan:**
1. **Vitest:** Add a test that mocks a DB connection failure and verifies the error message is sanitized (no table/column names).
2. **Manual:** Temporarily break the DATABASE_URL and verify the error messages shown to users are generic.

---

## Batch 4: UX, Accessibility, and Data Integrity

### Finding #6: No Client-Side Email Validation on Partner Claim Form

**Severity:** Medium | **Category:** UX | **Effort:** 10 min

**Root Cause:** The ClaimWizard Step 2 in `PartnerPortal.tsx` only checks `contactEmail.trim()` before allowing the user to advance to Step 3. No format validation is performed. The backend `z.string().email()` catches invalid emails, but the error appears as a generic toast instead of inline feedback.

**Fix:**
```typescript
// File: client/src/pages/PartnerPortal.tsx — ClaimWizard Step 2
// Add a simple email regex check before advancing:

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// In the "Continue" button's disabled condition:
disabled={!businessName.trim() || !contactEmail.trim() || !isValidEmail(contactEmail)}

// Add inline error message:
{contactEmail && !isValidEmail(contactEmail) && (
  <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
)}
```

**Test Plan:**
1. **Manual:** Enter "notanemail" in the contact email field and verify the Continue button is disabled and an inline error appears.
2. **Regression:** Enter a valid email and verify the form advances to Step 3.

---

### Finding #11: Partner Contact Info Exposed Without Audit Logging

**Severity:** Medium | **Category:** Security | **Effort:** 15 min (deferred)

**Root Cause:** The admin partner management page displays `contactEmail`, `contactPhone`, and `userId` directly. While this is expected for admin pages, there's no audit trail of who accessed this data.

**Fix (Deferred):** This is a nice-to-have for compliance. The recommended approach is to add an `admin_audit_log` table and log admin page views. However, this is low priority for an MVP. **Recommendation: Accept the risk for now and add audit logging in a future sprint.**

**Test Plan:** N/A (deferred).

---

### Finding #12: No Rate Limiting on Partner Claim or Price Submission

**Severity:** Medium | **Category:** Security | **Effort:** 20 min (deferred)

**Root Cause:** A malicious user could spam hundreds of price submissions or claim attempts. The unique constraint prevents duplicate claims, but doesn't prevent spam.

**Fix (Deferred):** Add a simple in-memory rate limiter using a Map:
```typescript
// File: server/rateLimit.ts (NEW FILE)
const limits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
```

Apply to `partners.claim` (5 per hour per user) and `partners.submitPrice` (30 per hour per user).

**Recommendation:** This is medium priority. The unique constraint on claims and the admin review on prices provide some protection. Implement when the app has real traffic.

**Test Plan:**
1. **Vitest:** Test the rate limiter function directly — verify it blocks after N requests and resets after the window.
2. **Manual:** Submit 6 claims rapidly and verify the 6th is rejected.

---

### Finding #13: innerHTML Usage in MapView

**Severity:** Low | **Category:** Security | **Effort:** 5 min

**Root Cause:** Two instances of `innerHTML` assignment in `client/src/pages/MapView.tsx` (lines 219, 371) for map marker content. The content is hardcoded HTML strings (not user input), so XSS risk is minimal.

**Fix:** Replace `innerHTML` with DOM API calls:
```typescript
// Instead of: markerDiv.innerHTML = `<div class="...">...</div>`;
// Use: const inner = document.createElement("div"); inner.className = "..."; markerDiv.appendChild(inner);
```

**Test Plan:** Verify map markers still render correctly on the `/map` page.

---

### Finding #14: Partner Price Expiration Not Enforced on Display

**Severity:** Low | **Category:** Data Integrity | **Effort:** 10 min

**Root Cause:** `getPartnerVerifiedPrices` correctly filters by `expiresAt > now`, so expired prices don't display. However, expired prices remain in "approved" status in the database. There's no background job to update their status.

**Fix:** Add a cleanup step to the `ingestSnapshot` admin procedure (which already runs weekly):
```typescript
// File: server/routers.ts — priceDrops.ingestSnapshot procedure
// After the alert trigger engine runs, clean up expired partner prices:
const db = await getDb();
if (db) {
  await db.update(partnerPriceUpdates)
    .set({ status: "rejected", reviewNote: "Auto-expired" })
    .where(and(
      eq(partnerPriceUpdates.status, "approved"),
      lt(partnerPriceUpdates.expiresAt, new Date())
    ));
}
```

**Test Plan:**
1. **Vitest:** Add a test that creates a partner price with an `expiresAt` in the past, runs the cleanup, and verifies the status changed to "rejected".
2. **SQL:** Query `SELECT COUNT(*) FROM partner_price_updates WHERE status = 'approved' AND expiresAt < NOW()` — should return 0 after cleanup.

---

### Finding #15: No Foreign Key Constraints

**Severity:** Low | **Category:** Data Integrity | **Effort:** 15 min

**Root Cause:** `dispensaryPartners.userId` and `partnerPriceUpdates.partnerId` don't have foreign key constraints. If a user is deleted, their partner records become orphaned.

**Fix:** Add foreign key references in `drizzle/schema.ts`:
```typescript
// In dispensaryPartners:
userId: int("userId").notNull().references(() => users.id),

// In partnerPriceUpdates:
partnerId: int("partnerId").notNull().references(() => dispensaryPartners.id),
```

Then run `pnpm db:push` to apply the migration.

**Test Plan:**
1. **SQL:** Verify `SHOW CREATE TABLE dispensary_partners` includes `FOREIGN KEY (userId) REFERENCES users(id)`.
2. **Regression:** Verify partner claim and price submission still work.

---

### Finding #17: Partner Portal Not in Desktop Nav

**Severity:** Low | **Category:** UX | **Effort:** 10 min

**Root Cause:** The Partner Portal link is only in the mobile extra links dropdown and the footer. Desktop users have no direct navigation path.

**Fix:** Add a "Partner" link to the desktop nav in `client/src/components/Navbar.tsx`:
```typescript
// In the desktop nav links array, add:
{ label: "Partner", href: "/partner" }
```

**Test Plan:** Verify the "Partner" link appears in the desktop nav bar and navigates to `/partner`.

---

### Finding #18 + #22: AdminPartners Back Arrow Goes to /moderation

**Severity:** Low | **Category:** UX | **Effort:** 2 min

**Root Cause:** The back arrow in `AdminPartners.tsx` links to `/moderation` (the comments moderation page) instead of a more logical destination.

**Fix:** Change the back link to `/partner`:
```typescript
// File: client/src/pages/AdminPartners.tsx
// Change: <Link href="/moderation">
// To: <Link href="/partner">
```

**Test Plan:** Click the back arrow on `/admin/partners` and verify it goes to `/partner`.

---

### Finding #20: Voting Section Positioning on Mobile

**Severity:** Low | **Category:** UX | **Effort:** 0 min (Accepted)

**Root Cause:** On mobile, the sidebar stacks below the main content, pushing the voting section far down the page. This is standard responsive behavior for a two-column layout.

**Fix:** No fix needed. The voting section is in the sidebar by design. On mobile, users scroll to reach it. Adding a floating "Rate" button would add complexity without clear benefit at this stage.

**Test Plan:** N/A (accepted behavior).

---

### Finding #23: Partner Portal "Continue with..." Button Text

**Severity:** Low | **Category:** UX | **Effort:** 5 min

**Root Cause:** The dispensary list in the ClaimWizard shows 20 items. The "Continue with..." button text may be unclear.

**Fix:** The button already says "Continue with [dispensary name]" when a dispensary is selected. If no dispensary is selected, it should be disabled. Verify the current behavior is correct and add a "Show more" button if the list is truncated.

**Test Plan:** Open `/partner`, search for a dispensary, select one, and verify the button text shows the dispensary name.

---

### Finding #25: No ARIA Labels on Partner Pages

**Severity:** Medium | **Category:** Accessibility | **Effort:** 20 min

**Root Cause:** `PartnerPortal.tsx` and `AdminPartners.tsx` have 0 `aria-label`, `aria-describedby`, or `role` attributes. Screen readers will struggle with interactive elements.

**Fix:** Add ARIA labels to key interactive elements:
```typescript
// PartnerPortal.tsx — ClaimWizard:
<input aria-label="Search dispensaries" ... />
<button aria-label={`Select ${d.name}`} ... />
<input aria-label="Business name" ... />
<input aria-label="Contact email" ... />
<input aria-label="Contact phone" ... />

// AdminPartners.tsx:
<button aria-label={`Filter by ${status}`} ... />
<button aria-label={`Expand details for ${p.dispensaryName}`} ... />
<button aria-label={`Approve ${p.dispensaryName}`} ... />
<button aria-label={`Reject ${p.dispensaryName}`} ... />
```

**Test Plan:**
1. **Automated:** Run `npx axe-core` or Lighthouse accessibility audit on `/partner` and `/admin/partners`.
2. **Manual:** Tab through the partner claim form with a screen reader and verify all elements are announced.

---

## Implementation Priority and Effort Summary

| Batch | Findings | Total Effort | Priority |
|-------|----------|-------------|----------|
| **Batch 1: Real Bugs** | #24, #2, #3 | 40 min | Immediate |
| **Batch 2: Code Quality** | #4/#26, #5, #7, #16 | 57 min | High |
| **Batch 3: Performance** | #8, #9/#28, #10/#27 | 65 min | High |
| **Batch 4: UX/A11y/Data** | #6, #13, #14, #15, #17, #18/#22, #25 | 77 min | Medium |
| **Deferred** | #11, #12, #19, #20, #23 | — | Low/Future |
| **Total** | 23 findings | ~4 hours | — |

---

## Post-Fix Verification Checklist

After all fixes are applied, run this verification sequence:

1. `npx tsc --noEmit --noUnusedLocals` — 0 errors, 0 warnings
2. `pnpm test` — all tests pass (218+ after new tests)
3. `pnpm build` — succeeds, main chunk under 500KB
4. Browser test: Home → Compare → Strain Detail → Partner Portal → Admin Partners → Moderation
5. Network tab: verify `verifiedSlugs` caches correctly (1 request across 3 strain pages)
6. Partner flow: claim → submit price → verify cache invalidation → admin approve
7. Error handling: temporarily break DB URL and verify sanitized error messages

---

## Notes for Claude Review

1. **The codebase is functional and production-ready** — all 218 tests pass, TypeScript compiles cleanly, and the build succeeds. The findings are optimization opportunities, not showstoppers.

2. **The most impactful fix is #24 (cache invalidation)** — this is the only finding that causes a visible user-facing bug in normal usage.

3. **The analytics gap (#5) is worth discussing** — 4 analytics events are imported but never called, meaning price comparisons, map interactions, outbound link clicks, and dispensary clicks are silently untracked. Wiring these up would significantly improve the analytics coverage.

4. **The bundle size (#8) is typical for a React + tRPC app** — 919KB pre-gzip (270KB gzipped) is within acceptable range for a data-heavy SPA. The manual chunks optimization would improve initial load but is not urgent.

5. **Rate limiting (#12) and audit logging (#11) are deferred** — these are important for production at scale but add complexity that isn't justified for the current user base.
