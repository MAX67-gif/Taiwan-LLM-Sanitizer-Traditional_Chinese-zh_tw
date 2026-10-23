#!/usr/bin/env node
/* Local-only translation QA. No network, no storage, no plaintext output by default. MIT. */
'use strict';
const fs=require('node:fs');
const names=require('../src/core/entities.js');
const MAX=2_000_000;
const TEMPLATE=/(\{\{[^{}]{1,300}\}\}|\$\{[^}]{1,300}\}|\{[A-Za-z_$][\w.$-]*\}|%[sdif]|\x60{3,}[^\n]*|\x60[^\x60\n]{1,300}\x60|https?:\/\/[^\s<>]+)/gu;
function occurrences(text) {
  const out=new Map();
  for(const m of text.matchAll(TEMPLATE))out.set(m[0],(out.get(m[0])||0)+1);
  return out;
}
function inspect(source,translated){
  if(typeof source!=='string'||typeof translated!=='string')throw new TypeError('Text required');
  const issues=[];
  const audit=names.audit(source,translated);
  issues.push(...audit.issues);
  const a=occurrences(source),b=occurrences(translated);
  for(const [key,count] of a) {
    if((b.get(key)||0)<count)issues.push({code:'PROTECTED_STRUCTURE_MISSING',kind:(
      key.startsWith('http')?'url':key.startsWith('\x60')?'code':'placeholder'),count:count-(b.get(key)||0)});
  }
  // Diagnostic only: does NOT prove semantic equivalence or fluency.
  return Object.freeze({ok:issues.length===0,issues,
    checkedNames:audit.protectedCount,protectedStructures:[...a.values()].reduce((x,y)=>x+y,0),
    semanticEquivalenceVerified:false,piiUploaded:false});
}
function main(argv=process.argv.slice(2)){
  const args={};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--source'||argv[i]==='--translated'){
      if(!argv[i+1])throw Error('Missing file after '+argv[i]);
      args[argv[i].slice(2)]=argv[++i];
    }else throw Error('Usage: node tools/translation_qa.js --source ORIGINAL.txt --translated RESULT.txt');
  }
  if(!args.source||!args.translated)throw Error('Provide --source and --translated; only local files are read');
  for(const filename of [args.source,args.translated]){
    const st=fs.lstatSync(filename);
    if(!st.isFile()||st.isSymbolicLink()||st.size>MAX)throw Error('Input must be a local plain text file under 2MB');
  }
  const report=inspect(fs.readFileSync(args.source,'utf8'),fs.readFileSync(args.translated,'utf8'));
  // Do not log any original/translated content; only controlled diagnostics.
  console.log(JSON.stringify(report,null,2));
  if(!report.ok)process.exitCode=1;
}
if(require.main===module)try{main();}catch(e){console.error('LOCAL_QA_ERROR: '+e.message);process.exitCode=2;}
module.exports={inspect,occurrences,main};
