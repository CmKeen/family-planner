# Bug Tracker - Family Planner
**Last Updated:** November 3, 2025

> This document tracks all bugs found during comprehensive testing. Updated continuously as testing progresses.

---

## Summary Statistics

**Total Bugs Found:** 3 fixed + 1 critical new + 1 high new + 2 re-confirmed + 1 potential
- 🔴 **Critical:** 4 total (3 fixed ✅, 1 new ⚠️)
- 🟡 **High:** 1 (new)
- 🟢 **Medium:** 2 (re-confirmed, not yet fixed)
- ⚪ **Low:** 0
- ⚠️ **Potential:** 1 (needs verification)

**Launch Blockers:** 1 - BUG-015 (shopping list not auto-generated) 🔴

---

## 🔴 Critical Bugs

### BUG-010: Navigation Route Mismatch (FIXED ✅)
**Status:** ✅ FIXED & VERIFIED
**Severity:** 🔴 Critical
**Discovered:** November 3, 2025 (user report)
**Fixed:** November 3, 2025

**Description:**
Back button from shopping list page navigated to incorrect route, causing white screen.

**Location:**
`frontend/src/pages/ShoppingListPage.tsx:65`

**Root Cause:**
Route mismatch - back button navigated to `/weekly-plan/${planId}` but actual route is `/plan/:planId`

**Impact:**
- Users clicking back button from shopping list got white screen
- No way to return to plan page (complete navigation failure)
- User must use browser back button or manually navigate

**Fix Applied:**
```typescript
// Before:
navigate(`/weekly-plan/${planId}`);

// After:
navigate(`/plan/${planId}`);
```

**Test Results:**
- ✅ Back button navigation works correctly
- ✅ No white screen
- ✅ Zero console errors
- ✅ Verified on November 3, 2025

**Files Modified:**
- `frontend/src/pages/ShoppingListPage.tsx`

---

### BUG-011: Shopping List Missing Product Names (FIXED ✅)
**Status:** ✅ FIXED & VERIFIED
**Severity:** 🔴 Critical
**Discovered:** November 3, 2025 (user report)
**Fixed:** November 3, 2025

**Description:**
Shopping list displayed quantities and units but no product/ingredient names, making list completely unusable.

**Location:**
- `frontend/src/pages/ShoppingListPage.tsx:15` (interface definition)
- `frontend/src/pages/ShoppingListPage.tsx:236` (category view display)
- `frontend/src/pages/ShoppingListPage.tsx:284` (recipe view display)
- `frontend/src/pages/ShoppingListPage.tsx:309` (print view display)

**Root Cause:**
Field name mismatch between frontend and backend:
- Backend API returns: `name` field (matches Prisma schema)
- Frontend interface expected: `ingredientName` field
- Display code read `item.ingredientName` which was `undefined`

**Impact:**
- Shopping list showed "500 g " with no product name
- Users couldn't tell what to buy
- Core feature completely unusable
- Affects all views: category view, recipe view, print view

**Fix Applied:**
```typescript
// Interface (line 15):
interface ShoppingItem {
  id: string;
  name: string;  // Changed from: ingredientName
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  recipeNames?: string[];
}

// Display (lines 236, 284, 309):
{item.quantity} {item.unit} {item.name}  // Changed from: item.ingredientName
```

**Test Results:**
- ✅ All 37 items now show product names correctly
- ✅ Examples verified: "Crème fraîche", "Lait", "Haricots rouges", "Filets de saumon"
- ✅ Works in category view, recipe view, and print view
- ✅ Verified on November 3, 2025

**Files Modified:**
- `frontend/src/pages/ShoppingListPage.tsx`

---

### BUG-013: No 404 Error Page - White Screen on Invalid Routes (FIXED ✅)
**Status:** ✅ FIXED & VERIFIED
**Severity:** 🔴 Critical
**Discovered:** November 3, 2025 (during TEST-NAV-004)
**Fixed:** November 3, 2025

**Description:**
Application has no 404 error page. When users navigate to invalid/non-existent routes, they see a completely blank white screen with no user-facing error message or recovery options.

**Location:**
Missing catch-all route in `frontend/src/App.tsx`

