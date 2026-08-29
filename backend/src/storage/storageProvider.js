'use strict';

const { evidenceConfig } = require('../config/evidence');
const { createLocalStorageProvider } = require('./localStorageProvider');

let provider;
function getStorageProvider() {
  if (!provider) provider = createLocalStorageProvider(evidenceConfig().storagePath);
  return provider;
}

module.exports = { getStorageProvider };
