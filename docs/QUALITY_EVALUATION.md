# 臺灣自然繁體中文翻譯品質驗證｜R6 公開測試

**R6 是研究／評測功能，R5 的 Chrome／Tampermonkey 正式翻譯行為沒有在此階段改動。** 這份說明讓讀者可以自己重現測試，了解哪些結果經過驗證，以及哪些還沒有。

## 為什麼光靠詞庫不夠？

「Codex for Open Source」應保留專有名稱，「menu」要按網站／餐飲情境分辨；但即使這些詞都正確，整句話仍可能生硬、加了不存在的承諾，甚至破壞技術文件中的程式碼與 Prompt 變數。因此我們分開檢查：**技術結構、安全與專有名詞（可部分自動驗證）**，以及**忠實度、自然中文、臺灣語境與語氣（需要真人評估）**。

## R6 已提供什麼？

| 項目 | 狀態 |
| --- | --- |
| [凍結的 100 題 JSONL](../benchmarks/r6/public_frozen_v1.jsonl) | **已鎖定**：技術、商務、一般網站、專有名稱、Prompt 各 20 題 |
| [凍結版本、SHA256 與資料狀態](../benchmarks/r6/frozen_manifest_v1.json) | **已提供**；修改必須另開 V2 |
| [四維人工評分標準](../benchmarks/r6/human_rubric_v1.json) | **已提供**：意思、自然度、臺灣語境、語氣 |
| [本地自動評測工具](../tools/r6_benchmark.js) | **已提供**：檢查已知專名、部分結構、覆蓋率與失敗題號 |
| [本機 Chrome 真實 Translator API 執行頁](../examples/TW_R6_Local_Chrome_Model_Run_20261024.html) | **已提供測試入口**；是否可取得真實譯文依使用者桌面 Chrome 而定，未在 CI 實測模型品質 |
| [雙語人工審閱室](../examples/TW_R6_Bilingual_Quality_Review_20261024.html) | **已提供**：並排／上下／僅譯文、人工四維評分、可自己匯出 JSONL |

**請注意：100 題參考譯文是本專案自行撰寫的編輯草稿，還沒有獨立語言專家審查；不是唯一標準答案，也不能用來宣稱任何模型勝率或達到專業品質。**

## 如何使用（不需上傳任何檔案）

1. 安裝 Node.js 20+ 並下載完整專案，在專案資料夾執行下列命令，確認凍結內容仍與 SHA256 相同。
2. 若你的桌面 Chrome 支援本機 Translator API，可先下載本機的 HTML 執行頁，從檔案選擇器讀取公開的 100 題，檢查語言組合，**自行決定是否啟動模型下載與翻譯**，再下載結果 JSONL。此步驟不會由我們的工具上傳任何文字；Chrome 可能下載語言包。**手機版 Chrome 不支援此 API。**
3. 用本機自動 QA 指令讀入譯文、產出不包含原文或譯文的結構化報告。任何未翻譯、名稱被改寫、模板被破壞的案例會標記為問題；**結構通過不等於語意或自然度通過**。
4. 以雙語審閱室自行載入輸出，先看原文與候選譯文，完成四項人工評分，再匯出 JSONL。完整報告仍須兩位真正獨立評審及必要爭議裁決；僅填不同評審代號不等於驗證了人員身分。

```bash
node tools/r6_benchmark.js validate
node tools/r6_benchmark.js baseline --output ./r6_terms_baseline.jsonl --report ./r6_terms_structural_report.json
node tools/r6_benchmark.js score --input ./model_output.jsonl --output ./r6_structural_report.json --model-id chrome-local-real
node tools/r6_benchmark.js review-template --input ./model_output.jsonl --output ./r6_review_template.jsonl
node tools/r6_benchmark.js score --input ./model_output.jsonl --reviews ./human_reviews.jsonl --output ./r6_report_with_human.json --model-id chrome-local-real
```

CLI 的 **baseline** 僅使用 R5 離線詞彙規則，**不是完整翻譯模型，也不能當成 R5 的真實翻譯品質成果**。這裡產出的模型 ID 是使用者輸入的說明文字，不構成經第三方證實的模型或版本身分。

## 評測如何避免自欺與過度擬合？

- 100 題公開資料只適合作為固定**回歸測試**；既已曝光，**不能當成從未見過的 OOS 測試**。
- 新模型與舊模型必須使用**完全相同的題目、來源語言、設定、覆蓋率與人工評分流程**才能比較。
- 不能把「100 題中 90 題沒有弄壞變數」稱為「90% 翻譯成功」；這只代表可辨識的結構問題比較少。
- 不能只挑選模型能翻的案例宣稱整體勝率。缺少的譯文必須列入覆蓋率。
- 如需真正未見過的題目，須在測試結果出現前另行凍結獨立樣本，並清楚紀錄來源權利與資料時間；不可從已看過的錯誤中反覆調參救分。
- 真人評估可能有語境歧見，允許多種臺灣慣用說法；遇到重要分歧須再裁決。

## 不收集個資、不上傳翻譯文字

本專案的 R6 JavaScript 與 HTML **沒有伺服器端收集功能、外部翻譯請求、遙測或上傳 API**。公開題庫和你打開的候選檔案，都留在你的本機環境；下載報告必須由你自行操作。Chrome 本機模型下載屬於瀏覽器自身行為；若你把內容另行貼給雲端模型，則依該平台的資料處理政策。

參考方法：[MQM Council 的翻譯品質錯誤分類](https://www.themqm.org/mqm-pillars/typology/)；本專案只採適合當前內容的**簡化、原創描述**，不宣稱是官方 MQM 認證、ISO 審定或大型人工語料。

[返回首頁](../README.md) · [公開發展方向](ROADMAP.md) · [隱私政策](../PRIVACY.md)