**Root Cause:**
React Router configuration lacks a wildcard catch-all route (`path="*"`) to handle unmatched URLs. When no route matches, React Router renders nothing, resulting in a blank screen.

**Impact:**
- Users who mistype URLs see completely blank white screen
- Users who follow broken/old links see blank screen
- No user-facing error message or guidance
- No "Return to Dashboard" or recovery button
- Only recovery is browser back button (many users don't know this)
- Extremely poor user experience
- Makes application appear broken/crashed

**How to Reproduce:**
1. Navigate to `http://localhost:5173/invalid-route-that-does-not-exist`
2. Observe: Completely blank white screen
3. Console shows: "No routes matched location" warning (not visible to users)
4. No UI elements render at all

**Expected Behavior:**
- Show friendly 404 error page
- Display message like "Page not found" or "Oops! This page doesn't exist"
- Provide "Return to Dashboard" button
- Optionally show navigation menu or helpful links
- Maintain consistent application layout/branding

**Recommended Fix:**
Add catch-all route in `App.tsx`:

```typescript
// In App.tsx routes configuration
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  {/* ... other routes ... */}

  {/* Add catch-all route at the end */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

Create `NotFoundPage.tsx`:
```typescript
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Page non trouvée</p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Retour au tableau de bord
      </button>
    </div>
  );
}
```

**Fix Applied:**

1. **Created NotFoundPage component** (`frontend/src/pages/NotFoundPage.tsx`):
   - Clean, user-friendly 404 error page
   - Large "404" heading with friendly error message
   - Two action buttons: "Go Back" (browser history) and "Dashboard" (navigate home)
   - Helpful suggestion links to Recipes and Family pages
   - Fully responsive with gradient background and centered card design
   - Uses Lucide icons (Home, ArrowLeft)

2. **Added catch-all route** in `frontend/src/App.tsx`:
   ```typescript
   <Route path="*" element={<NotFoundPage />} />
   ```
   - Placed at the end of routes configuration
   - Catches all unmatched URLs

3. **Added translations** in all 3 languages:
   - French: "Page non trouvée" with full description
   - English: "Page Not Found" with full description
   - Dutch: "Pagina niet gevonden" with full description
   - Includes translations for all buttons and suggestions

**Test Results:**
- ✅ Initial test: TEST-NAV-004 FAILED (blank white screen)
- ✅ After fix: Beautiful 404 page renders correctly
- ✅ URL tested: `/invalid-route-that-does-not-exist`, `/this-page-does-not-exist`
- ✅ Result: Professional 404 error page with clear messaging
- ✅ "Dashboard" button navigates correctly (to login or dashboard)
- ✅ "Go Back" button works (browser history)
- ✅ Suggestion links visible ("Recettes", "Famille")
- ✅ Console: Zero errors
- ✅ All translations working correctly in French
- ✅ Verified on November 3, 2025

**Files Modified:**
- `frontend/src/App.tsx` - Added catch-all route
- `frontend/src/pages/NotFoundPage.tsx` - Created new page (NEW FILE)
- `frontend/src/locales/fr.json` - Added 404 + navigation translations
- `frontend/src/locales/en.json` - Added 404 + navigation translations
- `frontend/src/locales/nl.json` - Added 404 + navigation translations

---

### BUG-015: Shopping List Not Auto-Generated on Validation (NEW ⚠️)
**Status:** ⚠️ NEW - NEEDS FIX
**Severity:** 🔴 Critical
**Discovered:** November 3, 2025 (during TEST-DATA-002)
**Priority:** LAUNCH BLOCKER

**Description:**
The plan validation dialog promises "Valider ce plan hebdomadaire ? Cela générera la liste de courses" (This will generate the shopping list), but after clicking "Valider", the shopping list is NOT generated. When users click "Voir la liste de courses", they get stuck on an infinite loading screen.

**Location:**
- `frontend/src/pages/WeeklyPlanPage.tsx` - Validation handler
- `backend/src/controllers/weeklyPlan.controller.ts` - Validate endpoint

**Root Cause:**
The backend `/api/weekly-plans/:planId/validate` endpoint only updates the plan status to "VALIDATED" but does NOT call the shopping list generation service. The frontend then tries to fetch a shopping list that doesn't exist, resulting in 404 errors and infinite loading.

**Impact:**
- Users click "Valider le plan" expecting shopping list generation
- They see validation success and "Voir la liste de courses" button appears
- Clicking the button shows "Chargement de la liste..." forever
- API returns 404: "Shopping list not found"
- Users are completely stuck with no way to access shopping list
- No error message shown to user - just infinite loading
- Core feature completely unusable without technical workaround

**How to Reproduce:**
1. Create a weekly plan with meals
2. Click "Valider le plan" button
3. Accept validation dialog ("Cela générera la liste de courses...")
4. Observe: Validation succeeds, button changes to "Voir la liste de courses"
5. Click "Voir la liste de courses"
6. Observe: Page shows "Chargement de la liste..." forever
7. Check Network tab: GET `/api/shopping-lists/{planId}` returns 404
8. Check console: "Shopping list not found" error

**Expected Behavior:**
- When user validates plan, backend should automatically generate shopping list
- When user clicks "Voir la liste de courses", list should display immediately
- No 404 errors, no infinite loading

**Technical Details:**
```javascript
// Current flow (BROKEN):
1. POST /api/weekly-plans/:planId/validate
   → Updates plan.status = "VALIDATED"
   → Returns success
