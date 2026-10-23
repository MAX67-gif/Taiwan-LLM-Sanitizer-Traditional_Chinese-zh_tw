/* Taiwan-LLM-Sanitizer R3 Chrome MV3: user opt-in and persisted site mode. */
(() => {
'use strict';
const $=selector=>document.querySelector(selector);
const mode=$('#mode'),source=$('#source'),domain=$('#domain'),state=$('#state'),host=$('#host'),toggle=$('#toggle'),apply=$('#apply');
const files=['lexicon_pack.js','engine.js','provider.js','web_adapter.js','content.js'];
let tab=null,pattern='',origin='',siteId='',enabled=false,busy=false;
function siteHash(value){
  let hash=2166136261;
  for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return 'tls_site_'+hash.toString(16);
}
function settingsKey(){return 'tls-site-config-v2:'+origin;}
function siteConfig(){return {mode:mode.value==='local-ai'?'local-ai':'terms',sourceLanguage:source.value,domain:domain.value};}
function view(message){
  if(message)state.textContent=message;
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
    if(!s)return '本站允許，但頁面控制器尚未載入；重新整理可啟用';
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
    const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[siteId]});
    enabled=scripts.some(x=>x.matches.includes(pattern));
    if(enabled){
      try{await ensureRegistration();}catch(_){}
      state.textContent=await status();
    }else state.textContent='尚未啟用本站。按「啟用本站」才請求網站權限。';
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
initialize();
})();
