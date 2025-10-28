# 🍽️ Family Planner - Meal Planning SaaS

A comprehensive family meal planning application with multi-dietary constraint support (Kosher, Halal, Vegetarian, Vegan, Gluten-Free, Lactose-Free), smart weekly menu generation, school menu integration, and collaborative planning features.

---

## 📚 Documentation

### **Essential Reading (MANDATORY)**
1. **[CLAUDE.md](CLAUDE.md)** - Main codebase reference & architecture
2. **[TDD_GUIDE.md](TDD_GUIDE.md)** - Test-driven development workflow
3. **[VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)** - Chrome MCP verification procedures
4. **[CODING_STANDARDS.md](CODING_STANDARDS.md)** - Coding standards & best practices

---

## 🚨 Critical Requirements

### 1. Test-Driven Development (TDD)
**You MUST write tests BEFORE implementing features.**
- Minimum coverage: 80% statements, 75% branches
- Follow RED → GREEN → REFACTOR cycle
- See [TDD_GUIDE.md](TDD_GUIDE.md)

### 2. Chrome MCP Verification
**All features MUST be verified using Chrome MCP.**
- Test in all 3 languages (FR/EN/NL)
- Check console errors and network requests
- See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)

### 3. Multi-Lingual Support
**ALL user-facing content MUST be translated** (French, English, Dutch)
- Frontend: Use `t('key')` from i18next (never hardcode text)
- Backend: Multi-lingual DB fields (title/titleEn, description/descriptionEn)

### 4. Docker-First Development
**ALWAYS use Docker** - No local installations required
- All commands run in containers
- Hot reloading enabled

---

## 🚀 Quick Start

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access the application:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001/api
# - API Docs: http://localhost:3001/api-docs
# - Admin Panel: http://localhost:3001/admin
```

### Run Tests
```bash
# Backend tests
docker-compose exec backend npm test
docker-compose exec backend npm run test:coverage

# Frontend tests
docker-compose exec frontend npm test
docker-compose exec frontend npm run test:ui
```

### Common Commands
```bash
# Database management
docker-compose exec backend npm run prisma:studio
docker-compose exec backend npm run prisma:migrate

# Grant admin privileges
docker-compose exec backend npm run make-admin -- user@example.com

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

---

## ✨ Features

### MVP Features (V1.0)
- ✅ **Multi-Constraint Dietary Profiles**: Kosher, Halal, Vegetarian, Vegan, Gluten-Free, Lactose-Free, and custom allergies
- ✅ **Smart Weekly Planning**: Auto-generate meal plans with 60% favorites + max 2 novelties
- ✅ **Express Plan**: Quick planning with favorites only
- ✅ **Recipe Catalog**: Filtered catalog based on family dietary constraints
- ✅ **Recipe Swapping**: Replace meals with compliant alternatives
- ✅ **School Menu Integration**: Import school menus and avoid duplication
- ✅ **Smart Shopping Lists**: Consolidated lists with portion calculations and dietary substitutions
- ✅ **PWA Support**: Offline-ready shopping lists
- ✅ **Mobile-First Design**: Optimized for phones, tablets, and desktop
- ✅ **Multi-Language**: French (default), English, Dutch support
- ✅ **Family Invitations**: Token-based invitation system
- ✅ **Flexible Meal Templates**: System and custom family templates

### V1.5 Features (In Progress)
- 🔄 Enhanced family collaboration with votes, RSVP, and wishes
- 🔄 Guest management and portion recalculation
- 🔄 Cutoff system with delta mode
- 🔄 Notifications and reminders

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js 20 + Express + TypeScript
- PostgreSQL 15 + Prisma ORM 5.7
- JWT authentication
- AdminJS admin panel
- Swagger/OpenAPI documentation
- Zod validation

**Frontend:**
- React 18.2 + TypeScript
- Vite 5.0 (fast build tool)
- Tailwind CSS 3.4 (mobile-first)
- Radix UI components (accessible)
- Zustand (global state) + React Query (server state)
- i18next (FR/EN/NL internationalization)
- PWA support

**Infrastructure:**
- Docker + Docker Compose
- GitHub Actions CI/CD

---

## 🗂️ Project Structure

```
family-planner/
├── backend/              # Node.js API
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, error handling
│   │   ├── config/       # Configuration
│   │   └── admin/        # AdminJS customizations
│   └── prisma/           # Database schema & migrations
├── frontend/             # React SPA
│   ├── src/
│   │   ├── pages/        # Route pages
│   │   ├── components/   # React components
│   │   ├── stores/       # State management
│   │   ├── lib/          # API client, utilities
│   │   └── locales/      # Translations (FR/EN/NL)
├── CLAUDE.md            # Main documentation
├── TDD_GUIDE.md         # TDD workflow
├── VERIFICATION_GUIDE.md # Verification procedures
├── CODING_STANDARDS.md  # Coding standards
└── docker-compose.dev.yml # Dev environment
```