2. GET /api/shopping-lists/:planId
   → Returns 404 (shopping list doesn't exist yet)

// Expected flow (FIX NEEDED):
1. POST /api/weekly-plans/:planId/validate
   → Updates plan.status = "VALIDATED"
   → Automatically calls generateShoppingList()
   → Returns success
2. GET /api/shopping-lists/:planId
   → Returns existing shopping list
```

**Workaround (Technical Users Only):**
Manually call generation API via browser console:
```javascript
fetch('http://localhost:3001/api/shopping-lists/generate/{planId}', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer {token}' }
})
```

**Recommended Fix:**
Update `weeklyPlan.controller.ts` validate endpoint:
```typescript
export const validateWeeklyPlan = async (req: Request, res: Response) => {
  // ... existing validation logic ...

  // Add automatic shopping list generation:
  await generateShoppingList({ params: { weeklyPlanId: planId } }, res);

  // ... return response ...
};
```

**Related Issues:**
- Confirms BUG-007 from previous testing session
- Same root cause reported before but not yet fixed

**Testing Required:**
- [ ] Update validate endpoint to auto-generate shopping list
- [ ] Test validation → shopping list flow
- [ ] Verify no 404 errors
- [ ] Verify shopping list displays immediately
- [ ] Test with empty plans (no meals)
- [ ] Test with partial plans (some meals empty)

**Priority:** CRITICAL - LAUNCH BLOCKER
**User Impact:** 10/10 - Core feature completely broken
**Frequency:** 100% - Happens every time a user validates a plan

---

## 🟡 High Priority Bugs

### BUG-014: Shopping List Recipe View Broken - All Items as "Autres" (NEW ⚠️)
**Status:** ⚠️ NEW - NEEDS FIX
**Severity:** 🟡 High
**Discovered:** November 3, 2025 (during TEST-DATA-002)

**Description:**
The shopping list "Par recette" (By Recipe) view is supposed to group items by which recipe they come from. Instead, ALL 28 items are lumped together under a single category called "Autres" (Others), making the feature useless.

**Location:**
- `frontend/src/pages/ShoppingListPage.tsx` - Recipe view rendering
- `backend/src/controllers/shoppingList.controller.ts` - Shopping list generation (recipeNames field)

**Root Cause:**
When generating the shopping list, items are not being tagged with their source recipe names. The `recipeNames` field on ShoppingItem is either `null`, `undefined`, or empty array `[]`, causing all items to fall into the "Autres" category.

**Impact:**
- "Par recette" view shows single section: "Autres (28 articles)"
- No items grouped by recipe (e.g., "Saumon grillé et légumes", "Chili sin carne")
- Feature defeats its purpose - users can't see what ingredients belong to which recipe
- Users lose ability to plan shopping around specific meals
- Not a launch blocker but significantly degrades UX

**How to Reproduce:**
1. Validate a weekly plan with multiple recipes
2. Generate shopping list (manual workaround needed due to BUG-015)
3. Navigate to shopping list page
4. Click "Par recette" tab
5. Observe: Single section "Autres" with all 28 items
6. Expected: Multiple sections like "Saumon grillé... (5 items)", "Poulet rôti... (7 items)", etc.

**Expected Behavior:**
```
Par recette view should show:

