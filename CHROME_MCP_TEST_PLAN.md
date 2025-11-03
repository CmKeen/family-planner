# Family Planner - Chrome MCP Test Plan

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** Ready for Execution

> Comprehensive Chrome MCP testing protocol for pre-launch quality assurance. This document serves as a reusable test plan for iterative quality checks.

---

## 📋 Test Plan Overview

### Purpose
Ensure the Family Planner application delivers an exceptional user experience across all features, languages, and devices before production launch.

### Scope
- **8 Test Phases** covering complete user journey
- **3 Languages:** French (FR), English (EN), Dutch (NL)
- **3 Viewports:** Mobile (375px), Tablet (768px), Desktop (1920px)
- **All Core Features:** Auth, Planning, Recipes, Shopping, Collaboration

### Success Criteria
- ✅ All critical user flows complete end-to-end
- ✅ Zero console errors (warnings acceptable)
- ✅ All network requests return 2xx status codes
- ✅ Complete translations (no hardcoded text or translation keys)
- ✅ Mobile-responsive across all viewports
- ✅ Graceful error handling with helpful messages
- ✅ Fast performance (<2s page loads, <500ms API responses)

### Test Environment
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001/api
- **Admin:** http://localhost:3001/admin
- **API Docs:** http://localhost:3001/api-docs
- **Browser:** Chrome (via Chrome MCP)
- **Docker:** All services running in development mode

---

## 🧪 Test Phases

### Phase 1: New User Onboarding (30-45 min)

**Objective:** Validate first-time user experience from registration to family setup.

#### Test Cases

##### 1.1 User Registration
**Steps:**
1. Navigate to http://localhost:5173/register
2. Attempt to submit empty form (test validation)
3. Enter invalid email format
4. Enter password < 8 characters
5. Enter valid credentials:
   - Email: `test-user-[timestamp]@example.com`
   - Password: `TestPassword123!`
   - Name: `Test User`
6. Submit registration

**Expected Results:**
- ✅ Validation errors appear in real-time
- ✅ Error messages are translated
- ✅ Successful registration redirects to onboarding
- ✅ No console errors
- ⚠️ **KNOWN ISSUE:** Onboarding page has hardcoded English "Welcome!"

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 1.2 User Login
**Steps:**
1. Navigate to http://localhost:5173/login
2. Attempt login with wrong password
3. Verify error message is helpful
4. Login with correct credentials
5. Verify redirect to dashboard

**Expected Results:**
- ✅ Wrong credentials show clear error
- ✅ Successful login redirects to dashboard
- ✅ JWT token stored (check network tab)
- ✅ User info loaded (check /api/auth/me)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 1.3 Family Onboarding
**Steps:**
1. Complete "Create Your Family" form:
   - Family name: `Test Family [timestamp]`
   - Language: French
   - Unit system: Metric
2. Add first family member:
   - Name: `Parent 1`
   - Role: Parent
   - Age: 35
3. Add second member:
   - Name: `Child 1`
   - Role: Child
   - Age: 8
4. Set diet profile:
   - Check "Vegetarian"
   - Add allergy: "Peanuts"
5. Select default meal template: "Lunch & Dinner - 7 days"
6. Complete onboarding

**Expected Results:**
- ✅ Multi-step wizard flows smoothly
- ✅ Back button works
- ✅ Progress indicator updates
- ✅ Family created in database
- ✅ Redirect to dashboard
- ⚠️ **KNOWN ISSUE:** Some text may not be translated

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 1.4 Language Switching
**Steps:**
1. From dashboard, click language switcher
2. Switch to English (EN)
3. Verify all UI elements update
4. Switch to Dutch (NL)
5. Verify all UI elements update
6. Switch back to French (FR)
7. Refresh page, verify language persists

**Expected Results:**
- ✅ Language changes immediately
- ✅ All text updates (no English leakage)
- ✅ No translation keys visible (e.g., "common.loading")
- ✅ Language preference persists in localStorage
- ✅ Date/time formats localized

**Actual Results:**
- [ ] Pass / [ ] Fail
- Translation Issues Found: _[List any untranslated text]_

---

### Phase 2: Meal Plan Generation & Management (60 min)

**Objective:** Test core value proposition - automated meal planning.

#### Test Cases

##### 2.1 Dashboard Overview
**Steps:**
1. View dashboard after onboarding
2. Check empty state (no plans yet)
3. Verify "Generate Plan" buttons visible
4. Check recent activity feed (should be empty)

**Expected Results:**
- ✅ Clean empty state with call-to-action
- ✅ Clear instructions for first plan
- ✅ No loading errors

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 2.2 Auto Plan Generation
**Steps:**
1. Click "Generate Auto Plan"
2. Observe loading state (should show progress)
3. Wait for plan generation (watch network tab)
4. Review generated plan:
   - Verify 14 meals (7 days × 2 meals)
   - Check recipe variety
   - Verify dietary restrictions applied (vegetarian only)
   - Confirm no peanut ingredients
5. Check favorite ratio (should be ~60% favorites)
6. Count novelties (should be ≤2)