See [CLAUDE.md](CLAUDE.md#-directory-structure) for full directory details.

---

## 💾 Database

**19 Models:** User, Family, FamilyMember, FamilyInvitation, DietProfile, Recipe, Ingredient, Instruction, WeeklyPlan, Meal, MealScheduleTemplate, Attendance, Guest, Vote, Wish, ShoppingList, ShoppingItem, InventoryItem, Feedback, SchoolMenu

See [backend/prisma/schema.prisma](backend/prisma/schema.prisma) for full schema.

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:3001/api`

### Main Endpoints
- `/api/auth` - Register, login, logout
- `/api/families` - Family CRUD, members, diet profile
- `/api/families/:id/invitations` - Family invitation system
- `/api/recipes` - Recipe CRUD, catalog, favorites
- `/api/weekly-plans` - Plan generation & management
- `/api/shopping-lists` - Shopping list generation
- `/api/school-menus` - School menu integration
- `/api/families/:familyId/meal-templates` - Template management

**Interactive API Docs:** http://localhost:3001/api-docs

See [CLAUDE.md](CLAUDE.md#-api-endpoints) for full API reference.

---

## 🔒 Security

- JWT authentication (7-day expiration)
- bcrypt password hashing (10 rounds)
- Rate limiting (multiple tiers)
- Helmet.js security headers
- CORS whitelist
- Input validation with Zod
- RGPD compliant

---

## 🎯 Key Features Guide

### 1. User Registration & Login
- Create account with email/password
- Secure JWT-based authentication

### 2. Family Setup
- Create family profile
- Add family members with roles (admin, parent, member, child)
- Configure comprehensive dietary profile

### 3. Weekly Planning

**Auto-Generate Plan:**
- System generates balanced week with 60% favorites + max 2 novelties
- Full dietary compliance
- No duplication with school menus

**Express Plan:**
- Quick planning with only favorites
- 1 novelty maximum

**Manual Adjustments:**
- Swap meals with alternatives
- Lock meals to prevent changes
- Adjust portions per meal

### 4. Recipe Management
- Browse filtered recipe catalog
- View details (ingredients, instructions, timing)
- Mark favorites and rate recipes
- Multilingual support (FR/EN)

### 5. Shopping Lists
- Auto-generated from weekly plan
- Grouped by aisle/department
- Smart quantity calculation (portions, guests, inventory)
- Dietary substitutions
- Offline-capable (PWA)

### 6. School Menu Integration
- Add school lunch menus
- Automatic anti-duplication by food category

---

## 👨‍💼 Admin Panel

**Access:** `http://localhost:3001/admin` (requires admin privileges)

**Features:**
- Full CRUD for all database models
- HelloFresh recipe scraper
- Fix broken images action
- Export to CSV

**Grant Admin:**
```bash
docker-compose exec backend npm run make-admin -- user@example.com
```

---

## 🧪 Testing

**Coverage Requirements:**
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

```bash
# Run tests
docker-compose exec backend npm test
docker-compose exec frontend npm test

# Coverage reports
docker-compose exec backend npm run test:coverage
docker-compose exec frontend npm run test:coverage

# Watch mode (for TDD)
docker-compose exec backend npm run test:watch
```

---

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Commit with conventional commits
git commit -m "feat(recipes): add multilingual search"
git commit -m "fix(auth): resolve JWT expiration"
git commit -m "test(weeklyPlan): add integration tests"

# Push and create PR
git push origin feature/your-feature
```

See [CODING_STANDARDS.md](CODING_STANDARDS.md) for full conventions.

---

## 🚀 Deployment

### Production Checklist

**Backend:**
- ✓ Set NODE_ENV=production
- ✓ Configure secure JWT_SECRET (256-bit)
- ✓ Set production DATABASE_URL
- ✓ Configure CORS_ORIGIN whitelist
- ✓ Run migrations: `npx prisma migrate deploy`
- ✓ Build: `npm run build`

**Frontend:**
- ✓ Set VITE_API_URL to production API
- ✓ Build: `npm run build`
- ✓ Serve with nginx/CDN
- ✓ Configure CSP headers

See [CLAUDE.md](CLAUDE.md#-deployment) for full deployment guide.

---

## 🛣️ Roadmap

### V1.0 (Current - MVP)
- ✅ Core meal planning features
- ✅ Multi-dietary constraints
- ✅ Shopping list generation
- ✅ School menu integration
- ✅ Family invitation system
- ✅ Flexible meal templates

### V1.5 (Q2 2025)
- 🔄 Enhanced family collaboration
- 🔄 RSVP and guest management
- 🔄 Voting on meals
- 🔄 Wish list
- 🔄 Notifications

### V2.0 (Q3 2025)
- 📋 Grocery store integrations
- 📋 Hebrew calendar integration
- 📋 Passover planning
- 📋 Weather-based suggestions
- 📋 Gamification

---

## 🤝 Contributing

**Before contributing:**
1. Read [CODING_STANDARDS.md](CODING_STANDARDS.md)
2. Follow TDD workflow in [TDD_GUIDE.md](TDD_GUIDE.md)
3. Verify with Chrome MCP per [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)
4. Add translations for all 3 languages (FR/EN/NL)
5. Ensure tests pass and coverage meets thresholds

**Process:**
1. Fork the repository
2. Create feature branch
3. Write tests FIRST (TDD)
4. Implement feature
5. Verify with Chrome MCP
6. Submit PR with conventional commit messages

---

## 📚 Additional Resources

- **Main Documentation:** [CLAUDE.md](CLAUDE.md)
- **API Documentation:** http://localhost:3001/api-docs
- **Prisma Studio:** `docker-compose exec backend npm run prisma:studio`

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/family-planner/issues)
- **Documentation:** [CLAUDE.md](CLAUDE.md)

---

## 📝 License

This project is licensed under the MIT License.

---

**Remember: Write tests FIRST, verify with Chrome MCP, translate EVERYTHING!** 🚀

**Happy Planning! 🍽️**
