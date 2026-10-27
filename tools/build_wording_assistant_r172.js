#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const catalog=JSON.parse(read('lexicon/approved_r3.json'));
const overlay=JSON.parse(read('lexicon/wording_overlay_r172.json'));
if(catalog.entries.length!==67||overlay.forms.length!==9||overlay.forms.filter(x=>x.kind==='R172_CANDIDATE_ALIAS').length!==6)throw Error('R172_FIXED_CATALOG_CHANGED');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const slots=[
 ['__TLS_R172_ENTITIES__','src/core/entities.js'],
 ['__TLS_R172_CORE_R151__','src/core/protected_segments_r15.js'],
 ['__TLS_R172_R16__','src/core/local_workbench_r16.js'],
 ['__TLS_R172_ASSISTANT__','src/core/wording_assistant_r172.js'],
 ['__TLS_R172_UI__','tools/wording_assistant_r172_ui.js']];
let html=read('tools/templates/wording_assistant_r172.html');
for(const [slot,filename] of slots){const code=read(filename);if(code.toLowerCase().includes('</script'))throw Error('UNSAFE_EMBEDDED_SCRIPT:'+filename);if(html.split(slot).length!==2)throw Error('MISSING_SLOT:'+slot);html=html.replace(slot,()=>code);}
function set(slot,key,value){const text='window.'+key+'=Object.freeze('+JSON.stringify(value).replace(/</g,'\\u003c')+');';if(html.split(slot).length!==2)throw Error('MISSING_SLOT:'+slot);html=html.replace(slot,()=>text);}
set('__TLS_R172_CATALOG__','TLSWordingCatalogR172',catalog);
set('__TLS_R172_OVERLAY__','TLSWordingOverlayR172',overlay);
set('__TLS_R172_DIGESTS__','TLSWordingDigestsR172',{catalog_sha256:hash(JSON.stringify(catalog)),overlay_sha256:hash(JSON.stringify(overlay))});
const target=path.join(ROOT,'examples/TW_Wording_Assistant_R172_20261027.html');
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==html)throw Error('R172_HTML_PARITY_MISMATCH');console.log('R172_HTML_PARITY_PASS',hash(html));}
else{fs.writeFileSync(target,html,'utf8');console.log('R172_HTML_BUILT',hash(html));}
