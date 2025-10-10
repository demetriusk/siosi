const fs = require('fs');
const path = require('path');

const messagesDir = path.resolve(__dirname, '../messages');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value, fullKey);
    }
    return [fullKey];
  });
}

if (!fs.existsSync(messagesDir)) {
  console.error('messages directory not found at', messagesDir);
  process.exit(1);
}

const localeFiles = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    locale: path.basename(file, '.json'),
    path: path.join(messagesDir, file),
  }));

const enLocale = localeFiles.find((entry) => entry.locale === 'en');
if (!enLocale) {
  console.error('Missing en.json locale file.');
  process.exit(1);
}

const enMessages = JSON.parse(fs.readFileSync(enLocale.path, 'utf8'));
const enKeys = new Set(flatten(enMessages));

let hasMismatch = false;

for (const { locale, path: localePath } of localeFiles) {
  if (locale === 'en') continue;

  const messages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  const keys = new Set(flatten(messages));

  const missing = [...enKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !enKeys.has(key));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`${locale}: ✓ matches en.json keys`);
    continue;
  }

  console.log(`${locale}:`);
  if (missing.length > 0) {
    hasMismatch = true;
    console.log('  Missing keys:');
    for (const key of missing) {
      console.log(`    - ${key}`);
    }
  }
  if (extra.length > 0) {
    console.log('  Extra keys:');
    for (const key of extra) {
      console.log(`    + ${key}`);
    }
  }
}

if (hasMismatch) {
  process.exitCode = 2;
}
