#!/usr/bin/env node
/* Deterministic, standalone, no-CDN R15 shadow report HTML generator. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tpl=read('tools/templates/structured_integrity_r15.html');
// Historic 0.1.0 is immutable; never silently rebuild it with newer R15.1 logic.
const frozen=read('tests/fixtures/r15/R15_0_1_0_LOCKED_CORE.js');
const frozenSha=crypto.createHash('sha256').update(frozen,'utf8').digest('hex');
if(frozenSha!=='ab8683a6f2c491b55b894b90cf16fd7d3d209977cb5f06632f955f87c06ebf7d')throw Error('R15_0_1_0_FROZEN_KERNEL_TAMPERED');
const kernels=[['__TLS_R15_NAMES__','src/core/entities.js'],['__TLS_R15_CORE__','tests/fixtures/r15/R15_0_1_0_LOCKED_CORE.js']];
let html=tpl;
for(const [slot,file] of kernels){if(html.split(slot).length!==2)throw Error('R15_TEMPLATE_SLOT_INVALID');
 const code=read(file);if(code.includes('</script>'))throw Error('R15_SCRIPT_TAG_ESCAPE_REQUIRED');html=html.replace(slot,()=>code);}
const output=path.join(root,'examples/TW_Structured_Integrity_Lab_R15_20261025.html');
const hash=crypto.createHash('sha256').update(html,'utf8').digest('hex');
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw Error('R15_GENERATED_HTML_OUT_OF_SYNC');
 console.log('R15 OFFLINE HTML PARITY PASS',hash);
}else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');console.log('R15 OFFLINE HTML BUILT',hash);}
