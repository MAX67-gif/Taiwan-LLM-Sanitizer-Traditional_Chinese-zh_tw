'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const api = require('../src/r19/file_io_boundary_r19.js');
const bytes = text => new TextEncoder().encode(text);
const file = (name, contents) => {
  const b = contents instanceof Uint8Array ? contents : bytes(contents);
  return {name, size: b.byteLength, arrayBuffer: async () => b.slice().buffer};
};
const source = '# 受控原創例子\r\n\r\n請使用軟件。\r\n';
const b = bytes(source);
function gate() {
  const state = {source: '先前原稿', choices: 2, raw: b, errors: [], settled: 0};
  const driver = api.createImportGate({
    commit: data => {state.source = data.text; state.raw = data.bytes; state.choices = 0;},
    reject: code => state.errors.push(code),
    settle: () => state.settled++,
  });
  return {state, driver};
}
function deferred() {
  let resolve, reject;
  const pending = new Promise((a, b) => {resolve=a; reject=b;});
  return {pending, resolve, reject};
}
test('R19 boundary is optional and fail-closed, maximum raw bytes 65536', () => {
  assert.equal(api.MAX_BYTES, 65536);
  assert(Object.isFrozen(api));
  assert(api.PUBLIC_CODES.includes('INVALID_UTF8'));
});
test('metadata rejects wrong extension, zero bytes, oversize and liar sizes', () => {
  assert.equal(api.metadataCode(file('a.md', 'ok')), null);
  assert.equal(api.metadataCode(file('a.markdown', 'ok')), null);
  assert.equal(api.metadataCode(file('a.txt', 'ok')), null);
  assert.equal(api.metadataCode(file('a.json', 'ok')), 'UNSUPPORTED_EXTENSION');
  assert.equal(api.metadataCode(file('empty.txt', '')), 'INPUT_EMPTY');
  assert.equal(api.metadataCode(file('huge.md', 'A'.repeat(65537))), 'INPUT_LIMIT');
  assert.equal(api.metadataCode({name: 'a.md', size: -1, arrayBuffer() {}}), 'INVALID_FILE_SIZE');
});
test('invalid UTF-8 rejects rather than replacing malformed bytes', () => {
  assert.throws(() => api.decodeBytes(new Uint8Array([255,254])), /INVALID_UTF8/);
  assert.throws(() => api.decodeBytes(new Uint8Array([0xe4,0xb8])), /INVALID_UTF8/);
});
test('BOM, NUL, empty, and bytes bigger than metadata limit reject', () => {
  assert.throws(() => api.decodeBytes(new Uint8Array([239,187,191,65])), /UTF8_BOM/);
  assert.throws(() => api.decodeBytes(new Uint8Array([65,0,66])), /NUL_BYTE/);
  assert.throws(() => api.decodeBytes(new Uint8Array(0)), /INPUT_EMPTY/);
  assert.throws(() => api.decodeBytes(new Uint8Array(65537).fill(65)), /INPUT_LIMIT/);
});