**Expected Results:**
- ✅ Generation completes in <5 seconds
- ✅ Loading spinner/progress visible
- ✅ 14 meals generated
- ✅ All recipes are vegetarian
- ✅ No peanut allergens
- ✅ Recipe distribution follows algorithm (60% favorites)
- ✅ Network request to `/api/weekly-plans/:familyId/generate` returns 201

**Actual Results:**
- [ ] Pass / [ ] Fail
- Generation Time: _[Record actual time]_
- Meals Generated: _[Count]_
- Dietary Violations: _[List any issues]_

##### 2.3 Express Plan Generation
**Steps:**
1. Return to dashboard
2. Click "Generate Express Plan"
3. Compare generation time vs. Auto Plan
4. Review plan structure

**Expected Results:**
- ✅ Faster generation (<3 seconds)
- ✅ Fixed structure (Lunch + Dinner × 7 days)
- ✅ Only favorites + 1 novelty max
- ✅ Dietary restrictions still applied

**Actual Results:**
- [ ] Pass / [ ] Fail
- Generation Time: _[Record actual time]_
- Notes: _[Comparison with Auto Plan]_

##### 2.4 Weekly Plan Viewing
**Steps:**
1. Click on generated plan
2. Verify weekly grid layout:
   - 7 columns (Mon-Sun)
   - Rows for each meal type (Lunch, Dinner)
3. Hover over meal cards
4. Check meal details displayed:
   - Recipe name (translated)
   - Image (if available)
   - Prep time
   - Portions
5. Click to view full meal details

**Expected Results:**
- ✅ Grid layout is clear and organized
- ✅ Hover states work smoothly
- ✅ All meal data displays correctly
- ✅ Images load (or placeholder shown)
- ✅ Responsive on mobile (stacks vertically)

**Actual Results:**
- [ ] Pass / [ ] Fail
- UI Issues: _[Note any layout problems]_

##### 2.5 Recipe Swapping
**Steps:**
1. Click "Swap" on Monday's dinner
2. View swap modal:
   - Verify recipe suggestions filtered by:
     - Same meal type (Dinner)
     - Same dietary restrictions (Vegetarian)
     - No allergens (Peanuts)
3. Search for specific recipe
4. Select new recipe
5. Verify meal updates immediately
6. Check network request succeeds

**Expected Results:**
- ✅ Swap modal opens instantly
- ✅ Filtered recipes displayed
- ✅ Search works (accent-insensitive)
- ✅ Meal updates without page reload
- ✅ Network request to `/api/weekly-plans/:planId/meals/:mealId/swap` returns 200

**Actual Results:**
- [ ] Pass / [ ] Fail
- Filter Quality: _[Are suggestions relevant?]_

##### 2.6 Meal Locking
**Steps:**
1. Click "Lock" icon on Tuesday's lunch
2. Verify lock icon changes to locked state
3. Attempt to swap locked meal (should be disabled)
4. Unlock the meal
5. Verify swap is re-enabled

**Expected Results:**
- ✅ Lock toggle works instantly
- ✅ Locked meals cannot be swapped
- ✅ Visual indicator clear (lock icon)
- ✅ Unlock restores functionality

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[Any UX confusion?]_

##### 2.7 Attendance & Guests
**Steps:**
1. Click on Wednesday's dinner
2. Add attendance:
   - Mark "Parent 1" as Present
   - Mark "Child 1" as Absent
3. Add guest:
   - Name: "Guest Friend"
   - Age: 30
   - Portion factor: 1.0
4. Verify portion calculations update
5. Check shopping list reflects changes (test later)

**Expected Results:**
- ✅ Attendance toggles work
- ✅ Guests can be added
- ✅ Portion counts update visually
- ✅ Changes persist after page reload

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 2.8 Voting System
**Steps:**
1. Vote on Thursday's lunch:
   - Click "LOVE" (❤️)
   - Verify vote registers
2. Change vote to "LIKE" (👍)
3. Click again to remove vote
4. Vote "DISLIKE" (👎) on different meal
5. View vote summary (if displayed)

**Expected Results:**
- ✅ Votes register immediately
- ✅ Vote changes allowed
- ✅ Can remove vote
- ✅ Visual feedback clear
- ✅ All family members can vote

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 2.9 Wish System
**Steps:**
1. Click "Add Wish" button
2. Enter wish:
   - Meal type: Dinner
   - Day preference: Friday
   - Description: "Pizza night!"
3. Submit wish
4. Verify wish appears in wish list
5. Test wish influences next plan generation (generate new plan)

**Expected Results:**
- ✅ Wish form is intuitive
- ✅ Wish saved to database
- ✅ Wish visible in UI
- ✅ Future plans consider wishes

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[Did wish affect next generation?]_

##### 2.10 Plan Validation
**Steps:**
1. Click "Validate Plan"
2. Verify status changes: DRAFT → IN_VALIDATION
3. Check if validation locks any features
4. Check activity feed for validation event

**Expected Results:**
- ✅ Status updates visibly
- ✅ Validation workflow clear
- ✅ Appropriate permissions enforced

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

---

### Phase 3: Meal Comments & Activity Feed (45 min)

