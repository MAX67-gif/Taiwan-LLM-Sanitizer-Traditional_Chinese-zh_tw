'use strict';

/** Synthetic, no-network R19 filename DISPLAY hardening evaluation only. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {formatUntrustedFilenameLabel: label} =
  require('../tools/r19_filename_label_shadow.js');

const original = fs.readFileSync(
  path.join(__dirname, '../src/r19/first_result_studio_r19.js'), 'utf8');

test('frozen R19 R2 baseline retains direction overrides in its old display helper', () => {
  const match = original.match(/function safeDisplayName\(name\)\{[\s\S]*?\n\}/u);
  assert.ok(match, 'original R19 display helper must exist');
  const oldHelper = vm.runInNewContext('(' + match[0] + ')');
  const synthetic = 'readme\u202e.gpj.md';
  assert.equal(oldHelper(synthetic).includes('\u202e'), true,
    'previous source does not strip Unicode bidi control; this is a SHADOW observation');
  assert.equal(label(synthetic).label.includes('\u202e'), false);
});

test('bidi embeddings / isolates / Arabic direction mark are removed only from display', () => {
  const raw = '安全\u202e.txt\u202c\u2067.md\u2069\u061c';
  const result = label(raw);
  assert.equal(result.label, '安全.txt.md');
  assert.equal(result.removed_controls, 5);
  assert.equal(result.removed_bidi_controls, 5);
  assert.equal(result.changed, true);
  assert.equal(raw.includes('\u202e'), true, 'input remains unmodified');
});

test('invisible and C0/C1 controls cannot hide a misleading filename', () => {
  const raw = 'file\u0000\u001f\u007f\u0085\u200b\u2060\ufeff\u2028\u2029.txt';
  const result = label(raw);
  assert.equal(result.label, 'file.txt');
  assert.equal(result.removed_controls, 9);
  assert.equal(result.removed_bidi_controls, 0);
});

test('ordinary Taiwan Chinese, combining characters and emoji ZWJ remain untouched', () => {
  const examples = ['臺灣用語－資料庫.md', '文件e\u0301.markdown', '修稿🧑‍💻.txt', 'الملف.md'];
  for (const item of examples) {
    const result = label(item);
    assert.equal(result.label, item);
    assert.equal(result.changed, false);
  }
});

test('truncation is explicit and does not split a UTF-16 surrogate pair', () => {
  const source = '😀'.repeat(100) + '.md';
  const result = label(source);
  assert.equal(result.truncated, true);
  assert.equal(Array.from(result.label).length, 90);
  assert.equal(result.label.endsWith('…'), true);
  assert.equal(result.label.includes('\ufffd'), false);
  assert.equal(source.endsWith('.md'), true, 'original extension unchanged');
});

test('empty metadata and invalid limits fail predictably, never disclose source bytes', () => {
  const result = label(null);
  assert.equal(result.label, '未命名檔案');
  assert.equal(result.changed, true);
  for (const n of [0, 2, 257, NaN, 8.5]) {
    assert.throws(() => label('readme.md', n), /INVALID_DISPLAY_FILENAME_LIMIT/);
  }
  const synthetic = Object.freeze({ name: 'menu\u202e.md', source: 'TEST-SOURCE-PRIVATE' });
  const out = label(synthetic.name);
  assert.equal(synthetic.name, 'menu\u202e.md');
  assert.equal(JSON.stringify(out).includes(synthetic.source), false);
  assert.equal(Object.keys(out).includes('source'), false);
});
