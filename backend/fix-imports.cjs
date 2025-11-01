// Fix ESM imports by adding .js extensions
const fs = require('fs');
const path = require('path');

function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, __tests__
      if (item !== 'node_modules' && item !== 'dist' && item !== '__tests__') {
        getAllTsFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Match relative imports without .js extension
  // Matches: from './path' or from "../path"
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;

  const newContent = content.replace(importRegex, (match, importPath) => {
    // Skip if already has .js or is importing .json
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }

    // Add .js extension
    changed = true;
    return match.replace(importPath, importPath + '.js');
  });

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = getAllTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files\n`);

let fixedCount = 0;
for (const file of files) {
  if (fixImports(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);
