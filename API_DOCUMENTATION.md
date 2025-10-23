# 📚 Family Planner - Complete API Documentation

## Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are also sent as HTTP-only cookies named `token`.

---

## 🔐 Authentication Endpoints

### Register User

**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "language": "fr" // Optional: "fr", "en", "nl"
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "fr",
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

**Validation:**
- Email must be valid format
- Password must be minimum 8 characters
- Email must be unique

---

### Login

**POST** `/api/auth/login`

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "fr"
    },
    "token": "jwt-token-here"
  }
}
```

**Errors:**
- `401` - Invalid credentials

---

### Logout

**POST** `/api/auth/logout`

Clear authentication cookie.

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### Get Current User

**GET** `/api/auth/me`

Get authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "language": "fr",
      "units": "metric",
      "createdAt": "2025-10-23T10:00:00.000Z",
      "families": [
        {
          "id": "family-uuid",
          "role": "ADMIN",
          "family": {
            "id": "family-uuid",
            "name": "The Smith Family",
            "dietProfile": { /* diet settings */ }
          }
        }
      ]
    }
  }
}
```

---

## 👨‍👩‍👧‍👦 Family Endpoints

### Create Family

**POST** `/api/families`

Create a new family with dietary profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "The Smith Family",
  "language": "fr",
  "units": "metric",
  "dietProfile": {
    "kosher": true,
    "kosherType": "moderate",
    "meatToMilkDelayHours": 3,
    "shabbatMode": false,
    "halal": false,
    "vegetarian": false,
    "vegan": false,
    "pescatarian": false,
    "glutenFree": false,
    "lactoseFree": false,
    "allergies": ["peanuts", "shellfish"],
    "favoriteRatio": 0.6,
    "maxNovelties": 2,
    "diversityEnabled": true
  }
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "family": {
      "id": "family-uuid",
      "name": "The Smith Family",
      "language": "fr",
      "units": "metric",
      "dietProfile": { /* full diet profile */ },
      "members": [
        {
          "id": "member-uuid",
          "name": "user@example.com",
          "role": "ADMIN"
        }
      ]
    }
  }
}
```

---

### Get All Families

**GET** `/api/families`

Get all families the user is a member of.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "families": [
      {
        "id": "family-uuid",
        "name": "The Smith Family",
        "language": "fr",
        "units": "metric",
        "dietProfile": { /* diet profile */ },
        "members": [ /* members */ ],
        "_count": {
          "recipes": 15,
          "weeklyPlans": 3
        }
      }
    ]
  }
}
```

---

### Get Family By ID

**GET** `/api/families/:id`

Get detailed family information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "family": {
      "id": "family-uuid",
      "name": "The Smith Family",
      "dietProfile": {
        "kosher": true,
        "kosherType": "moderate",
        "meatToMilkDelayHours": 3,
        "halal": false,
        "vegetarian": false,
        "vegan": false,
        "glutenFree": false,
        "lactoseFree": false,
        "allergies": ["peanuts"],
        "favoriteRatio": 0.6,
        "maxNovelties": 2
      },
      "members": [
        {
          "id": "member-uuid",
          "name": "John Doe",
          "role": "ADMIN",
          "age": 35,
          "portionFactor": 1.0,
          "user": {
            "email": "john@example.com",
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      ]
    }
  }
}
```

---

### Update Family

**PUT** `/api/families/:id`

Update family name, language, or units. (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Family Name",
  "language": "en",
  "units": "imperial"
}
```

**Response:** `200 OK`

**Errors:**
- `403` - Not authorized (must be admin)

---

### Delete Family

**DELETE** `/api/families/:id`

