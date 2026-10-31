# 三步完成第一份臺灣繁中 Markdown｜TLS R17.2 正式版入門

> 初版核對：2026-10-28；下載位置重新核對：2026-10-31。R17.4 是**入門文件**更新，不是新的翻譯引擎，也不是新的 Release。原有 R17.2 工具不變。此說明的翻譯語意尚待真人審閱。

## 先確認要完成什麼

貼入自己有權處理的中文 Markdown → 查看有限的臺灣用語候選 → **每一處**決定採用或保留 → 產生受保護片段驗證過的差異預覽 → 另存新的 Markdown。不是全面簡繁轉換、全文 AI 翻譯或專業母語品質認證。

## 第一步：從正式下載頁取得可操作檔案

**[點選最新正式 Release（GitHub 官方資產頁）](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)**。

在該頁 **Assets** 找到 **`TLS_ALL_TOOLS_SUITE_17_3_0.zip`**（目前可完整取得的 Suite 17.3.0；日後新版以 GitHub 實際附件名稱為準）。也可以只下載獨立 **`TW_Wording_Assistant_R172_20261027.html`**。

**舊版下載說明：**Suite 17.1／17.2 的舊完整套件及開發者 ZIP 已撤回，其歷史清單可能仍列有撤回附件。使用 [Suite 17.3.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0) 才能取得現行完整包；R17.2 修稿工具本身未改版。

請注意：GitHub 中 `examples/*.html` 是原始檔檢視頁，**不是**已託管的線上工具；不要以為在 GitHub 上看到 HTML 就已開始操作。Release 的 `.html` 需先下載，再由本機瀏覽器開啟。

## 第二步：開啟離線修稿工作台

1. 將 ZIP 解壓到自己的電腦，**用瀏覽器開啟壓縮包內的 `START_HERE.html`**。不要只在 ZIP 預覽視窗閱讀它。
2. 在首頁選「開啟 R17.2 離線修稿助手」；或直接從正式 Release 下載該 `.html`，再用瀏覽器開啟。
3. 選「載入原創範例」，或者將 [此份自製 Markdown 練習稿](R174_ORIGINAL_FIRST_TASK.md) 貼入工作台。資料由本機瀏覽器處理，工作台本身不主動呼叫 AI 雲端服務。

## 第三步：逐項確認並匯出

1. 選「尋找臺灣用語建議」，查看候選出現的位置與理由。
2. 每筆手動選擇建議或「保留原文」。同樣是 `menu`，餐飲可能是「菜單」，軟體可能是「選單」；不確定要保留。
3. 點選「產生安全差異預覽」，檢查程式碼、網址、HTML 註解、模板變數仍保留。若被標記 `LIMITED` 或拒絕，**不要**自行視為成功。
4. 檢視語意後才選「下載新稿」，原檔不會由工具直接覆寫。

**常見誤會：**看不到候選 ≠ 原文無錯；技術結構檢查 PASS ≠ 譯文自然度 PASS。此工具只支援 Markdown 保守掃描的可編輯區段；單稿 64 KiB、候選最多 120 項，不能當成 JSON／Prompt／PDF 的通用翻譯器。

## 想和 AI 協作？

先在 [Codex／Claude／Grok 搭配手冊](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md)取得原創或自己有權使用的草稿，再由本機 TLS 驗證與人工選詞。一般網頁 AI 不會自動讀本機 Skill；在 AI 雲端輸入內容前先檢查隱私與授權。

## 自願回饋／真人採用研究

目前尚未取得 E1／E2／E3／D7 的真人測量結果。本專案不內建隱藏追蹤、回傳稿件或蒐集個資。未來研究必須取得明確同意；不得上傳私人文章、個人識別資訊或整份聊天紀錄到公開 Issue。

[返回首頁](../README.md) · [AI 操作手冊](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md) · [正式 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)
