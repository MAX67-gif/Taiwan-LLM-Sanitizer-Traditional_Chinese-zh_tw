/* TLS R19 local review helpers (MIT). No DOM, storage, transport or decisions. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.TLSReviewHelpersR19=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MAX_IMPORT_BYTES=65536;
 const fail=code=>{throw new Error('TLS_R19_'+code);};

 function validText(value){
  if(typeof value!=='string')fail('INVALID_TEXT');
  for(let i=0;i<value.length;i++){
   const code=value.charCodeAt(i);
   if(code>=0xd800&&code<=0xdbff){
    const next=value.charCodeAt(++i);
    if(!(next>=0xdc00&&next<=0xdfff))fail('INVALID_TEXT');
   }else if(code>=0xdc00&&code<=0xdfff)fail('INVALID_TEXT');
  }
 }
 function validRadius(radius){if(!Number.isSafeInteger(radius)||radius<0)fail('INVALID_RADIUS');}
 function splitsPair(text,index){
  const previous=text.charCodeAt(index-1),next=text.charCodeAt(index);
  return (previous>=0xd800&&previous<=0xdbff&&next>=0xdc00&&next<=0xdfff)||
   (text[index-1]==='\r'&&text[index]==='\n');
 }

 // Engine spans remain UTF-16 offsets. Human-facing line/column and radius
 // count code points; CRLF, CR and LF each start one new logical line.
 // Context never crosses that line, and the complete matched word is retained.
 function contextExcerpt(source,start,end,radius=72){
  validText(source);validRadius(radius);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>source.length||
   splitsPair(source,start)||splitsPair(source,end)||/[\r\n]/u.test(source.slice(start,end)))fail('INVALID_SPAN');
  const prefixLines=source.slice(0,start).split(/\r\n|\r|\n/u);
  const prior=Array.from(prefixLines[prefixLines.length-1]);
  const following=Array.from(source.slice(end).split(/[\r\n]/u,1)[0]);
  return {
   before:prior.slice(Math.max(0,prior.length-radius)).join(''),
   match:source.slice(start,end),after:following.slice(0,radius).join(''),
   line:prefixLines.length,column:prior.length+1,
   leading:prior.length>radius,trailing:following.length>radius
  };
 }

 function splitCRLF(points,index){return points[index-1]==='\r'&&points[index]==='\n';}
 function excerptEnd(points,wanted){
  let end=Math.min(points.length,wanted);
  if(splitCRLF(points,end))end++;
  return end;
 }
 // Show the first actual difference even on very long lines. Each excerpt is
 // at most 2*radius+1 code points, plus two if both bounds need a complete CRLF.
 // A zero column means identical input; truncation flags describe omitted text.
 function changedLineExcerpt(before,after,radius=100){
  validText(before);validText(after);validRadius(radius);
  const oldPoints=Array.from(before),newPoints=Array.from(after);
  let difference=0;
  while(difference<oldPoints.length&&difference<newPoints.length&&oldPoints[difference]===newPoints[difference])difference++;
  const equal=difference===oldPoints.length&&difference===newPoints.length;
  let start=equal?0:Math.max(0,difference-radius);
  if(splitCRLF(oldPoints,start)||splitCRLF(newPoints,start))start--;
  const wanted=equal?2*radius+1:difference+radius+1;
  const oldEnd=excerptEnd(oldPoints,wanted),newEnd=excerptEnd(newPoints,wanted);
  return {
   before:oldPoints.slice(start,oldEnd).join(''),after:newPoints.slice(start,newEnd).join(''),
   column:equal?0:difference+1,leading:start>0,
   beforeTrailing:oldEnd<oldPoints.length,afterTrailing:newEnd<newPoints.length
  };
 }

 function coverageSummary(snapshot){
  if(!snapshot||!Array.isArray(snapshot.candidates))fail('INVALID_COVERAGE');
  const shown=snapshot.candidates.length,rawOmitted=snapshot.coverage?.omitted_candidate_count;
  const omitted=rawOmitted===undefined?0:rawOmitted;
  if(!Number.isSafeInteger(omitted)||omitted<0||!Number.isSafeInteger(shown+omitted))fail('INVALID_COVERAGE');
  return {shown,omitted,total:shown+omitted,partial:omitted>0};
 }

 // Byte validation precedes decoding so a UTF-8 BOM cannot disappear before
 // rejection. Decoding preserves original line endings and never mutates input.
 function decodeMarkdownBytes(bytes,declaredSize,maxBytes=MAX_IMPORT_BYTES){
  let view;
  if(bytes instanceof Uint8Array)view=bytes;
  else if(bytes instanceof ArrayBuffer)view=new Uint8Array(bytes);
  else fail('IMPORT_BYTES');
  if(!Number.isSafeInteger(declaredSize)||declaredSize<0||declaredSize!==view.byteLength)fail('IMPORT_SIZE');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)fail('IMPORT_LIMIT');
  if(view.byteLength>Math.min(maxBytes,MAX_IMPORT_BYTES))fail('IMPORT_LIMIT');
  if(view.byteLength===0)fail('IMPORT_EMPTY');
  if(view[0]===0xef&&view[1]===0xbb&&view[2]===0xbf)fail('IMPORT_BOM');
  let source;
  try{source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(view);}
  catch(_){fail('IMPORT_UTF8');}
  if(source.includes('\0'))fail('IMPORT_NUL');
  if(!source.trim())fail('IMPORT_EMPTY');
  return source;
 }

 return Object.freeze({contextExcerpt,changedLineExcerpt,coverageSummary,decodeMarkdownBytes});
});
