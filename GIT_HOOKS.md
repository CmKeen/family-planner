# Git Hooks Setup

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to enforce code quality and run tests before committing and pushing changes.

## Overview

Two git hooks are configured:

1. **pre-commit**: Runs linting and TypeScript type checking on staged files
2. **pre-push**: Runs all tests (backend and frontend) before pushing

## Pre-Commit Hook

Runs automatically when you commit changes (`git commit`).

### What it does:

- Runs ESLint with auto-fix on staged TypeScript/JavaScript files
- Runs TypeScript compiler (`tsc --noEmit`) to check for type errors
- Only processes files that are staged for commit (efficient!)

### Affected files:

- **Backend**: `backend/src/**/*.{ts,js}`
- **Frontend**: `frontend/src/**/*.{ts,tsx,js,jsx}`

### What happens:

✅ **Success**: Commit proceeds normally
❌ **Failure**: Commit is blocked, fix the errors shown

**Example:**
```bash
git add .
git commit -m "feat: add new feature"
# ✓ ESLint runs and auto-fixes issues
# ✓ TypeScript checks for errors
# ✓ If all pass, commit succeeds
```

## Pre-Push Hook

Runs automatically when you push changes (`git push`).

### What it does:

1. Checks if Docker is running
2. Checks if containers are up
3. Runs backend tests: `docker-compose exec -T backend npm test`
4. Runs frontend tests: `docker-compose exec -T frontend npm test -- --run`

### What happens:

✅ **Success**: Push proceeds normally
❌ **Failure**: Push is blocked, fix the failing tests

**Example:**
```bash
git push origin main
# 🧪 Running backend tests...
# ✓ Backend tests passed
# 🧪 Running frontend tests...
# ✓ Frontend tests passed
# ✅ All tests passed!
# Push proceeds...
```

### Important Notes:

- **Docker must be running** before you push
- **Containers must be started**: `docker-compose -f docker-compose.dev.yml up -d`
- Tests run in Docker containers (as per project standards)

## Bypassing Hooks (Not Recommended)

If you need to bypass hooks temporarily (use with caution):

```bash
# Skip pre-commit
git commit --no-verify -m "message"

# Skip pre-push
git push --no-verify
```

⚠️ **Warning**: Only bypass hooks if you know what you're doing. The hooks are there to maintain code quality and prevent broken code from being pushed.

## Manual Commands

You can run these commands manually at any time:

```bash
# Lint backend
cd backend && npm run lint

# Lint frontend
cd frontend && npm run lint

# TypeScript check backend
cd backend && npx tsc --noEmit

# TypeScript check frontend
cd frontend && npx tsc --noEmit

# Run tests (Docker)
docker-compose exec backend npm test
docker-compose exec frontend npm test
```

## Troubleshooting

### "Docker is not running"

Start Docker Desktop and try again.

### "Docker containers are not running"

Start the containers:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### TypeScript errors in pre-commit

Fix the type errors shown in the output. The hook will block the commit until they're resolved.

### Tests failing in pre-push

Fix the failing tests before pushing. Run tests locally first:
```bash
docker-compose exec backend npm test
docker-compose exec frontend npm test
```

### ESLint warnings

The pre-commit hook uses `eslint --fix` to automatically fix common issues. Remaining issues will be shown but won't block commits (only errors block commits).

## Configuration Files

- **Husky hooks**: `.husky/pre-commit`, `.husky/pre-push`
- **lint-staged config**: `package.json` (root) → `lint-staged` field
- **Backend ESLint**: `backend/eslint.config.js`
- **Frontend ESLint**: `frontend/eslint.config.js`

## How It Works

1. **Husky** manages git hooks
2. **lint-staged** runs commands only on staged files (fast!)
3. **ESLint** checks code style and auto-fixes issues
4. **TypeScript** checks for type errors
5. **Tests** run in Docker containers before push

This ensures:
- ✅ Consistent code style
- ✅ No type errors
- ✅ All tests pass before pushing
- ✅ Higher code quality overall
