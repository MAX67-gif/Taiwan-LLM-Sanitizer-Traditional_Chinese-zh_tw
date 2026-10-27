# R17.2 臺灣用語修稿助手（有限 Preview）

**用途：**對自己已寫好的中文 Markdown 提出有限、需逐項確認的臺灣用詞建議。原文不會自動變更，沒有模型或網路請求。只支援 Markdown 模式下的散文區域；普通文字可以貼入但仍依 Markdown 保守掃描。

## 怎麼用

1. 到 [GitHub 最新正式 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest) 下載獨立 `TW_Wording_Assistant_R172_20261027.html` 或完整 Suite。將 HTML 存在自己電腦、以瀏覽器開啟。不要直接在 GitHub `blob` 頁面期待編輯。
2. 貼入有權處理的中文／Markdown，或按「載入原創範例」，或選取 `.md`／`.txt` 檔。
3. 按「尋找臺灣用語建議」，逐處看實際候選及其語境。**全部預設未選；沒有候選不等於原文已正確。**
4. 每個位置單獨選「採用某候選」或「保留這一處原文」。不同位置的同一個詞可以做不同決定。滑鼠操作 `click` 可選「點選」，但統計與聲響保留原義；UI menu/餐飲 menu 分開。
5. 按「產生安全差異預覽」：新段落會經 R16/R15.1 確認來源 SHA、位置與保護範圍。失敗則不開放下載；成功後用「複製新稿」或「下載新稿」另存 `.md`。
6. 修改原文會撤銷舊 session 和預覽；清除會清掉當頁的原文、候選與結果。預覽新稿包含你提供的全文，應自行保管。

## 邊界

- **最大 64 KiB UTF-8**，最多 120 個可操作候選；未覆蓋數量會顯示，不能視為全文完成。單一可編輯片段若超過 R15.1 的 1,000 UTF-16 code units 則 LIMIT，該片段不供直接採用。
- 專名、網址、code fence、HTML 註解、模板變數等優先受 R16 保護；核心**不是完整 GFM AST**。不能安全解析的格式會拒絕或標示受限，不做全量猜測修復。
- 明確 JSON 物件／陣列與疑似未保護的 JSON key/value 區段拒絕；可另用 R16 原有 `json` 模式。本文不宣稱能任意處理 HTML、JSON、Prompt、PDF 或 OCR。
- 此版本沿用 67 個既有**專案編輯種子**，只新增六個明列的繁體技術候選（軟件、數據庫、服務器、文件夾、源代碼、數組）及三種 `click` 操作來源；沒有把待審詞庫整批升為已審。
- 沒有全文翻譯、四種文風自動套用、無人審稿、使用率統計、遠端 Provider、Chrome/Grok/Claude 插件或雲端資料傳輸。

**與 AI 搭配：**[Codex、Claude、Grok 三條完整教學](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md)。請先由 AI 產稿，再將允許處理的內容貼到 TLS；**AI 的雲端資料流與 TLS 離線工具是不同的事**。

[回首頁](../README.md) · [其他格式 R16](R16_LOCALIZATION_STUDIO.md)
