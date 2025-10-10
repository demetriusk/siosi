const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const messagesPath = path.join(projectRoot, 'messages', 'en.json');

const SEARCH_DIRS = ['app', 'components', 'hooks', 'lib', 'scripts'];
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);


function flattenMessages(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenMessages(value, fullKey);
    }
    return [{ key: fullKey, value }];
  });
}

function walk(dir) {
  return fs.readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      return walk(full);
    }
    return [full];
  });
}

function loadCodeFiles() {
  const files = [];
  for (const relative of SEARCH_DIRS) {
    const dir = path.join(projectRoot, relative);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const ext = path.extname(file);
      if (FILE_EXTENSIONS.has(ext)) {
        files.push(file);
      }
    }
  }
  return files;
}

function fileContainsKey(content, key) {
  const simple = `'${key}'`;
  const double = `"${key}"`;
  const template = `\`${key}\``;
  return content.includes(simple) || content.includes(double) || content.includes(template);
}

function parseLiteralNamespace(argSource) {
  if (!argSource) return '';
  const trimmed = argSource.trim();
  if (!trimmed || trimmed === '') return '';
  const literalMatch = trimmed.match(/['"`]([^'"`]+)['"`]/);
  if (literalMatch) return literalMatch[1];
  return null;
}

function extractTranslators(content) {
  const translators = [];

  const useRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*useTranslations\(([^)]*)\)/g;
  let match;
  while ((match = useRegex.exec(content)) !== null) {
    const [, varName, argSource] = match;
    const namespace = parseLiteralNamespace(argSource);
    translators.push({ varName, namespace: namespace === null ? null : namespace });
  }

  const getRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*(?:await\s+)?getTranslations\(([^)]*)\)/g;
  while ((match = getRegex.exec(content)) !== null) {
    const [, varName, argSource] = match;
    let namespace = parseLiteralNamespace(argSource);
    if (namespace === null) {
      const nsMatch = argSource.match(/namespace\s*:\s*['"`]([^'"`]+)['"`]/);
      namespace = nsMatch ? nsMatch[1] : '';
    }
    translators.push({ varName, namespace: namespace === null ? null : namespace });
  }

  return translators;
}

function extractKeysFromCalls(content, translators) {
  const keys = new Set();
  for (const { varName, namespace } of translators) {
    if (namespace === null) {
      // dynamic namespace we can't resolve statically
      continue;
    }
    const callRegex = new RegExp(
      varName + "(?:\\.(?:rich|raw))?\\(\\s*(['\"`])([^'\"`]+)\\1",
      'g'
    );
    let match;
    while ((match = callRegex.exec(content)) !== null) {
      const [, , literal] = match;
      const fullKey = namespace ? `${namespace}.${literal}` : literal;
      keys.add(fullKey);
    }
  }
  return keys;
}

const dynamicPatterns = [
  { pattern: /`home\.labs\.\$\{/, prefix: 'home.labs.' },
  { pattern: /`profile\.skin_types\.\$\{/, prefix: 'profile.skin_types.' },
  { pattern: /`profile\.lid_types\.\$\{/, prefix: 'profile.lid_types.' },
  { pattern: /`results\.verdict\.\$\{/, prefix: 'results.verdict.' },
];

function main() {
  if (!fs.existsSync(messagesPath)) {
    console.error('Could not find en.json at', messagesPath);
    process.exit(1);
  }

  const enMessages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
  const flattened = flattenMessages(enMessages);
  const codeFiles = loadCodeFiles();

  const fileContents = new Map();
  const usedKeys = new Set();
  const dynamicPrefixesFound = new Set();

  for (const file of codeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    fileContents.set(file, content);

    const translators = extractTranslators(content);
    const keysFromCalls = extractKeysFromCalls(content, translators);
    for (const key of keysFromCalls) {
      usedKeys.add(key);
    }

    for (const dynamic of dynamicPatterns) {
      if (dynamic.pattern.test(content)) {
        dynamicPrefixesFound.add(dynamic.prefix);
      }
    }
  }

  const unused = [];

  for (const { key } of flattened) {
    let found = false;
    if (usedKeys.has(key)) {
      found = true;
    } else if ([...dynamicPrefixesFound].some((prefix) => key.startsWith(prefix))) {
      found = true;
    } else {
      for (const content of fileContents.values()) {
        if (fileContainsKey(content, key)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      unused.push(key);
    }
  }

  if (unused.length === 0) {
    console.log('All en.json keys are referenced in code.');
  } else {
    console.log('Unused keys in en.json:');
    for (const key of unused) {
      console.log(` - ${key}`);
    }
  }
}

main();
