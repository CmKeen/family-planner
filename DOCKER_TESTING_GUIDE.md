# 🐳 Docker Deployment Testing Guide

**Purpose:** Complete step-by-step guide to test the Family Planner application using Docker.

**Last Updated:** 2025-10-23

---

## Prerequisites

Before testing, ensure you have:

- ✅ Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- ✅ Docker Compose installed (v2.0+)
- ✅ At least 4GB free RAM
- ✅ Ports 3000, 3001, and 5432 available

**Check your setup:**
```bash
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

---

## Step 1: Clean Docker Environment

Start with a fresh environment to avoid conflicts:

```bash
# Stop all running containers
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all containers
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove project-specific images
docker rmi family-planner-backend family-planner-frontend 2>/dev/null || true

# Remove unused volumes (OPTIONAL - deletes data!)
docker volume prune -f

# Verify clean state
docker ps -a        # Should show no containers
docker images       # Should not show family-planner images
```

---

## Step 2: Clone & Navigate to Project

```bash
# If not already cloned
git clone https://github.com/CmKeen/family-planner.git
cd family-planner

# Verify you're on the correct branch
git branch
git status
```

---

## Step 3: Build Docker Images

Build all services from scratch:

```bash
# Build all images (takes 5-10 minutes first time)
docker-compose build --no-cache

# Check images were created
docker images | grep family-planner
```

**Expected output:**
```
family-planner-frontend    latest    abc123    2 minutes ago    200MB
family-planner-backend     latest    def456    3 minutes ago    300MB
postgres                   15-alpine xyz789    ...              250MB
```

---

## Step 4: Start All Services

```bash
# Start all services in detached mode
docker-compose up -d

# Watch logs in real-time
docker-compose logs -f
```

**What to look for in logs:**

1. **PostgreSQL (database):**
   ```
   family-planner-db | database system is ready to accept connections
   ```

2. **Backend:**
   ```
   family-planner-backend | ✅ Environment configuration loaded
   family-planner-backend | Prisma schema loaded
   family-planner-backend | Server running on port 3001
   ```

3. **Frontend:**
   ```
   family-planner-frontend | nginx started
   ```

**Check container status:**
```bash
docker-compose ps
```

All services should show status "Up" and be healthy.

---

## Step 5: Verify Database Migration

Check that database migrations ran successfully:

```bash
# Check backend logs for migration messages
docker-compose logs backend | grep -i "migrat"

# Access database directly
docker-compose exec postgres psql -U familyplanner -d family_planner

# In psql, check tables exist:
\dt

# You should see tables like:
# - User
# - Family
# - Recipe
# - WeeklyPlan
# - Meal
# - ShoppingList
# etc.

# Exit psql
\q
```

---

## Step 6: Verify Seed Data

Check that sample recipes were seeded:

```bash
# Check backend logs for seed messages
docker-compose logs backend | grep -i "seed"

# Query recipes from database
docker-compose exec postgres psql -U familyplanner -d family_planner -c "SELECT id, name, category FROM \"Recipe\" LIMIT 5;"

