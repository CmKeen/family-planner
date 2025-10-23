# 🧪 Family Planner - Complete Testing Guide

## Quick Start Testing

### Prerequisites
- Docker Desktop installed
- Postman or curl (for API testing)
- Web browser (Chrome/Firefox/Safari)

---

## 🐳 Option 1: Docker Testing (Recommended)

### 1. Start the Application

```bash
cd /home/user/family-planner

# Start all services
docker-compose up --build

# Wait for services to be ready (30-60 seconds)
# You'll see: "Server is running on port 3001"
```

### 2. Verify Services

**Check Backend Health:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T..."
}
```

**Check Database:**
```bash
docker-compose exec postgres psql -U familyplanner -d family_planner -c "SELECT COUNT(*) FROM \"Recipe\";"
```

Expected: `8` (seed recipes)

**Check Frontend:**
Open: http://localhost:3000

---

## 📝 Testing Workflows

### Workflow 1: User Registration & Authentication

**Step 1: Open Frontend**
```
http://localhost:3000
```

**Step 2: Click "Sign up"**

**Step 3: Fill Registration Form**
```
First Name: John
Last Name: Doe
Email: john.doe@example.com
Password: password123
Confirm Password: password123
```

**Step 4: Submit**
- Should redirect to onboarding
- Token saved in localStorage
- Cookie set for authentication

**API Test (Alternative):**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Expected: `201 Created` with user object and JWT token

---

### Workflow 2: Family Creation

**Step 1: After Registration**
- Redirected to onboarding page

**Step 2: Create Family**
```
Family Name: The Doe Family
```

**Step 3: Submit**
- Should create family with default dietary profile
- Redirect to dashboard

**API Test:**
```bash
TOKEN="your-jwt-token-from-register"

curl -X POST http://localhost:3001/api/families \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "The Doe Family",
    "dietProfile": {
      "kosher": true,
      "kosherType": "moderate",
      "meatToMilkDelayHours": 3,
      "glutenFree": false,
      "lactoseFree": false,
      "vegetarian": false,
      "vegan": false,
      "allergies": [],
      "favoriteRatio": 0.6,
      "maxNovelties": 2
    }
  }'
```

**Verify in Database:**
```bash
docker-compose exec postgres psql -U familyplanner -d family_planner -c "SELECT name, language FROM \"Family\";"
```

---

### Workflow 3: View Seed Recipes

**API Test: Get All Recipes**
```bash
curl http://localhost:3001/api/recipes \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 8 recipes including:
- Poulet rôti aux herbes (French, kosher meat)
- Pâtes tomates basilic (Italian, vegan)
- Saumon grillé (Mediterranean, pescatarian)
- Burger maison (American, kids favorite)
- Chili sin carne (Mexican, vegan, GF, LF)
- Gratin dauphinois (French, vegetarian, dairy)
- Sushis maison (Japanese, pescatarian)
- Soupe de légumes (French, vegan, express)

**Test Filtering:**
```bash
# Get only vegetarian recipes
curl "http://localhost:3001/api/recipes?vegetarian=true" \
  -H "Authorization: Bearer $TOKEN"

# Get quick recipes (≤20 min)
curl "http://localhost:3001/api/recipes?maxTime=20" \
  -H "Authorization: Bearer $TOKEN"

# Get kosher recipes
curl "http://localhost:3001/api/recipes?kosher=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Workflow 4: Auto-Generate Weekly Plan

**Frontend Test:**
1. Go to Dashboard
2. Click "New Plan" button
3. Wait for generation
4. Should redirect to plan view with 14 meals

**API Test:**
```bash
FAMILY_ID="your-family-uuid"
WEEK_START="2025-10-27T00:00:00.000Z"

curl -X POST "http://localhost:3001/api/weekly-plans/$FAMILY_ID/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"weekStartDate\": \"$WEEK_START\"}"
```

**Verify Plan Contains:**
- 14 meals (7 days × 2 meals)
- Each meal has: dayOfWeek, mealType, recipeId, portions
- ~60-80% from favorites (if favorites marked)
- 1-2 novelties
- Recipe details populated

**Check in Database:**
```bash
docker-compose exec postgres psql -U familyplanner -d family_planner -c "SELECT * FROM \"WeeklyPlan\" WHERE \"familyId\" = 'your-family-uuid';"

