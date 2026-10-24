/* TLS R11 optional manual site glossary popup; preserves R5 permissions and config. MIT */
(() => {
'use strict';
const $=selector=>document.querySelector(selector);
const mode=$('#mode'),source=$('#source'),domain=$('#domain'),tone=$('#tone'),state=$('#state'),host=$('#host'),toggle=$('#toggle'),apply=$('#apply');
const files=['lexicon_pack.js','preferences.js','entities.js','engine.js','provider.js','web_adapter.js','progress_ui.js','user_terms_r9.js','site_glossary_r11.js','content.js'];
const visual=$('#visual'),glyph=$('#glyph');
const VISUALS={paused:['Ⅱ','已暫停'],running:['↻','正在處理'],download:['↓','正在準備模型'],
 warning:['!','部分未完成'],done:['✓','目前頁面翻譯完成'],idle:['文','等待文字']};
function setPhase(phase) {
 const key=VISUALS[phase]?phase:'idle';
 visual.dataset.phase=key;glyph.textContent=VISUALS[key][0];
 visual.setAttribute('aria-label',VISUALS[key][1]);
}
function phaseOf(s){
 if(!s||!s.running)return 'paused';
 if(s.provider?.state==='MODEL_DOWNLOAD'||s.lastState==='MODEL_DOWNLOAD')return 'download';
 if(s.busy||s.queued>0)return 'running';
 if(s.errors>0||s.overflow>0||s.provider?.state==='DEGRADED')return 'warning';
 return s.scanned>0||s.converted>0?'done':'idle';
}
let tab=null,pattern='',origin='',siteId='',enabled=false,busy=false;
function siteHash(value){
  let hash=2166136261;
  for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return 'tls_site_'+hash.toString(16);
}
function settingsKey(){return 'tls-site-config-v2:'+origin;}
function siteConfig(){return {mode:mode.value==='local-ai'?'local-ai':'terms',sourceLanguage:source.value,domain:domain.value,
  regionalPreference:document.querySelector('input[name="regionalPreference"]:checked')?.value||'balanced',
  tone:tone.value};}
function view(message){
  if(message)state.textContent=message;
  if(busy)setPhase('running');
  else if(!enabled)setPhase('paused');
  toggle.disabled=busy||!tab;
  apply.disabled=busy||!enabled||!tab;
  if(ui11)ui11.preview.disabled=busy||!enabled||!tab;
  toggle.textContent=enabled?'停用本站並還原':'啟用本站繁中化';
}
async function inject() {
  await chrome.scripting.executeScript({target:{tabId:tab.id},files});
}
async function ensureRegistration(force=false) {
  const found=await chrome.scripting.getRegisteredContentScripts({ids:[siteId]});
  const old=found[0];
  if(old && !force && JSON.stringify(old.js)===JSON.stringify(files))return;
  if(old)await chrome.scripting.unregisterContentScripts({ids:[siteId]});
  await chrome.scripting.registerContentScripts([{
    id:siteId,matches:[pattern],js:files,runAt:'document_idle',
    allFrames:false,persistAcrossSessions:true
  }]);
}
async function save() {await chrome.storage.local.set({[settingsKey()]:siteConfig()});}
async function status(){
  try{
    const response=await chrome.tabs.sendMessage(tab.id,{kind:'TLS_STATUS'});
    const s=response?.status;
    if(!s){setPhase('idle');return '本站允許，但頁面控制器尚未載入；重新整理可啟用';}
    setPhase(phaseOf(s));
    if(!s.running)return '目前已停用；重新啟用可恢復';
    const name=s.mode==='local-ai'?'Chrome 本機 AI（可降級）':'離線詞彙';
    const part='｜已修改 '+s.converted+' 處';
    const issue=s.lastReason?'｜狀態：'+s.lastReason:'';
    const prov=s.provider?.state==='MODEL_DOWNLOAD'?'｜正在下載語言模型':'';
    return name+part+issue+prov;
  }catch(_){return '本站允許；重新整理後將自動啟用';}
}
async function initialize(){
  try{
    const active=await chrome.tabs.query({active:true,currentWindow:true});
    tab=active[0];
    if(!tab?.id||!tab?.url)throw new Error('找不到一般網站分頁');
    const url=new URL(tab.url);
    if(!['http:','https:'].includes(url.protocol))throw new Error('受保護分頁無法翻譯');
    origin=url.origin;pattern=url.protocol+'//'+url.hostname+'/*';siteId=siteHash(pattern);
    host.textContent=url.hostname;
    const data=await chrome.storage.local.get(settingsKey());
    mode.value=data[settingsKey()]?.mode==='local-ai'?'local-ai':'terms';
    const wanted=data[settingsKey()]?.sourceLanguage;
    if([...source.options].some(x=>x.value===wanted))source.value=wanted;
    const savedDomain=data[settingsKey()]?.domain||'auto';
    if([...domain.options].some(x=>x.value===savedDomain))domain.value=savedDomain;
    const preferences=data[settingsKey()]||{};
    const preferred=preferences.regionalPreference||'balanced';
    const option=document.querySelector('input[name="regionalPreference"][value="'+preferred+'"]');
    if(option)option.checked=true;
    if([...tone.options].some(x=>x.value===preferences.tone))tone.value=preferences.tone;
    const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[siteId]});
    enabled=scripts.some(x=>x.matches.includes(pattern));
    if(enabled){
      setPhase('idle');
      try{await ensureRegistration();}catch(_){}
      state.textContent=await status();
    }else {state.textContent='尚未啟用本站。按「啟用本站」才請求網站權限。';setPhase('paused');}
    view();
  }catch(e){tab=null;host.textContent='此頁不可使用';view(e.message);toggle.disabled=true;apply.disabled=true;}
}
toggle.addEventListener('click',()=>{
  if(busy||!tab)return;
  busy=true;view('處理中…');
  if(!enabled) {
    // Invoke permission request directly inside user click to preserve gesture.
    chrome.permissions.request({origins:[pattern]}).then(async granted=>{
      if(!granted)throw new Error('使用者未授權本站');
      await save();await ensureRegistration(true);await inject();
      enabled=true;view(await status());
    }).catch(e=>view('啟用失敗：'+e.message)).finally(()=>{busy=false;view();});
  } else {
    (async()=>{
      try{await chrome.tabs.sendMessage(tab.id,{kind:'TLS_STOP'});}catch(_){}
      await chrome.scripting.unregisterContentScripts({ids:[siteId]});
      await chrome.permissions.remove({origins:[pattern]});
      enabled=false;view('已停用本站；其他已開啟分頁可重新整理以完全還原。');
    })().catch(e=>view('停用失敗：'+e.message)).finally(()=>{busy=false;view();});
  }
});
apply.addEventListener('click',async()=>{
  if(!enabled||busy)return;
  busy=true;view('套用設定中…');
  try{
    await save();await ensureRegistration();
    const response=await chrome.tabs.sendMessage(tab.id,{kind:'TLS_CONFIG',config:siteConfig()});
    if(!response?.ok)await inject();
    view(await status());
  }catch(e){
    try{await inject();view(await status());}
    catch(err){view('套用失敗：'+err.message);}
  }finally{busy=false;view();}
});
$('#refresh').addEventListener('click',()=>{if(tab&&enabled)status().then(view).catch(()=>{});});
const ui11={file:$('#r11-file'),preview:$('#r11-preview'),apply:$('#r11-apply'),
  restore:$('#r11-restore'),exit:$('#r11-exit'),state:$('#r11-state'),matches:$('#r11-matches')};
