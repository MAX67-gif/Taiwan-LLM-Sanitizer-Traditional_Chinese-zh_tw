#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),parts=[['__TLS_R17_SHA_CORE__','src/core/protected_segments_r15.js'],['__TLS_R17_DTG_CORE__','src/core/document_trust_graph_r17.js']];
let html=fs.readFileSync(path.join(ROOT,'tools/templates/document_trust_graph_r17.html'),'utf8');
for(const [marker,file] of parts){if(html.split(marker).length!==2)throw Error('TLS_R17_BAD_TEMPLATE_SLOT');const data=fs.readFileSync(path.join(ROOT,file),'utf8');if(data.includes('</script>'))throw Error('TLS_R17_SCRIPT_BREAKOUT');html=html.replace(marker,()=>data)}
const out=path.join(ROOT,'examples/TW_Document_Trust_Graph_R17_20261026.html'),sha=crypto.createHash('sha256').update(html).digest('hex');
if(process.argv.includes('--check')){if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==html)throw Error('TLS_R17_HTML_PARITY_MISMATCH');console.log('R17_HTML_PARITY_PASS',sha)}
else{fs.writeFileSync(out,html,'utf8');console.log('R17_HTML_CREATED',sha)}