# Should show 8+ recipes
```

---

## Step 7: Access the Application

Open your browser and test each service:

### 1. Frontend (http://localhost:3000)
- ✅ Page loads without errors
- ✅ No console errors in browser DevTools
- ✅ Displays login page
- ✅ Language switcher appears (FR/EN)
- ✅ Responsive design works on mobile view

### 2. Backend API Health (http://localhost:3001/health)
- ✅ Returns `{"status": "ok"}` or similar
- ✅ HTTP 200 status code

### 3. Swagger API Docs (http://localhost:3001/api-docs)
- ✅ Interactive API documentation loads
- ✅ All endpoints listed
- ✅ Can expand endpoint details
- ✅ "Try it out" button functional

---

## Step 8: Complete User Workflow Test

Test the full application flow:

### 8.1 Register New User

**Via Frontend UI:**
1. Navigate to http://localhost:3000
2. Click "Sign up" / "S'inscrire"
3. Fill in registration form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: TestPassword123!
4. Click "Create Account"
5. ✅ Should redirect to onboarding page

**Via Swagger UI:**
1. Navigate to http://localhost:3001/api-docs
2. Find POST /api/auth/register
3. Click "Try it out"
4. Enter JSON:
   ```json
   {
     "firstName": "Test",
     "lastName": "User",
     "email": "test2@example.com",
     "password": "TestPassword123!"
   }
   ```
5. Click "Execute"
6. ✅ Should return 201 Created with JWT token

### 8.2 Login

**Via Frontend:**
1. Navigate to login page
2. Enter: test@example.com / TestPassword123!
3. Click "Sign In"
4. ✅ Should redirect to onboarding (new user) or dashboard

**Via Swagger:**
1. Use POST /api/auth/login
2. Enter credentials
3. Copy JWT token from response
4. Click "Authorize" button at top
5. Enter: `Bearer <your-token>`
6. ✅ Can now test protected endpoints

### 8.3 Create Family

**Via Frontend:**
1. After login, onboarding page appears
2. Enter family name: "Test Family"
3. Click "Continue"
4. ✅ Should redirect to dashboard

**Via Swagger:**
1. Use POST /api/families (ensure authenticated)
2. Enter JSON:
   ```json
   {
     "name": "Test Family"
   }
   ```
3. ✅ Returns family object with ID

### 8.4 Generate Meal Plan

**Via Frontend:**
1. On dashboard, click "New Plan" button
2. Wait for plan generation (5-10 seconds)
3. ✅ Should show weekly plan with 14 meals (7 days × 2 meals)
4. Verify:
   - All 7 days displayed (Lundi-Dimanche or Monday-Sunday)
   - Each day has Lunch and Dinner
   - Recipe names shown
   - Cooking times displayed
   - Stats cards show data (Total time, Favorites, Novelties)

**Via Swagger:**
1. Use POST /api/weekly-plans/auto-generate
2. Enter:
   ```json
   {
     "familyId": "<family-id-from-step-8.3>",
     "weekStartDate": "2025-01-20T00:00:00.000Z"
   }
   ```
3. ✅ Returns plan with 14 meals

### 8.5 Validate Plan & View Shopping List

**Via Frontend:**
1. On weekly plan page, click "Valider le plan" / "Validate Plan"
2. Confirm dialog
3. ✅ Plan status changes to "Validé" / "Validated"
4. Click "Voir la liste de courses" / "View Shopping List"
5. ✅ Shopping list appears with:
   - All ingredients needed
   - Quantities calculated
   - Grouped by category or recipe
   - Checkboxes functional

**Via Swagger:**
1. Use POST /api/weekly-plans/{planId}/validate
2. Then GET /api/shopping-lists/plan/{planId}
3. ✅ Returns shopping list with items

### 8.6 Browse Recipes

**Via Frontend:**
1. Navigate to Recipes page
2. ✅ See recipe catalog
3. Try search: "poulet"
4. ✅ Filter works
5. Try category filter: "Viandes"
6. ✅ Shows only meat recipes
7. Click on a recipe
8. ✅ Recipe detail dialog shows ingredients & instructions

---

## Step 9: Test Language Switching

1. Open any page
2. Click language switcher (Globe icon)
3. ✅ All text changes language (FR ↔ EN)
4. ✅ Language preference persists on page reload
5. Test on:
   - Login page
   - Dashboard
   - Weekly plan page
   - Recipes page
   - Shopping list page

---

## Step 10: Check Container Logs

Inspect logs for errors:

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend

# Search for errors
docker-compose logs | grep -i "error"
docker-compose logs | grep -i "warning"
docker-compose logs | grep -i "exception"
```

**What to look for:**
- ❌ No ERROR messages
- ❌ No uncaught exceptions
- ❌ No database connection errors
- ✅ Only INFO/DEBUG messages

---

## Step 11: Test Container Health & Restart

```bash
# Check health status
docker-compose ps

# Restart a specific service
docker-compose restart backend

# Watch it recover
docker-compose logs -f backend

# Test frontend still works after backend restart
# Navigate to http://localhost:3000
```

**Expected:**
- ✅ Backend restarts in < 10 seconds
- ✅ Frontend continues to work
- ✅ Database connection recovers automatically

---

## Step 12: Test Data Persistence

```bash
# Stop all containers
docker-compose down

# Start again (without --volumes flag to keep data)
docker-compose up -d

# Login with same user (test@example.com)
```

**Expected:**
- ✅ User still exists
- ✅ Family still exists
- ✅ Meal plans still exist
- ✅ All data preserved

---

## Step 13: Performance Testing