Delete a family and all associated data. (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Family deleted successfully"
}
```

---

### Add Family Member

**POST** `/api/families/:id/members`

Add a new member to the family.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Emily Smith",
  "role": "MEMBER", // ADMIN, PARENT, MEMBER, CHILD
  "age": 8,
  "portionFactor": 0.7,
  "aversions": ["broccoli", "mushrooms"],
  "favorites": ["pizza", "pasta"]
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "member": {
      "id": "member-uuid",
      "familyId": "family-uuid",
      "name": "Emily Smith",
      "role": "MEMBER",
      "age": 8,
      "portionFactor": 0.7,
      "aversions": ["broccoli", "mushrooms"],
      "favorites": ["pizza", "pasta"]
    }
  }
}
```

---

### Update Family Member

**PUT** `/api/families/:familyId/members/:memberId`

Update member details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (all fields optional)
```json
{
  "name": "Emily Rose Smith",
  "age": 9,
  "portionFactor": 0.75,
  "aversions": ["broccoli"],
  "favorites": ["pizza", "pasta", "chicken"]
}
```

**Response:** `200 OK`

---

### Remove Family Member

**DELETE** `/api/families/:familyId/members/:memberId`

Remove a member from the family.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Update Diet Profile

**PUT** `/api/families/:id/diet-profile`

Update family's dietary profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (all fields optional)
```json
{
  "kosher": true,
  "kosherType": "strict",
  "meatToMilkDelayHours": 6,
  "halal": false,
  "vegetarian": false,
  "vegan": false,
  "glutenFree": true,
  "lactoseFree": true,
  "allergies": ["peanuts", "tree nuts", "shellfish"],
  "favoriteRatio": 0.7,
  "maxNovelties": 1
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "dietProfile": { /* updated profile */ }
  }
}
```

---

## 🍳 Recipe Endpoints

### Get All Recipes

**GET** `/api/recipes`

Get recipes with optional filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
familyId      - Filter by family (shows family recipes + public)
category      - Filter by category (pasta, chicken, fish, etc.)
mealType      - Filter by meal type (breakfast, lunch, dinner, snack)
maxTime       - Maximum total time in minutes
kosher        - Filter kosher recipes (true/false)
halal         - Filter halal-friendly recipes (true/false)
vegetarian    - Filter vegetarian recipes (true/false)
vegan         - Filter vegan recipes (true/false)
glutenFree    - Filter gluten-free recipes (true/false)
lactoseFree   - Filter lactose-free recipes (true/false)
favorites     - Show only favorites (true/false)
```

**Example:**
```
GET /api/recipes?vegetarian=true&maxTime=30&favorites=true
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "recipes": [
      {
        "id": "recipe-uuid",
        "title": "Pâtes tomates basilic",
        "titleEn": "Tomato Basil Pasta",
        "description": "Pâtes simples sauce tomate fraîche",
        "prepTime": 5,
        "cookTime": 15,
        "totalTime": 20,
        "difficulty": 1,
        "kidsRating": 5,
        "kosherCategory": "parve",
        "halalFriendly": true,
        "glutenFree": false,
        "lactoseFree": true,
        "vegetarian": true,
        "vegan": true,
        "category": "pates",
        "mealType": ["lunch", "dinner"],
        "cuisine": "italian",
        "season": ["spring", "summer", "fall", "winter"],
        "imageUrl": "https://images.unsplash.com/...",
        "servings": 4,
        "budget": "low",
        "isFavorite": true,
        "isNovelty": false,
        "timesCooked": 5,
        "avgRating": 4.5,
        "ingredients": [
          {
            "id": "ing-uuid",
            "name": "Pâtes",
            "quantity": 500,
            "unit": "g",
            "category": "Épicerie",
            "containsGluten": true,
            "order": 0
          }
        ],
        "instructions": [
          {
            "id": "step-uuid",
            "stepNumber": 1,
            "text": "Cuire les pâtes selon les instructions",
            "duration": 10
          }
        ]
      }
    ],
    "count": 15
  }
}
```

---

### Get Recipe By ID

**GET** `/api/recipes/:id`

Get detailed recipe information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "recipe": {
      "id": "recipe-uuid",
      "title": "Poulet rôti aux herbes",
      // ... all recipe fields
      "ingredients": [ /* full ingredients */ ],
      "instructions": [ /* full instructions */ ],
      "feedbacks": [
        {
          "id": "feedback-uuid",
          "rating": 5,
          "kidsLiked": true,
          "comment": "Délicieux!",
          "createdAt": "2025-10-20T..."
        }
      ]
    }
  }
}
```

