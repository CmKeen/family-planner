const fs = require('fs');
const path = require('path');

const files = [
  'src/controllers/__tests__/mealComment.controller.test.ts',
  'src/controllers/__tests__/auditLog.controller.test.ts',
  'src/middleware/__tests__/cutoffEnforcement.test.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Add AuthRequest import if not present
  if (!content.includes('AuthRequest')) {
    content = content.replace(
      /import\s+\{\s*Request,\s*Response\s*\}\s*from\s*['"]express['"];?/,
      "import { Response } from 'express';\nimport { AuthRequest } from '../../middleware/auth.js';"
    );
  }

  // Replace Partial<Request> with AuthRequest
  content = content.replace(/Partial<Request>/g, 'AuthRequest');

  // Remove user and member from object literal type errors
  // This will allow TypeScript to accept them as part of AuthRequest

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${file}`);
});

console.log('\n✅ All test files updated to use AuthRequest');
