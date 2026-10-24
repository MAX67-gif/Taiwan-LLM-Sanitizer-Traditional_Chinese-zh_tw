# R12｜真實翻譯品質證據工作台（獨立離線研究版）

> 2026-10-25，Taiwan-LLM-Sanitizer R12 Shadow Quality Evidence。MIT 開源，Project Founder / Steward：CA L.。**本階段僅提供本地驗證與研究工具，不升級 R5/R11 執行期、不宣稱自然度、翻譯正確率或已取得真實模型結果。**

## 1. 結論與定位

R11 已能安全將**使用者自己核准**的網站用語逐站套用，但一般用語替換和 Chrome 本機 Translator API 的自然中文表現尚未有可獨立驗證的成績。R6 既有 100 題公開凍結資料集、部分結構 QA 和真實 Chrome 端測試入口；R12 在其上增加**候選來源匯入、兩組同題比較、自填人工評分與可攜彙總報告**的無網路工作台。

重要界線：只驗證功能、不造假數據；沒有模型實際跑出來的譯文，報告就會是「未提供」。模型名稱可由使用者自行填寫，不代表模型廠商、版本或真人評審身分獲得獨立認證。

## 2. 離線使用方式（不需安裝 Python）

1. 下載並開啟 `examples/TW_Quality_Audit_Lab_R12_20261025.html`，可在一般桌面瀏覽器與窄版畫面使用。原始碼／詞庫都內嵌於單一 HTML，CSP 禁止對外連線。
2. 到 R6 公開本機模型測試頁 `examples/TW_R6_Local_Chrome_Model_Run_20261024.html`，在真正支援 Chrome Translator API 的**桌面環境**取得候選 JSONL；也可以匯入自行合法取得的等價格式。Chrome 可能需要下載語言包，R12 本身不呼叫模型或網路。
3. 在 R12 匯入候選 A；可選擇另匯入候選 B 和 R6 雙語審閱室的人工評分 JSONL。建議僅匯入公開、無商業祕密的測試資料。
4. 按「開始本機檢查」，查看 A/B 覆蓋率、缺漏、保護文字缺失、未翻譯英文警示、五領域分布，以及人工評閱覆蓋。
5. 如需保存證據，**手動**下載匯總 JSON。摘要不包含任何翻譯全文、原文、審閱者姓名或評語，但包含**使用者自行填寫的候選名稱**、固定公開題號與警示類型；候選名稱也不要填私人客戶資料。關閉／清除頁面不會自動同步或備份。

## 3. 輸入資料契約與防呆

- 固定來源：`benchmarks/r6/public_frozen_v1.jsonl` 必須維持 `frozen_manifest_v1.json` 中原始 SHA256；`tools/build_quality_audit_r12.js` 建置時驗證題庫完全一致，再內嵌 100 筆編號、領域、原文、來源語言與 `preserve_exact`。不得改動原題以提升評分。
- 候選 JSONL：每行必須且僅能包含 `id`、`translation` 兩個欄位，ID 必須為固定 R6 題號；最多 100 筆，不可重複 ID，譯文限制 50,000 字元，單檔限制 5MB。只有存在的譯文列才算「已提交」。來源未知或資料被破壞時拒絕整個匯入。
- 人工評分 JSONL：沿用 R6 `id`、`reviewer_id` 及 `meaning/naturalness/taiwan_locale/register` 四軸 1~5 整數；容許原有 `comment` 和 `error_categories`，但不會匯出原評語。對同一題同一 reviewer_id 重複評分、非法軸值、未知題號與未知欄位會拒絕。
- 每題至少兩個不同 reviewer_id 時才列入「至少兩人自填」覆蓋；**系統無法辨識填寫者是否為兩名獨立真人**。模型／評審身分、審稿盲測與爭議裁決需要外部合法的實際證據。
- 不比對未提交樣本的自然度，不將缺少譯文的模型忽略以誇大成績；比較結果僅為數量和已知保護文字警示，不是模型排名。

## 4. 計算口徑（絕不可宣稱超出功能）