let review11=null,revision11=null;
function state11(message){ui11.state.textContent=message;}
function reset11(){review11=null;revision11=null;ui11.matches.replaceChildren();
 ui11.apply.disabled=true;ui11.restore.disabled=true;ui11.exit.disabled=true;}
function show11(result){
 review11=result.matches;revision11=result.revision;ui11.matches.replaceChildren();
 for(const hit of review11.slice(0,60)){
  const label=document.createElement('label');label.className='r11-item';
  const check=document.createElement('input');check.type='checkbox';check.value=hit.id;
  label.append(check,document.createTextNode(' '+hit.from+' → '+hit.to+' ['+hit.domain+']'));
  const context=document.createElement('span');context.className='r11-context';context.textContent=hit.context;
  label.appendChild(context);ui11.matches.appendChild(label);
 }
 ui11.apply.disabled=!review11.length;ui11.restore.disabled=false;ui11.exit.disabled=false;
 state11('找到 '+review11.length+' 處，未修改。逐項勾選後才能套用。'+
  (result.truncated?' 部分內容已達掃描上限。':'')+(review11.length>60?' 只顯示前 60 處。':''));
}
async function r11Send(kind,extra={}){
 if(!tab?.id||!origin||!enabled)throw new Error('請先啟用本站');
 const response=await chrome.tabs.sendMessage(tab.id,{kind,origin,...extra});
 if(!response?.ok)throw new Error(response?.reason||'頁面尚未載入，請重新整理');
 return response;
}
ui11.file.addEventListener('change',async()=>{
 const file=ui11.file.files?.[0];if(!file)return;
 try{
  if(!origin)throw Error('請開啟一般網站');
  if(file.size>65536)throw Error('詞庫檔案超過 64 KiB');
  const raw=await file.text();const entries=globalThis.TLSPersonalGlossary.importProfile(raw);
  await chrome.storage.local.set({['tls-r11-profile:'+origin]:raw});
  reset11();state11('已在本機為此網站保存 '+entries.length+' 筆個人用語；尚未掃描或修改。');
 }catch(e){state11('匯入失敗：'+String(e.message||e));}
 finally{ui11.file.value='';}
});
ui11.preview.addEventListener('click',async()=>{
 try{
  const stored=await chrome.storage.local.get('tls-r11-profile:'+origin);
  const value=stored['tls-r11-profile:'+origin];
  if(!value)throw Error('請先匯入 R9 詞庫檔案');
  const entries=globalThis.TLSPersonalGlossary.importProfile(value);
  if(!entries.length)throw Error('詞庫是空的');
  const result=await r11Send('TLS_R11_PREVIEW',{rows:entries,domain:domain.value});
  show11(result);
 }catch(e){state11('預覽失敗：'+String(e.message||e));}
});
ui11.apply.addEventListener('click',async()=>{
 try{
  if(!review11)throw Error('請先預覽');
  const selected=[...ui11.matches.querySelectorAll('input:checked')].map(x=>x.value);
  if(!selected.length)throw Error('請勾選要套用的項目');
  const result=await r11Send('TLS_R11_APPLY',{selectedIds:selected,revision:revision11});
  ui11.apply.disabled=true;
  state11('已明確套用 '+result.approvedPositions+' 處／修改 '+result.nodesChanged+' 個文字節點。可隨時還原。');
 }catch(e){state11('套用拒絕：'+String(e.message||e));}
});
ui11.restore.addEventListener('click',async()=>{
 try{const r=await r11Send('TLS_R11_RESTORE');reset11();ui11.restore.disabled=false;ui11.exit.disabled=false;
  state11('已還原 '+r.restored+' 處；網站已改動或離線節點略過 '+r.skipped+' 處。');}
 catch(e){state11('還原問題：'+String(e.message||e));}
});
ui11.exit.addEventListener('click',async()=>{
 try{const r=await r11Send('TLS_R11_EXIT');reset11();state11('已退出 R11，恢復原本翻譯；復原 '+r.restored+' 處。');}
 catch(e){state11('退出問題：'+String(e.message||e));}
});

const poll=setInterval(()=>{
 if(!busy&&tab&&enabled)status().then(message=>{if(!busy&&enabled)state.textContent=message;}).catch(()=>{});
},500);
addEventListener('unload',()=>clearInterval(poll));
initialize();
})();