---

### Get Weekly Catalog

**GET** `/api/recipes/catalog/:familyId`

Get filtered recipe catalog for weekly planning (12-20 recipes).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
weekStartDate - ISO date for the week (optional)
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "catalog": [
      /* 12-20 recipes filtered by family's dietary constraints */
    ],
    "counts": {
      "favorites": 8,
      "novelties": 2,
      "total": 14
    }
  }
}
```

**Algorithm:**
- Filters recipes by family's dietary profile
- Excludes recipes with allergens
- Calculates: 60-80% favorites, 1-2 novelties, rest variety
- Returns shuffled selection

---

### Create Recipe

**POST** `/api/recipes`

Create a new recipe (admin/parent only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Mon nouveau plat",
  "titleEn": "My New Dish",
  "description": "Description du plat",
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": 2,
  "kidsRating": 4,
  "kosherCategory": "meat",
  "halalFriendly": true,
  "glutenFree": false,
  "lactoseFree": false,
  "vegetarian": false,
  "vegan": false,
  "category": "chicken",
  "mealType": ["lunch", "dinner"],
  "cuisine": "french",
  "season": ["fall", "winter"],
  "imageUrl": "https://...",
  "servings": 4,
  "budget": "medium",
  "ingredients": [
    {
      "name": "Poulet",
      "nameEn": "Chicken",
      "quantity": 1,
      "unit": "kg",
      "category": "Boucherie",
      "containsGluten": false,
      "containsLactose": false,
      "allergens": [],
      "alternatives": ["Tofu"]
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "text": "Préchauffer le four",
      "textEn": "Preheat oven",
      "duration": 5
    }
  ],
  "familyId": "family-uuid" // Optional: null for public recipes
}
```

**Response:** `201 Created`

---

### Update Recipe

**PUT** `/api/recipes/:id`

Update an existing recipe.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (all fields optional)

**Response:** `200 OK`

---

### Delete Recipe

**DELETE** `/api/recipes/:id`

Delete a recipe.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Toggle Favorite

**POST** `/api/recipes/:id/favorite`

Mark/unmark recipe as favorite.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "recipe": {
      "id": "recipe-uuid",
      "isFavorite": true
    }
  }
}
```

---

### Submit Feedback

**POST** `/api/recipes/:id/feedback`

Submit feedback after cooking a recipe.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "mealId": "meal-uuid",
  "rating": 5,
  "kidsLiked": true,
  "tooLong": false,
  "comment": "Délicieux et facile!"
}
```

**Response:** `200 OK`

**Side Effect:** Updates recipe's average rating and times cooked count.

---

## 📅 Weekly Plan Endpoints

### Create Weekly Plan

**POST** `/api/weekly-plans`

Create an empty weekly plan.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "familyId": "family-uuid",
  "weekStartDate": "2025-10-27T00:00:00.000Z"
}
```

**Response:** `201 Created`

---

### Get Weekly Plans

**GET** `/api/weekly-plans/family/:familyId`

Get all weekly plans for a family.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
limit - Number of plans to return (default: 10)
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "plans": [
      {
        "id": "plan-uuid",
        "familyId": "family-uuid",
        "weekStartDate": "2025-10-27T00:00:00.000Z",
        "weekNumber": 44,
        "year": 2025,
        "status": "DRAFT", // DRAFT, IN_VALIDATION, VALIDATED, LOCKED
        "validatedAt": null,
        "meals": [
          {
            "id": "meal-uuid",
            "dayOfWeek": "MONDAY",
            "mealType": "LUNCH",
            "recipeId": "recipe-uuid",
            "recipe": { /* recipe details */ },
            "portions": 4,
            "locked": false,
            "attendance": [],
            "guests": [],
            "votes": []
          }
        ]
      }
    ],
    "count": 3
  }
}
```

