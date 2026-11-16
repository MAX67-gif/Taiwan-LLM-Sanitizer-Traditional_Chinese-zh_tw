# R204｜臺灣用語審稿工作台（離線研究 Preview）

R204 延續 R203 的可攜人工審稿決定，新增**復原／重做、搜尋、狀態篩選、處理進度、逐項差異核對**，並保護較新的文字與選詞不被延遲讀檔或匯入覆蓋。不是新的翻譯模型，不自動套用詞庫，也不是正式 Suite 17.5 Release。

## 使用流程

先執行 `node research/comparison/r173/build_review_workbench_r204.js --build`，再用瀏覽器開啟同資料夾的 `TW_Review_Workbench_R204_20261116.html`。產物是完全自含的 HTML，不需要伺服器、安裝套件、CDN 或雲端帳號。

貼上／選取自己有權處理的 Markdown 或文字 → 點選「尋找臺灣用語建議」→ 每一處自行採用或保留原文 → 需要時使用「復原決定／重做決定」→ 點選安全預覽 → 核對每一處原詞、替換詞與行號 → 手動下載新稿。**原始檔不會被覆寫。**

可用「尚未選擇／已採用／保留原文／受限」篩選及原詞／候選詞搜尋縮小畫面；這些只改變顯示，不修改選擇。最多保留 50 個審稿狀態；來源一改動即撤銷舊歷史與預覽。Alt+Z 復原、Alt+Shift+Z 重做，輸入文字時不攔截鍵盤。

仍可匯出／載入原 R203 `tls.r203.review-continuity.v1` JSON。**格式不變**，R204 對來源與字典採相同嚴格檢查，只有人工 CONFIRM / KEEP_ORIGINAL 能被還原；匯入後還需要再主動預覽。來源及審稿紀錄各最多 64 KiB，候選最多 120 個。

## 新防護

- 全量驗證前先複製／鎖定審稿紀錄，避免等待期間改動輸入物件。
- 讀檔、匯入、Undo/Redo 及預覽都綁定最新操作序號；舊結果不准覆蓋較新原文或人工選詞。
- 再次匯入以最新操作為準，而不是哪個讀檔 Promise 最後完成。可用「取消待處理操作」讓未完成結果失效，不清除已選項。
- 所有匯入文字以嚴格 UTF-8 解碼；無效 bytes、NUL、重複 JSON keys（含跳脫同名鍵）、不安全欄位與權限宣稱一律拒絕。
- 錯誤匯入保留既有決定；JSON 在新臨時 session 全部核對後才交換。不拿部分有效紀錄改寫使用者當前工作。
- 差異列表只列真正手動採用的位置，並與既有 R172→R16 結構保護產生的預覽逐字對照。程式碼、網址、模板與受保護位置沿用舊規則。

## 邊界與隱私

本工作台不連網、不遙測、不用 localStorage，不提供雲端或模糊跨文件遷移。匯出的 JSON 不含原文及替換詞明文，但 SHA 和選項 ID 仍可能推知已知文件或用語，**請當作敏感工作資料保管，不是匿名資料**。

來源 SHA 綁定工作台文字欄位的內容。瀏覽器文字欄位會把換行正規化為 LF；它不是原始檔案 byte 指紋檢查器。原檔保留，新稿另存；R203 紀錄必須與工作台中的原文／詞庫完全一致。

既有 R172、R203 程式、正式 Suite17.4.0 和 R202 Draft #60 不改。本功能仍是有自動測試的研究 Preview；不宣稱真人母語品質、採用成效或 OS 原生檔案選擇取消已測。這也不是修復 ChatGPT 平台的訊息逾時。

## 重現測試

```bash
node research/comparison/r173/build_review_workbench_r204.js --build
node research/comparison/r173/build_review_workbench_r204.js --check
node --test research/comparison/r173/test_review_workbench_r204.js
python research/comparison/r173/test_review_workbench_browser_r204.py
node --test tests/*.js
```

Chromium 測試預設直接開啟 `file://`。受管理環境若禁止檔案導覽，**不得關閉管理政策**；可以明確設 `TLS_BROWSER_MODE=content` 只測內容載入，收據會標示模式，不得冒充 file URL 驗收。`TLS_CHROMIUM_PATH` 可選擇已安裝且允許使用的 Chromium。

建置僅產生衍生 HTML，不覆寫不一致舊輸出。正式發行仍須另一份全工具 Registry／新版本 Publisher／Draft 和 Published 全新下載驗證；此研究 PR 不得重發舊版本。
