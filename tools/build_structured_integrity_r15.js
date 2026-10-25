#!/usr/bin/env node
/* Deterministic, standalone, no-CDN R15 shadow report HTML generator. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tpl=read('tools/templates/structured_integrity_r15.html');
const kernels=[['__TLS_R15_NAMES__','src/core/entities.js'],['__TLS_R15_CORE__','src/core/protected_segments_r15.js']];
let html=tpl;
for(const [slot,file] of kernels){if(html.split(slot).length!==2)throw Error('R15_TEMPLATE_SLOT_INVALID');
 const code=read(file);if(code.includes('</script>'))throw Error('R15_SCRIPT_TAG_ESCAPE_REQUIRED');html=html.replace(slot,()=>code);}
const output=path.join(root,'examples/TW_Structured_Integrity_Lab_R15_20261025.html');
const hash=crypto.createHash('sha256').update(html,'utf8').digest('hex');
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw Error('R15_GENERATED_HTML_OUT_OF_SYNC');
 console.log('R15 OFFLINE HTML PARITY PASS',hash);
}else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');console.log('R15 OFFLINE HTML BUILT',hash);}
