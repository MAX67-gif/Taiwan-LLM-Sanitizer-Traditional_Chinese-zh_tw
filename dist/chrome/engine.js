/* Taiwan-LLM-Sanitizer R3 shared browser core: offline rules, no network. MIT. */
(function (global) {
  'use strict';
  const VERSION = '0.3.0';
  if (global.TLSCore && global.TLSCore.VERSION === VERSION) return;
  const LEXICON = global.TLSLexicon || (
    typeof module !== 'undefined' && module.exports ? require('./lexicon_pack.js') : null
  );
  const ENGLISH_LABELS = Object.freeze({
    'start':'開始','pause':'暫停','resume':'繼續','retry':'重試',
    'settings':'設定','options':'選項','save':'儲存','cancel':'取消',
    'close':'關閉','back':'返回','next':'下一步','continue':'繼續',
    'loading':'載入中','loading...':'載入中…','help':'說明',
    'language':'語言','search':'搜尋','download':'下載','upload':'上傳',
    'submit':'送出','confirm':'確認','reset':'重設','edit':'編輯',
    'delete':'刪除','copy':'複製','share':'分享','home':'首頁',
    'account':'帳戶','profile':'個人檔案','notifications':'通知',
    'about':'關於','read more':'閱讀更多','sign in':'登入',
    'sign out':'登出','log in':'登入','log out':'登出',
    'privacy policy':'隱私權政策','terms of service':'服務條款',
    'contact us':'聯絡我們'
  });
  const CHINESE_TERMS = [
    ['数据库','資料庫'],['數據庫','資料庫'],
    ['数据集','資料集'],['服务器','伺服器'],['服務器','伺服器'],
    ['软件','軟體'],['軟件','軟體'],['硬件','硬體'],
    ['网络','網路'],['網絡','網路'],['鼠标','滑鼠'],
    ['內存','記憶體'],['内存','記憶體'],
    ['緩存','快取'],['缓存','快取'],
    ['配置文件','設定檔'],['配置檔案','設定檔'],
    ['代碼倉庫','程式碼儲存庫'],['代码仓库','程式碼儲存庫'],
    ['源代碼','原始碼'],['源代码','原始碼']
  ].sort((a,b) => b[0].length-a[0].length);
  const PROTECT = /(\{\{[^{}]*\}\}|\x24\{[^}]*\}|\x60[^\x60]*\x60|https?:\/\/[^\s<>]+|%\d*\$?[sd])/g;
  const SKIP = 'script,style,noscript,textarea,select,option,pre,code,kbd,samp,svg,canvas,math,template,[contenteditable],[translate="no"],[data-no-translate],[data-tls-ui],.monaco-editor,.cm-editor';
  const ATTRS = ['title','aria-label','alt'];

  function translateSegment(text, options={}) {
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m) return text;
    const exact = ENGLISH_LABELS[m[2].toLocaleLowerCase('en-US')];
    if (exact) return m[1] + exact + m[3];
    let result = LEXICON ? LEXICON.normalize(text,options).text : text;
    for (const pair of CHINESE_TERMS) result = result.split(pair[0]).join(pair[1]);
    return result;
  }
  function translateText(text, options={}) {
    if (typeof text !== 'string' || !text || text.length > 20000) return text;
    let out = '', at = 0;
    PROTECT.lastIndex = 0;
    for (const match of text.matchAll(PROTECT)) {
      out += translateSegment(text.slice(at, match.index),options) + match[0];
      at = match.index + match[0].length;
    }
    return out + translateSegment(text.slice(at),options);
  }
  function blocked(el) {
    if (!el || el.nodeType !== 1) return true;
    try { return !!el.closest(SKIP) || !!el.isContentEditable; }
    catch (_) { return true; }
  }
  function createLocalizer(doc) {
    if (!doc || !doc.documentElement || typeof doc.createTreeWalker !== 'function')
      throw new TypeError('Browser Document is required');
    const texts = new Map(), attrs = new Map(), pending = new Set();
    let running = false, observer = null, timer = null, changed = 0;
    function updateText(node) {
      if (!node.parentElement || blocked(node.parentElement)) return;
      const before = node.data;
      const old = texts.get(node);
      if (old && before === old.after) return;
      const after = translateText(before);
      if (after !== before) {
        texts.set(node, {before, after});
        node.data = after;
        changed++;
      } else if (old) texts.delete(node);
    }
    function updateAttrs(el) {
      if (blocked(el)) return;
      for (const name of ATTRS) {
        if (!el.hasAttribute(name)) continue;
        const before = el.getAttribute(name);
        const record = attrs.get(el);
        const old = record && record[name];
        if (old && before === old.after) continue;
        const after = translateText(before);
        if (after !== before) {
          const map = record || {};
          map[name] = {before, after};
          attrs.set(el, map);
          el.setAttribute(name, after);
          changed++;
        } else if (old) {
          delete record[name];
          if (!Object.keys(record).length) attrs.delete(el);
        }
      }
    }
    function scan(root) {
      if (!root) return;
      if (root.nodeType === 3) { updateText(root); return; }
      if (![1,9,11].includes(root.nodeType)) return;
      if (root.nodeType === 1 && blocked(root)) return;
      if (root.nodeType === 1) updateAttrs(root);
      const walker = doc.createTreeWalker(root, 5);
      let node, visited = 0;
      while ((node = walker.nextNode()) && visited++ < 30000) {
        if (node.nodeType === 3) updateText(node);
        else if (node.nodeType === 1) updateAttrs(node);
      }
    }
    function drain() {
      timer = null;
      if (!running) { pending.clear(); return; }
      let i = 0;
      for (const node of pending) {
        pending.delete(node);
        scan(node);
        if (++i >= 12) break;
      }
      if (texts.size > 5000) for (const n of texts.keys()) if (!n.isConnected) texts.delete(n);
      if (attrs.size > 2000) for (const n of attrs.keys()) if (!n.isConnected) attrs.delete(n);
      if (pending.size) timer = setTimeout(drain, 30);
    }
    function schedule(node) {
      if (!running) return;
      pending.add(node);
      if (timer === null) timer = setTimeout(drain, 0);
    }
    function start() {
      if (running) return;
      running = true;
      observer = new MutationObserver(changes => {
        for (const change of changes) {
          if (change.type === 'childList') {
            for (const node of change.addedNodes) schedule(node);
          } else schedule(change.target);
        }
      });
      observer.observe(doc.documentElement, {
        subtree:true, childList:true, characterData:true,
        attributes:true, attributeFilter:ATTRS
      });
      schedule(doc.documentElement);
    }
    function stop() {
      running = false;
      if (observer) observer.disconnect();
      observer = null;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending.clear();
      for (const [node, record] of texts) {
        if (node.isConnected && node.data === record.after) node.data = record.before;
      }
      for (const [el, records] of attrs) {
        if (!el.isConnected) continue;
        for (const [name, record] of Object.entries(records)) {
          if (el.getAttribute(name) === record.after) el.setAttribute(name, record.before);
        }
      }
      texts.clear(); attrs.clear();
    }
    return Object.freeze({
      start, stop, pause:stop, resume:start,
      isRunning:() => running,
      getStatus:() => ({version:VERSION,running,changed,trackedText:texts.size}),
      translateText
    });
  }
  const api = Object.freeze({VERSION, translateText, createLocalizer});
  global.TLSCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
