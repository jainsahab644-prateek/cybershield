'use strict';

const fs = require('node:fs');
const path = require('node:path');

function withinRoot(root, filename) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, filename);
  if (path.dirname(resolved) !== resolvedRoot) throw new Error('Unsafe storage filename.');
  return resolved;
}

function createLocalStorageProvider(root) {
  return Object.freeze({
    pathFor(filename) { return withinRoot(root, filename); },
    async saveFile(filename, bytes) {
      const destination = withinRoot(root, filename);
      await fs.promises.writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
      return destination;
    },
    readFile(filename) { return fs.promises.readFile(withinRoot(root, filename)); },
    fileExists(filename) { return fs.existsSync(withinRoot(root, filename)); },
    async deleteTemporaryFile(filename) {
      await fs.promises.unlink(withinRoot(root, filename)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  });
}

module.exports = { createLocalStorageProvider, withinRoot };
