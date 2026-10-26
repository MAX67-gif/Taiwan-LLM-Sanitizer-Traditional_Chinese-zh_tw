#!/usr/bin/env node
/* TLS R17-P0 offline explicit-root/allowlist report; never writes to project. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const DTG=require('../src/core/document_trust_graph_r17.js');
const VALID=new Set(['--root','--allowlist','--report','--locale','--baseline','--include-paths']);
function fail(code){throw Error('TLS_R17_'+code)}
function parse(args){const out=Object.create(null);
 for(let i=0;i<args.length;i++){
  let k=args[i];if(!VALID.has(k)||out[k]!==undefined)fail('UNKNOWN_OR_DUPLICATE_ARG');
  if(k==='--include-paths'){out[k]=true;continue}
  if(i+1>=args.length)fail('MISSING_VALUE');out[k]=args[++i];
 }
 if(!out['--root']||!out['--allowlist']||!out['--report'])fail('REQUIRED_ARGS');
 return out;
}
function inside(root,target){return target===root||target.startsWith(root+path.sep)}
function checkRoot(rootName){const p=path.resolve(rootName),stat=fs.lstatSync(p);
 if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync(p)!==p)fail('ROOT_NOT_REAL_DIRECTORY');
 return p;
}
function readTextSecure(p,max){
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||st.size>max)fail('UNSAFE_FILE');
 const flags=fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0);const fd=fs.openSync(p,flags);try{
  const fresh=fs.fstatSync(fd);if(!fresh.isFile()||fresh.ino!==st.ino||fresh.dev!==st.dev||fresh.size>max)fail('FILE_CHANGED_DURING_AUDIT');
  const bytes=fs.readFileSync(fd);if(bytes.length>max)fail('SIZE_BUDGET');
  return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 }finally{fs.closeSync(fd)}
}
function checkAncestry(root,p){
 if(!inside(root,p))fail('OUTSIDE_ROOT');
 let curr=root;const rel=path.relative(root,p);
 for(const seg of rel.split(path.sep).slice(0,-1)){
  curr=path.join(curr,seg);const st=fs.lstatSync(curr);
  if(!st.isDirectory()||st.isSymbolicLink())fail('SYMLINK_OR_NONDIR_PARENT');
 }
}
function outputPath(root,name,inputs){
 const target=path.resolve(name),parent=path.dirname(target);
 if(inside(root,target)||inputs.includes(target))fail('REPORT_IN_SCANNED_ROOT');
 if(fs.existsSync(target))fail('OUTPUT_ALREADY_EXISTS');
 // Parent must be a real directory, no symlink traversal to unexpected targets.
 if(fs.realpathSync(parent)!==parent||fs.lstatSync(parent).isSymbolicLink())fail('REPORT_PARENT_UNSAFE');
 return target;
}
async function execute(argv=process.argv.slice(2)){
 const options=parse(argv),root=checkRoot(options['--root']);
 const allowName=path.resolve(options['--allowlist']);
 if(inside(root,allowName))fail('ALLOWLIST_INSIDE_ROOT');
 const doc=JSON.parse(readTextSecure(allowName,65536));
 if(!Array.isArray(doc.file_allowlist)||doc.file_allowlist.length>DTG.MAX_FILES||doc.file_allowlist.length===0)fail('INVALID_ALLOWLIST');
 const files=[];let total=0;
 for(const rel of doc.file_allowlist){DTG.checkPath(rel);if(!/\.md|\.markdown$/iu.test(rel))fail('MARKDOWN_ONLY');
  const file=path.join(root,...rel.split('/'));checkAncestry(root,file);
  if(!fs.existsSync(file)){files.push({path:rel,missing:true});continue}
  const value=readTextSecure(file,DTG.MAX_FILE_BYTES);total+=Buffer.byteLength(value,'utf8');if(total>DTG.MAX_TOTAL_BYTES)fail('TOTAL_BUDGET');
  files.push({path:rel,text:value});
 }
 const report=await DTG.audit({schema:DTG.REQUEST,file_allowlist:doc.file_allowlist,files,locale:options['--locale']||doc.locale,check_external:false,network_requested:false},{include_paths:options['--include-paths']===true});
 if(options['--baseline']){
  const prev=JSON.parse(readTextSecure(path.resolve(options['--baseline']),2_000_000));
  const cmp=DTG.compareSnapshots(prev,report);
  report.baseline_validation=cmp;
  if(cmp.decision!=='PASS')report.decision='BLOCK_STALE';
 }
 const target=outputPath(root,options['--report'],[allowName,...(options['--baseline']?[path.resolve(options['--baseline'])]:[])]);
 fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
 console.log('TLS_R17_REPORT_WRITTEN',report.decision,JSON.stringify(report.summary));
 // Default PASS, WARN, UNKNOWN should finish. BLOCK is a quality issue, exit code 2.
 return report.decision==='BLOCK'||report.decision==='BLOCK_STALE'?2:0;
}
if(require.main===module)execute().then(code=>{process.exitCode=code}).catch(e=>{const type=String(e?.message||'').replace(/^TLS_R17_/u,'');const safe=/^[A-Z_]+$/u.test(type)?type:'AUDIT_FAILED';console.error('TLS_R17_BLOCKED',safe);process.exitCode=2});
module.exports={parse,readTextSecure,execute,checkRoot,checkAncestry};
