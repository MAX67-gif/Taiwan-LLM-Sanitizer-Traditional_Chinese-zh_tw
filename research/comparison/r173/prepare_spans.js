/* Locally prepare the ONLY permitted utf16 span manifest for an optional
 * installed OpenCC baseline. Does not print source or send anything out. */
'use strict';
const fs=require('node:fs');const path=require('node:path');
const B=require('./naive_baseline.js');
async function prepare(source){
 B.assertSource(source);const s=await B.inspectSource(source);
 return {schema:'tls.r173.editable-spans.v1',status:s.status,format:'markdown',offset_unit:'utf16',source_sha256:B.digest(source),source_length_utf16:source.length,
  spans:s.spans.map(x=>({id:x.id,start:x.start,end:x.end})),reason_codes:s.reason_codes||[],protected_segment_count:s.protected_count};
}
async function cli(a){
 if(a.length!==4||a[0]!=='--input'||a[2]!=='--output')throw Error('R173_REQUIRED_INPUT_AND_OUTPUT');
 const inp=path.resolve(a[1]),out=path.resolve(a[3]);if(inp===out||!fs.statSync(inp).isFile()||fs.lstatSync(inp).isSymbolicLink())throw Error('R173_INPUT_PATH');
 if(out.startsWith(path.resolve(__dirname,'../../../')+path.sep))throw Error('R173_OUTPUT_MUST_NOT_BE_IN_SOURCE_TREE');
 if(fs.existsSync(out))throw Error('R173_NO_OVERWRITE');
 const m=await prepare(fs.readFileSync(inp,'utf8'));fs.writeFileSync(out,JSON.stringify(m,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:m.status,spans:m.spans.length,transport:'NONE',private_manifest_created:true})+'\n');
}
module.exports={prepare};
if(require.main===module)cli(process.argv.slice(2)).catch(e=>{console.error('R173_PREPARE_ERROR:',e.message);process.exitCode=2});