Saumon grillé et légumes (5 items)
  - 150 g Filets de saumon
  - 0.5 pièces Courgettes
  - 1 pièce Citron
  - ...

Chili sin carne (4 items)
  - 100 g Haricots rouges
  - 0.5 pièces Poivrons
  - ...

Poulet rôti aux herbes (6 items)
  - 0.5 kg Poulet entier
  - 200 g Pommes de terre
  - ...
```

**Actual Behavior:**
```
Autres (28 articles)
  - [All 28 items mixed together]
```

**Data Analysis:**
From API response, all items have:
```json
{
  "name": "Filets de saumon",
  "quantity": 150,
  "unit": "g",
  "category": "Boucherie",
  "recipeNames": []  // ← EMPTY! Should contain ["Saumon grillé et légumes"]
}
```

**Recommended Fix:**
1. Update shopping list generation logic to track recipe source:
```typescript
// When aggregating ingredients, track which recipes they come from
const aggregatedItems = {
  "Filets de saumon": {
    quantity: 150,
    unit: "g",
    category: "Boucherie",
    recipeNames: ["Saumon grillé et légumes"]  // Track source recipe
  }
};
```

2. Ensure frontend groups by `recipeNames` correctly:
```typescript
// If recipeNames is empty or null → "Autres"
// Otherwise group under recipe name
```

**Testing Required:**
- [ ] Fix shopping list generation to populate recipeNames
- [ ] Test recipe view shows correct groupings
- [ ] Test items used in multiple recipes (should appear in both groups)
- [ ] Test items without recipe source (should go to "Autres")
- [ ] Verify category view still works correctly

**Priority:** HIGH (not launch blocker, but major UX degradation)
**User Impact:** 7/10 - Feature exists but doesn't work as designed
**Frequency:** 100% - Affects all shopping lists

---

## ⚠️ Potential Bugs (Needs Verification)

### BUG-012: Missing Error Handling in Query Hooks (NOT YET VERIFIED)
**Status:** ⚠️ IDENTIFIED - NEEDS VERIFICATION
**Severity:** 🔴 Critical (if confirmed)
**Discovered:** November 3, 2025 (code audit)
**Priority:** High - Should verify and fix

**Description:**
14 `useQuery` hooks across all pages only handle `isLoading` state but not `isError` state. This could cause white screens or infinite loading when APIs fail.

**Locations:**
1. `ShoppingListPage.tsx:38` - Shopping list query
2. `DashboardPage.tsx:24` - Families query
3. `DashboardPage.tsx:32` - Weekly plans query
4. `DashboardPage.tsx:42` - Templates query
5. `InvitationsPage.tsx:34` - Families query
6. `InvitationsPage.tsx:44` - Received invitations query
7. `InvitationsPage.tsx:52` - Sent invitations query
8. `WeeklyPlanPage.tsx:130` - Plan query
9. `WeeklyPlanPage.tsx:150` - Recipes query
10. `WeeklyPlanPage.tsx:160` - Templates query
11. `RecipesPage.tsx:108` - Recipes query
12. `RecipesPage.tsx:132` - Recipe details query
13. `FamilySettingsPage.tsx:33` - Families query
14. `FamilySettingsPage.tsx:43` - Templates query

**Root Cause:**
Queries destructure only `data` and `isLoading`, never `isError` or `error`:
```typescript
// Current pattern (problematic):
const { data, isLoading } = useQuery({ ... });

if (isLoading) return <Loading />;
// If error occurs, neither isLoading nor error is handled → shows nothing or stale data

// Should be:
const { data, isLoading, isError, error } = useQuery({ ... });

