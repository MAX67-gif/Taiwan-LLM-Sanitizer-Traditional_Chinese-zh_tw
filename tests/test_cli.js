/* Taiwan-LLM-Sanitizer R1 local adapter regression tests. MIT License. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {markdown,jsonValues,convert,main}=require('../tools/localize_cli.js');
test('fenced code and inline code are not translated',()=>{
  const input='# 软件與服务器\n'+'~~~js\n'+'const 软件="数据库";\n'+'~~~\n'+'軟件 \x60软件\x60 https://site.example/软件\n';
  const result=markdown(input);
  assert.match(result,/軟體與伺服器/u);
  assert.match(result,/const 软件="数据库";/u);
  assert.match(result,/軟體 \x60软件\x60 https:\/\/site.example\/软件/u);
});
test('JSON identifiers and source-code fields stay unchanged',()=>{
  const data={id:'软件',text:'软件',code:'数据库',metadata:{role:'软件',description:'数据库'}};
  const next=jsonValues(data,'',true);
  assert.deepEqual(next,{id:'软件',text:'軟體',code:'数据库',metadata:{role:'软件',description:'資料庫'}});
  assert.equal(convert(JSON.stringify(data),'.json',false),JSON.stringify(data));
});
test('JSONL processes opt-in string fields but not machine keys',()=>{
  assert.deepEqual(JSON.parse(convert('{"id":"软件","text":"软件"}','.jsonl',true)),
    {id:'软件',text:'軟體'});
});
test('CLI rejects overwriting the input folder and preserves the input file',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tls-'));
  try{
    const source=path.join(tmp,'source');fs.mkdirSync(source);
    const original=path.join(source,'example.md');
    fs.writeFileSync(original,'軟件\n','utf8');
    assert.throws(()=>main(['--input',source,'--output',source]),/separate directory/u);
    assert.throws(()=>main(['--input',source,'--output',path.join(source,'child')]),/separate directory/u);
    main(['--input',source,'--output',path.join(tmp,'out')]);
    assert.equal(fs.readFileSync(original,'utf8'),'軟件\n');
    assert.equal(fs.readFileSync(path.join(tmp,'out','example.md'),'utf8'),'軟體\n');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});