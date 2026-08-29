'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', 'frontend');
const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const target=path.join(directory,entry.name);
    if (entry.isDirectory()) walk(target); else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}
walk(root);

const missing=[];
for (const file of htmlFiles) {
  if (path.relative(root,file).startsWith(`components${path.sep}`)) continue;
  const source=fs.readFileSync(file,'utf8');
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    const reference=match[1];
    if (!reference || reference.startsWith('#') || /^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
    const clean=reference.split(/[?#]/)[0];
    if (!clean || clean.includes('${')) continue;
    const target=clean.startsWith('/') ? path.join(root,clean) : path.resolve(path.dirname(file),clean);
    const candidates=[target,`${target}.html`,path.join(target,'index.html')];
    if (!candidates.some(fs.existsSync)) missing.push(`${path.relative(root,file)} -> ${reference}`);
  }
}
if (missing.length) {
  process.stderr.write(`Missing local frontend assets:\n${missing.join('\n')}\n`); process.exitCode=1;
} else process.stdout.write(`Frontend smoke check passed for ${htmlFiles.length} HTML files.\n`);