docker-compose exec postgres psql -U familyplanner -d family_planner -c "SELECT COUNT(*) FROM \"Meal\" WHERE \"weeklyPlanId\" = 'your-plan-uuid';"
```

Expected meal count: 14

---

### Workflow 5: Express Plan Generation

**Test Marking Favorites First:**
```bash
# Mark a recipe as favorite
RECIPE_ID="recipe-uuid"

curl -X POST "http://localhost:3001/api/recipes/$RECIPE_ID/favorite" \
  -H "Authorization: Bearer $TOKEN"
```

**Generate Express Plan:**
```bash
curl -X POST "http://localhost:3001/api/weekly-plans/$FAMILY_ID/generate-express" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"weekStartDate\": \"2025-11-03T00:00:00.000Z\"}"
```

**Verify:**
- All meals except 1 should be favorites
- 1 meal should be a novelty
- Faster generation than auto plan

---

### Workflow 6: Meal Swapping

**Get Plan Meals:**
```bash
PLAN_ID="your-plan-uuid"

curl "http://localhost:3001/api/weekly-plans/$PLAN_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Swap a Meal:**
```bash
MEAL_ID="meal-uuid-to-swap"
NEW_RECIPE_ID="different-recipe-uuid"

curl -X POST "http://localhost:3001/api/weekly-plans/$PLAN_ID/meals/$MEAL_ID/swap" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"newRecipeId\": \"$NEW_RECIPE_ID\"}"
```

**Verify:**
- Meal now has new recipe
- Portions remain same
- Other meals unchanged

---

### Workflow 7: Adjust Portions

**Update Meal Portions:**
```bash
curl -X PUT "http://localhost:3001/api/weekly-plans/$PLAN_ID/meals/$MEAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"portions": 6}'
```

**Verify:**
- Portion updated
- Will affect shopping list generation

---

### Workflow 8: Add Family Members

**Add Members:**
```bash
# Add a child
curl -X POST "http://localhost:3001/api/families/$FAMILY_ID/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Emily Doe",
    "role": "CHILD",
    "age": 8,
    "portionFactor": 0.7,
    "aversions": ["broccoli", "mushrooms"],
    "favorites": ["pizza", "pasta"]
  }'

# Add a parent
curl -X POST "http://localhost:3001/api/families/$FAMILY_ID/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Doe",
    "role": "PARENT",
    "age": 35,
    "portionFactor": 1.0
  }'
```

**Verify:**
```bash
curl "http://localhost:3001/api/families/$FAMILY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Should show all members

---

### Workflow 9: School Menu Integration

**Add School Menus:**
```bash
# Monday
curl -X POST http://localhost:3001/api/school-menus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "familyId": "'$FAMILY_ID'",
    "schoolName": "École Primaire",
    "date": "2025-10-28T00:00:00.000Z",
    "mealType": "LUNCH",
    "title": "Pâtes carbonara",
    "category": "pates",
    "description": "Pâtes avec sauce carbonara"
  }'

# Tuesday
curl -X POST http://localhost:3001/api/school-menus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "familyId": "'$FAMILY_ID'",
    "schoolName": "École Primaire",
    "date": "2025-10-29T00:00:00.000Z",
    "mealType": "LUNCH",
    "title": "Poulet au four",
    "category": "volaille",
    "description": "Poulet rôti avec légumes"
  }'
```

**Verify Anti-Duplication:**
- Generate a new weekly plan for the same week
- Tuesday dinner should NOT be pasta (already at lunch)
- Wednesday dinner should NOT be chicken (already at lunch)

---

### Workflow 10: Generate Shopping List

**Generate List:**
```bash
curl -X POST "http://localhost:3001/api/shopping-lists/generate/$PLAN_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Verify Response Contains:**
- Aggregated ingredients from all 14 meals
- Grouped by category (Boucherie, Fruits & Légumes, Épicerie, etc.)
- Quantities summed and rounded appropriately
- Alternatives suggested for dietary restrictions

**Get Shopping List:**
```bash
curl "http://localhost:3001/api/shopping-lists/$PLAN_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Check Categories:**
- Boucherie (Meat)
- Fruits & Légumes (Produce)
- Épicerie (Groceries)
- Produits laitiers (Dairy)
- Boulangerie (Bakery)

---

### Workflow 11: Shopping List Interaction

**Toggle Item Checked:**
```bash
ITEM_ID="shopping-item-uuid"

