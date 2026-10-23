'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {stateOf,VERSION}=require('../src/core/progress_ui.js');
test('R5 visual status has honest idle/running/done/warning/download/paused',()=>{
 assert.equal(VERSION,'0.4.0');
 assert.equal(stateOf(null),'paused');
 assert.equal(stateOf({running:false,converted:20}),'paused');
 assert.equal(stateOf({running:true,queued:4,busy:true}),'running');
 assert.equal(stateOf({running:true,queued:0,busy:false,converted:5}),'done');
 assert.equal(stateOf({running:true,busy:false,errors:1,converted:5}),'warning');
 assert.equal(stateOf({running:true,busy:true,provider:{state:'MODEL_DOWNLOAD'}}),'download');
 assert.equal(stateOf({running:true,busy:false,scanned:0,converted:0}),'idle');
});