**Objective:** Test newest collaboration features (from PR #7).

#### Test Cases

##### 3.1 Add Meal Comments
**Steps:**
1. Open Monday's dinner meal detail
2. Scroll to comments section
3. Type comment: "Can we add more vegetables?"
4. Submit comment
5. Verify comment appears immediately
6. Check comment shows:
   - Author name
   - Timestamp (localized)
   - Comment text

**Expected Results:**
- ✅ Comment posts instantly
- ✅ No page reload needed
- ✅ Author attribution correct
- ✅ Timestamp formatted (e.g., "il y a 2 minutes" in FR)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 3.2 Edit Own Comments
**Steps:**
1. Click "Edit" on your own comment
2. Change text to: "Actually, this looks perfect!"
3. Save edit
4. Verify updated text displays
5. Check "edited" indicator appears

**Expected Results:**
- ✅ Edit button only visible on own comments
- ✅ Edit modal/inline editor works
- ✅ Changes save instantly
- ✅ "Edited" timestamp shown

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 3.3 Delete Own Comments
**Steps:**
1. Click "Delete" on your comment
2. Confirm deletion (if confirmation dialog)
3. Verify comment removed
4. Check comment cannot be recovered

**Expected Results:**
- ✅ Delete button only visible on own comments
- ✅ Confirmation prevents accidents
- ✅ Comment removed instantly
- ✅ No orphaned data

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 3.4 Activity Feed / Audit Log
**Steps:**
1. Navigate to plan activity feed
2. Review audit log entries:
   - Plan created
   - Recipe swapped
   - Comments added
   - Votes submitted
   - Attendance updated
3. Check timestamps are chronological
4. Verify actor attribution (who did what)
5. Check localization of activity descriptions

**Expected Results:**
- ✅ All plan changes logged
- ✅ Chronological order (newest first)
- ✅ Clear descriptions of actions
- ✅ Translated in current language
- ✅ User names/avatars shown

**Actual Results:**
- [ ] Pass / [ ] Fail
- Log Quality: _[Is it helpful? Clear?]_

##### 3.5 Cutoff Enforcement
**Steps:**
1. Check if plan has cutoff date
2. If not, set plan to LOCKED status (via network or DB)
3. Attempt to add comment to locked plan
4. Verify error message shows
5. Check error is helpful (explains cutoff)

**Expected Results:**
- ✅ Locked plans prevent comments
- ✅ Error message is clear and translated
- ✅ Graceful handling (no console errors)
- ✅ Cutoff date displayed

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 3.6 Multi-User Comments (if testable)
**Steps:**
1. Open incognito browser
2. Register second user
3. Add to same family (via invitation)
4. Both users comment on same meal
5. Verify comments from both users display
6. Verify edit/delete permissions isolated

**Expected Results:**
- ✅ Multiple users can comment
- ✅ Comments appear for all family members
- ✅ Cannot edit/delete others' comments
- ✅ Real-time updates (if implemented)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[If not testable, skip]_

---

### Phase 4: Recipe Discovery & Management (30 min)

**Objective:** Ensure recipe browsing, search, and filtering work seamlessly.

#### Test Cases

##### 4.1 Browse Recipe Catalog
**Steps:**
1. Navigate to http://localhost:5173/recipes
2. Observe initial recipe grid
3. Scroll to load more recipes (if pagination/infinite scroll)
4. Hover over recipe cards
5. Note loading performance

**Expected Results:**
- ✅ Recipes display in grid layout
- ✅ Images load smoothly (lazy loading)
- ✅ Hover states work
- ✅ No broken images (placeholder shown)
- ✅ Responsive grid (mobile: 1 col, tablet: 2 col, desktop: 3-4 col)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Total Recipes Displayed: _[Count]_
- Performance: _[Fast/Slow?]_

##### 4.2 Recipe Search
**Steps:**
1. Search for "pasta"
2. Verify results filtered
3. Search for "crêpe" (with accent)
4. Search for "crepe" (without accent)
5. Verify both return same results (accent-insensitive)
6. Search for nonexistent recipe "xyz123"
7. Verify empty state displayed

**Expected Results:**
- ✅ Search results instant (<500ms)
- ✅ Accent-insensitive matching works
- ✅ Results relevant
- ✅ Empty state helpful ("No recipes found")
- ✅ Clear button to reset search

**Actual Results:**
- [ ] Pass / [ ] Fail
- Search Quality: _[Relevance of results]_
- Accent Test: _[crêpe = crepe?]_

##### 4.3 Recipe Filtering
**Steps:**
1. Apply filter: Category = "Dinner"
2. Verify only dinner recipes shown
3. Add filter: Cuisine = "Italian"
4. Verify filters combine (AND logic)
5. Add filter: Vegetarian = true
6. Verify all filters apply simultaneously
7. Remove filters one by one
8. Verify UI updates correctly

**Expected Results:**
- ✅ Filters apply immediately
- ✅ Multiple filters combine (AND logic)
- ✅ Filter badges/pills show active filters
- ✅ Clear all filters button works
- ✅ Filter state persists during session

**Actual Results:**
- [ ] Pass / [ ] Fail
- Filter Combinations Tested: _[List]_
- Issues: _[Any unexpected results?]_

##### 4.4 Diet Profile Filtering
**Steps:**
1. Verify family diet profile (Vegetarian, No Peanuts)
2. Check if non-vegetarian recipes are hidden
3. Check if peanut recipes are excluded
4. Toggle diet filters (if UI allows)
5. Verify catalog updates

**Expected Results:**
- ✅ Automatic filtering based on family diet
- ✅ No allergen recipes shown
- ✅ Dietary tags visible on recipes
- ✅ Filter can be overridden (if needed)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Violations Found: _[List any non-vegetarian or peanut recipes]_

##### 4.5 Recipe Detail View
**Steps:**
1. Click on recipe "Spaghetti Carbonara" (or any recipe)
2. Verify all sections display:
   - Hero image
   - Title (translated)
   - Description (translated)
   - Prep/Cook/Total time
   - Servings
   - Difficulty
   - Dietary tags (vegetarian, vegan, etc.)
   - Ingredients list (with quantities)
   - Instructions (step-by-step)
   - Nutrition info (if available)
3. Check image quality
4. Verify instructions are numbered

**Expected Results:**
- ✅ All recipe data visible
- ✅ Layout clean and readable
- ✅ Images high quality
- ✅ Instructions clear
- ✅ Translations complete
- ✅ Mobile-friendly layout

**Actual Results:**
- [ ] Pass / [ ] Fail
- Missing Data: _[Note any empty fields]_
- Layout Issues: _[Any problems?]_

##### 4.6 Favorite Recipes
**Steps:**
1. From recipe list, click heart icon on 3 recipes
2. Verify heart fills in (favorited)
3. Refresh page
4. Verify favorites persist
5. Filter by "Favorites Only"
6. Verify only favorited recipes shown
7. Unfavorite one recipe
8. Verify it disappears from favorites list

**Expected Results:**
- ✅ Favorite toggle instant feedback
- ✅ Favorites persist (stored in DB)
- ✅ Favorites filter works
- ✅ Unfavorite updates immediately

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 4.7 Recipe Feedback
**Steps:**
1. Open recipe detail
2. Scroll to feedback section
3. Submit feedback:
   - Rating: 4/5 stars
   - Comment: "Great recipe, but needs more salt"
4. Verify feedback saved
5. Check if rating updates recipe average

**Expected Results:**
- ✅ Feedback form intuitive
- ✅ Ratings update
- ✅ Comments visible (if public)
- ✅ Thank you message shown

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

---

### Phase 5: Shopping List Generation (30 min)

**Objective:** Test shopping list generation, management, and printing.

#### Test Cases

##### 5.1 Generate Shopping List
**Steps:**
1. From weekly plan view, click "Generate Shopping List"
2. Observe loading state
3. Wait for generation to complete
4. Review generated list

**Expected Results:**
- ✅ Generation completes in <3 seconds
- ✅ Loading indicator visible
- ✅ Redirect to shopping list page
- ✅ Network request to `/api/shopping-lists/generate/:weeklyPlanId` returns 201

**Actual Results:**
- [ ] Pass / [ ] Fail
- Generation Time: _[Record]_
- Notes: _[To be filled during testing]_

##### 5.2 Ingredient Aggregation
**Steps:**
1. Review shopping list items
2. Verify ingredients are aggregated:
   - If recipe 1 needs 200g chicken
   - And recipe 2 needs 300g chicken
   - List should show: 500g chicken (not separate items)
3. Check units are consistent:
   - No "200ml milk + 0.5L milk" (should be 700ml or 0.7L)
4. Verify portions scaled correctly:
   - Account for family members
   - Account for guests added
   - Account for attendance (absences reduce portions)

**Expected Results:**
- ✅ No duplicate ingredients
- ✅ Quantities aggregated correctly
- ✅ Unit conversion applied (ml to L when appropriate)
- ✅ Portion scaling accurate

**Actual Results:**
- [ ] Pass / [ ] Fail
- Aggregation Issues: _[List any duplicates or errors]_
- Math Check: _[Verify quantities manually if needed]_

##### 5.3 Category Grouping
**Steps:**
1. Review shopping list categories:
   - Produce (vegetables, fruits)
   - Meat & Fish
   - Dairy & Eggs
   - Grains & Pasta
   - Pantry (oils, spices)
   - Frozen
   - Bakery
2. Verify items sorted by category
3. Check if category order is logical (produce first?)

**Expected Results:**
- ✅ All items categorized
- ✅ Categories in logical order
- ✅ No "Uncategorized" items (or minimal)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Categorization Quality: _[Good/Poor?]_
- Uncategorized Items: _[Count]_

##### 5.4 Check/Uncheck Items
**Steps:**
1. Check off 5 items (mark as purchased)
2. Verify checkmarks appear
3. Refresh page
4. Verify checked items persist
5. Uncheck 2 items
6. Verify state updates

**Expected Results:**
- ✅ Check/uncheck instant feedback
- ✅ State persists (localStorage or DB)
- ✅ Visual distinction (strikethrough or grayed out)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Persistence: _[localStorage or DB?]_

##### 5.5 Edit Quantities
**Steps:**
1. Click on item quantity
2. Change "500g chicken" to "700g chicken"
3. Save change
4. Verify update persists

**Expected Results:**
- ✅ Quantities editable
- ✅ Changes save
- ✅ Validation prevents invalid input (negative numbers)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 5.6 Print Shopping List
**Steps:**
1. Click "Print" button
2. Review print preview
3. Check formatting:
   - Clean layout
   - Categories visible
   - Checkboxes present (for manual checking)
   - No unnecessary UI elements (navigation, buttons)
4. Test print to PDF

**Expected Results:**
- ✅ Print preview opens
- ✅ Layout optimized for printing
- ✅ No broken formatting
- ✅ All items visible (no cut-off)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Print Quality: _[Good/Poor?]_

##### 5.7 Dietary Substitutions
**Steps:**
1. Check if any ingredients have substitutions suggested
2. Verify substitutions respect diet profile:
   - Vegetarian family shouldn't see meat substitutions
3. Test applying a substitution
4. Verify shopping list updates

**Expected Results:**
- ✅ Substitutions relevant
- ✅ Easy to apply
- ✅ List updates automatically

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[Are substitutions helpful?]_

---

### Phase 6: Advanced Features (45 min)

**Objective:** Test component-based meals, custom templates, invitations, settings.

#### Test Cases

##### 6.1 Component-Based Meal Creation
**Steps:**
1. From weekly plan, click "Create Component Meal" (or similar)
2. Add components:
   - Protein: Chicken Breast (200g)
   - Vegetable: Broccoli (150g)
   - Carb: Rice (100g)
3. Adjust quantities using +/- buttons
4. Save meal
5. Verify meal appears in plan

**Expected Results:**
- ✅ Component selection intuitive
- ✅ Quantity adjustment works
- ✅ Meal saved to plan
- ✅ Shopping list includes components (test generation)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.2 Swap Individual Components
**Steps:**
1. Click "Swap" on protein component
2. Select alternative: Tofu
3. Verify component updates
4. Verify quantities recalculate if needed

**Expected Results:**
- ✅ Component swap works independently
- ✅ Other components unaffected
- ✅ Dietary filters apply (no meat if vegetarian)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.3 Save Component Meal as Recipe
**Steps:**
1. After creating component meal, click "Save as Recipe"
2. Enter recipe name: "My Custom Bowl"
3. Save
4. Navigate to recipe catalog
5. Verify new recipe appears
6. Open recipe detail
7. Verify components are listed as ingredients

**Expected Results:**
- ✅ Recipe created successfully
- ✅ Appears in catalog
- ✅ Ingredients match components
- ✅ Can be used in future plans

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.4 Custom Meal Template Creation
**Steps:**
1. Navigate to Family Settings
2. Go to "Meal Templates" section
3. Click "Create Custom Template"
4. Configure template:
   - Name: "Weekday Dinners Only"
   - Schedule:
     - Monday: Dinner
     - Tuesday: Dinner
     - Wednesday: Dinner
     - Thursday: Dinner
     - Friday: Dinner
     - Saturday: (none)
     - Sunday: (none)
5. Save template

**Expected Results:**
- ✅ Template builder intuitive
- ✅ Day/meal selection clear
- ✅ Template saved successfully

**Actual Results:**
- [ ] Pass / [ ] Fail
- Usability: _[Easy to use?]_

##### 6.5 Apply Custom Template to Plan
**Steps:**
1. Return to dashboard
2. Generate new plan
3. Select custom template: "Weekday Dinners Only"
4. Verify generated plan has:
   - 5 dinners (Mon-Fri)
   - No weekend meals

**Expected Results:**
- ✅ Template selection available
- ✅ Plan follows template schedule
- ✅ Correct number of meals

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.6 Set Default Template
**Steps:**
1. In Family Settings, set "Weekday Dinners Only" as default
2. Save
3. Generate new plan (without selecting template)
4. Verify default template applied automatically

**Expected Results:**
- ✅ Default template persists
- ✅ Applied to future plans
- ✅ Can still override when generating

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.7 Send Family Invitation
**Steps:**
1. Navigate to Family Settings > Members
2. Click "Invite Member"
3. Enter email: `invited-user@example.com`
4. Select role: Parent
5. Send invitation
6. ⚠️ **KNOWN ISSUE:** Email will NOT be sent (infrastructure disabled)
7. Copy invitation link from UI (if displayed)
8. Verify invitation appears in "Sent Invitations" list

**Expected Results:**
- ✅ Invitation created successfully
- ⚠️ Email NOT sent (expected)
- ✅ Invitation link generated
- ✅ Appears in sent list with status "Pending"

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.8 Accept Invitation
**Steps:**
1. Copy invitation link
2. Open in incognito browser (or different browser)
3. Register new user (if required) or login
4. Click invitation link
5. Review invitation details (family name, role)
6. Accept invitation
7. Verify redirect to family dashboard
8. In original browser, check invited user appears in family members

**Expected Results:**
- ✅ Invitation link works
- ✅ Invitation details clear
- ✅ Accept creates family member
- ✅ User added to family
- ✅ Can now access family data

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.9 Decline/Cancel Invitation
**Steps:**
1. Send another invitation
2. Decline invitation (from invitee side)
3. Verify status changes to "Declined"
4. Send third invitation
5. Cancel invitation (from sender side)
6. Verify status changes to "Cancelled"

**Expected Results:**
- ✅ Decline works
- ✅ Cancel works
- ✅ Status updates reflected in UI

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.10 Update Family Settings
**Steps:**
1. Navigate to Family Settings
2. Update family name
3. Change language preference
4. Change unit system (Metric ↔ Imperial)
5. Save changes
6. Refresh page
7. Verify changes persist

**Expected Results:**
- ✅ All fields editable
- ✅ Changes save successfully
- ✅ UI updates reflect changes (e.g., language, units)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.11 Manage Family Members
**Steps:**
1. Edit existing family member:
   - Update age
   - Change dietary restrictions
   - Update portion factor
2. Save changes
3. Delete a family member (if possible)
4. Confirm deletion
5. Verify member removed

**Expected Results:**
- ✅ Member updates save
- ✅ Deletion requires confirmation
- ✅ Deleted member removed from plan calculations

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 6.12 Update Diet Profile
**Steps:**
1. Navigate to diet profile section
2. Toggle dietary preferences:
   - Add: Vegan
   - Remove: Vegetarian
3. Update allergies:
   - Add: Shellfish
   - Remove: Peanuts
4. Save changes
5. Navigate to recipe catalog
6. Verify recipes filtered by new restrictions

**Expected Results:**
- ✅ Diet profile updates save
- ✅ Recipe catalog updates automatically
- ✅ Shopping lists reflect new restrictions
- ✅ Future plans apply new filters

**Actual Results:**
- [ ] Pass / [ ] Fail
- Filter Impact: _[Did recipe catalog update correctly?]_

---

### Phase 7: Multi-Language Comprehensive Test (30 min)

**Objective:** Ensure complete translations across all languages, no hardcoded text.

#### Test Cases

##### 7.1 French (FR) - Default Language
**Steps:**
1. Set language to French
2. Navigate through all pages:
   - Login / Register
   - Dashboard
   - Weekly Plan
   - Recipe Catalog
   - Shopping List
   - Family Settings
   - Invitations
3. Check for any English text
4. Take screenshots of key pages

**Expected Results:**
- ✅ All UI text in French
- ✅ Error messages in French
- ✅ Loading states in French
- ✅ Date formatting: "25 octobre 2025"
- ✅ Day names: Lundi, Mardi, etc.
- ✅ Meal types: Déjeuner, Dîner

**Actual Results:**
- [ ] Pass / [ ] Fail
- Untranslated Text Found: _[List]_
- Screenshots: _[Link to screenshots]_

##### 7.2 English (EN)
**Steps:**
1. Switch language to English
2. Navigate through all pages
3. Check for any French leakage
4. Verify date/time formatting:
   - Dates: "October 25, 2025"
   - Day names: Monday, Tuesday, etc.
   - Meal types: Lunch, Dinner

**Expected Results:**
- ✅ All UI text in English
- ✅ No French text visible
- ✅ Date formatting English-style
- ⚠️ **KNOWN ISSUE:** Onboarding may have hardcoded "Welcome!"

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues Found: _[List]_

##### 7.3 Dutch (NL)
**Steps:**
1. Switch language to Dutch
2. Navigate through all pages
3. Verify translations complete
4. Check date/time formatting:
   - Day names: Maandag, Dinsdag, etc.
   - Meal types: Lunch, Diner

**Expected Results:**
- ✅ All UI text in Dutch
- ✅ No English/French text visible
- ✅ Date formatting Dutch-style

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues Found: _[List]_

##### 7.4 Translation Key Detection
**Steps:**
1. In each language, check for visible translation keys like:
   - "common.loading"
   - "dashboard.title"
   - "recipes.search.placeholder"
2. Check browser console for i18n warnings
3. Look for missing translation warnings

**Expected Results:**
- ✅ No translation keys visible
- ✅ No console warnings about missing translations
- ⚠️ **KNOWN ISSUE:** i18n debug mode may show console messages

**Actual Results:**
- [ ] Pass / [ ] Fail
- Missing Keys: _[List any found]_
- Console Warnings: _[Count/describe]_

##### 7.5 Edge Cases - Empty States
**Steps:**
1. Test empty states in each language:
   - Empty recipe search results
   - No plans created yet
   - No invitations
   - Empty shopping list
2. Verify all empty state messages translated

**Expected Results:**
- ✅ Empty state text translated
- ✅ Call-to-action buttons translated

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues: _[To be filled during testing]_

##### 7.6 Error Messages
**Steps:**
1. Trigger various errors in each language:
   - Login with wrong password
   - Submit invalid form
   - Network error (disable network, test)
   - 404 page (visit invalid route)
2. Verify all error messages translated

**Expected Results:**
- ✅ Error messages translated
- ✅ Helpful and clear in all languages

**Actual Results:**
- [ ] Pass / [ ] Fail
- Untranslated Errors: _[List]_

---

### Phase 8: Responsiveness & Performance (30 min)

**Objective:** Ensure mobile-first experience and fast performance.

#### Test Cases

##### 8.1 Mobile Viewport (375x667 - iPhone SE)
**Steps:**
1. Resize browser to 375px width
2. Navigate through all pages
3. Check for:
   - Horizontal scrolling (should be none)
   - Touch target sizes (min 44x44px)
   - Text readability (no tiny text)
   - Form usability (inputs not zooming)
   - Navigation menu (hamburger?)
   - Grid layouts (stacking correctly)

**Expected Results:**
- ✅ No horizontal scroll
- ✅ All buttons/links tappable (44px)
- ✅ Text readable (min 16px)
- ✅ Forms work without zooming
- ✅ Navigation accessible
- ✅ Content stacks vertically

**Actual Results:**
- [ ] Pass / [ ] Fail
- Issues Found: _[List layout problems]_
- Screenshots: _[Link]_

##### 8.2 Tablet Viewport (768x1024 - iPad)
**Steps:**
1. Resize to 768px width
2. Check grid layouts:
   - Recipe catalog (2 columns?)
   - Weekly plan (readable?)
3. Verify navigation adapts

**Expected Results:**
- ✅ Layout optimized for tablet
- ✅ 2-column grids where appropriate
- ✅ No wasted space

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 8.3 Desktop Viewport (1920x1080)
**Steps:**
1. Resize to 1920px width
2. Check max-width containers (no excessive stretching)
3. Verify content centered
4. Check for any layout breaks

**Expected Results:**
- ✅ Content max-width applied (~1400px?)
- ✅ Centered layout
- ✅ No excessive whitespace

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _[To be filled during testing]_

##### 8.4 Performance - Page Load Times
**Steps:**
1. Open Chrome DevTools > Network tab
2. Hard refresh (Ctrl+Shift+R) on each page
3. Measure load time (DOMContentLoaded, Load)
4. Check for:
   - Large files (>1MB images?)
   - Excessive requests
   - Slow API calls

**Expected Results:**
- ✅ Page load <2 seconds
- ✅ DOMContentLoaded <1 second
- ✅ No blocking resources
- ✅ Images optimized (<300KB each)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Dashboard Load Time: _[Record]_
- Weekly Plan Load Time: _[Record]_
- Recipes Load Time: _[Record]_
- Slowest Resource: _[Identify]_

##### 8.5 Performance - API Response Times
**Steps:**
1. Monitor Network tab during testing
2. Record API response times for:
   - `/api/auth/me` (user info)
   - `/api/weekly-plans/:familyId/generate` (plan generation)
   - `/api/recipes/catalog/:familyId` (recipe catalog)
   - `/api/shopping-lists/generate/:planId` (shopping list)
3. Check for slow queries (>1 second)

**Expected Results:**
- ✅ Most API calls <500ms
- ✅ Plan generation <5s
- ✅ Shopping list generation <3s
- ✅ No timeouts

**Actual Results:**
- [ ] Pass / [ ] Fail
- API Response Times:
  - Auth: _[ms]_
  - Plan Generation: _[ms]_
  - Recipe Catalog: _[ms]_
  - Shopping List: _[ms]_
- Slowest Endpoint: _[Identify]_

##### 8.6 Console Errors & Warnings
**Steps:**
1. Open Chrome DevTools > Console
2. Navigate through entire app
3. Perform all major actions
4. Record all console messages:
   - Errors (red)
   - Warnings (yellow)
   - Info/Debug (blue)

**Expected Results:**
- ✅ Zero console errors
- ✅ Minimal warnings (React dev warnings OK)
- ⚠️ **KNOWN ISSUE:** i18n debug messages visible
- ⚠️ **KNOWN ISSUE:** Some console.log statements in backend

**Actual Results:**
- [ ] Pass / [ ] Fail
- Console Errors: _[Count and describe]_
- Console Warnings: _[Count and describe]_
- Console Logs: _[Any unexpected logs?]_

##### 8.7 Network Errors
**Steps:**
1. Review Network tab for failed requests
2. Check status codes:
   - 2xx: Success
   - 4xx: Client errors
   - 5xx: Server errors
3. Investigate any non-2xx responses

**Expected Results:**
- ✅ All requests return 2xx (or expected 404 for invalid routes)
- ✅ No 500 Internal Server Errors
- ✅ Proper error handling for 4xx

**Actual Results:**
- [ ] Pass / [ ] Fail
- Failed Requests: _[List URL and status code]_

##### 8.8 Memory Leaks & Performance Profiling
**Steps:**
1. Open Chrome DevTools > Performance tab
2. Start recording
3. Navigate through 5-10 pages
4. Perform several actions (generate plan, search recipes, etc.)
5. Stop recording
6. Review:
   - Frame rate (should be 60fps)
   - Long tasks (>50ms)
   - Memory usage (check for leaks)

**Expected Results:**
- ✅ Smooth 60fps animations
- ✅ No long tasks blocking main thread
- ✅ Memory usage stable (no continuous growth)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Frame Rate: _[fps]_
- Long Tasks: _[Count]_
- Memory Usage: _[Stable/Growing?]_

---

## 📊 Test Results Summary

### Test Execution Log

| Phase | Date | Tester | Duration | Status | Pass Rate | Notes |
|-------|------|--------|----------|--------|-----------|-------|
| 1: Onboarding | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/7 | _[Notes]_ |
| 2: Meal Planning | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/10 | _[Notes]_ |
| 3: Comments | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/6 | _[Notes]_ |
| 4: Recipes | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/7 | _[Notes]_ |
| 5: Shopping | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/7 | _[Notes]_ |
| 6: Advanced | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/12 | _[Notes]_ |
| 7: Multi-Language | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/6 | _[Notes]_ |
| 8: Performance | _[Date]_ | _[Name]_ | _[min]_ | ⏳ Pending | 0/8 | _[Notes]_ |
| **TOTAL** | | | **0 min** | ⏳ | **0/63** | |

---

## 🐛 Bugs & Issues Found

### Critical (Blocks Launch) 🔴

| ID | Phase | Description | Severity | Status | Assigned | Notes |
|----|-------|-------------|----------|--------|----------|-------|
| _[ID]_ | _[Phase]_ | _[Description]_ | 🔴 Critical | 🆕 New | _[Name]_ | _[Notes]_ |

### High (Degrades UX) 🟡

| ID | Phase | Description | Severity | Status | Assigned | Notes |
|----|-------|-------------|----------|--------|----------|-------|
| _[ID]_ | _[Phase]_ | _[Description]_ | 🟡 High | 🆕 New | _[Name]_ | _[Notes]_ |

### Medium (Polish) 🟢

| ID | Phase | Description | Severity | Status | Assigned | Notes |
|----|-------|-------------|----------|--------|----------|-------|
| _[ID]_ | _[Phase]_ | _[Description]_ | 🟢 Medium | 🆕 New | _[Name]_ | _[Notes]_ |

### Low (Nice-to-Have) ⚪

| ID | Phase | Description | Severity | Status | Assigned | Notes |
|----|-------|-------------|----------|--------|----------|-------|
| _[ID]_ | _[Phase]_ | _[Description]_ | ⚪ Low | 🆕 New | _[Name]_ | _[Notes]_ |

---

## 🎨 UX Improvements Suggested

| ID | Feature | Suggestion | Impact | Effort | Priority |
|----|---------|------------|--------|--------|----------|
| _[ID]_ | _[Feature]_ | _[Suggestion]_ | High/Med/Low | S/M/L | High/Med/Low |

---

## 📸 Screenshots & Evidence

### Phase 1: Onboarding
- _[Links to screenshots]_

### Phase 2: Meal Planning
- _[Links to screenshots]_

### Phase 3: Comments
- _[Links to screenshots]_

### Phase 4: Recipes
- _[Links to screenshots]_

### Phase 5: Shopping
- _[Links to screenshots]_

### Phase 6: Advanced
- _[Links to screenshots]_

### Phase 7: Multi-Language
- FR: _[Links]_
- EN: _[Links]_
- NL: _[Links]_

### Phase 8: Performance
- Network waterfall: _[Screenshot]_
- Performance profile: _[Screenshot]_

---

## ✅ Pre-Launch Checklist

### Code Quality
- [ ] No console.log in production code
- [ ] No debug flags enabled (i18n debug, etc.)
- [ ] All TODOs addressed or documented
- [ ] Environment variables set correctly (.env.production)

### Security
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] JWT secret is strong (256-bit)
- [ ] Helmet.js configured
- [ ] Input sanitization enabled