---

### Get Weekly Plan By ID

**GET** `/api/weekly-plans/:id`

Get detailed weekly plan with all meals, attendance, votes.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "plan": {
      "id": "plan-uuid",
      "weekStartDate": "2025-10-27T00:00:00.000Z",
      "weekNumber": 44,
      "year": 2025,
      "status": "DRAFT",
      "family": {
        "id": "family-uuid",
        "name": "The Smith Family",
        "dietProfile": { /* diet profile */ },
        "members": [ /* members */ ]
      },
      "meals": [
        {
          "id": "meal-uuid",
          "dayOfWeek": "MONDAY",
          "mealType": "LUNCH",
          "recipe": {
            "id": "recipe-uuid",
            "title": "Poulet rôti",
            "ingredients": [ /* ingredients */ ],
            "instructions": [ /* instructions */ ]
          },
          "portions": 4,
          "locked": false,
          "attendance": [
            {
              "id": "att-uuid",
              "memberId": "member-uuid",
              "member": { "name": "John" },
              "status": "PRESENT"
            }
          ],
          "guests": [
            {
              "id": "guest-uuid",
              "adults": 2,
              "children": 1,
              "note": "Friends from work"
            }
          ],
          "votes": [
            {
              "id": "vote-uuid",
              "memberId": "member-uuid",
              "member": { "name": "Emily" },
              "type": "LOVE",
              "comment": "Mon préféré!"
            }
          ]
        }
      ],
      "wishes": [
        {
          "id": "wish-uuid",
          "text": "Sushis cette semaine",
          "memberId": "member-uuid",
          "fulfilled": false
        }
      ]
    }
  }
}
```

---

### Generate Auto Plan

**POST** `/api/weekly-plans/:familyId/generate`

Auto-generate a weekly plan with smart algorithm.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "weekStartDate": "2025-10-27T00:00:00.000Z"
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "plan": {
      "id": "plan-uuid",
      "weekStartDate": "2025-10-27T00:00:00.000Z",
      "meals": [
        /* 14 meals (7 days × 2 meals) */
      ]
    }
  }
}
```

**Algorithm:**
1. Get family's dietary constraints
2. Filter compliant recipes
3. Get school menus for the week
4. Select 60-80% favorites, 1-2 novelties
5. Avoid duplicating school lunch categories at dinner
6. Distribute variety across the week
7. Calculate portions based on family size

---

### Generate Express Plan

**POST** `/api/weekly-plans/:familyId/generate-express`

Quick plan with only favorites + 1 novelty.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "weekStartDate": "2025-10-27T00:00:00.000Z"
}
```

**Response:** `201 Created`

**Algorithm:**
1. Get only favorite recipes
2. Require at least 1 favorite recipe
3. Fill week with favorites
4. Add 1 random novelty
5. Optimized for < 5 min validation

**Errors:**
- `400` - No favorite recipes found

---

### Update Meal

**PUT** `/api/weekly-plans/:planId/meals/:mealId`

Update meal recipe or portions.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipeId": "new-recipe-uuid",
  "portions": 6
}
```

**Response:** `200 OK`

---

### Swap Meal

**POST** `/api/weekly-plans/:planId/meals/:mealId/swap`

Replace meal with a different recipe.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "newRecipeId": "recipe-uuid"
}
```

**Response:** `200 OK`

**Note:** Should provide compliant alternatives based on:
- Same meal type
- Similar cooking time
- Dietary compliance
- Category diversity

---

### Lock Meal

**POST** `/api/weekly-plans/:planId/meals/:mealId/lock`

Lock/unlock a meal to prevent changes.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "locked": true
}
```

**Response:** `200 OK`

---

### Add Attendance (RSVP)

**POST** `/api/weekly-plans/:planId/meals/:mealId/attendance`

