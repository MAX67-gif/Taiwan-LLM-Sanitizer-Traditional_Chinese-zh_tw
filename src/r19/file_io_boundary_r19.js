/* TLS R19 research: pure, offline file I/O boundary.
 * NOT a released R19 interface and NOT a change to frozen R17.2.
 * Callers own atomic UI state; reject/stale events never revoke a session.
 */
(function (root, factory) {
  'use strict';
  const api = Object.freeze(factory());
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TLSR19FileIOBoundary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 65536;
  const EXTENSION = /\.(?:md|markdown|txt)$/i;
  const PUBLIC_CODES = Object.freeze([
    'INVALID_FILE', 'UNSUPPORTED_EXTENSION', 'INVALID_FILE_SIZE',
    'INPUT_EMPTY', 'INPUT_LIMIT', 'UTF8_BOM', 'NUL_BYTE',
    'INVALID_UTF8', 'FILE_READ_FAILED', 'FILE_SIZE_MISMATCH', 'INVALID_REVIEW',
    'SOURCE_BYTES_MISMATCH', 'LINE_ENDING_SHAPE_CHANGED',
    'OUTPUT_LIMIT'
  ]);

  class BoundaryError extends Error {
    constructor(code) {
      super(code);
      this.name = 'TLSR19BoundaryError';
      this.code = PUBLIC_CODES.includes(code) ? code : 'FILE_READ_FAILED';
    }
  }
  const fail = code => { throw new BoundaryError(code); };
  function metadataCode(file) {
    if (!file || typeof file.name !== 'string' ||
        typeof file.arrayBuffer !== 'function') return 'INVALID_FILE';
    if (!EXTENSION.test(file.name)) return 'UNSUPPORTED_EXTENSION';
    if (!Number.isSafeInteger(file.size) || file.size < 0) return 'INVALID_FILE_SIZE';
    if (file.size === 0) return 'INPUT_EMPTY';
    if (file.size > MAX_BYTES) return 'INPUT_LIMIT';
    return null;
  }
  function cloneBytes(raw) {
    // Bound raw byteLength BEFORE cloning: a dishonest File-like object must
    // never cause a large extra allocation while validation is in progress.
    const size = raw instanceof ArrayBuffer || raw instanceof Uint8Array
      ? raw.byteLength : null;
    if (size === null) fail('FILE_READ_FAILED');
    if (size === 0) fail('INPUT_EMPTY');
    if (size > MAX_BYTES) fail('INPUT_LIMIT');
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw.slice(0));
    return new Uint8Array(raw);
  }
  function decodeBytes(raw) {
    const bytes = cloneBytes(raw);
    if (bytes.length === 0) fail('INPUT_EMPTY');
    if (bytes.length > MAX_BYTES) fail('INPUT_LIMIT');
    if (bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 &&
        bytes[2] === 191) fail('UTF8_BOM');
    if (bytes.includes(0)) fail('NUL_BYTE');
    let text;
    try {
      text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
    } catch (_) {
      fail('INVALID_UTF8');
    }
    if (text.charCodeAt(0) === 0xFEFF) fail('UTF8_BOM');
    if (text.indexOf('\0') !== -1) fail('NUL_BYTE');
    if (!text.trim()) fail('INPUT_EMPTY');
    return {text, bytes};
  }
  function normalized(text) {
    return text.replace(/\r\n|\r/g, '\n');
  }
  function assertValidUTF16(text) {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF) {
        if (i + 1 >= text.length) fail('INVALID_REVIEW');
        const next = text.charCodeAt(++i);
        if (next < 0xDC00 || next > 0xDFFF) fail('INVALID_REVIEW');
      } else if (code >= 0xDC00 && code <= 0xDFFF) {
        fail('INVALID_REVIEW');
      }
    }
  }
  function encodeReview({originalBytes, originalText, reviewedText} = {}) {
    if (typeof originalText !== 'string' || typeof reviewedText !== 'string')
      fail('INVALID_REVIEW');
    assertValidUTF16(reviewedText);
    const original = decodeBytes(originalBytes);
    // Browser textareas normalize CRLF. Accept only that specific change
    // at the input boundary, never a different original payload.
    if (normalized(original.text) !== normalized(originalText))
      fail('SOURCE_BYTES_MISMATCH');
    if (normalized(original.text) === normalized(reviewedText))
      return cloneBytes(original.bytes);

    // R19 candidate choices must not add/remove lines. Preserve even mixed
    // CRLF/LF per-line terminators; reject unknown newline transformations.
    const breaks = original.text.match(/\r\n|\r|\n/g) || [];
    const editedBreaks = reviewedText.match(/\r\n|\r|\n/g) || [];
    if (breaks.length !== editedBreaks.length)
      fail('LINE_ENDING_SHAPE_CHANGED');
    const pieces = reviewedText.split(/\r\n|\r|\n/);
    let output = pieces[0];
    for (let i = 0; i < breaks.length; i++)
      output += breaks[i] + pieces[i + 1];
    if (output.indexOf('\0') !== -1) fail('INVALID_REVIEW');
    const result = new TextEncoder().encode(output);
    if (result.length > MAX_BYTES) fail('OUTPUT_LIMIT');
    return result;
  }

  function createImportGate({commit, reject, settle} = {}) {
    if (typeof commit !== 'function' ||
        (reject !== undefined && typeof reject !== 'function') ||
        (settle !== undefined && typeof settle !== 'function'))
      throw new TypeError('INVALID_INTEGRATION_CALLBACKS');
    let epoch = 0;
    const invalidate = () => ++epoch;
    async function open(file) {
      const token = ++epoch;
      try {
        const invalid = metadataCode(file);
        if (invalid) fail(invalid);
        const buffer = await file.arrayBuffer();
        if (token !== epoch) return Object.freeze({status: 'STALE'});
        const decoded = decodeBytes(buffer);
        if (token !== epoch) return Object.freeze({status: 'STALE'});
        // Never trust File.size alone. Validate actual content length as well.
        if (decoded.bytes.length !== file.size) fail('FILE_SIZE_MISMATCH');
        // Commit is the only mutation point and must be atomic in the UI.
        commit({text: decoded.text, bytes: decoded.bytes, name: file.name});
        return Object.freeze({status: 'IMPORTED', byte_count: decoded.bytes.length});
      } catch (err) {
        if (token !== epoch) return Object.freeze({status: 'STALE'});
        const code = err instanceof BoundaryError ? err.code : 'FILE_READ_FAILED';
        if (reject) reject(code);
        return Object.freeze({status: 'REJECTED', code});
      } finally {
        if (token === epoch && settle) settle();
      }
    }
    return Object.freeze({open, invalidate});
  }

  function createStagedImportGate({commit, reject} = {}) {
    if (typeof commit !== 'function') throw new TypeError('INVALID_CALLBACK');
    let generation = 0, staged = null, index = 0;
    const invalidate = () => {generation++; staged = null;};
    async function stage(file) {
      const current = ++generation; staged = null;
      try {
        const invalid = metadataCode(file);
        if (invalid) fail(invalid);
        const raw = await file.arrayBuffer();
        if (current !== generation) return Object.freeze({status:'STALE'});
        const decoded = decodeBytes(raw);
        if (current !== generation) return Object.freeze({status:'STALE'});
        if (decoded.bytes.length !== file.size) fail('FILE_SIZE_MISMATCH');
        const ticket = 'stage-' + (++index) + '-' + current;
        staged = {ticket, decoded};
        return Object.freeze({status:'STAGED', ticket, byte_count:decoded.bytes.length});
      } catch (error) {
        if (current !== generation) return Object.freeze({status:'STALE'});
        const code = error instanceof BoundaryError ? error.code : 'FILE_READ_FAILED';
        if (typeof reject === 'function') reject(code);
        return Object.freeze({status:'REJECTED', code});
      }
    }
    function accept(ticket) {
      if (!staged || staged.ticket !== ticket) return Object.freeze({status:'STALE'});
      const data = staged.decoded;
      invalidate();
      commit({text:data.text, bytes:cloneBytes(data.bytes)});
      return Object.freeze({status:'IMPORTED', byte_count:data.bytes.length});
    }
    function cancel() {invalidate(); return Object.freeze({status:'CANCELLED'});}
    return Object.freeze({stage,accept,cancel,invalidate});
  }
  return {MAX_BYTES, PUBLIC_CODES, metadataCode, decodeBytes,
          encodeReview, createImportGate, createStagedImportGate};
});