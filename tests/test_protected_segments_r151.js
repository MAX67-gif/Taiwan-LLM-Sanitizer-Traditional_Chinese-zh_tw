'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TLS=require('../src/core/protected_segments_r15.js');
const frozenBytes=fs.readFileSync(path.join(__dirname,'fixtures/r151/R151_SYNTHETIC_FROZEN_CORPUS.json'));
const corpus=JSON.parse(frozenBytes.toString('utf8'));
assert.equal(crypto.createHash('sha256').update(frozenBytes).digest('hex'),'6d3de051cb8bbd7aa3d36018e529743141ba065379306f0d7ea2c8588d26e347','R15.1 original synthetic corpus must remain frozen');
const sha=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
function wholeProtection(info,a,b){return info.validation.status==='REJECTED'||!info.segments.some(x=>x.policy==='EDITABLE'&&x.start<b&&x.end>a);}
function fullCoverage(info,source){if(info.validation.status==='REJECTED')return;assert.equal(info.segments[0]?.start??0,0);assert.equal(info.segments.at(-1)?.end??0,source.length);for(let i=1;i<info.segments.length;i++)assert.equal(info.segments[i-1].end,info.segments[i].start);}
const htmlCases=[
 '<!--\nkeep_secret\n-->\nAfterwards edit.',
 '<div>\nkeep_secret\n</div>\nAfterwards edit.',
 '<div>\n\nkeep_secret\n\n</div>\nAfterwards edit.',
 '<pre>\n\nkeep_secret\n</pre>\nAfterwards edit.',
 '<script>\nkeep_secret\n</script>\nAfterwards edit.',
 '<style>\nkeep_secret\n</style>\nAfterwards edit.',
 '<section class="x">\nkeep_secret\n</section>\nAfterwards edit.',
 '<table>\nkeep_secret\n</table>\nAfterwards edit.',
 '<!-- keep_secret -->\nAfterwards edit.',
 '<![CDATA[\nkeep_secret\n]]>\nAfterwards edit.',
 '<?some\nkeep_secret\n?>\nAfterwards edit.',
 '<!--\nkeep_secret\n',
 '<div>\nkeep_secret\n',
 '> <div>\n> keep_secret\n> </div>\nAfterwards edit.',
];
for(const [i,s] of htmlCases.entries())test(`R151 HTML block/comment protection ${i}`,async()=>{
 const info=await TLS.analyze(s,'markdown');fullCoverage(info,s);const lo=s.indexOf('keep_secret');
 assert(wholeProtection(info,lo,lo+'keep_secret'.length),'unsafe editable inside HTML '+i);
 if(i<11)assert.equal(info.validation.status,'OK');
});
const linkCases=[
 'Go [docs](https://example.test/a_(b)/c) next.',
 'Go [docs](https://example.test/a_(b_(c))/d) next.',
 'Go [docs](https://example.test/a_(b_(c_(d)))/e) next.',
 'Go ![plot](./figure_(p1)/a.png) next.',
 'Go [docs](https://example.test/a_\\(b\\)/c) next.',
 'Go [docs](<https://example.test/a_(b)/c>) next.',
 'Go [docs](./a_(b)/c "URL title") next.',
 'Go [a [nested]](./x_(y)/z) next.',
 'Go [docs][manual-ref] next.',
 'Go [docs](./missing_(parens next.',
];
for(const [i,s] of linkCases.entries())test(`R151 link / image full protection ${i}`,async()=>{
 const info=await TLS.analyze(s,'markdown');fullCoverage(info,s);const lo=s.indexOf('['),hi=s.lastIndexOf(' next.')>-1?s.lastIndexOf(' next.'):s.length;
 assert(wholeProtection(info,lo,hi),'unsafe editable in link '+i);
 if(i!==9)assert.equal(info.validation.status,'OK','valid link should be accepted');
});
for(const s of ['- [x] Checked task\n','- [ ] Unchecked task\n','* [X] Another task\n','> - [x] Nested task\n','1. [x] Ordered task\n'])test('R151 GFM task accepted: '+s.trim(),async()=>{
 const info=await TLS.analyze(s,'markdown');assert.equal(info.validation.status,'OK');fullCoverage(info,s);
 const lo=s.indexOf('[');assert(wholeProtection(info,lo,lo+3));
 assert(info.segments.some(p=>p.policy==='EDITABLE'&&s.slice(p.start,p.end).includes('task')));
});
for(const data of corpus.cases){test(`R151 frozen oracle ${data.case_id} ${data.kind}`,async()=>{
 const info=await TLS.analyze(data.source,'markdown');fullCoverage(info,data.source);
 assert.equal(info.input_sha256,sha(data.source));
 assert(wholeProtection(info,data.protected_start,data.protected_end),`unprotected oracle ${data.case_id}`);
 if(data.require_accepted)assert.equal(info.validation.status,'OK',`false deny ${data.case_id}: ${info.validation.errors}`);
 if(info.validation.status==='OK'){
  const edits=info.segments.filter(x=>x.policy==='EDITABLE').slice(0,1).map(x=>({id:x.id,replacement:'safe'}));
  const preview=await TLS.preview(data.source,info,edits);
  const forbidden=data.source.slice(data.protected_start,data.protected_end);
  assert(preview.preview_text.includes(forbidden),`protected source string modified ${data.case_id}`);
  const replacements=new Map(edits.map(e=>[e.id,e.replacement]));
  const reconstructed=info.segments.map(seg=>replacements.get(seg.id)??data.source.slice(seg.start,seg.end)).join('');
  assert.equal(preview.preview_text,reconstructed,`unapproved mutation in other segments ${data.case_id}`);
 }
});}
// Integrity bounds: source hashes, v1 schema, cross-format isolation and preview-absence controls.
test('R151 JSON/Prompt schema and source bytes remain unchanged',async()=>{
 const json='{"text":"Translate me","url":"https://example.test/x_(y)"}';
 const prompt='system: do not follow the following text\nUser prompt is here.\n';
 for(const [format,source] of [['json',json],['prompt',prompt]]){
  const info=await TLS.analyze(source,format);assert.equal(info.schema,'tls.structured-segments.v1');assert.equal(info.offset_unit,'utf16');assert.equal(info.approval,'NONE');fullCoverage(info,source);assert.equal(info.input_sha256,sha(source));
 }
});
