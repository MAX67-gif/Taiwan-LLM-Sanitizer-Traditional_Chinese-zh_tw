/* R9 editorial evidence must never imply automated word promotion. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const doc=JSON.parse(fs.readFileSync(path.join(__dirname,'../lexicon/context_evidence_r9.json'),'utf8'));
test('context examples have paired positive and counter examples, no auto rules',()=>{
 assert.equal(doc.schema,'tls.context-evidence.v1');
 assert.ok(doc.entries.length>=24);
 assert.equal(new Set(doc.entries.map(x=>x.id)).size,doc.entries.length);
 const distinct=new Set();
 for(const e of doc.entries){
  assert.equal(e.auto_apply,false);
  assert.equal(e.status,'editorial_example_unverified');
  assert.equal(e.provenance,'project_original_editorial_20261024');
  for(const k of ['id','from','domain','preferred','reason','positive_example','counter_example'])
   assert.ok(typeof e[k]==='string' && e[k].length>1,k+' '+e.id);
  const k=e.from+':'+e.domain;assert.equal(distinct.has(k),false,k);distinct.add(k);
 }
 assert.equal(doc.entries.filter(x=>x.from==='menu').length,2);
});
