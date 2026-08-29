'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const roots = [
  path.resolve(__dirname, '..', 'src'),
  path.resolve(__dirname),
  path.resolve(__dirname, '..', '..', 'frontend', 'js')
];

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  });
}

for (const file of roots.flatMap(javascriptFiles)) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('Backend and frontend JavaScript syntax checks passed.');
