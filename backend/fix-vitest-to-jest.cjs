const fs = require('fs');
const path = require('path');

const files = [
  'src/controllers/__tests__/mealComment.controller.test.ts',
  'src/controllers/__tests__/auditLog.controller.test.ts',
  'src/middleware/__tests__/cutoffEnforcement.test.ts',
  'src/utils/__tests__/auditLogger.test.ts',
  'src/utils/__tests__/permissions.test.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace vitest imports with jest
  content = content.replace(
    /import\s+\{\s*describe,\s*it,\s*expect,\s*beforeEach,\s*vi\s*\}\s*from\s*['"]vitest['"];?/g,
    ''
  );

  // Replace vi.fn() with jest.fn()
  content = content.replace(/vi\.fn\(\)/g, 'jest.fn()');

  // Replace vi.mock with jest.mock
  content = content.replace(/vi\.mock\(/g, 'jest.mock(');

  // Replace vi.clearAllMocks with jest.clearAllMocks
  content = content.replace(/vi\.clearAllMocks\(\)/g, 'jest.clearAllMocks()');

  // Replace vi.resetAllMocks with jest.resetAllMocks
  content = content.replace(/vi\.resetAllMocks\(\)/g, 'jest.resetAllMocks()');

  // Replace vi.spyOn with jest.spyOn
  content = content.replace(/vi\.spyOn\(/g, 'jest.spyOn(');

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${file}`);
});

console.log('\n✅ All files converted from vitest to jest');
