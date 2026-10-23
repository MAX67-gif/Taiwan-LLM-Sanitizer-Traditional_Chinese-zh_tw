/* R3 CLI preference boundary regression */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {argsOf,convert}=require('../tools/localize_cli.js');
test('CLI parses explicit wording preference and retains balanced default',()=>{
 assert.equal(argsOf(['--input','in','--output','out']).regionalPreference,'balanced');
 assert.equal(argsOf(['--input','in','--output','out','--regional-preference','original']).regionalPreference,'original');
 assert.throws(()=>argsOf(['--input','in','--output','out','--regional-preference','anything']),/Invalid regional preference/u);
});
test('CLI never silently normalizes when reader wants original region terms',()=>{
 assert.equal(convert('菜单和软件','.txt',false,'ui','original'),'菜单和软件');
 assert.equal(convert('菜单和软件','.txt',false,'ui','balanced'),'選單和軟體');
});
test('CLI Markdown code blocks remain untouched in strongly Taiwan-focused context',()=>{
 const input=['~~~js','const 菜单="软件";','~~~','菜单'].join('\n');
 const output=convert(input,'.md',false,'ui','taiwan');
 assert.ok(output.includes('const 菜单="软件";'));
 assert.ok(output.endsWith('選單'));
});
