/* R16 explicit local-only shadow workbench CLI. No networking, no overwrite. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const Workbench=require('../src/core/local_workbench_r16.js');
const REQUIRED=new Set(['--input','--format','--report']);
const OPTIONS=new Set([...REQUIRED,'--edits','--preview-output']);
function parse(argv){
 if(argv.length%2)throw Error('R16_ARGUMENTS');
 const out=Object.create(null);
 for(let i=0;i<argv.length;i+=2){if(!OPTIONS.has(argv[i])||!argv[i+1]||out[argv[i]])throw Error('R16_ARGUMENTS');out[argv[i]]=argv[i+1];}
 for(const k of REQUIRED)if(!out[k])throw Error('R16_REQUIRED_'+k);
 if(Boolean(out['--edits'])!==Boolean(out['--preview-output']))throw Error('R16_PREVIEW_REQUIRES_EDITS');
 return out;
}
function readStrict(filename,limit=1048576){
 const p=path.resolve(filename),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size>limit)throw Error('R16_INVALID_FILE');
 const b=fs.readFileSync(p);if(b.includes(0))throw Error('R16_BINARY');
 return {path:p,text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b)};
}
function ensureNewPath(filename,others){
 const p=path.resolve(filename),parent=path.dirname(p);
 if(others.includes(p)||fs.existsSync(p))throw Error('R16_WOULD_OVERWRITE');
 if(fs.lstatSync(parent).isSymbolicLink()||fs.realpathSync(parent)!==parent)throw Error('R16_UNSAFE_OUTPUT_DIR');
 return p;
}
function writeNew(p,value){fs.writeFileSync(p,value,{encoding:'utf8',flag:'wx',mode:0o600});}
async function main(argv=process.argv.slice(2)){
 const opts=parse(argv),input=readStrict(opts['--input']);
 const session=Workbench.openSession({source:input.text,format:opts['--format']});
 try{
  const report=await session.inspect();
  if(report.validation_status!=='OK')throw Error('R16_REJECTED_'+report.reject_reasons.join('_'));
  const edits=opts['--edits']?readStrict(opts['--edits'],65536):null;
  const reportPath=ensureNewPath(opts['--report'],[input.path,edits?.path].filter(Boolean));
  let preview=null,previewPath=null;
  if(edits){
   const plan=JSON.parse(edits.text);preview=await session.prepare(plan);
   previewPath=ensureNewPath(opts['--preview-output'],[input.path,edits.path,reportPath]);
  }
  writeNew(reportPath,JSON.stringify(preview?preview.report:report,null,2)+'\n');
  if(preview)writeNew(previewPath,preview.preview_text);
  return {status:'PASS',report:reportPath,preview:previewPath};
 }finally{session.revoke();}
}
if(require.main===module){main().then(x=>console.log('R16_LOCAL_ONLY',JSON.stringify(x)),e=>{console.error('R16_CLI_BLOCKED',e.message);process.exitCode=1;});}
module.exports={parse,readStrict,ensureNewPath,main};
