# ESM Module Resolution - Critical Documentation

**Status**: ✅ WORKING - DO NOT MODIFY WITHOUT READING THIS ENTIRE DOCUMENT

**Last Updated**: November 1, 2025

---

## The Problem

Node.js with `"type": "module"` in package.json requires **explicit `.js` extensions** in all relative imports, even when importing TypeScript files that compile to `.js`. However, Jest (our test runner) does **not** work well with `.js` extensions in source TypeScript files.

### Example of the Issue

```typescript
// ❌ Source code with .js - Breaks Jest
import { env } from './config/env.js';  // Jest can't resolve this

// ✅ Source code without .js - Works with Jest
import { env } from './config/env';     // Jest works, but Node ESM fails

// ✅ Compiled output with .js - Works with Node ESM
import { env } from './config/env.js';  // Node ESM works
```

---

## The Solution: Post-Build Transformation

We use a **post-build script** that adds `.js` extensions to the compiled output AFTER TypeScript compilation. This gives us the best of both worlds:

1. **Source files** (`.ts`) → No `.js` extensions → Jest works ✅
2. **Compiled files** (`.js` in `dist/`) → Has `.js` extensions → Node ESM works ✅

### Implementation

**File**: `backend/add-js-extensions.cjs`
- Runs after `tsc` compilation
- Processes all `.js` files in `dist/`
- Adds `.js` extensions to relative imports using regex

**Build Script** in `package.json`:
```json
"build": "tsc && node add-js-extensions.cjs"
```

---

## Critical Rules - DO NOT VIOLATE

### ✅ DO

1. **Keep source files WITHOUT `.js` extensions**
   ```typescript
   // ✅ CORRECT in source files (.ts)
   import { prisma } from '../lib/prisma';
   import { log } from './logger';
   ```

2. **Run the post-build script after compilation**
   ```bash
   npm run build  # This runs: tsc && node add-js-extensions.cjs
   ```

3. **Keep `add-js-extensions.cjs` in the backend root**
   - This file is critical for production builds
   - Do not delete or modify without understanding the full impact

4. **Ensure package-lock.json is committed**
   - Render uses `npm ci` which requires a synced package-lock.json
   - Always commit package-lock.json changes

### ❌ DO NOT

1. **DO NOT add `.js` extensions to source TypeScript files**
   ```typescript
   // ❌ WRONG - This breaks Jest tests
   import { prisma } from '../lib/prisma.js';
   ```

2. **DO NOT modify jest.config.cjs moduleNameMapper**
   - It's configured to strip `.js` extensions if they exist
   - Changing this will break tests

3. **DO NOT change `tsconfig.json` moduleResolution to "NodeNext"**
   - This forces `.js` extensions in source files
   - We tried this - it breaks everything

4. **DO NOT use `tsc-alias` or similar tools**
   - Our custom script (`add-js-extensions.cjs`) is simpler and more reliable
   - We control exactly what gets transformed

5. **DO NOT modify the build script order**
   ```json
   // ✅ CORRECT
   "build": "tsc && node add-js-extensions.cjs"

   // ❌ WRONG - Script must run AFTER tsc
   "build": "node add-js-extensions.cjs && tsc"
   ```

---

## How It Works

### 1. Development (Local & Docker)
- Use `npm run dev` which runs `tsx watch src/index.ts`
- `tsx` handles ESM imports natively, no extensions needed
- Tests run with `npm test` (Jest with ts-jest)

### 2. Production Build (Render)
```bash
npm ci                           # Install dependencies from lock file
npm run build                    # Run: tsc && node add-js-extensions.cjs
  └─ tsc                         # Compile TS → JS (no .js extensions)
  └─ node add-js-extensions.cjs  # Add .js extensions to compiled output
npm start                        # Run: node dist/index.js
```

### 3. What Gets Transformed

**Before** (after `tsc`):
```javascript
// dist/config/logger.js
import { env } from './env';  // ❌ Won't work in Node ESM
```

