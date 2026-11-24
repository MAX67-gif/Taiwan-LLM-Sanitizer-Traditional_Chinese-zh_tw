#!/usr/bin/env node
/* TLS R212 — portable caller-opt-in GitHub Action wrapper for R211.
 * Research-only. Reads ONE caller-owned Markdown file, writes ONE new
 * source-free report. It never edits source, calls network, or chooses words.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const R211=require('../pr_wording_gate_r211.js');
const FAIL=code=>{throw Error('TLS_R212_'+code);};
const CONTROL=/[\x00-\x1f\x7f]/u;
const REPORT_NAME='tls-r212-review-report.json';
const PARAMS=new Set(['input','report','strict']);
const FIELDS=new Set(['GITHUB_WORKSPACE','RUNNER_TEMP','GITHUB_OUTPUT']);
const string=x=>typeof x==='string'&&x.length>0&&x.length<=4096&&!CONTROL.test(x);
const nested=(root,item)=>item!==root&&item.startsWith(root+path.sep);
function environment(env){
 if(!env||typeof env!=='object')FAIL('ENV');
 for(const key of FIELDS)if(!string(env[key]))FAIL('ENV');
 const workspace=path.resolve(env.GITHUB_WORKSPACE),temp=path.resolve(env.RUNNER_TEMP);
 if(!path.isAbsolute(env.GITHUB_WORKSPACE)||!path.isAbsolute(env.RUNNER_TEMP)||
    !fs.lstatSync(workspace).isDirectory()||!fs.lstatSync(temp).isDirectory()||
    fs.lstatSync(workspace).isSymbolicLink()||fs.lstatSync(temp).isSymbolicLink()||
    nested(workspace,temp)||nested(temp,workspace))FAIL('ENV');
 const output=path.resolve(env.GITHUB_OUTPUT);
 const st=fs.lstatSync(output);
 if(!st.isFile()||st.isSymbolicLink())FAIL('ENV');
 return {workspace,temp,output};
}
function safePath(root,target,mode){
 if(!nested(root,target))FAIL(mode);
 const pieces=path.relative(root,target).split(path.sep);
 let location=root;
 for(let i=0;i<pieces.length;i++){
  const last=i===pieces.length-1;
  location=path.join(location,pieces[i]);
  let st;
  try{st=fs.lstatSync(location);}catch(e){
   if(e.code!=='ENOENT'||!last)FAIL(mode);
   if(mode==='UNSAFE_INPUT')FAIL(mode);
   return target;
  }
  if(st.isSymbolicLink()||!last&&!st.isDirectory())FAIL(mode);
  if(last&&mode==='UNSAFE_INPUT'&&!st.isFile())FAIL(mode);
  if(last&&mode==='UNSAFE_REPORT')FAIL(mode);
 }
 return target;
}
function paramsOf(untrusted){
 if(!untrusted||typeof untrusted!=='object'||Array.isArray(untrusted)||
    Object.keys(untrusted).some(k=>!PARAMS.has(k)))FAIL('INPUTS');
 const input=untrusted.input??'README.md',report=untrusted.report??'',
       strict=untrusted.strict??'false';
 if(!string(input)||report!==''&&!string(report))FAIL('INPUTS');
 if(strict!=='true'&&strict!=='false')FAIL('STRICT');
 return Object.freeze({input,report,strict:strict==='true'});
}
async function run(inputs={},env=process.env){
 const opts=paramsOf(inputs),base=environment(env);
 const input=path.resolve(base.workspace,opts.input);
 safePath(base.workspace,input,'UNSAFE_INPUT');
 const dest=opts.report?path.resolve(base.workspace,opts.report):
   path.join(base.temp,REPORT_NAME);
 const outputBase=nested(base.temp,dest)?base.temp:
   nested(base.workspace,dest)?base.workspace:null;
 if(!outputBase||dest===input)FAIL('UNSAFE_REPORT');
 safePath(outputBase,dest,'UNSAFE_REPORT');
 if(dest===base.output)FAIL('UNSAFE_REPORT');
 const reply=await R211.main(['--input',input,'--report',dest,
                              ...(opts.strict?['--strict']:[])]);
 if(reply.schema!==R211.SCHEMA||reply.report_written!==true||
    typeof reply.review_required!=='boolean'||![0,2].includes(reply.exit_code))
  FAIL('INVALID_R211_RESULT');
 const metadata=JSON.parse(fs.readFileSync(dest,'utf8'));
 if(metadata.schema!==R211.SCHEMA||metadata.status!==reply.status||
    metadata.review_required!==reply.review_required||
    metadata.approval!=='NONE'||metadata.auto_apply!==false||
    metadata.network_requested!==false||metadata.contains_source_text!==false||
    metadata.contains_replacement_text!==false||metadata.contains_file_names!==false||
    metadata.full_document_certified!==false)FAIL('UNSAFE_R211_REPORT');
 const out=Object.freeze({
  status:reply.status,review_required:reply.review_required,
  review_high:reply.review_high,review_medium:reply.review_medium,
  report_written:true,report_path:dest,exit_code:reply.exit_code
 });
 // Every output is a bounded scalar; prevent GitHub command-file injection.
 const fields=[
  ['status',out.status],['review_required',out.review_required],
  ['review_high',out.review_high],['review_medium',out.review_medium],
  ['report_path',dest],['exit_code',out.exit_code]
 ];
 for(const [key,value] of fields)if(!string(String(value)))FAIL('UNSAFE_OUTPUT');
 fs.appendFileSync(base.output,fields.map(([k,v])=>k+'='+v+'\n').join(''),'utf8');
 return out;
}
async function main(){
 try{
  const result=await run({input:process.env.TLS_R212_INPUT,
                          report:process.env.TLS_R212_REPORT,
                          strict:process.env.TLS_R212_STRICT});
  console.log('TLS_R212_LOCAL_GITHUB_ACTION',JSON.stringify({
   schema:R211.SCHEMA,status:result.status,review_required:result.review_required,
   review_high:result.review_high,review_medium:result.review_medium,
   exit_code:result.exit_code,source_unchanged:true,network_requested:false
  }));
  process.exitCode=result.exit_code;
 }catch(e){
  const match=/^TLS_R212_([A-Z_]+)$/.exec(String(e.message||''));
  // No untrusted filepath, document or OS errors in CI logs.
  console.error('TLS_R212_REJECTED',match?match[1]:'INVALID_LOCAL_INPUT_OR_OUTPUT');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports=Object.freeze({run,paramsOf,REPORT_NAME});
