'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**','coverage/**','backups/**','private_uploads/**','data/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js','scripts/**/*.js','tests/**/*.js','*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: {
      ...globals.node, afterAll: 'readonly', beforeAll: 'readonly', describe: 'readonly', expect: 'readonly', it: 'readonly'
    } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-control-regex': 'off',
      'no-useless-assignment': 'off'
    }
  }
];
