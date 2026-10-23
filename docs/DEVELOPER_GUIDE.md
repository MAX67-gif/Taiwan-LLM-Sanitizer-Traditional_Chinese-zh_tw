# 開發者快速指南

這份文件只描述**公開專案可重現的建置與使用介面**。私人開發筆記、商業研究或補助申請準備不屬於公開 Repository 的必要資料。

## 基本指令

建議環境：Node.js 20+、Python 3.12+。

```bash
node --test tests/*.js
python tools/generate_lexicon_r3.py --check
python tools/build.py
python tools/publication_guard.py
```

可選擇以 Playwright/Chromium 驗證 DOM 與擴充功能視窗互動；GitHub Actions 會執行相關回歸測試。

## 核心架構

- `src/core/engine.js`：保守文字與詞彙規則，確保歷史功能可重用。
- `src/core/lexicon_pack.js`、`src/core/preferences.js`：已公開詞條與使用者用語偏好。
- `src/core/provider.js`：離線詞彙／選用 Chrome 本機翻譯能力。
- `src/core/web_adapter.js`：在使用者允許時處理部分 DOM 文字，支援停止及還原。
- `src/chrome/`：Manifest V3 控制與逐站權限。
- `src/userscript/`：打包成一個可安裝的使用者腳本。
- `tools/localize_cli.js`：無雲端服務的本地批次轉換器。

`tools/build.py` 從單一來源產出 `dist/chrome/` 與 `dist/userscript/`；提交時必須保持生成結果與原始碼一致。

## 公開發布檔案規則

`tools/publication_guard.py` 使用**明確的公開檔案白名單**，並在 CI 檢查提交路徑、常見敏感金鑰、禁止的外傳 API、根目錄與 docs 位置。這是安全防線之一，不代表取代人工程式碼審查。

只上傳使用者能下載的原始碼、安裝檔、測試、簡短文件及授權資料。若需增加新公開文件，必須同步審查它的必要性並更新白名單。

有安全疑慮、版權不明或包含私人資料的內容**不得先提交再刪除**；Git 歷史可能保留已公開的文字。請先在本地私有環境處理，再用篩選後的公開資料提出 PR。

## 授權

本公開核心依 [MIT](../LICENSE)。CA L. 是專案發起與產品治理負責人；他人合法貢獻、原有 MIT 授權及第三方素材的權利不受此身份影響。

## R6 公開品質測試

```bash
node tools/r6_benchmark.js validate
node --test tests/test_r6_benchmark.js
```

R6 的 frozen_manifest SHA256 與 100 題原文在發布後不可原地修改；如發現需修正的題目，建立新版公開 cohort 並保留舊 hash。自動 QA 只涵蓋有限的結構／專有名稱檢查，不等於模型品質分數；人工自然度須獨立審閱。使用者的模型輸出與評論資料不應提交公開儲存庫。

[評分說明](QUALITY_EVALUATION.md)
