# R205｜臺灣用語語境風險雷達（離線研究 Preview）

**功能：唯讀提示＋人工風險排序；不是翻譯引擎、模型推理、正式新 Release 或語意正確率證明。**

這個獨立的離線 HTML 繼承 R204 的人工審稿、Undo/Redo、同源 JSON 接續、字詞搜尋與安全差異預覽。新增「高風險優先／原文順序／只看高風險」三種視圖，把可能互相矛盾的語境優先呈現，而不是改變候選字典或替換結果。

## 怎麼用

1. 從 GitHub Actions 下載名為 `TLS_R205_CONTEXT_RISK_LENS_OFFLINE_RESEARCH_NOT_RELEASED` 的研究檔案，或在開發環境執行 `node research/comparison/r173/build_context_risk_lens_r205.js --build`。
2. 直接用瀏覽器開啟 `TW_Context_Risk_Lens_R205_20261124.html`，不用伺服器或帳號。
3. 貼上自己有權處理的 Markdown／文字；點選「尋找臺灣用語建議」後，雷達會列出**風險優先**候選。
4. 看每處候選下的風險說明，必要時切換「只看高風險」，自行採用候選或保留原文；所有選項預設不修改。
5. 點選安全預覽，核對 R204 原有的每筆差異，再由使用者自行下載新檔。R203 的同源 JSON 匯入/匯出及 R204 的復原／重做維持不變。

## 目前哪些語境會提醒？

| 來源例子 | 規則式標籤 | 解讀 |
|---|---|---|
| 介面 menu | 單一 UI 線索／MEDIUM | 附近找到介面線索，但**不會替你選「選單」** |
| 餐廳 menu | 單一餐飲線索／MEDIUM | 附近找到餐飲線索，但**不會替你選「菜單」** |
| 餐廳設定 menu | 雙域衝突／HIGH | 同段含兩域詞彙，無法判定，優先人工審查 |
| 未知 menu | 沒有明確線索／HIGH | 不知道是否餐飲或介面，應保留給使用者 |
| 介面 menu（人工選了「菜單」） | 已選領域不一致／HIGH | **提醒但不取消人工選擇** |
| 程式碼與模板變數中的 menu | 沿用 R172/R16 結構保護 | 不納入候選，也不可因雷達而解除保護 |

規則只讀取該候選位置附近、以標點切開的局部文字，避免把另一句的「餐廳」當作本句線索。所有規則為原創教學用 whitelist，不可視為人工語境審核或模型準確率；遇到衝突或不明確維持人工審查。

## 安全與資料界線

- 此研究功能**不會自動改稿、自動選詞、授權發布或外傳原文**。每個風險物件 `auto_apply=false`、`approval=NONE`，summary 不含原文與替換詞。
- 只用 DOM `textContent` 呈現使用者內容；單檔 CSP 保留 `default-src 'none'`、`connect-src 'none'`。
- 優先順序只是顯示層排序，原候選 ID、位置、選取狀態與審稿 JSON Schema 完全不變。
- R204 原始 JS、R203、R172、R16、R15.1 與 Suite17.4.0 原本發布位元組不覆寫。研究 Sidecar 不會自動升級為 Suite17.5 的第31個工具。
- R202 Draft #60 的 30 工具候選仍未正式發布，兩條路線必須分開治理。
- 仍未取得真人語言品質、外部採用、OpenAI OSS 入選或 OS 原生檔案選取取消之證據。

## 重現驗收

```bash
node research/comparison/r173/build_review_workbench_r204.js --check
node --test research/comparison/r173/test_context_risk_lens_r205.js
node research/comparison/r173/build_context_risk_lens_r205.js --build
node research/comparison/r173/build_context_risk_lens_r205.js --check
python research/comparison/r173/test_context_risk_lens_browser_r205.py
```

GitHub CI 以原生 Chromium `file://`、原始 R204 狀態保真、零 HTTP、人工已選衝突警告、320–390px 版面回歸為驗收依據。程式碼與正式安裝檔分開，只有 CI 全部通過才有資格合併公共主線。若後續擴大語境提示語料，必須另做未曝光與真人審核，不以單一合成例句救援調參。
