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

  // Fix cutoffEnforcement which has an extra import line issue
  if (file.includes('cutoffEnforcement')) {
    // Make sure AuthRequest is imported
    if (!content.includes("import { AuthRequest }")) {
      content = "import { AuthRequest } from '../auth.js';\n" + content;
    }
  }

  // Replace all instances of "as Request" with "as AuthRequest"
  content = content.replace(/as Request(?!,)/g, 'as AuthRequest');

  // Make sure we don't have double imports
  content = content.replace(/import { Response } from 'express';\nimport { Response } from 'express';/g, "import { Response } from 'express';");

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${file}`);
});

console.log('\n✅ All test casts updated to AuthRequest');
