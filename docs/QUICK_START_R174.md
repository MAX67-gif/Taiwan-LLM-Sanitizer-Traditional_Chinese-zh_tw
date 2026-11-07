# 三步完成第一份臺灣繁中 Markdown｜R19 離線入門

> 2026-11-07 更新為 Suite 17.4.0 的 R19 入口。原 R17.2 工具與歷史 Suite 17.3.2 保留；本頁檔名 R174 是原入門指南的識別碼。R19 仍是工程預覽，真人語言品質尚未驗證。

## 第一步：取得可操作檔案

從 **[最新正式 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)** 的 Assets 下載 `TLS_ALL_TOOLS_SUITE_17_4_0.zip`，或單獨下載 `TW_First_Result_Studio_R19_20261101.html`。請先確認該頁已實際發布這些附件；較舊的 Release 不含 R19。原 `TW_Wording_Assistant_R172_20261027.html` 仍可獨立使用。

Suite 17.1／17.2 的舊整合與開發者 ZIP 已撤回。歷史 [Suite 17.3.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0) 僅作版本查核；現行完整下載依最新正式頁面。GitHub 的 HTML 原始碼頁不是線上工具，需下載後用本機瀏覽器開啟。

## 第二步：開啟 R19 並載入原創內容

1. 解壓完整 ZIP，以本機瀏覽器開啟 `START_HERE.html`，選「開啟 R19 首份成果工作台」。獨立 HTML 也可直接開啟。
2. 使用頁面快速導覽的原創範例，或載入／貼入自己有權處理的 Markdown。[原創練習稿](R174_ORIGINAL_FIRST_TASK.md)含軟體、餐飲、程式碼與網址情境。
3. 檢查載入內容。取消或錯誤編碼匯入會保留既有成果；成功載入新內容後需重新檢視決策。工具不會自動連接 AI 服務。

## 第三步：逐處決定，檢查差異並另存

查看有限的用語候選與前後文；語境偏好只影響提示，不會替你批次批准。每一處選擇採用或保留：例如軟體 menu 可用「選單」，餐飲 menu 可用「菜單」。不確定時保留原文。

完成決策後產生安全預覽，核對差異與受保護的程式碼、網址、HTML 註解和模板變數，再下載新稿。原檔不由工具覆寫。處理上限為 64 KiB、最多顯示 120 筆候選；若偵測到更多候選，全部顯示項目已處理仍屬部分審閱，不能宣稱全文完成。預覽處理中或結果過期時需等待新結果，不使用舊下載。

沒有候選不表示原文無錯，結構檢查通過不表示語意正確。工具是 Markdown 的保守人工審閱流程，不能當成 JSON／PDF／整篇自動翻譯器。

## AI 協作與回饋

需要產稿時可參考 [Codex／Claude／Grok 手冊](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md)，交回本機 TLS 後仍須人工確認。雲端 AI 的內容傳送由使用者在該平台決定。

目前尚未取得 E1／E2／E3／D7 真人操作與採用量測。沒有隱藏追蹤或自動上傳原稿；真人試用依使用者要求延後。請勿將私人文件或完整聊天紀錄放到公開 Issue。

[返回首頁](../README.md) · [R19 功能與限制](r19/README.md) · [正式下載](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)