if (isLoading) return <Loading />;
if (isError) return <Error message={error} />;
```

**Potential Impact:**
- If API returns 404/500/503 → Page shows loading spinner forever OR shows stale/empty data
- No user-friendly error message
- No retry button
- Users may think app is broken
- Could cause white screens or crashes in some scenarios

**Recommended Fix:**
1. Add error handling to all 14 queries
2. Create reusable `<ErrorMessage />` component
3. Show user-friendly messages based on error type:
   - 401: "Session expired, please log in"
   - 403: "You don't have permission"
   - 404: "Not found"
   - 500: "Something went wrong, please try again"
   - Network error: "Check your connection"
4. Provide "Retry" or "Back to dashboard" buttons

**Testing Required:**
- [ ] Test each page with network offline
- [ ] Test with API returning 404
- [ ] Test with API returning 500
- [ ] Test with slow/timeout API
- [ ] Verify user-friendly error messages appear
- [ ] Verify retry functionality works

**Priority:** Should test and fix during critical testing phase

---

## 🟡 High Priority Bugs

*(None found yet)*

---

## 🟢 Medium Priority Bugs

*(None found yet)*

---

## ⚪ Low Priority Bugs

*(None found yet)*

---

## Bug Categories

### Navigation Issues
- ✅ BUG-010: Back button route mismatch (FIXED)

### Data Display Issues
- ✅ BUG-011: Missing product names (FIXED)

### Error Handling Issues
- ⚠️ BUG-012: Missing error handling (NEEDS VERIFICATION)

### Translation Issues
*(None found yet)*

### Performance Issues
*(None found yet)*

### Mobile/Responsive Issues
*(None found yet)*

---

## Known Issues from Previous Testing

From `FINAL_TEST_REPORT_2025-11-03.md` (not yet re-verified):

### BUG-003: Template Descriptions Not Translated 🟡 Medium
- **Status:** Not yet re-tested
- **Issue:** Template descriptions in French only
- **Impact:** Non-French speakers see French text
- **Priority:** Medium (cosmetic, doesn't break functionality)

### BUG-004: Incomplete Meal Generation 🟡 Medium
- **Status:** Not yet re-tested
- **Issue:** Plan generation creates 10-12 of 14 requested meals
- **Impact:** Users have to manually add missing meals
- **Priority:** Medium (workaround available)

### BUG-007: Shopping List UX 🟡 Medium
- **Status:** Not yet re-tested
- **Issue:** Shopping list not auto-generated on plan validation
- **Impact:** Users must click "Generate shopping list" manually
- **Priority:** Medium (UX improvement)

### BUG-009: Category Names Not Translated ⚪ Low
- **Status:** Not yet re-tested
- **Issue:** Some category names ("meat", "pantry", "produce") not translated
- **Impact:** English words in French/Dutch UI
- **Priority:** Low (cosmetic)

**Note:** These bugs were found in previous testing but have NOT been re-verified yet. They should be checked during comprehensive testing.

---

## Testing Progress

**Phase 1 - Code Audits:** ✅ Complete
- ✅ Navigation audit (clean - BUG-010 was only issue)
- ✅ Field mapping audit (clean - BUG-011 was only issue)
- ✅ Translation audit (clean)
- ✅ Error handling audit (found BUG-012)

**Phase 2 - Critical Testing:** 🚧 In Progress (24% complete)
- ✅ Navigation & Routing (5/5 tests complete - 100%)
- 🚧 Data Display Validation (2/5 tests complete - 40%)
- ⏳ Error Handling (0/5 tests)
- ⏳ User Journeys (0/7 tests)
- ⏳ Field Mapping (0/3 tests)

**Phase 3 - High-Priority Testing:** ⏳ Pending
- ⏳ Multi-Language (5 tests)
- ⏳ Empty States (5 tests)
- ⏳ Mobile Responsive (5 tests)
- ⏳ Edge Cases (5 tests)
- ⏳ Auth & Permissions (5 tests)

---

## Quick Reference

**Legend:**
- 🔴 Critical: Blocks core functionality, makes feature unusable
- 🟡 High: Significant impact, workaround available
- 🟢 Medium: Minor impact, cosmetic or edge case
- ⚪ Low: Very minor, cosmetic only
- ✅ Fixed & Verified
- 🔧 Fixed, awaiting verification
- 🚧 In progress
- ⏳ Pending
- ⚠️ Needs verification

**Next Steps:**
1. Continue comprehensive testing (Phase 2 & 3)
2. Verify BUG-012 (error handling)
3. Re-verify bugs from previous testing (BUG-003, 004, 007, 009)
4. Document all new bugs found
5. Fix all critical/high bugs
6. Make launch decision

---

*This document will be updated continuously as testing progresses.*
