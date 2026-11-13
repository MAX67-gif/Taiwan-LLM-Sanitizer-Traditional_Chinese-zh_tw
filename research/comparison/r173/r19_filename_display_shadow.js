'use strict';

/**
 * R192 research-only filename label hardening (unreleased engineering evidence).
 *
 * RESEARCH SHADOW ONLY, deliberately outside src/tools shipped runtime.
 * NOT wired into frozen R19 R2 HTML, import gate or Suite registry.
 * Prior draft PR #55 remains a separate unreleased precursor.
 *
 * File.name is untrusted display metadata. This helper removes Unicode
 * direction controls and invisible formatting controls from the **label only**.
 * Never change the source file name, contents, extension check or bytes.
 *
 * It is deliberately NOT a homoglyph detector or an OS-file-picker test.
 */
const INVISIBLE_OR_CONTROL =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu;
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

function formatUntrustedFilenameLabel(name, maxCodePoints = 90) {
  if (!Number.isInteger(maxCodePoints) || maxCodePoints < 4 || maxCodePoints > 256) {
    throw new RangeError('INVALID_DISPLAY_FILENAME_LIMIT');
  }
  const original = typeof name === 'string' ? name : '';
  let removed = 0;
  let bidiRemoved = 0;
  const cleaned = original.replace(INVISIBLE_OR_CONTROL, ch => {
    removed++;
    if (BIDI_CONTROL.test(ch)) bidiRemoved++;
    return '';
  });
  const chars = Array.from(cleaned);
  const truncated = chars.length > maxCodePoints;
  const label = (truncated ? chars.slice(0, maxCodePoints - 1).join('') + '…' : cleaned) || '未命名檔案';
  return Object.freeze({
    label,
    removed_controls: removed,
    removed_bidi_controls: bidiRemoved,
    truncated,
    changed: removed > 0 || truncated || !original,
  });
}

module.exports = Object.freeze({ formatUntrustedFilenameLabel });
