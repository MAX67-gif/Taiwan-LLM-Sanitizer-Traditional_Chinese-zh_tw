# R10｜臺灣用語來源追溯、語境反例與人工審查治理

> 公開產品文件 · 2026-10-24 · R10 獨立 Preview · MIT 原創示例 · Founder / Project Steward：CA L.
>
> **審查輔助，不是「臺灣標準用語」認證，也不是翻譯模型、禁語名單或自動替換功能。**

## 1. 此版想解決的問題

R3 有 883 筆未審候選、67 筆保守編輯種子；R9 讓使用者能人工選詞。R10 接著回答一個更實際的問題：**這項建議來自哪裡？反例是什麼？它可不可以安全地推薦給別人？**

R10 以 28 筆 R9 專案自撰的正反例為**逐欄可查的歷史來源**，再寫 12 筆新的編輯草稿，全部放在 `lexicon/context_provenance_r10.json`，共 40 筆、36 種原詞。保留 R3 950 筆詞庫，不偷升級詞庫或自動判斷。**40 筆是人工審查示例數量，不是實際詞庫審查完成數，更不是 40 筆高精度正確譯法。**

## 2. 公開資料、來源與權利

| 檔案 | 用途與邊界 |
| --- | --- |
| `lexicon/context_provenance_r10.json` | 40 筆編輯示例，含原詞、領域、建議、正例、反例、理由、來源參照、狀態、風險 |
| `lexicon/context_provenance_r10_manifest.json` | 資料 SHA256、參照計數、版本及 `runtime_permission: NONE` |
| `lexicon/context_examples_r9.json` | 28 筆既有原創例句，保留原檔不修改 |
| `src/core/context_governance_r10.js` | 嚴格資料／匯入匯出契約；**不提供任何翻譯網站的 apply() 入口** |
| `tools/build_context_governance_r10.js` | 可重現 HTML 與證據 Manifest、逐欄比對 R9 歷史源 |
| `tools/templates/context_governance_r10.html` | 輕量、鍵盤可操作、手機適配的零外連介面 |
| `examples/TW_Context_Governance_Lab_R10_20261024.html` | 可直接下載後開啟的單一離線工作台 |

所有 R10 例句都宣告為專案原創編輯草稿，**尚沒有獨立專業語言審稿**。來源追溯是方便核對內容從哪一輪來，不是外部證據、真人評分或市場調查；不能把此欄當成權威性背書。若引用第三方詞典、專業標準、文章或翻譯，須另行記錄著作權與再散布權，不可直接把受限內容寫進 MIT 資料檔。

## 3. 每筆證據的資料契約

`tls.term-evidence.v1` 包含 `pack_id`、版本日期、語言政策、權利與用途、`runtime_permission=NONE` 與 `entries`。

單筆固定欄位：`id`、`source_term`、`domain`、`suggested_term`、`meaning_note`、`positive_example`、`counter_example`、`evidence_origin`、`source_path`、`source_case_id`、`source_license`、`evidence_status`、`permission`、`auto_apply`、`risk_tier`。

必要檢查：

- 來源 `r9_editorial_reference` 的 28 筆與原 R9 每個欄位完全一致（程式會核對）；另外 12 筆使用 `r10_original_editorial`。
- `evidence_status` 固定 `unverified_editorial`；`permission` 固定 `SUGGEST_ONLY`；`auto_apply=false`。沒有核准自動替換的途徑。
- 單筆領域、重要語意、正反例及風險不可缺少；不得用單一固定「menu → 主選單」覆蓋餐飲情境。
- `source_license` 僅描述此專案自行創作的例句，不代表任何第三方網站／遊戲原始文字可隨之納入 MIT。
- 本版本有意凍結編輯案例與 SHA256；若更正原創示例，請建立新的 pack_id／manifest，不偷偷改舊封包而宣稱同版本。

## 4. 人工選詞及可攜審查檔

