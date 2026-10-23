# R2 階段接續：目標／限制／完成／下一步

## 目前目標
把 R1「字詞校正原型」升級為可選用 Chrome 本機 AI 全句翻譯的通用 Provider 平台。瀏覽器、CLI、文件、Prompt 等輸入輸出適配器互相獨立，不以任何網站或 Tampermonkey 綁架產品方向。

## 已確認限制
R1 MIT/Open-Core 的公開授權不可追溯縮限。現在沒有外部 AI API key、遠端傳文、使用者資料庫、對特定網站合作授權；Chrome 模型能力需實際檢測，不能冒稱 100% 全網翻譯。CLI 仍只有離線詞彙。原有 R1 GitHub 文件/Commit 永久保留供溯源。

## 已完成（須以最新 CI 驗證）
新本機 Provider + 保護 token、來源語言處理、cache、失敗 circuit breaker；可還原的非同步 DOM 轉接器；Chrome MV3 逐站設定；Tampermonkey 單檔控制；打包與 CI／Chromium 回歸測試。歷史 R1 漏譯 aria-label 缺陷已修正。

## 下一步
1. 用真實桌面 Chrome 支援語言模型對不同來源做人工驗收，建立能力矩陣與誤譯/延遲樣本。
2. 語意級段落合併與技術文件結構 parser（Markdown/HTML/JSON schema/Prompt 保真）。
3. 客製詞庫與差異預覽、單頁翻譯進度與取消 UX。
4. 選配其他合法翻譯 Provider，清楚區分本機資料與需外傳之資料，不可默認雲端。
5. 透過版本、CI、真實公開 Issues／PR 累積 Codex OSS 申請證據。

**唯一優先行動：先以 CI 和使用者可重現的 Chrome 本機模型測試反證「能翻譯」這個核心主張，而不是繼續無證據堆功能。**
