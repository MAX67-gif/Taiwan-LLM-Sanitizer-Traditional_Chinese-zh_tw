#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const names=[['__TLS_R16_ENTITIES__','src/core/entities.js'],['__TLS_R16_CORE__','src/core/protected_segments_r15.js'],['__TLS_R16_WORKBENCH__','src/core/local_workbench_r16.js']];
let html=read('tools/templates/local_workbench_r16.html');
for(const [slot,filename] of names){if(html.split(slot).length!==2)throw Error('R16_TEMPLATE_SLOT_INVALID');const src=read(filename);if(src.includes('</script>'))throw Error('R16_SCRIPT_TAG_INVALID');html=html.replace(slot,()=>src);}
const output=path.join(root,'examples/TW_Localization_Safety_Studio_R16_20261026.html');const sha=crypto.createHash('sha256').update(html,'utf8').digest('hex');
if(process.argv.includes('--check')){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw Error('R16_HTML_PARITY_FAILED');console.log('R16_STUDIO_HTML_PARITY_PASS',sha);}
else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html,'utf8');console.log('R16_STUDIO_HTML_BUILT',sha);}