Set member's attendance for a meal.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "memberId": "member-uuid",
  "status": "PRESENT" // PRESENT, ABSENT, MAYBE
}
```

**Response:** `200 OK`

**Side Effect:** May trigger portion recalculation

---

### Add Guests

**POST** `/api/weekly-plans/:planId/meals/:mealId/guests`

Add guests to a meal.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "adults": 2,
  "children": 1,
  "note": "Friends from work"
}
```

**Response:** `200 OK`

**Side Effect:** Increases portion calculation

---

### Add Vote

**POST** `/api/weekly-plans/:planId/meals/:mealId/vote`

Vote on a meal.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "memberId": "member-uuid",
  "type": "LOVE", // LIKE, DISLIKE, LOVE
  "comment": "Mon préféré!"
}
```

**Response:** `200 OK`

---

### Add Wish

**POST** `/api/weekly-plans/:planId/wishes`

Add a meal wish to the weekly plan.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "J'aimerais manger des sushis cette semaine",
  "memberId": "member-uuid"
}
```

**Response:** `200 OK`

---

### Validate Plan

**POST** `/api/weekly-plans/:planId/validate`

Mark plan as validated and finalize.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "plan": {
      "id": "plan-uuid",
      "status": "VALIDATED",
      "validatedAt": "2025-10-23T15:30:00.000Z"
    }
  }
}
```

**Side Effect:**
- Changes status to VALIDATED
- Locks the plan
- Triggers shopping list generation

---

## 🛒 Shopping List Endpoints

### Generate Shopping List

**POST** `/api/shopping-lists/generate/:weeklyPlanId`

Generate shopping list from weekly plan.

**Headers:** `Authorization: Bearer <token>`

**Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "shoppingList": {
      "id": "list-uuid",
      "familyId": "family-uuid",
      "weeklyPlanId": "plan-uuid",
      "generatedAt": "2025-10-23T15:30:00.000Z",
      "items": [
        {
          "id": "item-uuid",
          "name": "Poulet entier",
          "nameEn": "Whole chicken",
          "quantity": 1.5,
          "unit": "kg",
          "category": "Boucherie",
          "alternatives": ["Poulet bio", "Poulet halal"],
          "checked": false,
          "inStock": false,
          "order": 0
        }
      ]
    }
  }
}
```

**Algorithm:**
1. Aggregate all ingredients from all meals
2. Group by name, unit, category
3. Sum quantities
4. Adjust for portions and guests
5. Deduct from inventory (if tracked)
6. Round to packaging sizes (0.25kg, 50g, etc.)
7. Add dietary substitutions where needed
8. Sort by category and name

---

### Get Shopping List

**GET** `/api/shopping-lists/:weeklyPlanId`

Get shopping list for a weekly plan.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "shoppingList": {
      "id": "list-uuid",
      "items": [ /* all items */ ]
    },
    "groupedItems": {
      "Boucherie": [
        {
          "id": "item-uuid",
          "name": "Poulet entier",
          "quantity": 1.5,
          "unit": "kg",
          "checked": false
        }
      ],
      "Fruits & Légumes": [ /* items */ ],
      "Épicerie": [ /* items */ ],
      "Produits laitiers": [ /* items */ ]
    }
  }
}
```

---

### Update Shopping Item

**PUT** `/api/shopping-lists/items/:itemId`

Update item quantity or checked status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "quantity": 2,
  "unit": "kg",
  "checked": true,
  "inStock": false
}
```

**Response:** `200 OK`

---

### Toggle Item Checked

**POST** `/api/shopping-lists/items/:itemId/toggle`

Quick toggle checked status.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "item": {
      "id": "item-uuid",
      "checked": true
    }
  }
}
```

---

## 🏫 School Menu Endpoints

### Create School Menu

**POST** `/api/school-menus`

Add a school menu entry.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "familyId": "family-uuid",
  "schoolName": "École Primaire",
  "date": "2025-10-28T00:00:00.000Z",
  "mealType": "LUNCH",
  "title": "Pâtes bolognaise",
  "category": "pates",
  "description": "Pâtes avec sauce bolognaise maison",
  "ocrConfidence": 0.95,
  "needsReview": false
}
```

