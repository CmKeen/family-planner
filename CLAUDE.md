# Family Planner - Codebase Documentation

## 1. High-Level Architecture Overview

A comprehensive family meal planning SaaS application with multi-dietary constraint support.

### Tech Stack

**Backend:** Node.js 20+ + Express 4.18 + TypeScript + PostgreSQL 15 + Prisma ORM 5.7
- JWT authentication with bcrypt
- AdminJS for admin panel
- Swagger/OpenAPI documentation
- Zod validation, Winston logging

**Frontend:** React 18.2 + TypeScript + Vite 5.0 + Tailwind CSS 3.4
- Radix UI components (accessible)
- Zustand (state management)
- React Query (data fetching)
- i18next (FR/EN/NL)
- PWA support (offline)

---

## 2. Development Commands

Root: npm install, npm run dev, npm run build
Backend: npm run dev, npm test, npm run prisma:migrate, npm run prisma:studio
Frontend: npm run dev, npm run build, npm test
Docker: docker-compose -f docker-compose.dev.yml up

---

## 3. API Endpoints

Base URL: http://localhost:3001/api

Routes:
- /auth: register, login, logout, getMe
- /families: CRUD + members + diet-profile
- /recipes: CRUD + catalog + favorite + feedback
- /weekly-plans: generate + meals + swap + vote + wish + validate
- /shopping-lists: generate + items + toggle
- /school-menus: CRUD
- /health: health checks
- /api-docs: Swagger UI
- /admin: Admin panel

---

## 4. Database Models (16 total)

User, Family, DietProfile, FamilyMember, Recipe, Ingredient, Instruction, WeeklyPlan, Meal, ShoppingList, ShoppingItem, Attendance, Guest, Vote, Wish, Feedback, SchoolMenu, InventoryItem

---

## 5. Frontend Structure

App.tsx (routing) > pages/ > components/ui/ (Radix UI)
Stores: authStore (Zustand)
API: api.ts (Axios with interceptors)
i18n: i18next with FR/EN/NL

---

## 6. Backend Structure

index.ts (entry) > middleware > routes > controllers > models
Database: Prisma with 16 models
Admin: AdminJS integrated

---

## 7. Key Files

Backend: src/index.ts, src/middleware/auth.ts, prisma/schema.prisma, src/controllers/weeklyPlan.controller.ts
Frontend: src/App.tsx, src/stores/authStore.ts, src/lib/api.ts
Config: docker-compose.dev.yml, package.json files

---

## 8. Deployment

Backend env: DATABASE_URL, JWT_SECRET (required)
Frontend env: VITE_API_URL (required)
Build: npm run build (backend + frontend)
Docker: docker-compose up

---

## 9. Quick Start

npm install && cd backend && npm install && cd ../frontend && npm install
Set .env (DATABASE_URL, JWT_SECRET)
npm run prisma:migrate && npm run prisma:seed
npm run dev
Access: http://localhost:5173

---

Updated: October 25, 2025
