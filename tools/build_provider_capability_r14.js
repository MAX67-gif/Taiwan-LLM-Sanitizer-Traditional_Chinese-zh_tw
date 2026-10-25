/* Deterministic R14 standalone offline decision lab build. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tpl=read('tools/templates/provider_capability_r14.html');
const kernel=read('src/core/provider_capability_r14.js');
if(!tpl.includes('__TLS_R14_KERNEL__')||tpl.match(/__TLS_R14_KERNEL__/g).length!==1)throw Error('R14_TEMPLATE_INVALID');
const html=tpl.replace('__TLS_R14_KERNEL__',kernel);
const out=path.join(root,'examples/TW_Provider_Capability_Lab_R14_20261025.html');
const digest=crypto.createHash('sha256').update(html,'utf8').digest('hex');
if(process.argv.includes('--check')){
 if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==html)throw Error('R14_HTML_OUT_OF_SYNC');
 console.log('R14 OFFLINE LAB PARITY PASS',digest);
}else{
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html,'utf8');
 console.log('R14 OFFLINE LAB BUILT',digest);
}