test('oversized ArrayBuffer is rejected before invoking slice/copy', () => {
  class NoCopy extends ArrayBuffer {
    slice() {throw new Error('LARGE_BUFFER_COPY_ATTEMPTED');}
  }
  assert.throws(() => api.decodeBytes(new NoCopy(65537)), /INPUT_LIMIT/);
});
test('file metadata and actual decoded byte length must agree before state commit', async () => {
  const {state,driver}=gate();
  const mismatch={name:'verified.md',size:1,arrayBuffer:async()=>bytes('合法兩字').buffer};
  const result=await driver.open(mismatch);
  assert.deepEqual(result,{status:'REJECTED',code:'FILE_SIZE_MISMATCH'});
  assert.equal(state.source,'先前原稿');
  assert.equal(state.choices,2);
  assert.deepEqual(state.errors,['FILE_SIZE_MISMATCH']);
});
test('subarray views are decoded only within their intended byte offsets', () => {
  const wrapped=bytes('ZZ原稿YY');
  const view=wrapped.subarray(2,wrapped.length-2);
  const decoded=api.decodeBytes(view);
  assert.equal(decoded.text,'原稿');
  assert.deepEqual([...decoded.bytes],[...bytes('原稿')]);
  decoded.bytes[0]=0;
  assert.equal(view[0],bytes('原稿')[0]);
});
test('Chinese, emoji and true Unicode encoded bytes roundtrip', () => {
  const text='軟體 🦜\n不動原文';
  const result=api.decodeBytes(bytes(text));
  assert.equal(result.text,text);
  assert.deepEqual([...result.bytes],[...bytes(text)]);
});
test('rejected invalid UTF-8 retains previous source and decisions', async () => {
  const {state,driver}=gate();
  const result=await driver.open(file('bad.md',new Uint8Array([255,254,250])));
  assert.deepEqual(result,{status:'REJECTED',code:'INVALID_UTF8'});
  assert.equal(state.source,'先前原稿'); assert.equal(state.choices,2);
  assert.deepEqual(state.errors,['INVALID_UTF8']);assert.equal(state.settled,1);
});
test('rejected oversized file never triggers previous-session revoke', async () => {
  const {state,driver}=gate();
  const result=await driver.open(file('too-big.md',new Uint8Array(65537).fill(65)));
  assert.equal(result.code,'INPUT_LIMIT');
  assert.equal(state.source,'先前原稿');assert.equal(state.choices,2);
});
test('metadata lies about length but actual bytes reject without mutation', async () => {
  const {state,driver}=gate();
  const wrong={name:'a.md',size:8,arrayBuffer:async()=>new Uint8Array(65537).fill(65).buffer};
  const result=await driver.open(wrong);
  assert.equal(result.code,'INPUT_LIMIT');
  assert.equal(state.source,'先前原稿');assert.equal(state.choices,2);
});
test('successful import calls exactly one atomic commit', async () => {
  const {state,driver}=gate();
  const result=await driver.open(file('okay.md','# 已寫好的軟體說明'));
  assert.equal(result.status,'IMPORTED');
  assert.equal(state.source,'# 已寫好的軟體說明');
  assert.equal(state.choices,0);
  assert.equal(state.settled,1);
});
test('stale file read after Clear cannot restore source or decisions', async () => {
  const {state,driver}=gate(),d=deferred();
  const ongoing=driver.open({name:'stale.md',size:10,arrayBuffer:()=>d.pending});
  driver.invalidate();state.source='';state.choices=0;
  d.resolve(bytes('請使用軟件').buffer);
  const result=await ongoing;
  assert.equal(result.status,'STALE');assert.equal(state.source,'');
  assert.deepEqual(state.errors,[]);assert.equal(state.settled,0);
});
test('stale read rejection cannot display a new error after Clear', async () => {
  const {state,driver}=gate(),d=deferred();
  const ongoing=driver.open({name:'pending.md',size:10,arrayBuffer:()=>d.pending});
  driver.invalidate();state.source='';
  d.reject(new Error('private local path MUST NOT surface'));
  const result=await ongoing;
  assert.equal(result.status,'STALE');assert.deepEqual(state.errors,[]);
});
test('last selected file wins, earlier file completion cannot overwrite it', async () => {
  const {state,driver}=gate(),d=deferred();
  const first=driver.open({name:'first.md',size:8,arrayBuffer:()=>d.pending});
  const second=await driver.open(file('second.md','正確的新原稿'));
  assert.equal(second.status,'IMPORTED');
  d.resolve(bytes('過時的原稿').buffer);
  assert.equal((await first).status,'STALE');
  assert.equal(state.source,'正確的新原稿');
});
test('a newly rejected file also invalidates an earlier pending reader', async () => {
  const {state,driver}=gate(),d=deferred();
  const old=driver.open({name:'old.md',size:8,arrayBuffer:()=>d.pending});
  const newer=await driver.open(file('wrong.js','no'));
  assert.equal(newer.code,'UNSUPPORTED_EXTENSION');
  d.resolve(bytes('早期過時內容').buffer);
  assert.equal((await old).status,'STALE');
  assert.equal(state.source,'先前原稿');assert.equal(state.choices,2);
});
test('reading APIs must never disclose thrown system/private paths', async () => {
  const {state,driver}=gate();
  const unsafe={name:'a.md',size:8,arrayBuffer:async()=>{throw new Error('/home/private/secret.md');}};
  const response=await driver.open(unsafe);
  assert.equal(response.code,'FILE_READ_FAILED');
  assert.equal(JSON.stringify(response).includes('/home/'),false);
  assert.deepEqual(state.errors,['FILE_READ_FAILED']);
});
test('zero-edit CRLF output uses exact imported bytes even after textarea newline normalization', () => {
  const raw=api.encodeReview({originalBytes:b,originalText:source,reviewedText:source.replace(/\r\n/g,'\n')});
  assert.deepEqual([...raw],[...b]);
  assert.equal(raw.filter(x=>x===13).length,3);
});
test('one reviewed wording change retains original CRLF terminators and emoji', () => {
  const text='# 標題 💾\r\n\r\n軟件 menu\r\n';
  const reviewed='# 標題 💾\n\n軟體 menu\n';
  const output=api.encodeReview({originalBytes:bytes(text),originalText:text,reviewedText:reviewed});
  assert.equal(new TextDecoder().decode(output),'# 標題 💾\r\n\r\n軟體 menu\r\n');
});
test('mixed CRLF, LF and lone CR are preserved by position', () => {
  const original='軟件\r\nmenu\n數據庫\r';
  const revised='軟體\nmenu\n資料庫\n';
  const out=api.encodeReview({originalBytes:bytes(original),originalText:original,reviewedText:revised});
  assert.equal(new TextDecoder().decode(out),'軟體\r\nmenu\n資料庫\r');
});
test('line-count changes fail closed rather than guessing terminators', () => {
  assert.throws(()=>api.encodeReview({originalBytes:b,originalText:source,reviewedText:'# 對照\n請使用軟體。'}),/LINE_ENDING_SHAPE_CHANGED/);
});
test('input raw bytes cannot be replaced with another document', () => {
  assert.throws(()=>api.encodeReview({originalBytes:b,originalText:'偽造不同原稿',reviewedText:source}),/SOURCE_BYTES_MISMATCH/);
});
test('unpaired Unicode surrogate and new NUL are not silently encoded', () => {
  assert.throws(()=>api.encodeReview({originalBytes:b,originalText:source,reviewedText:'壞字\ud800\n\n文字\n'}),/INVALID_REVIEW/);
  assert.throws(()=>api.encodeReview({originalBytes:b,originalText:source,reviewedText:'# 標題\n\n內含\0\n'}),/INVALID_REVIEW/);
});
test('output over 64 KiB is refused, no partial export', () => {
  const original='軟件';
  assert.throws(()=>api.encodeReview({originalBytes:bytes(original),originalText:original,reviewedText:'A'.repeat(65537)}),/OUTPUT_LIMIT/);
});
test('source bytes do not alias returned mutable arrays', () => {
  const input=bytes(source);
  const out=api.encodeReview({originalBytes:input,originalText:source,reviewedText:source});
  out[0]=0;
  assert.notEqual(input[0],out[0]);
});

