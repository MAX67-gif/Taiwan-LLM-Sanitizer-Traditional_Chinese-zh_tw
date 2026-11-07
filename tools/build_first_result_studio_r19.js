#!/usr/bin/env node
/* Original R19 context review built from byte-locked R17.2 existing core. */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const catalog=JSON.parse(read('lexicon/approved_r3.json'));
const overlay=JSON.parse(read('lexicon/wording_overlay_r172.json'));
if(catalog.entries.length!==67||overlay.forms.length!==9||overlay.forms.filter(x=>x.kind==='R172_CANDIDATE_ALIAS').length!==6)throw Error('R19_FROZEN_WORDING_SOURCE_CHANGED');
const files=[
 ['__TLS_R18_ENTITIES__','src/core/entities.js'],
 ['__TLS_R18_CORE_R151__','src/core/protected_segments_r15.js'],
 ['__TLS_R18_R16__','src/core/local_workbench_r16.js'],
 ['__TLS_R18_ASSISTANT__','src/core/wording_assistant_r172.js'],
 ['__TLS_R19_HELPERS__','src/r19/review_helpers_r19.js'],
 ['__TLS_R19_UI__','src/r19/first_result_studio_r19.js']
];
let html=read('tools/templates/first_result_studio_r19.html');
function embed(key,value){const matches=html.split(key).length-1;if(matches!==1)throw Error('R19_SLOT_MISSING_OR_DUPLICATED:'+key);html=html.replace(key,()=>value);}
for(const [slot,p] of files){const script=read(p);if(script.toLowerCase().includes('</script'))throw Error('R19_SCRIPT_BREAKOUT:'+p);embed(slot,script);}
const inject=(slot,key,value)=>embed(slot,'window.'+key+'=Object.freeze('+JSON.stringify(value).replace(/</g,'\\u003c')+');');
inject('__TLS_R18_CATALOG__','TLSWordingCatalogR172',catalog);
inject('__TLS_R18_OVERLAY__','TLSWordingOverlayR172',overlay);
inject('__TLS_R18_DIGESTS__','TLSWordingDigestsR172',{catalog_sha256:sha(JSON.stringify(catalog)),overlay_sha256:sha(JSON.stringify(overlay))});
inject('__TLS_R18_SAMPLE__','TLSR18OriginalSample',read('docs/showcase/source.md'));
const target=path.join(root,'examples/TW_First_Result_Studio_R19_20261101.html');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==html)throw Error('R19_STUDIO_BUILD_MISMATCH');
 console.log('R19_STUDIO_BYTE_PARITY_PASS',sha(html),'bytes',Buffer.byteLength(html));
}else{fs.writeFileSync(target,html,'utf8');console.log('R19_STUDIO_BUILT',sha(html),'bytes',Buffer.byteLength(html));}
