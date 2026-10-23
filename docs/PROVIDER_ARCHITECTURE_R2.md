# R2｜通用 Provider 設計與安全契約（2026-10-23）

## 正式定位

Taiwan-LLM-Sanitizer 是**通用臺灣繁體中文在地化平台**；網頁、CLI、文件、Prompt、SDK 等都是 Adapter。Tampermonkey 是其中一個使用介面，**不是產品主體**。任何特定網站或遊戲都不是必要前提或限制。R1 基準及 MIT/Open-Core 決策完整保留。

## R2 已有功能與證據邊界

- 共用 \`src/core/engine.js\` 原本的離線詞彙校正，保留舊 \`TLSCore.createLocalizer\` 和既有 Node CLI。
- 新增 \`src/core/provider.js\`：\`createRouter\` 可選 \`terms\` 或 \`local-ai\`；後者經 \`Translator.availability\`、\`Translator.create\`、\`Translator.translate\` 使用 Chrome 本機模型（**依實際暴露的 API 功能決定**）。
- 新增 \`src/core/web_adapter.js\`：只翻譯普通 DOM 文字及 title／aria-label／alt，跳過 script、style、pre、code、textarea、input、contenteditable、translate=no 等；網站在翻譯中改動文字與使用者 stop 會阻擋過期結果覆寫。
- Chrome 使用者於 popup 選模式、來源語言與逐站啟用。Tampermonkey 保持單一 \`.user.js\` 並由工具選單/小面板切換。
- 維持離線與沒有自有雲端文字傳輸。Chrome 下載語言模型由瀏覽器本身管理，並非我們傳送頁面給雲端翻譯 API。
- mock Chrome Translator 的 Node + Chromium 整合測試能證明路由與回滾流程，**不能替代實際使用者環境的 Chrome 語言模型翻譯品質測試**。

## 源語言與路由

- Chrome 官方 Translator API 目標使用 \`zh-Hant\`，不以不存在的專有代碼亂猜。
- 使用者可選 \`en/ja/ko/zh/fr/de/es/ru/...\`，預設 auto；auto 優先使用網頁 \`lang\` 標籤、明確文字腳本訊號，若 Chrome LanguageDetector available 且信心度足夠才使用。無把握回傳 \`SOURCE_UNKNOWN\` 並保留原文或詞彙校正。
- \`TERMS\` → 少量已知詞彙；\`LOCALIZED_MODEL\` → 本機模型翻譯並附臺灣字詞校正；\`PROTECTED\` → 禁止修改；\`GUARD_REJECTED\` → 原文保護驗證失敗、拒絕模型結果；\`UNSUPPORTED_PROVIDER\` → 模型不可用，安全降級；\`DEFERRED\` → 取得模型中；\`STOPPED\` → 取消既有回傳並還原仍受控內容。
- 連續模型失敗 3 次啟動 circuit breaker，避免在同一分頁無窮重試；每個 model instance 於控制器銷毀時釋放，cache 最多 512 條。

## 保護機制與風險

- 模型前把 URL、模板佔位符、部分格式化參數、行內程式碼與 HTML 標記換成暫存 token；翻譯後必須逐一驗證保留，失敗時只能做保守詞彙 fallback，不得直接使用受損譯文。
- 這是文字層的**部分結構保護**，不是完整 Markdown/JSON/Python AST parser，不能保證所有嵌套、程式片段、指令階層、prompt-injection 相關語意完全保真。
- 修改 DOM 使用文字節點及 attribute set，不使用 innerHTML，也不讀寫站方程式變數、網路封包、互動輸入或跨來源 iframe。
- 避免在密碼、個資、醫療及金融敏感頁面使用實驗性模型；其隱私/法規風險應由逐站授權與清楚 UI 警語控制。

## 對外明示的未完成項目

**不宣稱**已能 OCR、Canvas/WebGL、PDF、圖片文字、封閉 Shadow DOM、Firefox 全功能翻譯、Chrome 商店審核、各種頁面 layout 保真，或已成為 OpenAI Codex OSS 受贊助專案。其他 Adapter／外部 Provider 需另有安全授權/費用/測試，預設不得送頁面至雲端。

## 官方資料

- https://developer.chrome.com/docs/ai/translator-api
- https://developer.chrome.com/docs/ai/get-started
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure
