'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const helperPath=path.resolve(__dirname,'../src/r19/review_helpers_r19.js');
// A missing new module is an assertion failure during the first TDD run.
// Existing modules must load normally; import errors are never swallowed.
const H=fs.existsSync(helperPath)?require(helperPath):{};
function helper(name){assert.equal(typeof H[name],'function',name+' must be implemented');return H[name];}

test('context locates an occurrence after CRLF using code-point columns',()=>{
 const context=helper('contextExcerpt');
 assert.deepEqual(context('前一行\r\n😀 開啟 menu；午餐 menu。\r\n末行',11,15,3),{
  before:'開啟 ',match:'menu',after:'；午餐',line:2,column:6,leading:true,trailing:true
 });
});

test('context radius keeps complete surrogate pairs on both sides',()=>{
 const context=helper('contextExcerpt');
 assert.deepEqual(context('甲😀menu🦉乙',3,7,1),{
  before:'😀',match:'menu',after:'🦉',line:1,column:3,leading:true,trailing:true
 });
 assert.deepEqual(context('甲😀menu🦉乙',3,7,2),{
  before:'甲😀',match:'menu',after:'🦉乙',line:1,column:3,leading:false,trailing:false
 });
});

test('context handles CR, CRLF and LF as separate logical line endings',()=>{
 const context=helper('contextExcerpt');
 assert.deepEqual(context('a\rb\r\nc\nd menu',9,13),{
  before:'d ',match:'menu',after:'',line:4,column:3,leading:false,trailing:false
 });
});

test('context preserves an exact match and never interprets source markup',()=>{
 const context=helper('contextExcerpt');
 assert.deepEqual(context('<img>😀字</img>',5,8,0),{
  before:'',match:'😀字',after:'',line:1,column:6,leading:true,trailing:true
 });
 assert.equal(context('<img>menu</img>',5,9).before,'<img>');
 assert.equal(context('<img>menu</img>',5,9).after,'</img>');
});

test('context rejects invalid spans instead of slicing through a surrogate or line ending',()=>{
 const context=helper('contextExcerpt');
 for(const [source,start,end] of [
  ['😀menu',1,6],['😀menu',0,1],['menu',-1,2],['menu',1,5],['menu',3,2],
  ['menu',0.5,2],['menu\r\nmenu',5,6],['menu\r\nmenu',0,10]
 ]) assert.throws(()=>context(source,start,end),/TLS_R19_INVALID_SPAN/);
});

test('context rejects malformed Unicode and invalid radius values',()=>{
 const context=helper('contextExcerpt');
 for(const source of ['\ud800menu','menu\udc00'])assert.throws(()=>context(source,0,1),/TLS_R19_INVALID_TEXT/);
 for(const radius of [-1,0.5,Infinity,NaN])assert.throws(()=>context('menu',0,4,radius),/TLS_R19_INVALID_RADIUS/);
});

test('changed line excerpt centers on the real edit after a 300-character prefix',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('甲'.repeat(300)+'軟件結束','甲'.repeat(300)+'軟體結束',2),{
  before:'甲軟件結束',after:'甲軟體結束',column:302,leading:true,beforeTrailing:false,afterTrailing:false
 });
});

test('changed line excerpt reports truncation independently for old and new lines',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('設定 menu','設定 選單',2),{
  before:'定 men',after:'定 選單',column:4,leading:true,beforeTrailing:true,afterTrailing:false
 });
});

test('changed line excerpt compares whole emoji rather than their shared high surrogate',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('甲😀尾','甲😁尾',0),{
  before:'😀',after:'😁',column:2,leading:true,beforeTrailing:true,afterTrailing:true
 });
});

test('changed line excerpt keeps end insertions and deletions visible',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('menu','menu!',1),{
  before:'u',after:'u!',column:5,leading:true,beforeTrailing:false,afterTrailing:false
 });
 assert.deepEqual(changed('menu!','menu',1),{
  before:'u!',after:'u',column:5,leading:true,beforeTrailing:false,afterTrailing:false
 });
 assert.deepEqual(changed('','新'),{
  before:'',after:'新',column:1,leading:false,beforeTrailing:false,afterTrailing:false
 });
});

test('changed line excerpt does not split CRLF at a clipping boundary',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('ab\r\n舊Z','ab\r\n新Z',1),{
  before:'\r\n舊Z',after:'\r\n新Z',column:5,leading:true,beforeTrailing:false,afterTrailing:false
 });
});

test('unchanged lines report no differing column and remain bounded',()=>{
 const changed=helper('changedLineExcerpt');
 assert.deepEqual(changed('same','same'),{
  before:'same',after:'same',column:0,leading:false,beforeTrailing:false,afterTrailing:false
 });
 assert.deepEqual(changed('abcdef','abcdef',1),{
  before:'abc',after:'abc',column:0,leading:false,beforeTrailing:true,afterTrailing:true
 });
});

test('coverage remains partial after all 120 visible occurrences are reviewed',async()=>{
 const coverage=helper('coverageSummary');
 const {createWordingSession}=require('../src/core/wording_assistant_r172.js');
 const session=createWordingSession({source:'請使用 '+('軟件 '.repeat(130))});
 let snapshot=await session.inspect();
 for(const candidate of snapshot.candidates)snapshot=session.choose({snapshot_id:snapshot.snapshot_id,candidate_id:candidate.id,action:'KEEP_ORIGINAL'});
 assert.deepEqual(coverage(snapshot),{shown:120,omitted:10,total:130,partial:true});
 assert.equal(snapshot.coverage.omitted_candidate_count,10);
 session.revoke();
});