| 指標 | 定義 | 不能解讀為 |
| --- | --- | --- |
| Submitted/Coverage | 同一凍結 ID 內提交的譯文筆數 / 100 | 模型翻譯完成度或語意正確率 |
| Missing | 固定 100 題中未提交的 ID | 只有容易的題可以代替全題 |
| Structural flags | 未包含 `preserve_exact`、空譯文或英語原文完全不變 | 沒警示就代表沒有其他錯誤 |
| Two-reviewer self-reported | 同一已提交題有兩個不同 `reviewer_id` | 兩名已認證真人或獨立評審 |
| A/B overlap | A/B 兩份 JSONL 都有提交的共同題號 | 不同模型都實際支援相同語言或同源裝置 |

`src/core/quality_audit_r12.js` 與 `tools/r6_benchmark.js` 的檢查職責不同。R12 是**頁面上可解釋的保守快速檢查**，沒有完整 R6 CLI 的各類命名實體 QA，兩者的旗標數不可不附說明就直接相比。需要更嚴格的結構問題時，仍應在本機執行 `node tools/r6_benchmark.js score ...`；真實自然度必須人工比對原文。

R12 報告永遠包含 `studyOnly:true`、`approval:NO_PROMOTION_NO_CLAIM`、`noUnseenOOS:true`、`candidateSourceVerified:false`、`humanReviewIndependent:false` 與 `rawCandidateTextIncluded:false`。任何情況不得把報表接成自動訓練或產品升級許可。

## 5. 隱私、授權、第三方與來源污染

本頁的 CSP 設定禁止外部連線、載入遠端資源與表單提交；沒有 `fetch`、WebSocket、CDN、追蹤器、瀏覽器 localStorage、IndexedDB、cookie 或自建後端。使用者主動匯入的原文／候選／評分保留於當次頁面記憶體；按「清除本頁資料」或關閉頁面可結束本次暫存。模型 A/B 的結果不會因為按分析就送至 GitHub。自行分享下載的摘要前仍應檢查使用者輸入的候選名稱。

R6 參考譯文是原創編輯草稿，不是唯一標準答案。外部商業語料、私人模型結果、真實聊天、客戶文件與受限第三方內容**不可直接加入 GitHub、PR、Issues 或 Actions Artifacts**。如需研究，應放在本機自有私有資料目錄，不用公開 `benchmarks/r6` 存放。

## 6. 測試與發布 Gate

```bash
node tools/build_quality_audit_r12.js
node tools/build_quality_audit_r12.js --check
node --test tests/*.js
python tests/test_quality_evidence_browser_r12.py
python tools/check_r12_release_workflow.py
python tools/check_release_workflow_r11.py
python tools/publication_guard.py
python -m py_compile tests/*.py tools/*.py
```

Chrome 與 Tampermonkey 的舊建置仍以 R5/R11 原本的 `build.py`、`build_r11.py` 生成與比對，不能為 R12 而更換；R6 原始 100 題 SHA、R7.1/ R8/R9/R10 的檔案都不修改。GitHub 應先讓新開發分支 `verify`、`browser-integration` 通過；合併 `main` 後完整跑 CI 再獨立建立 R12 Release（單一 HTML + SHA256），不覆寫之前 Release。

## 7. 已知不能由 R12 完成的項目與下一步

- 沒有任何新的真實 Chrome 本機模型跑分，尚未得到全語言配對/多硬體支援證據。
- 沒有驗證評審為獨立真人，不可宣稱雙審完成或已達某個自然度百分比。
- 沒有完成相同模型版本與固定瀏覽器、相同文字與語言組合的嚴格公平評估。
- 公開 R6 題目不能稱作新鮮 OOS，下一個真正未知集需在結果曝光前固定內容/Hash並保存隱私與權利來源。
- 沒有改動 R5/R11 翻譯策略、未自動套用候選、沒有雲端 Provider；R12 不處理 PDF/OCR/Canvas 或 Chrome Store 上架。

下一階段先由自願提供的**可公開、合法來源**真實模型譯文進行可重現案例驗證與人工翻譯品質盲審，再決定是否建立通用的雙語閱讀與語境融合引擎。若真實品質不足，優先找失敗原因，不為提升固定評分而修改已曝光樣本。