curl -X POST "http://localhost:3001/api/shopping-lists/items/$ITEM_ID/toggle" \
  -H "Authorization: Bearer $TOKEN"
```

**Update Item:**
```bash
curl -X PUT "http://localhost:3001/api/shopping-lists/items/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "quantity": 2,
    "unit": "kg",
    "checked": true
  }'
```

---

### Workflow 12: Collaboration Features (V1.5)

**Add RSVP:**
```bash
MEMBER_ID="member-uuid"

curl -X POST "http://localhost:3001/api/weekly-plans/$PLAN_ID/meals/$MEAL_ID/attendance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "memberId": "'$MEMBER_ID'",
    "status": "PRESENT"
  }'
```

**Add Guests:**
```bash
curl -X POST "http://localhost:3001/api/weekly-plans/$PLAN_ID/meals/$MEAL_ID/guests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "adults": 2,
    "children": 1,
    "note": "Friends from work"
  }'
```

**Add Vote:**
```bash
curl -X POST "http://localhost:3001/api/weekly-plans/$PLAN_ID/meals/$MEAL_ID/vote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "memberId": "'$MEMBER_ID'",
    "type": "LOVE",
    "comment": "Mon préféré!"
  }'
```

**Add Wish:**
```bash
curl -X POST "http://localhost:3001/api/weekly-plans/$PLAN_ID/wishes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "J'\''aimerais manger des sushis cette semaine",
    "memberId": "'$MEMBER_ID'"
  }'
```

---

### Workflow 13: Update Dietary Profile

**Update to Gluten-Free & Lactose-Free:**
```bash
curl -X PUT "http://localhost:3001/api/families/$FAMILY_ID/diet-profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "glutenFree": true,
    "lactoseFree": true,
    "allergies": ["peanuts", "shellfish"]
  }'
```

**Generate New Plan:**
- Should only include GF + LF recipes
- Should exclude recipes with peanuts or shellfish ingredients

**Test Recipe Catalog:**
```bash
curl "http://localhost:3001/api/recipes/catalog/$FAMILY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Only compliant recipes

---

### Workflow 14: Submit Recipe Feedback

**After "Cooking" a Meal:**
```bash
RECIPE_ID="cooked-recipe-uuid"

curl -X POST "http://localhost:3001/api/recipes/$RECIPE_ID/feedback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mealId": "'$MEAL_ID'",
    "rating": 5,
    "kidsLiked": true,
    "tooLong": false,
    "comment": "Délicieux et facile à faire!"
  }'
```

**Verify:**
- Recipe `avgRating` updated
- Recipe `timesCooked` incremented
- Feedback saved

---

## 🔍 Database Inspection

### Using Prisma Studio

```bash
docker-compose exec backend npx prisma studio
```

Opens: http://localhost:5555

**Browse Tables:**
- User
- Family
- DietProfile
- FamilyMember
- Recipe
- Ingredient
- Instruction
- WeeklyPlan
- Meal
- ShoppingList
- ShoppingItem
- SchoolMenu
- Attendance
- Guest
- Vote
- Wish
- Feedback

---

## 🧪 Automated Testing Scripts

### Test Script 1: Full User Journey

Create `test-full-journey.sh`:

```bash
#!/bin/bash

API="http://localhost:3001/api"

echo "=== 1. Register User ==="
REGISTER_RESPONSE=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

echo "=== 2. Create Family ==="
FAMILY_RESPONSE=$(curl -s -X POST "$API/families" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Family"
  }')

FAMILY_ID=$(echo $FAMILY_RESPONSE | jq -r '.data.family.id')
echo "Family ID: $FAMILY_ID"

echo "=== 3. Generate Weekly Plan ==="
PLAN_RESPONSE=$(curl -s -X POST "$API/weekly-plans/$FAMILY_ID/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "weekStartDate": "2025-10-27T00:00:00.000Z"
  }')

PLAN_ID=$(echo $PLAN_RESPONSE | jq -r '.data.plan.id')
MEAL_COUNT=$(echo $PLAN_RESPONSE | jq '.data.plan.meals | length')
echo "Plan ID: $PLAN_ID"
echo "Meals: $MEAL_COUNT"

echo "=== 4. Generate Shopping List ==="
SHOPPING_RESPONSE=$(curl -s -X POST "$API/shopping-lists/generate/$PLAN_ID" \
  -H "Authorization: Bearer $TOKEN")

ITEM_COUNT=$(echo $SHOPPING_RESPONSE | jq '.data.shoppingList.items | length')
echo "Shopping items: $ITEM_COUNT"

echo "=== TEST COMPLETE ==="
echo "✅ User registered"
echo "✅ Family created"
echo "✅ Weekly plan generated ($MEAL_COUNT meals)"
echo "✅ Shopping list generated ($ITEM_COUNT items)"
```

