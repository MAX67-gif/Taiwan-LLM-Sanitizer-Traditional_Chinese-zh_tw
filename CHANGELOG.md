# CHANGELOG — Taiwan-LLM-Sanitizer

## R3 · 2026-10-24 · Preview 0.3.0

- 新增 883 筆跨 16 領域的編輯候選（`suggestion_only`，待人工審核），67 筆小型啟用種子；沒有任何地區用詞審查或「禁用詞」。
- `src/core/lexicon_pack.js` 提供有限的語境/領域路由、長詞優先、英文單詞邊界與用語候選說明；對 menu/菜单 在 UI 與餐飲之間保守區分。
- Chrome／Tampermonkey 共用新詞庫，沿用 R2 Provider 與回復機制；CLI 增加 `--domain` 明確選擇。
- 加入大型詞庫驗證、上下文回歸、R3 Chromium navigation/food 案例、詞庫資料與編譯檔一致性檢查。
- 產品與市場競品研究、零隱私蒐集契約、Overlay 產品規格與下一步里程碑；**Overlay 尚未完成，不作已發布宣稱**。
- MIT／Open-Core 授權保持不變；R1/R2 歷史完整保留。候選詞資料不能拿來宣稱已經官方驗證，也未複製第三方受限辭典。


## R2 · 2026-10-23 · Preview 0.2.0

- 新增 `src/core/provider.js`：可插拔 BrowserLocalProvider、Chrome Translator API 可用性檢測、下載狀態、來源語言選擇、詞彙 fallback、session cache、連續失敗降級。
- 新增 `src/core/web_adapter.js`：支援 async Provider 的 DOM 更新、MutationObserver、修改原文還原、停用後舊請求不得覆寫網站新內容。
- Chrome MV3 Popup 新增詞彙／本機 AI 模式、來源語言、持續逐站設定；預設不請求所有網站，儲存設定但不向外部翻譯 API 傳頁面內容。
- Tampermonkey 仍為**一個完全自含單檔**，增加本機翻譯模式與來源語言控制；不依賴 CDN、第二段驅動碼。
- 既有 Node CLI 與原 `TLSCore.createLocalizer` 相容保留。
- Node unit tests + 真實 Chromium／Userscript stub regression + reproducible ZIP/checksums/Actions artifact。
- 修復動態 DOM 某些元素因沒有 `title` 而跳過 `aria-label` 的漏譯缺陷。
- 仍為 Preview，模型環境差異、語意保真及全網覆蓋未獲得廣泛用戶驗證。

## R1 · 2026-10-23 · Prototype 0.1.0

**專案定位：通用臺灣繁體中文在地化平台**，不限定任何特定網站、遊戲或 Tampermonkey。

### 新增
- 正式 R1 基準規格；第六輪 Open-Core MIT 授權政策與第九輪多語內容在地化方向整合。
- `src/core/engine.js` 共用的保守離線術語與簡短 UI 字詞引擎。
- Chrome Manifest V3：使用者逐站授權、動態 DOM、可停用還原。
- Tampermonkey：完全單檔、自行啟用／停用、暫停與還原。
- 本機 Node.js CLI：Markdown、TXT、JSON／JSONL 安全字詞轉換原型；機器識別欄位保護及不覆寫來源。
- `tools/build.py` 可重建 Chrome + Userscript 交付檔；Node CI 與可選 Chromium 測試。
- Privacy、Security、Contributing、Open-Core、通用 Adapter、Codex OSS 準備文件。

### 限制與未完成
- R1 不是任意語言全篇 AI 翻譯器，只有部分已知 UI 和臺灣技術詞彙。
- 不含 Canvas／WebGL、OCR、PDF/Office、Chrome Web Store 正式上架、通用 SDK、完整 Prompt Tuner。
- 無第三方採用或 OpenAI 贊助核准證據。不得從 CI 通過推導所有網站相容。

### 授權
本 Repo 既有原創程式與文件依 MIT 釋出；未來獨立商業模組須另列授權，不對已有 MIT 授權加限制。
