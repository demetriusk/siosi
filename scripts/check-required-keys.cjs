const fs = require('fs');
const path = require('path');

const messagesDir = path.resolve(__dirname, '../messages');

const requiredKeys = [
  'auth.login.title',
  'auth.login.description',
  'auth.login.or_continue_with',
  'auth.login.email_placeholder',
  'auth.login.terms_rich',
  'auth.magic_link.sent',
  'auth.magic_link.sent_details',
  'auth.magic_link.resend',
  'auth.magic_link.resend_wait',
  'auth.magic_link.dismiss',
  'auth.magic_link.error',
  'auth.magic_link.resend_error',
  'auth.magic_link.description',
  'auth.magic_link.resent_badge'
];

function walk(dir) {
  return fs.readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return fs.statSync(full).isDirectory() ? walk(full) : full;
  });
}

let hasError = false;

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

  const missing = [];
  for (const key of requiredKeys) {
    const parts = key.split('.');
    let cur = data;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur === undefined) missing.push(key);
  }

  if (missing.length) {
    console.error(`Missing keys in ${path.basename(file)}:\n  ${missing.join('\n  ')}`);
    hasError = true;
  } else {
    console.log(`${path.basename(file)}: OK`);
  }
}

if (hasError) {
  console.error('\nRequired key validation failed.');
  process.exit(3);
} else {
  console.log('\nAll locale files contain required keys.');
}
