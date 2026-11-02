# TCR 2.0｜Suite 17.3.2 可攜式語境檢查整合規格

日期：2026-11-02。狀態：工程候選，**須以最終 GitHub 發行收據判定是否正式可用**。

## 功能與主要使用流程

臺灣繁體中文用語並非單一字串替換。一般使用者依然由 R17.2 離線修稿工具開始；TCR 2.0 是給 Codex、Claude 與本機 Python 使用者的**選配、唯讀候選檢查 Skill**，不會擅自修改原文。

- 輸入：使用者有權處理的單一 UTF-8 Markdown／TXT 文件，最多 64 KiB；可選用另一份獨立修訂稿進行完整性比對。
- 語境候選：UI 的 menu 可能是「選單」；餐飲語境可能是「菜單」。不能只看關鍵字就聲稱語意已證明。
- 保護：保守標記 Markdown 程式碼、URLs、變數占位符、HTML 屬性等非一般文字；比對具名產品、數字、受保護片段與基本結構。
- 輸出：JSON metadata，顯示 SUGGEST／KEEP_ORIGINAL／NEEDS_CONTEXT／BLOCKED_TECH，不輸出全文、使用者路徑或文件 SHA。明確指定 --local-detail 的位置資訊不得公開。
- 不提供遠端 Provider、完整 AST 解析、全自動修稿、真人語言品質證明，或任何交易、網路、下載功能。

## 直接使用（先解壓下載的 developer ZIP）

1. 檢查安裝指南：`skills/taiwan-context-reviewer/README.zh-TW.md`。
2. 使用原創練習稿：`python skills/taiwan-context-reviewer/scripts/audit_markdown.py --input skills/taiwan-context-reviewer/assets/ORIGINAL_PRACTICE.md`。
3. 檢查原稿與修稿：使用 `--input` 與 `--compare` 指向兩份**有權處理**的 Markdown。若完整性有問題，應拒絕把結果當成已驗證修訂。

Windows 如找不到 python 命令，須自行以已安裝的 Python 啟動，不可臆測系統路徑。

## 封裝與版本契約

- 正式完整套件使用獨立的新標籤 `all-tools-suite-v17.3.2`；不得重用或刪改 17.3.0 與 17.3.1。
- 28 項既有工具 ID、版本、原始發行 SHA 與 bytes 保留，TCR 2.0 只加入**開發者原始碼 ZIP 的選配 Skill**，不是第 29 項已驗證獨立工具。
- 原始 19 個檔案以 Git Blob SHA 從 [PR #41](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/pull/41) 保存，避免不必要的重新編輯或失真。
- 原先 R3 Premium PNG、六語 README 的已凍結 R17.6／R17.7 區塊保持逐位元一致。
- 每次修改需驗證六語 README／Usage Examples 校驗標記、開發者 ZIP 檔案名、TCR 版本與 CI 的實際來源 SHA。

## 驗收與安全拒絕

1. 56 項原始 Python 測例與 Node test bridge 在最終 PR head 重跑。
2. 下載 developer ZIP 後確認 TCR 2.0 原始碼、README 與練習檔均存在並與原始 Git Blob 一致。
3. 以合法原創樣本測試：原稿不被改寫；允許的比對不聲稱語意等價；被改動的程式碼、數字、連結或否定不能收到無警告的 PASS。
4. 完整 All-Tools CI、瀏覽器回歸、公私資料守門、舊資產校驗、版本與發行完整性通過後，才可透過受保護 main 合併。
5. 主線版發布需先完成 Draft 實際下載逐件檢查，再發布、再下載回驗。任何階段失敗就維持未發布。

## 尚未解決的獨立工作

- R19 的真正原生 Chromium 十情境仍為 NOT_RUN／ENV_BLOCKED（先前出現 `ERR_BLOCKED_BY_ADMINISTRATOR`），不納入本次 Suite。
- 社群分享縮圖需 GitHub Settings 操作，不能由 README 原始碼 PR 代替。
- 真人品質與外部採用尚無獨立證據，不以測試數或 GitHub Stars 假冒成功。