開啟單檔 HTML → 篩選領域或搜尋 → 閱讀正例、反例與理由 → 選擇「暫時認可建議／保留原詞／需要更多語境／拒絕建議」→ 必要時寫自己的備註 → 手動下載 JSON。

自選決定為 `tls.term-review-ledger.v1`，固定 `schema`、`locale: zh-TW`、`evidence_sha256`、`decisions`。每項 `case_id`、`outcome`、`note`。審查決策可由人改、可隨時清除，只存在頁面記憶體，**不會自動回傳 GitHub，也不會改動 Chrome、Tampermonkey 或其他網頁**。

匯出僅含自行選擇的案例 ID、決定與備註，原始正反例、使用者閱讀全文、網址及瀏覽紀錄不會自動寫入。備註可能由使用者自行輸入敏感資訊，下載後請自己管理。匯入需手動選檔；最大 64 KiB、200 筆，超限、錯誤版本、未知欄位、重複案例、無效選項、結構文字注入都拒絕。只接受完全相同的證據 SHA256，避免新舊語義混淆。

**人工選詞只是本頁的意見。** 不會偽裝「兩位獨立審稿者同意」，沒有帳號、認證、寫入公開詞庫或 promotion。未來真正執行跨站偏好前，還需要 R11 的逐站授權、例外優先級、原文還原、頁面操控保護與回歸證據。

## 5. 隱私／Web 安全

- 此 HTML 內嵌資料及程式，CSP 禁止所有外部連線（`connect-src 'none'`）、不使用 iframe、CDN、伺服器或遙測。
- 選擇與備註只留在本頁記憶體，沒有 localStorage、cookie 或自動上傳。使用者手動下載除外。
- 所有資料透過 `textContent` 建立 DOM，不使用文字拼成 `innerHTML`；匯入 JSON 使用嚴格白名單及內容長度限制。
- 不讀取網站其他分頁、不操作網頁 DOM 翻譯內容，按下「暫時認可」不授權第三方介面自動套用。
- 本版未經完整外部資安稽核；可重現構建、靜態守門與 Chromium 操作測試只證明相應測試範圍。

## 6. 驗收命令

```bash
node tools/build_context_governance_r10.js --check
node --test tests/*.js
python tests/test_context_governance_browser_r10.py
python tools/publication_guard.py --self-test
python tools/publication_guard.py
python -m py_compile tests/*.py tools/*.py
```

CI 同時驗證 R1～R9 既有功能、R5 生成安裝檔 parity、R6 凍結題目 SHA、R7.1 獨立示範等；`verify` 與 `browser-integration` 都 PASS 且對應 PR SHA 後才合併；合併後再核對 main SHA 同樣通過。HTML 生成檔與 manifest 必須完全一致，不允許先改生成品冒充來源已同步。

## 7. R10 非本次功能與後續方向

- 不更動 R5 v0.4.0 Chrome／Tampermonkey／CLI 執行語意。
- 不更動 R6 已凍結 100 題及其品質分數，也不拿 40 筆審稿草稿當 unseen OOS。
- 不更動 R7.1 非官方示範、R8/R9 HTML，沒有 OCR/PDF/WebGL、自然文風的真實模型能力或獨立真人雙審認證。
- 下一階段應先根據可公開的真實錯譯案例逐步擴大社群審查、來源授權與爭議裁決；R11 才評估把使用者詞庫安全接入瀏覽器執行期。**目前 R10 僅是公開可信的治理與操作基礎，不等於語言資料權威。**

## 8. 回滾與權利

R10 是加法式獨立模組。需要撤回時 revert R10 PR 即可；舊 R5～R9 安裝包、Release、凍結題庫及原有 MIT notice 不受影響，勿 force push。私人研究歷程、遊戲資料、原始對話與商業詞庫不得放進這份公開文件或公共分支。Repo 的 CA L. Founder/Steward 署名維持既有治理口徑，並尊重 MIT 授權與其他合法貢獻者權利。
