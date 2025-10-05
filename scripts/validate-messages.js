const fs = require('fs');
const path = require('path');

const messagesDir = path.resolve(__dirname, '../messages');

function walk(dir) {
  return fs.readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return fs.statSync(full).isDirectory() ? walk(full) : full;
  });
}

function findPlaceholders(str) {
  const icu = [...str.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m => m[1]);
  const mustache = [...str.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(m => m[1]);
  return { icu, mustache };
}

let hasError = false;

if (!fs.existsSync(messagesDir)) {
  console.error('messages directory not found at', messagesDir);
  process.exit(1);
}

const files = walk(messagesDir).filter(f => f.endsWith('.json'));
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in', file, e.message);
    hasError = true;
    continue;
  }

  const checkObj = (obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        const { icu, mustache } = findPlaceholders(v);
        if (mustache.length > 0) {
          console.error(`Malformed placeholders ({{ }}) found in ${file} -> ${key}:`, v);
          hasError = true;
        }
        // optional: validate icu token names are safe
        for (const token of icu) {
          if (!/^[a-zA-Z0-9_]+$/.test(token)) {
            console.error(`Invalid ICU token '${token}' in ${file} -> ${key}:`, v);
            hasError = true;
          }
        }
      } else if (v && typeof v === 'object') {
        checkObj(v, key);
      }
    }
  };

  checkObj(data);
}

if (hasError) {
  console.error('\nMessage validation failed.');
  process.exit(2);
} else {
  console.log('Message validation passed for', files.length, 'files.');
}
