# Family Planner Backend

Node.js + Express + TypeScript + Prisma backend for the Family Planner application.

## Quick Start

```bash
# Development (with Docker)
docker-compose -f docker-compose.dev.yml up

# Development (local)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test
```

## Important Documentation

⚠️ **CRITICAL**: Before modifying build configuration or module imports, read:
- **[ESM_MODULES.md](ESM_MODULES.md)** - ESM module resolution (DO NOT MODIFY without reading)

This explains why:
- Source files don't have `.js` extensions
- The build script runs a post-build transformation
- Certain configuration files must not be changed

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (env, logger, swagger, admin)
│   ├── controllers/     # Business logic
│   ├── middleware/      # Express middleware
│   ├── routes/          # Route definitions
│   ├── utils/           # Utilities
│   ├── lib/             # Shared libraries (Prisma client)
│   └── index.ts         # Entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.ts          # Seed data
├── public/
│   └── images/          # Static images (recipes)
├── dist/                # Compiled output (generated)
├── add-js-extensions.cjs # Post-build script (CRITICAL)
└── package.json
```

## Scripts

### Development
- `npm run dev` - Start dev server with hot reload (tsx)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:seed` - Seed database

### Admin Management
- `npm run make-admin -- user@example.com` - Grant admin access
- `npm run revoke-admin -- user@example.com` - Revoke admin access

### Utilities
- `npm run scrape-hellofresh` - Scrape HelloFresh recipes
- `npm run fix-broken-images` - Fix broken recipe images

### Production
- `npm run build` - Build for production (runs tsc + post-build script)
- `npm start` - Start production server

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/family_planner

# JWT
JWT_SECRET=your-secret-key-here-min-256-bits
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=development
PORT=3001

# CORS
CORS_ORIGIN=http://localhost:5173

# App
APP_NAME=Family Planner API
```

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15
- **ORM**: Prisma 5.7
- **Authentication**: JWT + bcrypt
- **Validation**: Zod + express-validator
- **Logging**: Winston
- **Testing**: Jest + ts-jest
- **Admin Panel**: AdminJS
- **Documentation**: Swagger/OpenAPI

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3001/api-docs
- Swagger JSON: http://localhost:3001/api-docs.json

## Admin Panel

Access the admin panel at: http://localhost:3001/admin

Requires an admin user (create with `npm run make-admin`).

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

All tests must pass before pushing. The pre-push hook will run tests automatically.

## Build Process

The build process has two steps:

1. **TypeScript Compilation** (`tsc`)
   - Compiles `.ts` files to `.js` files in `dist/`
   - Source files do NOT have `.js` extensions

2. **Post-Build Transformation** (`node add-js-extensions.cjs`)
   - Adds `.js` extensions to compiled output
   - Required for Node.js ESM compatibility
   - **DO NOT SKIP THIS STEP**

See [ESM_MODULES.md](ESM_MODULES.md) for detailed explanation.

## Common Issues

### Tests failing with "Cannot find module"
- Check that source files do NOT have `.js` extensions
- See [ESM_MODULES.md](ESM_MODULES.md) for details

### Render deployment fails with ERR_MODULE_NOT_FOUND
- Ensure build script includes post-build transformation
- Verify `add-js-extensions.cjs` exists
- See [ESM_MODULES.md](ESM_MODULES.md) for troubleshooting

### npm ci fails on Render
- Run `npm install` locally
- Commit updated `package-lock.json`

## Security

- JWT authentication with HTTP-only cookies
- Rate limiting on all routes
- Helmet.js security headers
- Input validation with Zod
- SQL injection prevention with Prisma
- XSS protection with sanitization

## License

MIT
