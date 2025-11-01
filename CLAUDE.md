# Family Planner - Codebase Documentation

**Last Updated:** October 25, 2025

> A full-stack family meal planning SaaS with multi-dietary constraints, flexible scheduling, and smart recipe selection.

---

## 📚 Documentation Index

- **[TDD_GUIDE.md](TDD_GUIDE.md)** - Test-driven development workflow (MANDATORY)
- **[VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)** - Chrome MCP verification procedures (MANDATORY)
- **[CODING_STANDARDS.md](CODING_STANDARDS.md)** - Coding standards and best practices (MANDATORY)
- **[backend/ESM_MODULES.md](backend/ESM_MODULES.md)** - ESM module resolution configuration (CRITICAL - DO NOT MODIFY)

---

## 🚨 Critical Requirements

### 1. Test-Driven Development
- **MUST write tests BEFORE code** - See [TDD_GUIDE.md](TDD_GUIDE.md)
- Minimum coverage: 80% statements, 75% branches
- RED → GREEN → REFACTOR cycle

### 2. Chrome MCP Verification
- **MUST verify all features** - See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)
- Test in all 3 languages (FR/EN/NL)
- Check console errors and network requests

### 3. Multi-Lingual Support
**ALL user-facing content MUST be translated:**
- Frontend: Use `t('key')` from i18next (never hardcode text)
- Backend: Multi-lingual DB fields (title/titleEn, description/descriptionEn)
- Languages: French (default), English, Dutch

**Translation workflow:**
```typescript
// 1. Add to ALL locale files: fr.json, en.json, nl.json
{
  "recipes": {
    "create": "Créer une recette" // FR
  }
}

// 2. Use in components
const { t } = useTranslation();
<button>{t('recipes.create')}</button>
```

### 4. Docker-First Development
- **ALWAYS use Docker** - No local installations
- All commands run in containers: `docker-compose exec backend npm test`
- Hot reloading enabled (no restarts needed for code changes)

```bash
# Start stack
docker-compose -f docker-compose.dev.yml up

# Run commands
docker-compose exec backend npm test
docker-compose exec frontend npm test
```

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- Node.js 20 + Express + TypeScript
- PostgreSQL 15 + Prisma ORM 5.7
- JWT auth, AdminJS panel
- Swagger docs, Zod validation

**Frontend:**
- React 18.2 + TypeScript + Vite 5.0
- Tailwind CSS 3.4 + Radix UI
- Zustand (global state) + React Query (server state)
- i18next (FR/EN/NL)

**Infrastructure:**
- Docker + Docker Compose
- GitHub Actions CI/CD

---

## 📁 Directory Structure

### Root
```
family-planner/
├── backend/          # Node.js API
│   ├── src/
│   ├── prisma/       # Schema & migrations
│   └── public/       # Static files
├── frontend/         # React SPA
│   ├── src/
│   └── public/
├── docker-compose.dev.yml
├── CLAUDE.md         # This file
├── TDD_GUIDE.md
├── VERIFICATION_GUIDE.md
└── CODING_STANDARDS.md
```

### Backend (`backend/src/`)
```
src/
├── config/           # Configuration
│   ├── admin.ts
│   ├── env.ts
│   ├── logger.ts
│   └── swagger.ts
├── controllers/      # Business logic
│   ├── auth.controller.ts
│   ├── family.controller.ts
│   ├── invitation.controller.ts
│   ├── mealScheduleTemplate.controller.ts
│   ├── recipe.controller.ts
│   ├── schoolMenu.controller.ts
│   ├── shoppingList.controller.ts
│   ├── weeklyPlan.controller.ts
│   └── __tests__/
├── middleware/       # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   └── security.ts
├── routes/           # Route definitions
├── utils/            # Utilities
├── lib/              # Shared libraries
│   └── prisma.ts
├── admin/            # AdminJS customizations
├── scripts/          # Utility scripts
└── index.ts
```

### Frontend (`frontend/src/`)
```
src/
├── components/
│   ├── ui/           # Radix UI primitives
│   ├── ErrorBoundary.tsx
│   └── LanguageSwitcher.tsx
├── pages/            # Route pages
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── OnboardingPage.tsx
│   ├── WeeklyPlanPage.tsx
│   ├── RecipesPage.tsx
│   ├── ShoppingListPage.tsx
│   ├── FamilySettingsPage.tsx
│   ├── InvitationsPage.tsx
│   └── __tests__/
├── stores/           # Zustand stores
│   └── authStore.ts
├── hooks/            # Custom hooks
├── lib/
│   ├── api.ts        # Axios client
│   ├── i18n.ts       # i18next config
│   └── utils.ts
├── locales/          # Translations
│   ├── fr.json
│   ├── en.json
│   └── nl.json
├── App.tsx
└── main.tsx
```