### Load Time Test
```bash
# Test frontend load time
time curl -s http://localhost:3000 > /dev/null

# Test API response time
time curl -s http://localhost:3001/health > /dev/null

# Test authenticated endpoint
time curl -s -H "Authorization: Bearer <token>" http://localhost:3001/api/recipes > /dev/null
```

**Expected:**
- Frontend: < 500ms
- Health check: < 100ms
- API endpoints: < 500ms

### Concurrent Users Test
```bash
# Simulate 10 concurrent requests (requires apache2-utils)
ab -n 100 -c 10 http://localhost:3001/health

# Check for errors in response
```

---

## Step 14: Resource Usage Check

```bash
# Check CPU and memory usage
docker stats

# Check disk usage
docker system df
```

**Expected:**
- Backend: < 500MB RAM, < 10% CPU (idle)
- Frontend: < 100MB RAM, < 5% CPU (idle)
- Database: < 300MB RAM, < 10% CPU (idle)

---

## Step 15: Security Check

### Check Exposed Ports
```bash
docker-compose ps
```

**Expected ports:**
- 3000: Frontend (Nginx)
- 3001: Backend API
- 5432: PostgreSQL (for development only!)

**Production note:** Port 5432 should NOT be exposed in production!

### Check Environment Variables
```bash
# Check backend env
docker-compose exec backend env | grep -E "JWT_SECRET|DATABASE_URL"

# Ensure secrets are not hardcoded
docker-compose config | grep -i "secret"
```

---

## Troubleshooting

### Problem: Containers won't start

**Solution:**
```bash
# Check logs for specific errors
docker-compose logs

# Common issues:
# 1. Port already in use
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432

# 2. Build cache issues
docker-compose build --no-cache
docker-compose up -d
```

### Problem: Database connection errors

**Solution:**
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait 5 seconds, then restart backend
sleep 5
docker-compose restart backend
```

### Problem: Frontend shows blank page

**Solution:**
```bash
# Check frontend logs
docker-compose logs frontend

# Check browser console for errors
# Open http://localhost:3000 and press F12

# Common issue: API_URL misconfigured
docker-compose exec frontend cat /usr/share/nginx/html/index.html | grep "VITE_API_URL"
```

### Problem: Backend API not responding

**Solution:**
```bash
# Check backend is running
docker-compose ps backend

# Check backend logs for errors
docker-compose logs backend | tail -50

# Test backend directly
curl http://localhost:3001/health

# Restart backend
docker-compose restart backend
```

---

## Cleanup

### Stop Services
```bash
# Stop all services (keeps volumes)
docker-compose down

# Stop and remove volumes (deletes all data!)
docker-compose down -v
```

### Remove Everything
```bash
# Nuclear option: remove all Docker resources for this project
docker-compose down -v --rmi all
docker system prune -af
```

---

## Success Criteria

Your deployment is production-ready if:

- ✅ All 3 containers start without errors
- ✅ Database migrations complete successfully
- ✅ Seed data loads (8+ recipes)
- ✅ Frontend loads at http://localhost:3000
- ✅ Backend API responds at http://localhost:3001
- ✅ Swagger docs accessible at http://localhost:3001/api-docs
- ✅ User registration works
- ✅ User login works
- ✅ Family creation works
- ✅ Meal plan generation works
- ✅ Shopping list generation works
- ✅ Language switching works (FR/EN)
- ✅ No errors in container logs
- ✅ Containers recover from restarts
- ✅ Data persists across restarts
- ✅ API response time < 500ms
- ✅ Resource usage reasonable

---

## Reporting Issues

If you encounter issues:

1. **Collect information:**
   ```bash
   # Save all logs
   docker-compose logs > docker-logs.txt

   # Save configuration
   docker-compose config > docker-config.yml

   # Save system info
   docker version > system-info.txt
   docker-compose version >> system-info.txt
   ```

2. **Document the problem:**
   - What were you trying to do?
   - What command did you run?
   - What was the expected result?
   - What actually happened?
   - Include relevant log excerpts

3. **Create GitHub issue** with all information

---

## Next Steps

After successful Docker testing:

1. **Fix any bugs discovered** (Phase 1, Task 1.5)
2. **Proceed to Phase 2** (Security hardening)
3. **Deploy to production** (Railway, Render, or AWS)

---

**Testing completed successfully?** Mark Task 1.4 as ✅ in PRODUCTION_READINESS.md!
