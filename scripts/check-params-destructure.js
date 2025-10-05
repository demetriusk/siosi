const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoreDirs = ['node_modules', '.next', '.git', 'dist'];

function walk(dir) {
  return fs.readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (ignoreDirs.includes(name)) return [];
      return walk(full);
    }
    return full;
  });
}

const files = walk(root).filter(f => f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js'));
const pattern = /export\s+default\s+(?:async\s+)?function\s+[^\(]*\(\s*\{\s*params\s*:\s*\{[^}]+\}\s*\}/m;
let found = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (pattern.test(content)) {
    found.push(file);
  }
}

if (found.length) {
  console.error('Found destructured params in function signature in the following files:');
  for (const f of found) console.error(' -', f);
  console.error('\nPlease update these to await params inside the function body or use useParams() in client components.');
  process.exit(2);
} else {
  console.log('No destructured params in function signatures found.');
}
