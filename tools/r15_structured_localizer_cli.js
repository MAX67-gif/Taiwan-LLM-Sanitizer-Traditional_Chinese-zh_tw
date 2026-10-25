#!/usr/bin/env node
/* R15 offline SHADOW inspection and optional user-directed preview file. No network/overwrites. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const TLS=require('../src/core/protected_segments_r15.js');
const OPTIONS=new Set(['--input','--format','--report','--edits','--preview-output']);
function parse(argv){
 const vals=Object.create(null);for(let i=0;i<argv.length;i+=2){
  if(!OPTIONS.has(argv[i])||i+1>=argv.length||vals[argv[i]])throw Error('BAD_ARGUMENTS');
  vals[argv[i]]=argv[i+1];
 }
 if(!vals['--input']||!['markdown','json','prompt'].includes(vals['--format']))throw Error('MISSING_REQUIRED_FIELDS');
 if(Boolean(vals['--edits'])!==Boolean(vals['--preview-output']))throw Error('EDITS_REQUIRE_PREVIEW_OUTPUT');
 if(!vals['--report']&&!vals['--preview-output'])throw Error('REQUIRE_REPORT_OR_PREVIEW_PATH');
 return vals;
}
function localRead(name,max=TLS.MAX_BYTES){
 const p=path.resolve(name),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('UNSAFE_INPUT_FILE');
 const bytes=fs.readFileSync(p);
 if(bytes.includes(0))throw Error('BINARY_REJECTED');
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 return {path:p,text:decoder.decode(bytes)};
}
function outputFile(name,source,others,content){
 const target=path.resolve(name);
 if([source,...others].includes(target))throw Error('WOULD_OVERWRITE_INPUT');
 const parent=path.dirname(target);
 if(fs.existsSync(target))throw Error('OUTPUT_ALREADY_EXISTS');
 if(fs.lstatSync(parent).isSymbolicLink()||fs.realpathSync(parent)!==parent)throw Error('SYMLINK_OUTPUT_DIR');
 fs.writeFileSync(target,content,{encoding:'utf8',flag:'wx',mode:0o600});
}
async function main(argv=process.argv.slice(2)){
 const opts=parse(argv),input=localRead(opts['--input']);
 const report=await TLS.analyze(input.text,opts['--format']);
 if(opts['--edits']){
  const spec=localRead(opts['--edits'],65536),data=JSON.parse(spec.text);
  if(report.validation.status!=='OK')throw Error('BLOCKED_DOCUMENT');
  if(!data||data.schema!=='tls.structured-edits.v1'||data.input_sha256!==report.input_sha256||!Array.isArray(data.edits))throw Error('INVALID_EDIT_PLAN');
  const result=await TLS.preview(input.text,report,data.edits);
  if(result.status!=='SAFE_PREVIEW_NOT_APPLIED')throw Error('NOT_APPROVED_FOR_PREVIEW');
  outputFile(opts['--preview-output'],input.path,[spec.path,opts['--report']?path.resolve(opts['--report']):''],result.preview_text);
 }
 if(opts['--report'])outputFile(opts['--report'],input.path,[opts['--edits']?path.resolve(opts['--edits']):'',opts['--preview-output']?path.resolve(opts['--preview-output']):''],JSON.stringify(TLS.publicReport(report),null,2)+'\n');
 process.stdout.write(JSON.stringify({schema:report.schema,format:report.format,input_sha256:report.input_sha256,status:report.validation.status,protected_count:report.protected_count,mutable_count:report.mutable_count,approval:'NONE',no_network:true})+'\n');
 if(report.validation.status!=='OK')process.exitCode=1;
}
if(require.main===module)main().catch(()=>{process.stderr.write('TLS_R15_LOCAL_INPUT_OR_PREVIEW_REJECTED\n');process.exitCode=1;});
module.exports={parse,localRead,main};
