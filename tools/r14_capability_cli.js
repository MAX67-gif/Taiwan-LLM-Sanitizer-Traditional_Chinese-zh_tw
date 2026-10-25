#!/usr/bin/env node
/* R14 offline capability decision CLI; never sends any requests or echoes user content. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {evaluateProviderCapability}=require('../src/core/provider_capability_r14.js');
function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--input'){
  process.stderr.write('Usage: node tools/r14_capability_cli.js --input <local-json-file>\n');
  process.exitCode=2;return;
 }
 try{
  const f=path.resolve(args[1]);const stat=fs.lstatSync(f);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('INVALID_LOCAL_INPUT_FILE');
  const data=JSON.parse(fs.readFileSync(f,'utf8'));
  const result=evaluateProviderCapability(data);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.decision==='INVALID_INPUT')process.exitCode=1;
 }catch(e){process.stderr.write('TLS_R14_INPUT_REJECTED\n');process.exitCode=1;}
}
main();
