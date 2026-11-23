# R208｜TLS 離線首次任務引導與自願回饋（研究預覽）

**定位：**原始 R207 單筆專注審稿的加法式研究預覽；未合併到正式 Suite，不是一個 AI 自動翻譯模型。此工具沒有遙測、雲端 API、帳號、資料庫，也不會自動修改文件。

## 為什麼要做

R207 已經支援一筆一筆審稿、人工選詞、復原與差異預覽，但初次使用者仍可能不知道下一步該做什麼。R208 提供**實際操作驅動的 5 階段引導**，把工具的正確使用方式直接呈現於離線 HTML；外部採用與母語品質仍缺真人證據，不應把 CI 通過視為真人成功。

## 操作流程

1. **準備來源：**開啟離線 HTML，貼上自己有權處理的 Markdown；若沒有文件，點選「載入示範並開始」，使用完全原創的本機示範。
2. **安全分析：**在本機執行現有 R172／R16 保護過的候選掃描，不自動選任何詞。
3. **人工決定：**至少選擇一處「採用候選」或「保留原文」；引導可以帶到 R207 專注卡，但不能自行替使用者決定。
4. **預覽核對：**真正由使用者點選產生安全預覽，對照修改位置、原文與新稿。原始檔維持不變。
5. **主動下載：**點選「下載新稿」後，僅表示本機**觸發瀏覽器下載動作**；是否成功儲存到磁碟仍由瀏覽器與使用者確認。

進度在來源修改、取消、重選或預覽失效時撤銷，不能把舊版的成功狀態延用到新來源。超過既有候選掃描上限時，持續顯示部分涵蓋警告，進度 5／5 **也不是文件語意品質認證**。如果沒有可審候選，不會冒稱完成。

## 自願本機流程回饋

回饋功能預設關閉。使用者必須先展開回饋區、選擇操作理解程度與自評是否完成，並自行勾選明確的本機下載同意，最後再按「下載不含原文的本機回饋 JSON」。這不是上傳同意，也不會自動將資料傳至 GitHub 或開發者。

`tls.r208.local-voluntary-feedback.v1` 只紀錄：操作階段、完成步驟數、可審候選數與已決定數、未列出候選數、是否已觸發新稿下載、自選 `clarity`、自選 `outcome`，以及 `real_human_identity_verified=false`、`translation_quality_verified=false`、`sharing_authorized=false` 等安全標示。

**不包含：**文章正文、替換詞、選項 ID、檔名、全文 SHA、IP、Email、裝置指紋或時間戳。即使如此，回饋仍可能透露操作習慣與工作量，不應視為零隱私風險。自行下載的 JSON 只證明本地生成，不是可信的外部真人採用統計；真實使用者研究須另取得明確同意並採獨立證據。

## 技術入口與重建

- 核心：`research/comparison/r173/first_task_r208.js`（7 個原始進度輸入、嚴格狀態與同意門檻；不讀原文）
- UI：`research/comparison/r173/first_task_ui_r208.js`（觀察 R207 既有畫面狀態、顯示引導、使用者主動下載）
- Builder：`research/comparison/r173/build_first_task_r208.js`（只從原 R207 編譯新的完整離線 HTML，不改動 R207 原始檔）
- Node：`research/comparison/r173/test_first_task_r208.js`
- Chromium：`research/comparison/r173/test_first_task_browser_r208.py`

從 GitHub Actions 下載標明 `TLS_R208_FIRST_TASK_OFFLINE_RESEARCH_NOT_RELEASED` 的工件，解壓後以瀏覽器開啟 `TW_First_Task_Guided_R208_20261124.html`，**無須安裝 Node 才能使用**。開發者從原始碼重建時執行：

```sh
node research/comparison/r173/build_first_task_r208.js --build
node research/comparison/r173/build_first_task_r208.js --check
node --test research/comparison/r173/test_first_task_r208.js
python research/comparison/r173/test_first_task_browser_r208.py
```

GitHub CI 的原生 Chromium 驗收使用 `file://`。若本地管理政策禁止檔案導覽，不可繞過政策；可以顯式指定 `TLS_BROWSER_MODE=content`，但此模式只證明內容互動，不代表原生檔案可用。

## 安全、回滾與版本邊界

- 復用 R207 既有 R204 狀態處理和 R172／R16 保護核心。R207、R205、R204、R203、R172 的原始程式完全不修改，R205 Context Risk Lens 仍保留在另一獨立研究入口。
- 仍使用單檔的 `default-src 'none'; connect-src 'none'` CSP，不引用 CDN、不讀寫 localStorage、不使用雲端模型／API 或暗中回報。
- 舊版已發布 Suite 17.4.0、29 官方附件與舊 Tag 不變；R202/R206 進行中的 Suite17.5 Draft PR #60 不因此取得任何發布權限。
- 這個 R208 不自動加入全工具 Registry，也不冒稱第 31 個正式工具。若將來正式發布，必須另做完整權利、六語文件、全工具資產、正式 SHA 與新版本 Publisher 驗證。
- 回滾：還原本次獨立研究 PR；既有 R207/205/204/203 與正式安裝資料不受影響。

**驗收邊界：**Node、Chromium、SHA、CRC 成功只證明程式符合測試情況，不證明真人已採用、語意等價、OS 原生選檔取消或 Codex for Open Source 已入選。
