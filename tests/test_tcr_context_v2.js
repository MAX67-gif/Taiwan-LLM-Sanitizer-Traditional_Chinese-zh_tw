'use strict';
// The existing Node CI entrypoint must execute the portable Python contract.
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('portable TCR v2 context and integrity contracts pass without network', {timeout: 90000}, () => {
  const result = spawnSync('python', ['-m', 'unittest', 'discover', '-s',
    'skills/taiwan-context-reviewer/tests', '-v'],
    {cwd: root, encoding: 'utf8', timeout: 80000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stderr, /Ran 56 tests/);
  assert.match(result.stderr, /\bOK\b/);
});
