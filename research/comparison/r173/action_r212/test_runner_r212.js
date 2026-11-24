'use strict';
/* R212 test-first: reusable GitHub composite Action over existing R211.
 * No source overwrite, no egress, never accidentally enforce strict mode.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const child=require('node:child_process');
const Runner=require('./runner_r212.js');
const HERE=__dirname,TICK=String.fromCharCode(96);
const fixture='# Original review\n介面 menu，餐廳 menu。\n程式 '+TICK+'menu'+TICK+' 及 {{USER}} 不可改。\n';
const make=async cb=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r212-'));
 const workspace=path.join(dir,'checkout'),temp=path.join(dir,'runner-temp');
 fs.mkdirSync(workspace);fs.mkdirSync(temp);
 const original=path.join(workspace,'README.md');
 fs.writeFileSync(original,fixture,'utf8');
 const output=path.join(dir,'GH_OUTPUT');fs.writeFileSync(output,'');
 const env={GITHUB_WORKSPACE:workspace,RUNNER_TEMP:temp,GITHUB_OUTPUT:output};
 try{return await cb({dir,workspace,temp,original,output,env});}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
};
const expectFail=async (fn,term)=>assert.rejects(fn,new RegExp('R212_'+term));
test('R212 default is report-only, metadata output and untouched source',()=>make(async ctx=>{
 const before=fs.readFileSync(ctx.original);
 const r=await Runner.run({input:'README.md',report:'',strict:'false'},ctx.env);
 assert.equal(r.exit_code,0);assert.equal(r.review_required,true);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.report_written,true);
 assert.equal(path.dirname(r.report_path),ctx.temp);
 assert.deepEqual(fs.readFileSync(ctx.original),before);
 const payload=JSON.parse(fs.readFileSync(r.report_path,'utf8'));
 assert.equal(payload.schema,'tls.r211.pr-wording-audit.v1');
 assert.equal(payload.auto_apply,false);assert.equal(payload.network_requested,false);
 assert.equal(payload.contains_source_text,false);
 assert(!JSON.stringify(payload).includes('餐廳'));
 const outputs=fs.readFileSync(ctx.output,'utf8');
 assert.match(outputs,/review_required=true\n/u);
 assert.match(outputs,/exit_code=0\n/u);
 assert.match(outputs,/status=REVIEW_REQUIRED\n/u);
 assert(!outputs.includes('餐廳')&&!outputs.includes('menu'));
}));
test('R212 strict is explicit and exit 2 only for review-required warnings',()=>make(async ctx=>{
 let x=await Runner.run({input:'README.md',report:'strict.json',strict:'true'},ctx.env);
 assert.equal(x.exit_code,2);assert.equal(x.review_required,true);
 assert(fs.existsSync(path.join(ctx.workspace,'strict.json')));
 fs.writeFileSync(path.join(ctx.workspace,'clean.md'),'# Hello\nOrdinary words remain.\n');
 x=await Runner.run({input:'clean.md',report:'clean-report.json',strict:'true'},ctx.env);
 assert.equal(x.exit_code,0);assert.equal(x.review_required,false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(ctx.workspace,'clean-report.json'),'utf8')).linguistic_quality_verified,false);
}));
test('R212 rejects arbitrary strict/shell commands and unknown argument types',()=>make(async ctx=>{
 for(const input of ['yes','TRUE','false; echo hacked','--strict',false,0,{},['false']])
   await expectFail(()=>Runner.run({input:'README.md',report:'audit.json',strict:input},ctx.env),'STRICT');
 await expectFail(()=>Runner.run({input:'README.md',report:'audit.json',strict:'false',unsafe:'X'},ctx.env),'INPUTS');
}));
test('R212 input limited to checkout files, no traversal, symlink or absolute outside',()=>make(async ctx=>{
 const outside=path.join(ctx.dir,'outside.md');fs.writeFileSync(outside,fixture);
 for(const x of ['../outside.md',outside,'/etc/passwd','README.md/../../outside.md'])
  await expectFail(()=>Runner.run({input:x,report:'safe.json',strict:'false'},ctx.env),'UNSAFE_INPUT');
 const link=path.join(ctx.workspace,'link.md');fs.symlinkSync(outside,link);
 await expectFail(()=>Runner.run({input:'link.md',report:'safe.json',strict:'false'},ctx.env),'UNSAFE_INPUT');
 const linkDir=path.join(ctx.workspace,'external');fs.symlinkSync(ctx.dir,linkDir);
 await expectFail(()=>Runner.run({input:'external/outside.md',report:'safe.json',strict:'false'},ctx.env),'UNSAFE_INPUT');
}));
test('R212 report cannot overwrite existing, source, symlink, or leave workspace/temp',()=>make(async ctx=>{
 fs.writeFileSync(path.join(ctx.workspace,'report.json'),'ORIGINAL');
 for(const p of ['report.json','README.md','../../outside-report.json',ctx.dir+'/outside-report.json'])
  await expectFail(()=>Runner.run({input:'README.md',report:p,strict:'false'},ctx.env),'UNSAFE_REPORT');
 assert.equal(fs.readFileSync(path.join(ctx.workspace,'report.json'),'utf8'),'ORIGINAL');
 const link=path.join(ctx.workspace,'to-temp');fs.symlinkSync(ctx.temp,link);
 await expectFail(()=>Runner.run({input:'README.md',report:'to-temp/report.json',strict:'false'},ctx.env),'UNSAFE_REPORT');
}));
test('R212 repeated Action cannot overwrite first report',()=>make(async ctx=>{
 await Runner.run({input:'README.md',report:'report.json',strict:'false'},ctx.env);
 const before=fs.readFileSync(path.join(ctx.workspace,'report.json'));
 await expectFail(()=>Runner.run({input:'README.md',report:'report.json',strict:'false'},ctx.env),'UNSAFE_REPORT');
 assert.deepEqual(fs.readFileSync(path.join(ctx.workspace,'report.json')),before);
}));
test('R212 malformed source exits without report or source corruption',()=>make(async ctx=>{
 fs.writeFileSync(ctx.original,Buffer.from([0xff,0xff,0xff]));
 const before=fs.readFileSync(ctx.original);
 await assert.rejects(Runner.run({input:'README.md',report:'audit.json',strict:'false'},ctx.env));
 assert.deepEqual(fs.readFileSync(ctx.original),before);
 assert(!fs.existsSync(path.join(ctx.workspace,'audit.json')));
}));
test('R212 CLI wrapper never echoes document text or paths on errors',()=>make(async ctx=>{
 const runner=path.join(HERE,'runner_r212.js');
 const env={...process.env,...ctx.env,TLS_R212_INPUT:'README.md',TLS_R212_REPORT:'',TLS_R212_STRICT:'false'};
 let s=child.spawnSync(process.execPath,[runner],{env,encoding:'utf8'});
 assert.equal(s.status,0,s.stderr);
 assert(!s.stdout.includes('餐廳')&&!s.stdout.includes('menu'));
 assert(!s.stderr.includes(ctx.workspace));
 s=child.spawnSync(process.execPath,[runner],{env:{...env,TLS_R212_INPUT:'../outside.md'},encoding:'utf8'});
 assert.equal(s.status,1);
 assert(!s.stderr.includes(ctx.workspace));
}));
test('R212 composite metadata invokes trusted action_path through opaque env',()=>{
 const src=fs.readFileSync(path.join(HERE,'action.yml'),'utf8');
 assert.match(src,/using:\s*['"]?composite/u);
 assert.match(src,/TLS_R212_INPUT:\s*\$\{\{\s*inputs\.input\s*\}\}/u);
 assert.match(src,/TLS_R212_REPORT:\s*\$\{\{\s*inputs\.report\s*\}\}/u);
 assert.match(src,/TLS_R212_STRICT:\s*\$\{\{\s*inputs\.strict\s*\}\}/u);
 assert.match(src,/node "\$TLS_R212_ACTION_PATH\/runner_r212\.js"/u);
 assert(!src.includes('curl ')&&!src.includes('wget ')&&!src.includes('gh api'));
 assert(!src.includes('upload-artifact'));
});
