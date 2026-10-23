/* Taiwan-LLM-Sanitizer R5 Chrome MV3: user opt-in and persisted site mode. */
(() => {
'use strict';
const $=selector=>document.querySelector(selector);
const mode=$('#mode'),source=$('#source'),domain=$('#domain'),tone=$('#tone'),state=$('#state'),host=$('#host'),toggle=$('#toggle'),apply=$('#apply');
const files=['lexicon_pack.js','preferences.js','entities.js','engine.js','provider.js','web_adapter.js','progress_ui.js','content.js'];
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
const poll=setInterval(()=>{
 if(!busy&&tab&&enabled)status().then(message=>{if(!busy&&enabled)state.textContent=message;}).catch(()=>{});
},500);
addEventListener('unload',()=>clearInterval(poll));
initialize();
})();