**Response:** `201 Created`

---

### Get School Menus

**GET** `/api/school-menus/family/:familyId`

Get school menus for a family.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
startDate - ISO date (filter start)
endDate   - ISO date (filter end)
```

**Example:**
```
GET /api/school-menus/family/uuid?startDate=2025-10-27&endDate=2025-11-03
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "schoolMenus": [
      {
        "id": "menu-uuid",
        "familyId": "family-uuid",
        "schoolName": "École Primaire",
        "date": "2025-10-28T00:00:00.000Z",
        "mealType": "LUNCH",
        "title": "Pâtes bolognaise",
        "category": "pates",
        "description": "...",
        "ocrConfidence": 0.95,
        "needsReview": false
      }
    ],
    "count": 5
  }
}
```

---

### Update School Menu

**PUT** `/api/school-menus/:id`

Update school menu details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Pâtes carbonara",
  "category": "pates",
  "needsReview": false
}
```

**Response:** `200 OK`

---

### Delete School Menu

**DELETE** `/api/school-menus/:id`

Delete a school menu entry.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

## 🔒 Security

### Authentication
- JWT tokens with 7-day expiration
- HTTP-only cookies for web security
- Bcrypt password hashing with salt rounds: 10

### Authorization
- All endpoints require authentication (except register/login)
- Family operations check membership
- Admin operations check admin role
- Member deletion restricted to admins

### Validation
- All inputs validated with Zod schemas
- SQL injection protected by Prisma ORM
- XSS protection with proper escaping
- CORS configured for specific origins

### Rate Limiting
- (Not implemented yet - recommended for production)
- Suggested: 100 requests per 15 minutes per IP

---

## 📊 Status Codes

### Success
- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Successful deletion

### Client Errors
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists

### Server Errors
- `500 Internal Server Error` - Server error

---

## 🧪 Example Workflows

### Complete User Journey

**1. Register**
```bash
POST /api/auth/register
{
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
# Returns: { user, token }
```

**2. Create Family**
```bash
POST /api/families
Authorization: Bearer <token>
{
  "name": "The Doe Family",
  "dietProfile": {
    "kosher": true,
    "glutenFree": true,
    "allergies": ["peanuts"]
  }
}
# Returns: { family }
```

**3. Add Family Member**
```bash
POST /api/families/{familyId}/members
{
  "name": "Emily Doe",
  "role": "CHILD",
  "age": 8,
  "portionFactor": 0.7
}
```

**4. Generate Weekly Plan**
```bash
POST /api/weekly-plans/{familyId}/generate
{
  "weekStartDate": "2025-10-27T00:00:00.000Z"
}
# Returns: Plan with 14 meals (7 days × 2)
```

**5. Generate Shopping List**
```bash
POST /api/shopping-lists/generate/{planId}
# Returns: Consolidated shopping list
```

**6. Check Off Items**
```bash
POST /api/shopping-lists/items/{itemId}/toggle
# Toggles checked status
```

---

## 📝 Notes

### Pagination
- Most list endpoints support `limit` parameter
- Default limit: 10
- Sorting: Most recent first

### Localization
- All text fields have French and English versions
- User's language preference used for responses
- Recipes can have translations

### Performance
- Prisma includes query optimization
- Indexes on foreign keys
- N+1 query prevention with includes

### Future Enhancements
- GraphQL API (optional)
- WebSocket for real-time collaboration
- Batch operations
- Advanced filtering
- Export endpoints (PDF, Excel)

---

## 🆘 Support

For API issues:
1. Check request format matches docs
2. Verify authentication token
3. Check response status and error message
4. Review server logs

Common Issues:
- **401**: Token expired or missing
- **403**: Insufficient permissions
- **404**: Invalid ID or deleted resource
- **500**: Server error - check logs