**After** (`add-js-extensions.cjs`):
```javascript
// dist/config/logger.js
import { env } from './env.js';  // ✅ Works in Node ESM
```

---

## Configuration Files

### `package.json`
```json
{
  "type": "module",  // Required for ESM
  "scripts": {
    "build": "tsc && node add-js-extensions.cjs",  // Critical!
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "jest"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "module": "ESNext",              // ✅ Keep this
    "moduleResolution": "bundler",   // ✅ NOT "NodeNext"!
    "target": "ES2022",
    "outDir": "./dist",
    // ... other settings
  }
}
```

### `jest.config.cjs`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '(.*)\\.js': '$1'  // Strip .js extensions for Jest
  },
  // ... other settings
};
```

---

## Troubleshooting

### Problem: Tests failing with "Cannot find module"
**Cause**: Someone added `.js` extensions to source files
**Solution**: Remove `.js` extensions from all imports in `.ts` files

### Problem: Render deployment fails with ERR_MODULE_NOT_FOUND
**Cause**: Post-build script didn't run or failed
**Solution**:
1. Check build script: `"build": "tsc && node add-js-extensions.cjs"`
2. Verify `add-js-extensions.cjs` exists in backend root
3. Check Render build logs for script errors

### Problem: npm ci fails on Render
**Cause**: package-lock.json out of sync
**Solution**: Run `npm install` locally and commit package-lock.json

---

## Testing the Build

Before pushing to Render, always test locally:

```bash
cd backend

# Clean build
rm -rf dist/
npm run build

# Verify .js extensions were added
grep -r "from '\./config/env'" dist/  # Should find nothing
grep -r "from '\./config/env.js'" dist/  # Should find matches

# Run tests to ensure nothing broke
npm test

# Test the built output
node dist/index.js
```

---

## History & Context

### Why We Chose This Approach

We tried multiple approaches:

1. ❌ **Add `.js` to all source files** → Broke Jest tests
2. ❌ **Configure Jest for ESM** → Module mocking became impossible
3. ❌ **Change moduleResolution to "NodeNext"** → Required `.js` everywhere, 100+ errors
4. ❌ **Use tsc-alias** → Added complexity, harder to debug
5. ✅ **Post-build transformation** → Clean, simple, works perfectly

### Key Commits

- `99b5e49` - Initial post-build script implementation
- `f2dbf47` - Fixed package-lock.json sync issue

### Why It Kept Breaking

The issue kept recurring because:
1. Node ESM requirements aren't obvious
2. Changes to one file required understanding the entire system
3. No documentation existed explaining the approach
4. Easy to accidentally modify critical config files

**This document exists to prevent that from happening again.**

---

## Related Files

### Critical Files (DO NOT DELETE)
- `backend/add-js-extensions.cjs` - Post-build transformation script
- `backend/package.json` - Build script configuration
- `backend/package-lock.json` - Dependency lock file for Render

### Important Files (MODIFY WITH CARE)
- `backend/tsconfig.json` - TypeScript configuration
- `backend/jest.config.cjs` - Jest configuration
- `backend/fix-index-imports.cjs` - Legacy script (only touches index.ts)

### Obsolete Files (Can Delete)
- `backend/fix-imports.cjs` - Old approach, no longer used

---

## Summary

**The Golden Rule**:
> Source files have NO `.js` extensions.
> Compiled output GETS `.js` extensions via post-build script.
> NEVER mix the two approaches.

**If something breaks**:
1. Read this document
2. Check the configuration files match what's documented here
3. Verify the post-build script ran successfully
4. Test locally before pushing to Render

**If you need to modify this system**:
1. Update this document FIRST
2. Test thoroughly with both Jest and Node
3. Document your changes and reasoning
4. Commit documentation with code changes

---

**Remember**: This solution took hours to figure out. Please don't break it. 🙏