---

## 💾 Database Schema

**Location:** `backend/prisma/schema.prisma`

### 19 Models

**User Management:**
- User (auth, profile, isAdmin flag)
- Family (name, language, units, dietProfileId, defaultTemplateId)
- FamilyMember (name, role, age, portionFactor, aversions, favorites)
- FamilyInvitation (token-based system, 7-day expiration)

**Dietary:**
- DietProfile (kosher, halal, vegetarian, vegan, glutenFree, allergies, favoriteRatio, maxNovelties)

**Recipes:**
- Recipe (multilingual, timing, dietary flags, categories, ratings)
- Ingredient (multilingual, dietary flags)
- Instruction (multilingual, step-by-step)

**Planning:**
- WeeklyPlan (DRAFT → IN_VALIDATION → VALIDATED → LOCKED)
- Meal (dayOfWeek, mealType, recipeId, portions, locked)
- MealScheduleTemplate (flexible scheduling, JSON schedule)
- Attendance (RSVP tracking)
- Guest (guest management)
- Vote (LIKE/DISLIKE/LOVE)
- Wish (meal requests)

**Shopping:**
- ShoppingList (auto-generated from plan)
- ShoppingItem (quantity, checked, alternatives)
- InventoryItem (pantry tracking)
- Feedback (post-meal feedback)

**School:**
- SchoolMenu (integration with school menus)

### Key Relationships
```
User → Family (1:n as creator)
User → FamilyMember (1:n)
Family → DietProfile (1:1)
Family → WeeklyPlan (1:n)
WeeklyPlan → Meal (1:n)
Meal → Recipe (n:1)
Recipe → Ingredient (1:n)
```

---

## 🔌 API Endpoints

**Base:** `http://localhost:3001/api`

### Authentication (`/api/auth`)
```
POST   /register
POST   /login
POST   /logout
GET    /me
```

### Families (`/api/families`)
```
POST   /                      Create family
GET    /                      List families
GET    /:id                   Get family
PUT    /:id                   Update family
DELETE /:id                   Delete family
POST   /:id/members           Add member
PUT    /members/:memberId     Update member
DELETE /members/:memberId     Remove member
PUT    /:id/diet-profile      Update diet profile
```

### Invitations
```
POST   /api/families/:id/invitations           Send invitation
GET    /api/families/:id/invitations/sent      Sent invitations
GET    /api/families/invitations/received      Received invitations
POST   /api/families/invitations/:id/accept    Accept
POST   /api/families/invitations/:id/decline   Decline
DELETE /api/families/:id/invitations/:invId    Cancel
```

### Recipes (`/api/recipes`)
```
POST   /                      Create recipe
GET    /                      List recipes (with filters)
GET    /:id                   Get recipe
PUT    /:id                   Update recipe
DELETE /:id                   Delete recipe
GET    /catalog/:familyId     Weekly catalog (diet-filtered)
POST   /:id/favorite          Toggle favorite
POST   /:id/feedback          Submit feedback
```

### Weekly Plans (`/api/weekly-plans`)
```
POST   /                                Create plan
GET    /family/:familyId                List plans
GET    /:id                             Get plan
POST   /:familyId/generate              Auto-generate plan
POST   /:familyId/generate-express      Express plan
POST   /:planId/meals                   Add meal
DELETE /:planId/meals/:mealId           Remove meal
PUT    /:planId/meals/:mealId           Update meal
POST   /:planId/meals/:mealId/swap      Swap recipe
POST   /:planId/meals/:mealId/lock      Lock/unlock meal
POST   /:planId/meals/:mealId/vote      Vote on meal
POST   /:planId/wishes                  Add wish
POST   /:planId/validate                Validate plan
PUT    /:planId/template                Switch template
```

### Shopping Lists (`/api/shopping-lists`)
```
POST   /generate/:weeklyPlanId    Generate list
GET    /:weeklyPlanId              Get list
PUT    /items/:itemId              Update item
POST   /items/:itemId/toggle       Toggle checked
```

