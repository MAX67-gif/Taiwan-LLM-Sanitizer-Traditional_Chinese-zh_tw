'use strict';
/* R213 genuine RED->GREEN: bounded explicit path list, no auto-apply. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),child=require('node:child_process');
const B=require('./batch_r213.js'),CLI=path.join(__dirname,'batch_r213.js');
const risky='# Original\n介面 menu，餐廳 menu。\n餐廳設定 menu，未知 menu。\n'+String.fromCharCode(96)+'menu'+String.fromCharCode(96)+' 和 {{KEY}} 不變。\n';
async function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r213-'));
 const workspace=path.join(dir,'repo'),temp=path.join(dir,'tmp');
 fs.mkdirSync(workspace);fs.mkdirSync(temp);fs.mkdirSync(path.join(workspace,'docs'));
 fs.writeFileSync(path.join(workspace,'README.md'),risky);
 fs.writeFileSync(path.join(workspace,'docs','usage.md'),'# Original\n軟件與數據庫。\n');
 fs.writeFileSync(path.join(workspace,'clean.md'),'# English\nNo registered terms here.\n');
 const output=path.join(dir,'GH_OUTPUT');fs.writeFileSync(output,'');
 const env={GITHUB_WORKSPACE:workspace,RUNNER_TEMP:temp,GITHUB_OUTPUT:output};
 try{return await fn({dir,workspace,temp,output,env});}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const reject=(fn,code)=>assert.rejects(fn,new RegExp('TLS_R213_'+code));
test('2 real source files audited, aggregate preserves source, emits no source names/text/hash',()=>fixture(async c=>{
 const before=fs.readFileSync(path.join(c.workspace,'README.md'));
 const result=await B.run({files:'README.md\ndocs/usage.md',strict:'false',report:''},c.env);
 assert.equal(result.exit_code,0);assert.equal(result.review_required,true);
 assert.equal(path.dirname(result.report_path),c.temp);
 const x=JSON.parse(fs.readFileSync(result.report_path,'utf8'));
 assert.equal(x.schema,'tls.r213.batch-wording-audit.v1');assert.equal(x.input_files,2);
 assert.equal(x.files_needing_review,2);
 assert.deepEqual(x.file_summaries.map(z=>z.ordinal),[1,2]);
 assert.equal(x.approval,'NONE');assert.equal(x.auto_apply,false);
 assert.equal(x.full_document_certified,false);
 assert.equal(x.network_requested,false);assert.equal(x.external_adoption_verified,false);
 const json=JSON.stringify(x);
 for(const word of ['餐廳','軟件','menu','README.md','usage.md','KEY','source_sha256','replacement'])assert(!json.includes(word),word);
 assert.deepEqual(fs.readFileSync(path.join(c.workspace,'README.md')),before);
 assert.match(fs.readFileSync(c.output,'utf8'),/input_files=2\n/);
}));
test('default report-only; explicitly strict:true exit2, clean file strict0, never certified',()=>fixture(async c=>{
 const result=await B.run({files:'README.md',report:'warn.json',strict:'true'},c.env);
 assert.equal(result.exit_code,2);
 assert.equal(result.review_required,true);
 const clean=await B.run({files:'clean.md',report:'clear.json',strict:'true'},c.env);
 assert.equal(clean.exit_code,0);assert.equal(clean.review_required,false);
 const report=JSON.parse(fs.readFileSync(clean.report_path,'utf8'));
 assert.equal(report.status,'NO_REVIEW_REQUIRED_NOT_CERTIFIED');
 assert.equal(report.linguistic_quality_verified,false);
}));
test('invalid flags & unknown options rejected (no truthy strict coercion)',()=>fixture(async c=>{
 for(const strict of [true,'TRUE','yes','false; touch bad','0','',null,1])await reject(()=>B.run({files:'README.md',strict,report:'r.json'},c.env),'STRICT');
 await reject(()=>B.run({files:'README.md',strict:'false',report:'r.json',extra:'x'},c.env),'PARAMS');
}));
test('no empty list, duplicate normal paths, glob or >20 paths',()=>fixture(async c=>{
 for(const files of ['',' \n ','README.md\nREADME.md','README.md\n./README.md','README.md\n\n','**/*.md',
  Array.from({length:21},(_,i)=>'docs/'+i+'.md').join('\n')]){
  await assert.rejects(B.run({files,strict:'false',report:'r.json'},c.env));
 }
 assert.deepEqual(B.parseFiles('README.md\r\ndocs/usage.md'),['README.md','docs/usage.md']);
}));
test('input path escapes, absolute, symlink file and symlink directory denied',()=>fixture(async c=>{
 const outside=path.join(c.dir,'outside.md');fs.writeFileSync(outside,risky);
 for(const files of ['../outside.md',outside,'docs/../README.md','/etc/passwd'])
  await reject(()=>B.run({files,strict:'false',report:'r.json'},c.env),'UNSAFE_INPUT');
 fs.symlinkSync(outside,path.join(c.workspace,'link.md'));
 await reject(()=>B.run({files:'link.md',strict:'false',report:'r.json'},c.env),'UNSAFE_INPUT');
 fs.symlinkSync(c.dir,path.join(c.workspace,'external'));
 await reject(()=>B.run({files:'external/outside.md',strict:'false',report:'r.json'},c.env),'UNSAFE_INPUT');
}));
test('invalid UTF8 in second file is atomic: no report or GITHUB_OUTPUT',()=>fixture(async c=>{
 fs.writeFileSync(path.join(c.workspace,'bad.md'),Buffer.from([0xff,0xfe]));
 const before=fs.readFileSync(path.join(c.workspace,'README.md'));
 await assert.rejects(B.run({files:'README.md\nbad.md',strict:'false',report:'report.json'},c.env));
 assert.equal(fs.existsSync(path.join(c.workspace,'report.json')),false);
 assert.equal(fs.readFileSync(c.output,'utf8'),'');
 assert.deepEqual(fs.readFileSync(path.join(c.workspace,'README.md')),before);
}));
test('output refuses existing, source, outside workspace/temp, symlink ancestors and repeats',()=>fixture(async c=>{
 fs.writeFileSync(path.join(c.workspace,'existing.json'),'ORIGINAL');
 for(const report of ['existing.json','README.md','../../outside.json',path.join(c.dir,'escaped.json')])
  await reject(()=>B.run({files:'README.md',strict:'false',report},c.env),'UNSAFE_REPORT');
 const sym=path.join(c.workspace,'sym');fs.symlinkSync(c.temp,sym);
 await reject(()=>B.run({files:'README.md',strict:'false',report:'sym/report.json'},c.env),'UNSAFE_REPORT');
 await B.run({files:'README.md',strict:'false',report:'report.json'},c.env);
 await reject(()=>B.run({files:'README.md',strict:'false',report:'report.json'},c.env),'UNSAFE_REPORT');
 assert.equal(fs.readFileSync(path.join(c.workspace,'existing.json'),'utf8'),'ORIGINAL');
}));
test('17 near-limit 64KiB documents rejected by 1 MiB batch guard before output',()=>fixture(async c=>{
 const names=[];
 for(let i=0;i<17;i++){const n='docs/large-'+i+'.md';names.push(n);fs.writeFileSync(path.join(c.workspace,n),'a'.repeat(65536));}
 await reject(()=>B.run({files:names.join('\n'),strict:'false',report:'r.json'},c.env),'BATCH_BYTES');
 assert(!fs.existsSync(path.join(c.workspace,'r.json')));
}));
test('120 candidate cap remains partial with no translation quality claims',()=>fixture(async c=>{
 fs.writeFileSync(path.join(c.workspace,'large.md'),'# Original\n'+('menu '.repeat(125)));
 const x=await B.run({files:'large.md\nclean.md',strict:'false',report:'cap.json'},c.env);
 const a=JSON.parse(fs.readFileSync(x.report_path,'utf8'));
 assert.equal(a.files_partial_coverage,1);assert(a.omitted_candidates>=5);
 assert.equal(a.review_required,true);assert.equal(a.full_document_certified,false);
}));
test('CLI propagates 2 only in explicit strict mode, never echo source on failure',()=>fixture(async c=>{
 const env={...process.env,...c.env,TLS_R213_FILES:'README.md\nclean.md',TLS_R213_STRICT:'true',TLS_R213_REPORT:'out.json'};
 const p=child.spawnSync(process.execPath,[CLI],{env,encoding:'utf8'});
 assert.equal(p.status,2,p.stderr);assert(!p.stdout.includes('餐廳'));assert(!p.stderr.includes(c.workspace));
 const bad=child.spawnSync(process.execPath,[CLI],{env:{...env,TLS_R213_FILES:'../outside.md',TLS_R213_REPORT:'bad.json'},encoding:'utf8'});
 assert.equal(bad.status,1);assert(!bad.stderr.includes(c.workspace));
}));
test('composite action passes opaque env; no shell interpolation or artifact upload',()=>{
 const src=fs.readFileSync(path.join(__dirname,'action.yml'),'utf8');
 assert.match(src,/using:\s*['"]?composite/u);
 for(const key of ['files','strict','report'])
  assert(src.includes('inputs.'+key));
 assert(src.includes('node "$TLS_R213_ACTION_PATH/batch_r213.js"'));
 for(const bad of ['curl ','wget ','upload-artifact','gh api'])assert(!src.includes(bad));
});
