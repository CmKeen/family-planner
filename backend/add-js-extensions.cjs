// Post-build script: Add .js extensions to relative imports in compiled output
const fs = require('fs');
const path = require('path');

function getAllJsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getAllJsFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function addJsExtensions(filePath) {
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
    return true;
  }

  return false;
}

// Main execution
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run tsc first.');
  process.exit(1);
}

const files = getAllJsFiles(distDir);
console.log(`Processing ${files.length} compiled JS files...\n`);

let fixedCount = 0;
for (const file of files) {
  if (addJsExtensions(file)) {
    fixedCount++;
    const relative = path.relative(distDir, file);
    console.log(`✓ ${relative}`);
  }
}

console.log(`\n✅ Added .js extensions to ${fixedCount} files`);