test('coverage uses visible and omitted counts, not an inconsistent claimed total',()=>{
 const coverage=helper('coverageSummary');
 const snapshot=Object.freeze({candidates:Object.freeze([{},{}]),coverage:Object.freeze({omitted_candidate_count:1,scanned_candidate_count:999})});
 assert.deepEqual(coverage(snapshot),{shown:2,omitted:1,total:3,partial:true});
 assert.deepEqual(coverage({candidates:[]}),{shown:0,omitted:0,total:0,partial:false});
 assert.deepEqual(coverage({candidates:[{}],coverage:{omitted_candidate_count:0}}),{shown:1,omitted:0,total:1,partial:false});
});

test('coverage rejects malformed counts instead of reporting a false complete review',()=>{
 const coverage=helper('coverageSummary');
 for(const omitted of [-1,1.5,'10',null,NaN,Infinity])assert.throws(()=>coverage({candidates:[],coverage:{omitted_candidate_count:omitted}}),/TLS_R19_INVALID_COVERAGE/);
 assert.throws(()=>coverage(null),/TLS_R19_INVALID_COVERAGE/);
});

test('decode preserves UTF-8 text and every CRLF byte without mutating the input',()=>{
 const decode=helper('decodeMarkdownBytes');
 const bytes=Buffer.from('# 原稿\r\nmenu\r\n','utf8'),original=Buffer.from(bytes);
 assert.equal(decode(bytes,bytes.length,65536),'# 原稿\r\nmenu\r\n');
 assert.deepEqual(bytes,original);
 const backing=Uint8Array.from([88,109,101,110,117,89]);
 assert.equal(decode(backing.subarray(1,5),4,65536),'menu');
 assert.equal(decode(Uint8Array.from([109,101,110,117]).buffer,4,65536),'menu');
});

test('decode rejects actual UTF-8 BOM bytes before the decoder can strip them',()=>{
 const decode=helper('decodeMarkdownBytes');
 assert.throws(()=>decode(Uint8Array.from([0xef,0xbb,0xbf,109,101,110,117]),7,65536),/TLS_R19_IMPORT_BOM/);
 assert.throws(()=>decode(Uint8Array.from([0xef,0xbb,0xbf]),3,65536),/TLS_R19_IMPORT_BOM/);
});

test('decode rejects invalid, truncated, overlong and surrogate UTF-8 encodings',()=>{
 const decode=helper('decodeMarkdownBytes');
 for(const values of [[0xff],[0xe2,0x82],[0xc0,0xaf],[0xed,0xa0,0x80]]){
  const bytes=Uint8Array.from(values);assert.throws(()=>decode(bytes,bytes.length,65536),/TLS_R19_IMPORT_UTF8/);
 }
});

test('decode rejects NUL, empty or whitespace-only files',()=>{
 const decode=helper('decodeMarkdownBytes');
 assert.throws(()=>decode(Uint8Array.from([109,0,101]),3,65536),/TLS_R19_IMPORT_NUL/);
 assert.throws(()=>decode(new Uint8Array(0),0,65536),/TLS_R19_IMPORT_EMPTY/);
 assert.throws(()=>decode(Uint8Array.from([32,13,10,9]),4,65536),/TLS_R19_IMPORT_EMPTY/);
});

test('decode rejects size mismatches and cannot lift the 64 KiB ceiling',()=>{
 const decode=helper('decodeMarkdownBytes');
 assert.throws(()=>decode(Uint8Array.from([109,101,110,117]),3,65536),/TLS_R19_IMPORT_SIZE/);
 assert.throws(()=>decode(Uint8Array.from([109,101,110,117]),4,3),/TLS_R19_IMPORT_LIMIT/);
 const exact=new Uint8Array(65536).fill(120),large=new Uint8Array(65537).fill(120);
 assert.equal(decode(exact,65536,65536).length,65536);
 assert.throws(()=>decode(large,65537,65536),/TLS_R19_IMPORT_LIMIT/);
 assert.throws(()=>decode(large,65537,99999),/TLS_R19_IMPORT_LIMIT/);
});

test('decode rejects malformed byte containers and numeric limits',()=>{
 const decode=helper('decodeMarkdownBytes');
 assert.throws(()=>decode([109,101,110,117],4,65536),/TLS_R19_IMPORT_BYTES/);
 assert.throws(()=>decode(Uint8Array.from([109]),1.5,65536),/TLS_R19_IMPORT_SIZE/);
 assert.throws(()=>decode(Uint8Array.from([109]),1,NaN),/TLS_R19_IMPORT_LIMIT/);
});

test('the same helpers work as a browser script without require or a DOM',()=>{
 assert.ok(fs.existsSync(helperPath),'browser helper script must be implemented');
 const sandbox={window:{},TextDecoder,Uint8Array,ArrayBuffer};
 vm.runInNewContext(fs.readFileSync(helperPath,'utf8'),sandbox,{filename:'review_helpers_r19.js'});
 const browser=sandbox.window.TLSReviewHelpersR19;
 assert.equal(browser.contextExcerpt('😀 menu',3,7).column,3);
 assert.equal(browser.decodeMarkdownBytes(Uint8Array.from([109,101,110,117]),4,65536),'menu');
 assert.equal(browser.changedLineExcerpt('軟件','軟體').after,'軟體');
 assert.equal(browser.coverageSummary({candidates:[{}]}).partial,false);
});
