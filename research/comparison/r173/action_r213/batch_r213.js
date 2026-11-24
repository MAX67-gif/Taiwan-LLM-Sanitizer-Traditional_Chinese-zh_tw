#!/usr/bin/env node
/* TLS R213: metadata-only, user-enumerated batch scan over original R211.
 * Research-only. No globbing, source rewrite, telemetry, storage or network.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const R211=require('../pr_wording_gate_r211.js');
const SCHEMA='tls.r213.batch-wording-audit.v1';
const MAX_FILES=20,MAX_TOTAL_BYTES=1048576,MAX_FILE_BYTES=65536;
const DEFAULT_REPORT='tls-r213-batch-review.json';
const EXTENSIONS=new Set(['.md','.markdown','.txt']);
const fail=code=>{throw Error('TLS_R213_'+code);};
const control=/[\x00-\x1f\x7f]/u;
const inside=(root,target)=>target!==root&&target.startsWith(root+path.sep);
const frozen=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){
 for(const value of Object.values(o))frozen(value);Object.freeze(o);
 }return o;};
function parseFiles(raw){
 if(typeof raw!=='string'||!raw.length||raw.length>4096||raw.includes('\0')||
    raw.includes('\\')||raw.includes('\r')&&raw.replace(/\r\n/g,'').includes('\r'))fail('FILES');
 const entries=raw.replace(/\r\n/g,'\n').split('\n');
 // GitHub YAML | commonly adds exactly one terminal newline.
 if(entries.at(-1)==='')entries.pop();
 if(!entries.length||entries.length>MAX_FILES||entries.some(x=>!x||x.trim()!==x||
    x.length>320||control.test(x)||/[?*\[\]]/u.test(x)))fail('FILES');
 const keys=new Set();
 for(const item of entries){
  if(path.posix.isAbsolute(item)||/^[A-Za-z]:/u.test(item))fail('UNSAFE_INPUT');
  const normalized=path.posix.normalize(item);
  if(normalized===''||normalized==='.'||normalized==='..'||normalized.startsWith('../')||
     item.split('/').includes('..'))fail('UNSAFE_INPUT');
  if(keys.has(normalized))fail('FILES');
  keys.add(normalized);
 }
 return frozen(entries);
}
function paramsOf(opts={}){
 if(!opts||typeof opts!=='object'||Array.isArray(opts)||
    Object.keys(opts).some(k=>!['files','strict','report'].includes(k)))fail('PARAMS');
 const files=opts.files===undefined?'README.md':opts.files,
       strict=opts.strict===undefined?'false':opts.strict,
       report=opts.report===undefined?'':opts.report;
 if(strict!=='true'&&strict!=='false')fail('STRICT');
 if(typeof report!=='string'||report.length>4096||control.test(report))fail('PARAMS');
 return frozen({files:parseFiles(files),strict:strict==='true',report});
}
function safeEnvironment(env){
 if(!env||typeof env!=='object')fail('ENV');
 for(const key of ['GITHUB_WORKSPACE','RUNNER_TEMP','GITHUB_OUTPUT'])
  if(typeof env[key]!=='string'||!env[key]||control.test(env[key]))fail('ENV');
 const workspace=path.resolve(env.GITHUB_WORKSPACE),temp=path.resolve(env.RUNNER_TEMP),
       output=path.resolve(env.GITHUB_OUTPUT);
 for(const [raw,p] of [[env.GITHUB_WORKSPACE,workspace],[env.RUNNER_TEMP,temp]]){
  if(!path.isAbsolute(raw))fail('ENV');
  let st;try{st=fs.lstatSync(p);}catch(_){fail('ENV');}
  if(st.isSymbolicLink()||!st.isDirectory())fail('ENV');
 }
 if(inside(workspace,temp)||inside(temp,workspace)||workspace===temp)fail('ENV');
 try{const st=fs.lstatSync(output);if(!st.isFile()||st.isSymbolicLink())fail('ENV');}
 catch(e){if(String(e.message).includes('TLS_R213_'))throw e;fail('ENV');}
 return frozen({workspace,temp,output});
}
function safePath(root,target,kind){
 if(!inside(root,target))fail(kind);
 const parts=path.relative(root,target).split(path.sep);
 let current=root;
 for(let i=0;i<parts.length;i++){
  const last=i===parts.length-1;current=path.join(current,parts[i]);
  let st;
  try{st=fs.lstatSync(current);}catch(e){
   if(e.code!=='ENOENT'||!last||kind==='UNSAFE_INPUT')fail(kind);
   return target;
  }
  if(st.isSymbolicLink()||(!last&&!st.isDirectory()))fail(kind);
  if(last){
   if(kind==='UNSAFE_REPORT')fail(kind);
   if(!st.isFile()||st.nlink!==1)fail(kind);
  }
 }
 return target;
}
function load(root,relative){
 const target=path.resolve(root,relative);
 if(!EXTENSIONS.has(path.extname(target).toLowerCase()))fail('UNSAFE_INPUT');
 safePath(root,target,'UNSAFE_INPUT');
 let fd;
 try{
  fd=fs.openSync(target,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.nlink!==1||st.size>MAX_FILE_BYTES||st.size===0)fail('UNSAFE_INPUT');
  const bytes=fs.readFileSync(fd);
  if(bytes.length>MAX_FILE_BYTES||bytes.includes(0))fail('UNSAFE_INPUT');
  let text;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch(_){fail('INVALID_UTF8');}
  return {text,bytes:bytes.length};
 }finally{if(fd!==undefined)fs.closeSync(fd);}
}
async function scanFiles(files,env){
 // Perform all I/O validation and decoding before any R211 semantic work.
 let total=0;const sources=[];
 for(const name of files){
  const target=path.resolve(env.workspace,name);
  if(!inside(env.workspace,target)||name.split('/').includes('..'))fail('UNSAFE_INPUT');
  if(!EXTENSIONS.has(path.extname(target).toLowerCase()))fail('UNSAFE_INPUT');
  safePath(env.workspace,target,'UNSAFE_INPUT');
  const st=fs.lstatSync(target);
  if(st.size>MAX_FILE_BYTES||!st.isFile()||st.nlink!==1||st.size===0)fail('UNSAFE_INPUT');
  total+=st.size;if(total>MAX_TOTAL_BYTES)fail('BATCH_BYTES');
 }
 for(const name of files)sources.push(load(env.workspace,name).text);
 const per=[];
 for(const source of sources){
  const report=await R211.auditMarkdown(source);
  if(report.schema!==R211.SCHEMA||report.approval!=='NONE'||
     report.auto_apply!==false||report.network_requested!==false||
     report.contains_source_text!==false||report.contains_source_hashes!==false||
     report.contains_file_names!==false||report.full_document_certified!==false)fail('UNSAFE_R211_REPORT');
  per.push(report);
 }
 return per;
}
function summarize(reports){
 const numbers=['candidates_total','candidates_reviewable','review_high',
  'review_medium','review_low','native_locked','protected_segments','omitted_candidates'];
 const agg=Object.fromEntries(numbers.map(k=>[k,0]));
 let needs=0,partial=0;
 const file_summaries=reports.map((r,i)=>{
  for(const key of numbers){if(!Number.isSafeInteger(r[key])||r[key]<0)fail('UNSAFE_R211_REPORT');agg[key]+=r[key];}
  if(r.review_required)needs++;
  if(r.partial_coverage)partial++;
  return {ordinal:i+1,status:r.status,review_required:r.review_required,
          candidates_total:r.candidates_total,candidates_reviewable:r.candidates_reviewable,
          review_high:r.review_high,review_medium:r.review_medium,
          native_locked:r.native_locked,omitted_candidates:r.omitted_candidates};
 });
 const review_required=needs>0||partial>0;
 return frozen({
  schema:SCHEMA,status:review_required?'REVIEW_REQUIRED':'NO_REVIEW_REQUIRED_NOT_CERTIFIED',
  input_files:reports.length,files_needing_review:needs,files_partial_coverage:partial,
  ...agg,review_required,file_summaries,
  approval:'NONE',auto_apply:false,automatically_modified:false,
  network_requested:false,contains_source_text:false,
  contains_file_names:false,contains_source_hashes:false,
  contains_candidate_ids:false,contains_replacement_text:false,
  contains_user_identity:false,full_document_certified:false,
  linguistic_quality_verified:false,external_adoption_verified:false
 });
}
async function run(inputs={},environment=process.env){
 const options=paramsOf(inputs),env=safeEnvironment(environment);
 const report=options.report?path.resolve(env.workspace,options.report):
   path.join(env.temp,DEFAULT_REPORT);
 const root=inside(env.temp,report)?env.temp:
            inside(env.workspace,report)?env.workspace:null;
 if(!root||report===env.output)fail('UNSAFE_REPORT');
 if(options.files.some(name=>path.resolve(env.workspace,name)===report))fail('UNSAFE_REPORT');
 safePath(root,report,'UNSAFE_REPORT');
 const reports=await scanFiles(options.files,env);
 const summary=summarize(reports);
 fs.writeFileSync(report,JSON.stringify(summary,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
 const exit_code=options.strict&&summary.review_required?2:0;
 const output={status:summary.status,review_required:summary.review_required,
  input_files:summary.input_files,files_needing_review:summary.files_needing_review,
  risk_high:summary.review_high,risk_medium:summary.review_medium,
  report_path:report,exit_code};
 const lines=Object.entries(output).map(([key,value])=>{
  const text=String(value);
  if(control.test(text)||text.length>4096)fail('UNSAFE_OUTPUT');
  return key+'='+text+'\n';
 }).join('');
 fs.appendFileSync(env.output,lines,'utf8');
 return frozen({schema:SCHEMA,...output,report_written:true});
}
async function main(){
 try{
  const report=await run({files:process.env.TLS_R213_FILES,
     report:process.env.TLS_R213_REPORT,strict:process.env.TLS_R213_STRICT});
  console.log('TLS_R213_BATCH_REVIEW',JSON.stringify({
   schema:SCHEMA,status:report.status,review_required:report.review_required,
   input_files:report.input_files,files_needing_review:report.files_needing_review,
   risk_high:report.risk_high,risk_medium:report.risk_medium,
   exit_code:report.exit_code,network_requested:false,auto_apply:false
  }));
  process.exitCode=report.exit_code;
 }catch(e){
  const match=/^TLS_R213_([A-Z_]+)$/.exec(String(e.message||''));
  console.error('TLS_R213_REJECTED',match?match[1]:'INVALID_LOCAL_INPUT_OR_OUTPUT');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports=Object.freeze({SCHEMA,parseFiles,paramsOf,safeEnvironment,run,summarize});
