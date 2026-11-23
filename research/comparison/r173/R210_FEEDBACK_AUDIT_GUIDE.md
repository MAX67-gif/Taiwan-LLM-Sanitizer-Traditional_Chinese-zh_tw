# R210｜離線自願回饋證據檢核器（研究預覽，NOT RELEASED）

**用途：**驗證與整理當事人主動交付的 R208／R209 自願本機回饋 JSON，提供資料品質、重複 payload 與作業階段的本機統計。**不能證明真人數量、採用率、母語品質或外部使用者已同意向維護者分享內容。**

## A/B 決策與安全邊界

既有 R209 已整合臺灣語境風險／單筆審稿／五步新手任務；真正缺口不是再做另一個審稿 UI，而是建立能安全核對 **R208 feedback** 的獨立工具。三方案中不採雲端遙測，也不大幅擴充未審詞庫。本版以 **R208 既有 26 欄 schema** 為契約，不改任何舊來源與正式 17.4.0 Release。

## 一般使用流程

1. 在 GitHub Actions 下載 `TLS_R210_LOCAL_FEEDBACK_AUDIT_NOT_RELEASED` 工件，解壓後用瀏覽器直接開啟 `TW_Feedback_Audit_R210_20261124.html`。
2. 只有在回饋提供者**另行自願交付並允許本機分析**時才選取 JSON。選檔不會自動開始分析；需勾選有權本機檢查的確認框。
3. 手動點選「在本機檢查與統計」。批次最多 40 檔，每檔最多 8 KiB；無效欄位、重複 JSON 鍵、偽造授權、額外原稿或識別資訊、非法 UTF-8、操作階段矛盾會被拒絕。
4. 工作台只顯示有效**不同回饋內容**、重複內容、拒絕數與原因，以及自我回報的操作完成和理解程度。**不同內容數絕不能等於獨立真人數**，相同人可以提交不同內容，不同人也能提交相同內容。
5. 如有需要，再由維護者主動按下載取得未驗證 JSON 彙總。未勾授權、清除資料或重新選檔，舊摘要立即失效。

## 何種資料會被接受

原格式 `tls.r208.local-voluntary-feedback.v1` 需完整符合 26 欄、`status=LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED`、`local_download_consent=true`、`sharing_authorized=false`、`network_requested=false`、`auto_apply=false`、`approval=NONE`、所有 `contains_*` 欄位為 false。另按 R208 原始 `evaluate()` 重算來源、可審數、已決定數、部分涵蓋與完成階段，拒絕不一致資料。`outcome=FINISHED` 僅在 `stage=LOCAL_EXPORT_ACTION_TRIGGERED` 下可接受。

輸出 `tls.r210.local-feedback-evidence.v1` **只含計數**：輸入檔數、有效不同內容數、相同內容重複數、拒絕數與 reason code、原版 `clarity/outcome/stage` 分布。沒有個人資料、檔名、文稿、字串候選、文件 SHA、payload SHA 或時間戳。**即使資料合格也可由任何人手工捏造**，故 `real_user_count_verified=false`、`adoption_verified=false`、`translation_quality_verified=false`、`authenticity_verified=false` 固定為 false。

## 開發與重現測試

```sh
node research/comparison/r173/build_feedback_audit_r210.js --build
node research/comparison/r173/build_feedback_audit_r210.js --check
node --test research/comparison/r173/test_feedback_audit_r210.js
python research/comparison/r173/test_feedback_audit_browser_r210.py
```

GitHub CI 使用真實 Chromium `file://`、完成權限確認、有效＋重複＋不合法 JSON、彙總下載、撤銷授權、390px 機型與零對外請求。受管理沙盒若禁止 `file://`，可明確設 `TLS_BROWSER_MODE=content` 做較低層級檢查，**不能冒稱原生檔案模式成功**。此研究功能不得啟動現有 17.4 Publisher，也不得混進尚未驗收的 17.5 候選。

## 踩雷、成功路徑及回滾

- **TDD RED**：初次 Node 因缺 `feedback_audit_r210.js` 正確失敗；核心建好後 9 項通過，剩下離線 Builder 不存在而失敗；補齊 Builder 後 10 項皆通過。
- **瀏覽器首輪反例**：警語用詞與測試預期差異，改為明確「不是獨立參與者」；另統計報告中的 `contains_candidate_ids=false` 只是安全聲明，不等同包含實際 `candidate_id` 敏感內容，測試改查是否真的出現 `"candidate_id":` 或候選 ID；修完重測通過。
- **回滾**：撤銷單一 R210 研究 PR；原 R209／R208／R207／R205／R204 程式和舊 Suite 17.4.0 全部不動。已有人撰寫完整回饋時，仍不得私自發送、解壓公開傳送或當真人認證樣本。
