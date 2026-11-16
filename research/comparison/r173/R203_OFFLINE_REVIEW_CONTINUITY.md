# R203｜臺灣用語審稿接續（離線單檔研究 Preview）

**狀態：OFFLINE RESEARCH PREVIEW / NO NEW RELEASE / NO AUTO-REWRITE**

這是現有 R17.2 用語助手的**加法式接續介面**，不是新的翻譯模型，也不修改目前正式 Suite 17.4.0 或原版 R17.2 文件。可以直接在瀏覽器本機開啟單檔 HTML，逐項選擇「menu → 選單／菜單」或明確保留原文，下載不含原文的 JSON 審閱決定，隔次重新貼上**完全相同**的文件後匯入決定，重新預覽，不用再重選。

## 建置與使用

在 GitHub 原始碼根目錄：

1. `node research/comparison/r173/build_review_continuity_r203.js --build`（產出新的獨立研究 Preview HTML，若已有與原始碼不一致的舊檔會拒絕覆寫）。
2. 用瀏覽器直接開啟 `research/comparison/r173/TW_Review_Continuity_R203_20261116.html`。
3. 貼入或讀取自己有權處理的 Markdown／純文字，點選「尋找臺灣用語建議」。逐處選擇替換詞或保留原文；**不會自動改任何位置**。
4. 在候選上方點選「下載審閱決定 JSON」，自行保管這份檔案。
5. 重新開啟或清除後貼上**同一份**原文 → 再分析 → 選取前次 JSON → 核對每一處決定 → 主動點選「產生安全差異預覽」→ 如有需要再下載新稿。原始檔永不覆寫。

## R203 資料契約

- `schema=tls.r203.review-continuity.v1`；`approval=NONE`；`auto_apply=false`；`network_requested=false`。
- 匯出只保留全文 SHA256、字典／Overlay SHA256、候選數、保護片段數、每筆已選項的候選 ID、UTF-16 範圍、`CONFIRM/KEEP_ORIGINAL` 和選項 ID。
- 不匯出文件全文、修改後新稿、替換詞明文或額外上下文；未選的項目保持未選，受保護的程式碼／URL／模板保留原文。
- 匯入先檢查完整 schema、SHA、詞庫、候選數、UTF-16 範圍、選項 ID。**任何來源或詞庫差異都拒絕**。全部檢查通過後才在**全新 session**還原選擇，既有選擇在匯入失敗時不受影響。
- 明確的兩段確認：匯入不等於修改；使用者必須另行產生安全預覽、人工檢查，再自行匯出新稿。
- 不使用網路、儲存空間、資料庫、自動備份、雲端模型或 API；CSP 固定 `default-src 'none'; connect-src 'none'`。
- **隱私注意：**即使沒有原文，文件 SHA 與候選 ID 仍可能洩露文件指紋或使用者所選字典詞，**不能公開審閱 JSON 或把它當零風險匿名資料**。應像工作文件一樣保護。
- 最大來源 64 KiB、最多 120 個候選，來自既有 R17.2 限制。跨來源、跨詞庫搬移是明確不支援，而非嘗試模糊自動遷移。
- 原版 R17.2 人工語境選詞能力、R16 結構守門、R15.1 原文保護、R19 R2／R19 R3、原正式 Suite17.4.0 不變；真人翻譯自然度／採用率／OS 原生選檔取消仍未量測。

## 可重現的驗證

```bash
node research/comparison/r173/build_review_continuity_r203.js --check
node --test research/comparison/r173/test_review_continuity_r203.js
python research/comparison/r173/test_review_continuity_browser_r203.py
node tools/build_wording_assistant_r172.js --check
```

Python Chromium 驗證使用現有 Playwright／Chromium 測試環境。無人審校證據，測試成功只代表上述程式與安全行為符合測試案例。此單檔在公開研究路線，不是正式 All-Tools Registry 裡新增的第 31 項工具，也沒有新的 GitHub Release。

## 更新／回滾規則

R203 使用獨立的 `research/comparison/r173/` 檔案和明示 CI 步驟，**不修改** 17.4 官方 Release、版號、原始二進位、既有 R17.2 HTML 或 R202 Draft 候選。撤銷本次研究 PR／退回前一個 main 即可回滾，不需改動已安裝工具。若將來要求正式發行，需額外完成全工具 Registry、母語與 UX 審查、獨立新版本 Source SHA 和雙全新下載的發行 Gate。
