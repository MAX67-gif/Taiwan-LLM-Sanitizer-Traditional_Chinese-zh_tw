# R1 發布與技術驗收紀錄｜2026-10-23

## Canonical Repo
https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw

## 1. 設計基準
原始討論第六輪 Open-Core 方案 B 與第九輪多語技術內容在地化；使用者後續明確要求**通用工具、自由選擇使用情境、Tampermonkey 只是其中一個介面**。此要求優先於早期單網站示例。

## 2. 已確認交付
- MIT LICENSE + Open-Core 政策與貢獻授權邊界。
- 共用 JS 核心及 Chrome MV3／單檔 Userscript 原型。
- Node.js CLI 處理 Markdown/TXT 與 opt-in JSON/JSONL 字串，具安全保護。
- GitHub Actions CI、build.py、離線測試、公開文件及 README。
- GitHub Actions 可核對的成功結果：https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/39979980766

## 3. 證據與邊界
CI 顯示成功是**單元測試與打包流程的證據**，不是 Chrome Web Store 商店核准或所有真實網站的功能覆蓋證據。可選的 Chromium／Tampermonkey GM stub 測試亦不是正式商店／全網相容認證。

R1 只作離線詞彙級在地化，沒有通用大語言模型 Provider、完整 OCR、閉源網站語言資源轉換或無損翻譯保證。任何第三方網站、文件及資料集必須尊重合法授權與可存取範圍。

## 4. 下一階段 R2（研發規劃，非已實作）
1. **通用 Provider 契約**：優先研究支援 zh-Hant 的本機 Translator Provider，保留離線規則回退；可插拔並禁止資料外傳預設。
2. **語法安全與用戶體驗**：Markup／Prompt／JSON 保護、差異預覽、即時回復、自訂詞庫、語境衝突確認。
3. **跨介面共用能力**：Chrome／Userscript／CLI 相同術語資料，逐步加入可用 SDK、更多文件讀寫。
4. **實際相容性與效能證據**：普通網頁、SPA、公開文件、動態更新與權限失敗，包含人類驗收；不可杜撰語言覆蓋率。
5. **OSS 維護流程**：公共 Issues、PR review、release/checksum、可重現 CI，累積真實採用證據準備 Codex for OSS。

## 5. 驗收原則
不得更改已公開 MIT 使用者權利；新商業模組與使用者資料隔離。每版同步更新版本、README、手冊、CI、打包與回歸。避免將「規劃」當作「實作」，無資料時標示 UNKNOWN。
