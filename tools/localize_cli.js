#!/usr/bin/env node
/* Taiwan-LLM-Sanitizer R1: local batch adapter using the shared MIT engine. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/core/engine.js');
const allowed = new Set(['.md', '.markdown', '.txt', '.text', '.json', '.jsonl']);
const machineFields = new Set([
  'id','key','type','role','path','url','uri','href','src','mime_type',
  'schema','$schema','pattern','regex','code','source_code','script',
  'function','function_name','model','locale','language','sha','hash',
  'checksum','signature','token','api_key'
]);
const MAX_BYTES = 2 * 1024 * 1024;
function argsOf(argv) {
  const opts = {input:null, output:null, jsonStrings:false, dryRun:false};
  for (let i=0; i<argv.length; i++) {
    const a=argv[i];
    if (a==='--input' || a==='--output') {
      if (!argv[i+1]) throw new Error('Missing value for '+a);
      opts[a.slice(2)] = argv[++i];
    } else if (a==='--json-strings') opts.jsonStrings=true;
    else if (a==='--dry-run') opts.dryRun=true;
    else if (a==='--help' || a==='-h') opts.help=true;
    else throw new Error('Unknown option: '+a);
  }
  if (!opts.help && (!opts.input || !opts.output))
    throw new Error('Usage: node tools/localize_cli.js --input FILE_OR_DIR --output NEW_DIR [--json-strings] [--dry-run]');
  return opts;
}
function markdown(text) {
  let fence = null, frontMatter = false;
  return text.split(/(\r\n|\n|\r)/u).map((line,i,parts) => {
    if (i%2) return line;
    if (i===0 && line.trim()==='---') {frontMatter=true;return line;}
    if (frontMatter) {
      if (line.trim()==='---' || line.trim()==='...') frontMatter=false;
      return line;
    }
    const m=line.match(/^ {0,3}(\x60{3,}|~{3,})/u);
    if (m) {
      if (!fence) fence={char:m[1][0],len:m[1].length};
      else if(m[1][0]===fence.char && m[1].length>=fence.len &&
        line.trim().replace(/^[\x60~]+/u,'').trim()==='') fence=null;
      return line;
    }
    return fence ? line : core.translateText(line);
  }).join('');
}
function jsonValues(value, key='', enabled=false) {
  if (!enabled) return value;
  if (Array.isArray(value)) return value.map(x=>jsonValues(x,key,true));
  if(value && typeof value==='object') {
    const result={};
    for(const [name, item] of Object.entries(value))
      result[name]=machineFields.has(name.toLowerCase())?item:jsonValues(item,name,true);
    return result;
  }
  return typeof value==='string' && !machineFields.has(key.toLowerCase())
    ?core.translateText(value):value;
}
function convert(source,ext,jsonStrings=false) {
  if(ext==='.md'||ext==='.markdown') return markdown(source);
  if(ext==='.json') return jsonStrings
    ?JSON.stringify(jsonValues(JSON.parse(source),'',true),null,2)+'\n':source;
  if(ext==='.jsonl') return jsonStrings
    ?source.split(/\r?\n/u).map(x=>x.trim()?JSON.stringify(jsonValues(JSON.parse(x),'',true)):x).join('\n')
    :source;
  return source.split(/(\r\n|\n|\r)/u).map((s,i)=>i%2?s:core.translateText(s)).join('');
}
function gather(filename,base,acc=[]) {
  const st=fs.lstatSync(filename);
  if(st.isSymbolicLink()) return acc;
  if(st.isFile()){
    if(allowed.has(path.extname(filename).toLowerCase()))
      acc.push({filename,relative:path.relative(base,filename)});
    return acc;
  }
  for(const name of fs.readdirSync(filename)){
    if(['.git','node_modules','.venv','__pycache__','dist'].includes(name)) continue;
    gather(path.join(filename,name),base,acc);
  }
  return acc;
}
function main(argv=process.argv.slice(2)){
  const opts=argsOf(argv);
  if(opts.help){ console.log('node tools/localize_cli.js --input PATH --output DIRECTORY [--json-strings] [--dry-run]');return;}
  const input=path.resolve(opts.input), output=path.resolve(opts.output);
  if(!fs.existsSync(input)||fs.lstatSync(input).isSymbolicLink())
    throw new Error('Input missing or symlink is not accepted');
  const st=fs.statSync(input);
  const base=st.isDirectory()?input:path.dirname(input);
  if(output===base || output===input || (st.isDirectory()&&output.startsWith(base+path.sep)))
    throw new Error('Output must be a separate directory outside the source');
  let changed=0,unchanged=0,skipped=0;
  for(const entry of gather(input,base)){
    if(fs.statSync(entry.filename).size>MAX_BYTES){skipped++;continue;}
    const source=fs.readFileSync(entry.filename,'utf8');
    if(source.includes('\u0000')){skipped++;continue;}
    let target;
    try {target=convert(source,path.extname(entry.filename).toLowerCase(),opts.jsonStrings);}
    catch(err){skipped++;console.error('Skipped invalid file: '+entry.relative);continue;}
    if(target===source) unchanged++;else changed++;
    if(!opts.dryRun){
      const outfile=path.resolve(output,entry.relative);
      if(!outfile.startsWith(output+path.sep)) throw new Error('Unsafe output path');
      fs.mkdirSync(path.dirname(outfile),{recursive:true});
      fs.writeFileSync(outfile,target,'utf8');
    }
  }
  console.log(JSON.stringify({core_version:core.VERSION,processed:changed+unchanged,changed,unchanged,skipped,dryRun:opts.dryRun,jsonStrings:opts.jsonStrings}));
}
if(require.main===module){try{main();}catch(err){console.error(err.message);process.exitCode=1;}}
module.exports={argsOf,markdown,jsonValues,convert,main};
