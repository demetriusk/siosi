const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

// This script downloads Inter from Google Fonts GitHub release (a zip archive of ttf files)
// and extracts Inter-Regular.ttf and Inter-Bold.ttf into public/fonts/

const destDir = path.join(__dirname, '..', 'public', 'fonts');
const tmpZip = path.join(os.tmpdir(), 'inter-fonts.zip');

const url = 'https://github.com/rsms/inter/releases/download/v3.19/Inter-3.19.zip';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to download')); 
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => reject(err));
  });
}

async function run() {
  try {
    console.log('Downloading Inter fonts...');
    await download(url, tmpZip);
    const zip = new AdmZip(tmpZip);
    const entries = zip.getEntries();
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const wanted = ['Inter (Roboto).ttf', 'Inter-Bold.ttf', 'Inter-Regular.ttf'];
    entries.forEach(e => {
      const name = e.entryName.split('/').pop();
      if (!name) return;
      if (name.toLowerCase().includes('regular') || name.toLowerCase().includes('bold')) {
        const out = path.join(destDir, name.includes('Bold') ? 'Inter-Bold.ttf' : 'Inter-Regular.ttf');
        console.log('Extracting', name, 'to', out);
        fs.writeFileSync(out, e.getData());
      }
    });
    console.log('Fonts installed to', destDir);
  } catch (e) {
    console.error('Failed to fetch inter fonts', e);
    process.exit(1);
  }
}

run();
