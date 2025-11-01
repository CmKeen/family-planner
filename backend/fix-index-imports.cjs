// Fix ESM imports in index.ts only by adding .js extensions
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'src', 'index.ts');

let content = fs.readFileSync(indexPath, 'utf8');

// Match relative imports without .js extension
const importRegex = /from\s+['"](\.[^'"]+)['"]/g;

const newContent = content.replace(importRegex, (match, importPath) => {
  // Skip if already has .js or is importing .json
  if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
    return match;
  }

  // Add .js extension
  return match.replace(importPath, importPath + '.js');
});

fs.writeFileSync(indexPath, newContent, 'utf8');
console.log('✓ Fixed imports in src/index.ts');