### School Menus (`/api/school-menus`)
```
POST   /                      Create menu
GET    /family/:familyId      List menus
PUT    /:id                   Update menu
DELETE /:id                   Delete menu
```

### Templates (`/api/families/:familyId/meal-templates`)
```
GET    /                      List templates (system + family)
GET    /:templateId           Get template
POST   /                      Create template
PUT    /:templateId           Update template
DELETE /:templateId           Delete template
PUT    /families/:familyId/default-template  Set default
```

### Other
```
GET    /api/health            Health check
GET    /api/api-docs          Swagger UI
GET    /admin                 AdminJS dashboard
```

---

## 🔧 Development Workflow

### Initial Setup
```bash
# 1. Clone & install
git clone <repo>
cd family-planner
npm install

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET

# 3. Database
npm run prisma:migrate
npm run prisma:seed

# 4. Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL
```

### Running with Docker (Recommended)
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:3001/api
# API Docs: http://localhost:3001/api-docs
# Admin: http://localhost:3001/admin

# Run commands
docker-compose exec backend npm test
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run make-admin -- user@example.com
docker-compose exec frontend npm test

# Stop
docker-compose down
```

### Database Management
```bash
# Create migration
npm run prisma:migrate -- --name feature_name

# Prisma Studio (GUI)
npm run prisma:studio

# Reset database (⚠️ deletes data)
npx prisma migrate reset
```

### Testing
See [TDD_GUIDE.md](TDD_GUIDE.md) for full workflow.

```bash
# Backend
docker-compose exec backend npm test
docker-compose exec backend npm run test:coverage

# Frontend
docker-compose exec frontend npm test
docker-compose exec frontend npm run test:ui
```

### Building for Production
```bash
# Backend
cd backend
npm run build  # → dist/

# Frontend
cd frontend
npm run build  # → dist/
```

---

## ⚙️ Configuration

### Environment Variables

**Backend (`.env`)**
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**Frontend (`.env`)**
```bash
VITE_API_URL=http://localhost:3001/api
```

---

## 🎯 Key Features

### 1. Meal Plan Generation

**Two modes:**

**Auto Plan** (smart selection):
1. Load meal schedule template
2. Categorize recipes (favorites, novelties, others)
3. For each meal:
   - Check school menu (avoid duplicates)
   - Select recipe (60% favorites, max 2 novelties)
   - Filter by diet profile
4. Create meals → Return DRAFT plan

**Express Plan** (quick):
- Fixed: Lunch + Dinner × 7 days
- Only favorites + 1 novelty

### 2. Recipe Search
- Multilingual (FR/EN)
- Accent-insensitive
- Filters: category, mealType, cuisine, season
- Diet profile filtering

### 3. Shopping List Generation
1. Get all meals from plan
2. Scale ingredients by portions (family members + guests)
3. Aggregate by name + unit + category
4. Apply dietary substitutions
5. Check inventory, deduct in-stock
6. Sort by category

### 4. Invitation System
1. Send invitation (ADMIN/PARENT only)
2. Generate UUID token (7-day expiration)
3. Accept → Create FamilyMember (atomic transaction)
4. Status: PENDING → ACCEPTED/DECLINED/CANCELLED

### 5. Flexible Meal Templates
- System templates (e.g., "Lunch & Dinner 7 days")
- Custom family templates (e.g., "Dinners weekdays only")
- JSON schedule format:
  ```json
  [
    { "dayOfWeek": "MONDAY", "mealTypes": ["DINNER"] },
    { "dayOfWeek": "SATURDAY", "mealTypes": ["LUNCH", "DINNER"] }
  ]
  ```

---

## 🛡️ Security & Middleware

### Authentication
- JWT (7-day expiration)
- bcrypt password hashing (10 rounds)
- HTTP-only cookies + Authorization header

### Rate Limiting
```typescript
apiLimiter: 100 req/15min
authLimiter: 5 req/15min
registerLimiter: 3 req/hour
intensiveOperationLimiter: 5 req/min
```

### Security Headers
- Helmet.js (CSP, HSTS, etc.)
- CORS whitelist
- Request sanitization

### Error Handling
- Development: Full stack traces
- Production: Minimal exposure, JSON logs
- Custom AppError class
- Winston logging with context

---

## 🎨 Frontend Architecture

### State Management
**Zustand (Global):**
```typescript
// stores/authStore.ts
{ user, family, token, isAuthenticated, logout }
```

**React Query (Server):**
```typescript
useQuery(['recipes', familyId], () => recipeAPI.getCatalog(familyId))
```

### API Integration
```typescript
// lib/api.ts - Centralized Axios
- Request interceptor: Add JWT token
- Response interceptor: Handle 401 → logout