### Database
- [ ] Migrations run successfully
- [ ] Seed data loaded (if needed)
- [ ] Backup strategy in place
- [ ] Database connection pooling configured

### Performance
- [ ] Images optimized (<300KB)
- [ ] Lazy loading implemented
- [ ] Bundle size optimized (<500KB initial)
- [ ] CDN configured (if applicable)
- [ ] Caching headers set

### Monitoring
- [ ] Error tracking configured (Sentry/LogRocket)
- [ ] Logging aggregation set up
- [ ] Health check endpoint working
- [ ] Uptime monitoring configured

### Documentation
- [ ] API documentation up-to-date (Swagger)
- [ ] User guide created (if needed)
- [ ] Admin panel documentation
- [ ] Deployment runbook created

### Legal & Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified (if applicable)
- [ ] Cookie consent implemented (if needed)

---

## 🔄 Test Plan Changelog

### Version 1.0 (November 3, 2025)
- ✅ Initial test plan created
- ✅ 8 phases defined (63 test cases)
- ✅ Success criteria established
- ✅ Known issues documented

### Version 1.1 (TBD)
- _[To be updated after first test run]_

---

## 📝 Notes & Observations

_[Space for general observations, patterns, or insights discovered during testing]_

---

## 🎯 Next Steps

1. Execute test plan (all 8 phases)
2. Document bugs and issues
3. Prioritize fixes
4. Re-test after fixes applied
5. Final sign-off for launch

---

**Test Plan Prepared By:** Claude
**Last Updated:** November 3, 2025
**Status:** Ready for Execution ✅
