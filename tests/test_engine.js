'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {translateText,VERSION}=require('../src/core/engine.js');
test('version of shared offline engine',()=>assert.equal(VERSION,'0.4.0'));
test('Taiwan terminology translation',()=>{
  assert.equal(translateText('安装软件到服务器和数据库'),'安装軟體到伺服器和資料庫');
  assert.equal(translateText('網絡與內存緩存'),'網路與記憶體快取');
});
test('generic UI words match exact labels, not arbitrary English prose',()=>{
  assert.equal(translateText('  Search  '),'  搜尋  ');
  assert.equal(translateText('A search manual'),'A search manual');
  assert.equal(translateText('Download'),'下載');
});
test('preserves URLs, placeholder variables and inline code',()=>{
  const dollar=String.fromCharCode(36),tick=String.fromCharCode(96);
  const input='{{软件}}、'+dollar+'{网络}、'+tick+'软件'+tick+'、https://example.org/软件';
  assert.equal(translateText(input),input);
  assert.equal(translateText('软件 %s 服务器'),'軟體 %s 伺服器');
});
test('safe for non-string and long payload',()=>{
  assert.equal(translateText(undefined),undefined);
  const large='软件'.repeat(20000);
  assert.equal(translateText(large),large);
});