// Organized by domain
export const authAPI = { register, login, logout, getMe }
export const familyAPI = { create, getAll, getById, ... }
export const recipeAPI = { ... }
export const weeklyPlanAPI = { ... }
```

### Routing (React Router)
```typescript
<Route path="/login" element={<LoginPage />} />
<Route element={<ProtectedRoute />}>  {/* Auth guard */}
  <Route path="/" element={<DashboardPage />} />
  <Route path="/plan/:id" element={<WeeklyPlanPage />} />
  <Route path="/recipes" element={<RecipesPage />} />
  ...
</Route>
```

### i18n
```typescript
// lib/i18n.ts
Languages: fr (default), en, nl

// Usage
const { t, i18n } = useTranslation();
<h1>{t('dashboard.title')}</h1>
<button onClick={() => i18n.changeLanguage('en')}>EN</button>
```

---

## 👨‍💼 Admin Panel

**Access:** `http://localhost:3001/admin` (requires `user.isAdmin = true`)

### Features
- Custom dashboard
- Full CRUD for all models
- HelloFresh recipe scraper
- Fix broken images action
- Export to CSV

### Resource Categories
- User Management
- Family Management
- Recipe Management
- Planning
- Engagement (votes, wishes, attendance)
- Shopping & Inventory
- School Integration

### Admin User Management
```bash
# Grant admin
docker-compose exec backend npm run make-admin -- user@example.com

# Revoke admin
docker-compose exec backend npm run revoke-admin -- user@example.com
```

---

## 🚀 Deployment

### Production Checklist

**Backend:**
- ✓ NODE_ENV=production
- ✓ Secure JWT_SECRET (256-bit)
- ✓ Production DATABASE_URL
- ✓ CORS_ORIGIN whitelist
- ✓ HTTPS/HSTS
- ✓ Log aggregation
- ✓ Error tracking
- ✓ Run migrations: `npx prisma migrate deploy`
- ✓ Build: `npm run build`
- ✓ Start: `node dist/index.js`

**Frontend:**
- ✓ VITE_API_URL → production
- ✓ Build: `npm run build`
- ✓ Serve with nginx/CDN
- ✓ CSP headers
- ✓ Compression (gzip/brotli)

### Docker Production
```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

---

## 📝 Git Workflow

See [CODING_STANDARDS.md](CODING_STANDARDS.md) for full conventions.

```bash
# Feature branch
git checkout -b feature/your-feature

# Commit format: <type>(<scope>): <subject>
git commit -m "feat(recipes): add multilingual search"
git commit -m "fix(auth): resolve JWT expiration"
git commit -m "test(weeklyPlan): add integration tests"

# Push & PR
git push origin feature/your-feature
```

---

## 🎯 Quick Reference

### Common Commands
```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up

# Run tests (TDD!)
docker-compose exec backend npm test
docker-compose exec frontend npm test

# Database
docker-compose exec backend npm run prisma:studio
docker-compose exec backend npm run prisma:migrate

# Admin user
docker-compose exec backend npm run make-admin -- user@example.com

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart backend
```

### Key Files
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/config/admin.ts` - Admin panel config
- `frontend/src/lib/api.ts` - API client
- `frontend/src/locales/*.json` - Translations
- `docker-compose.dev.yml` - Dev environment

### Ports
- Frontend: `5173`
- Backend: `3001`
- PostgreSQL: `5432`

---

## 📚 Additional Resources

- **API Docs:** http://localhost:3001/api-docs
- **Prisma Studio:** `npm run prisma:studio`
- **TDD Guide:** [TDD_GUIDE.md](TDD_GUIDE.md)
- **Verification Guide:** [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)
- **Coding Standards:** [CODING_STANDARDS.md](CODING_STANDARDS.md)

---

**Remember:**
1. ✅ Write tests FIRST (TDD)
2. ✅ Verify with Chrome MCP
3. ✅ Translate ALL text (FR/EN/NL)
4. ✅ Use Docker for everything
5. ✅ Follow coding standards

**End of Documentation**