test('staged import keeps existing decisions until explicitly accepted', async () => {
  const state={source:'既有原稿',choices:3,commits:0};
  const gate=api.createStagedImportGate({commit:data=>{
    state.source=data.text;state.choices=0;state.commits++;
  }});
  const preview=await gate.stage(file('new.md','新的安全原稿'));
  assert.equal(preview.status,'STAGED');
  assert.equal(preview.byte_count,bytes('新的安全原稿').length);
  assert(!JSON.stringify(preview).includes('新的安全原稿'));
  assert.equal(state.source,'既有原稿');assert.equal(state.choices,3);
  assert.equal(state.commits,0);
});
test('accept with current staged ticket applies exactly once', async () => {
  const state={source:'舊稿',choices:2,commits:0};
  const gate=api.createStagedImportGate({commit:data=>{
    state.source=data.text;state.choices=0;state.commits++;
  }});
  const staged=await gate.stage(file('new.md','更新稿'));
  assert.equal(gate.accept(staged.ticket).status,'IMPORTED');
  assert.equal(state.source,'更新稿');assert.equal(state.commits,1);
  assert.equal(gate.accept(staged.ticket).status,'STALE');
  assert.equal(state.commits,1);
});
test('cancel staged import preserves previous working text and choices', async () => {
  const state={source:'原稿',choices:4,commits:0};
  const gate=api.createStagedImportGate({commit:()=>state.commits++});
  const pending=await gate.stage(file('new.md','新稿'));
  assert.equal(gate.cancel().status,'CANCELLED');
  assert.equal(gate.accept(pending.ticket).status,'STALE');
  assert.deepEqual(state,{source:'原稿',choices:4,commits:0});
});
test('invalid extension never creates staged acceptance', async () => {
  let commits=0;const errors=[];
  const gate=api.createStagedImportGate({commit:()=>commits++,reject:code=>errors.push(code)});
  const res=await gate.stage(file('bad.json','{"a":1}'));
  assert.deepEqual(res,{status:'REJECTED',code:'UNSUPPORTED_EXTENSION'});
  assert.deepEqual(errors,['UNSUPPORTED_EXTENSION']);
  assert.equal(gate.accept('stage-1-1').status,'STALE');
  assert.equal(commits,0);
});
test('invalid UTF8 and NUL file readers refuse stage', async () => {
  let commits=0;const gate=api.createStagedImportGate({commit:()=>commits++});
  assert.equal((await gate.stage(file('bad.md',new Uint8Array([255,254])))).code,'INVALID_UTF8');
  assert.equal((await gate.stage(file('bad.md',new Uint8Array([65,0,66])))).code,'NUL_BYTE');
  assert.equal(commits,0);
});
test('mismatched file size is rejected before staged commit', async () => {
  let commits=0;const gate=api.createStagedImportGate({commit:()=>commits++});
  const bad={name:'mismatch.md',size:1,arrayBuffer:async()=>bytes('字元數量').buffer};
  assert.equal((await gate.stage(bad)).code,'FILE_SIZE_MISMATCH');
  assert.equal(commits,0);
});
test('cancel while staged reader pending makes late completion stale', async () => {
  let commits=0;const gate=api.createStagedImportGate({commit:()=>commits++});
  const deferredRead=deferred();
  const active=gate.stage({name:'pending.md',size:5,arrayBuffer:()=>deferredRead.pending});
  gate.cancel();
  deferredRead.resolve(bytes('檔案').buffer);
  assert.equal((await active).status,'STALE');
  assert.equal(commits,0);
});
test('cancel while staged reader pending ignores late errors and rejection callback', async () => {
  let commits=0;const errors=[];
  const gate=api.createStagedImportGate({commit:()=>commits++,reject:code=>errors.push(code)});
  const d=deferred();
  const active=gate.stage({name:'pending.md',size:4,arrayBuffer:()=>d.pending});
  gate.cancel();
  d.reject(new Error('/private/document-path'));
  assert.equal((await active).status,'STALE');
  assert.deepEqual(errors,[]);
  assert.equal(commits,0);
});
test('concurrent staged readers only grant the latest accepted ticket', async () => {
  let content='previous';let commits=0;
  const gate=api.createStagedImportGate({commit:record=>{content=record.text;commits++;}});
  const d=deferred();
  const first=gate.stage({name:'old.md',size:3,arrayBuffer:()=>d.pending});
  const second=await gate.stage(file('new.md','最新稿'));
  d.resolve(bytes('舊稿').buffer);
  assert.equal((await first).status,'STALE');
  assert.equal(gate.accept('stage-1-1').status,'STALE');
  assert.equal(content,'previous');
  assert.equal(gate.accept(second.ticket).status,'IMPORTED');
  assert.equal(content,'最新稿');assert.equal(commits,1);
});
test('staged bytes are copied before passing to editor callback', async () => {
  const raw=bytes('保持原樣');let captured=null;
  const gate=api.createStagedImportGate({commit:item=>captured=item.bytes});
  const candidate=await gate.stage({name:'safe.md',size:raw.length,arrayBuffer:async()=>raw.buffer});
  raw[0]=0;
  const applied=gate.accept(candidate.ticket);
  assert.equal(applied.status,'IMPORTED');
  assert.equal(new TextDecoder().decode(captured),'保持原樣');
});
test('stage is invalid after a new attempt or editor invalidation', async () => {
  let commits=0;
  const gate=api.createStagedImportGate({commit:()=>commits++});
  const old=await gate.stage(file('first.md','第一稿'));
  const now=await gate.stage(file('second.md','第二稿'));
  assert.equal(gate.accept(old.ticket).status,'STALE');
  gate.invalidate();
  assert.equal(gate.accept(now.ticket).status,'STALE');
  assert.equal(commits,0);
});