Run:
```bash
chmod +x test-full-journey.sh
./test-full-journey.sh
```

---

## 📊 Performance Testing

### Load Test with Apache Bench

```bash
# Test registration endpoint
ab -n 100 -c 10 -T 'application/json' \
  -p register.json \
  http://localhost:3001/api/auth/register

# Test recipe listing (with token)
ab -n 1000 -c 50 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/recipes
```

**Expected Performance:**
- Registration: < 500ms per request
- Recipe listing: < 200ms per request
- Plan generation: < 3 seconds
- Shopping list generation: < 2 seconds

---

## 🐛 Bug Testing

### Edge Cases to Test

**1. Empty States**
- New user with no families
- Family with no recipes
- Week with no plans
- Plan with no shopping list

**2. Validation**
- Invalid email format
- Short password (< 8 chars)
- Negative portions
- Future dates only for school menus
- Required fields missing

**3. Permissions**
- Non-admin trying to delete family
- Accessing another family's data
- Expired JWT token

**4. Dietary Constraints**
- Kosher family gets only kosher recipes
- Vegan family gets no animal products
- Gluten-free filters work correctly
- Allergen exclusion works

**5. Data Integrity**
- Deleting family cascades correctly
- Updating plan recalculates shopping list
- Portion changes affect totals

---

## ✅ Test Checklist

### Backend API
- [ ] User registration works
- [ ] Login returns JWT token
- [ ] Protected endpoints require auth
- [ ] Family creation works
- [ ] Member management works
- [ ] Dietary profile updates work
- [ ] Recipe filtering works correctly
- [ ] Weekly plan generation creates 14 meals
- [ ] Express plan uses only favorites
- [ ] School menu integration works
- [ ] Anti-duplication logic works
- [ ] Shopping list aggregates correctly
- [ ] Portion calculations accurate
- [ ] Dietary substitutions suggested
- [ ] RSVP system works
- [ ] Guest management works
- [ ] Voting system works
- [ ] Wish list works

### Frontend
- [ ] Registration form submits
- [ ] Login form works
- [ ] Dashboard displays plans
- [ ] New plan button works
- [ ] Plan view shows meals
- [ ] Recipe cards display correctly
- [ ] Shopping list shows items
- [ ] Responsive on mobile
- [ ] Touch targets ≥ 44px
- [ ] Loading states show
- [ ] Error messages display

### Database
- [ ] All migrations run successfully
- [ ] Seed data loads (8 recipes)
- [ ] Foreign keys enforce integrity
- [ ] Cascade deletes work
- [ ] Indexes improve performance
- [ ] Queries are optimized

### Docker
- [ ] Containers build successfully
- [ ] All services start
- [ ] Health checks pass
- [ ] Database persists data
- [ ] Hot reload works in dev mode
- [ ] Production build optimized

---

## 📝 Known Issues

### Current Limitations
1. **Prisma Binary Download** - May fail in restricted networks
2. **No Email Verification** - Users can register without email confirmation
3. **No Rate Limiting** - API open to abuse
4. **No Pagination** - Large lists may be slow
5. **No Caching** - Redis not implemented
6. **Placeholder Pages** - WeeklyPlan, Recipes, ShoppingList UIs incomplete

### Workarounds
1. Use `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`
2. Implement email service in production
3. Add rate limiting middleware
4. Add pagination to list endpoints
5. Add Redis for caching
6. Complete UI pages

---

## 🚀 Next Steps

After successful testing:
1. Complete remaining UI pages
2. Add comprehensive error handling
3. Implement rate limiting
4. Add email notifications
5. Set up CI/CD pipeline
6. Deploy to staging environment
7. Conduct user acceptance testing
8. Deploy to production

---

## 📞 Support

If tests fail:
1. Check Docker logs: `docker-compose logs -f`
2. Check database: `docker-compose exec postgres psql ...`
3. Restart services: `docker-compose restart`
4. Full reset: `docker-compose down -v && docker-compose up --build`
5. Check API health: `curl http://localhost:3001/health`
