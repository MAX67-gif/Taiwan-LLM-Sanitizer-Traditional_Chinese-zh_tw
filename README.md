# Taiwan-LLM-Sanitizer｜讓外語與技術內容更符合臺灣人的閱讀習慣

**開源、可選詞、重視隱私的臺灣繁體中文在地化工具。** 不做文字審查，不宣稱所有譯法只有一個標準答案；使用者可以保留原文、決定用語，並在修改前查看差異。

> **產品定位：跨模型的臺灣繁中在地化控制與品質驗證層。** 我們不是另一個大型語言模型，也不是 TAIDE／Taiwan-LLM 的官方產品。公開核心依 [MIT 授權](LICENSE)；專案發起及治理：**CA L.**。

## 現在能使用什麼？

| 入口 | 最新可用版本 | 主要用途／限制 |
| --- | --- | --- |
| **Chrome／Tampermonkey** | **R11 v0.5.0 Preview** | 逐站授權、匯入自己的 R9 詞庫、預覽、明確勾選套用、還原；不是自動翻譯全網 |
| Chrome／Tampermonkey 舊版 | R5 v0.4.0 Preview | 離線用語校正及實驗性 Chrome 本機翻譯；保留作為舊版回退 |
| **品質稽核工作台** | **R12 獨立離線 HTML** | 匯入 R6 同題 A/B 譯文，檢查覆蓋與已知結構警示；**不代表模型品質已獲認證** |
| 研究／選詞工作台 | R8／R9／R10 獨立 HTML | 查詢語境、人工選詞、來源與反例；尚未驗證的詞不會自動變成翻譯規則 |
| 本地 CLI／AI Skill | 原型 | Markdown／TXT／部分 JSON/JSONL 安全詞彙處理、Codex／Claude 輔助規則 |

**下載入口：** [R11 Chrome ZIP＋Tampermonkey 單檔（v0.5.0）](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12 離線品質工作台](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [所有歷史 Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Chrome ZIP 必須先解壓縮，再到 `chrome://extensions` 開啟開發人員模式並載入含 `manifest.json` 的資料夾；**尚未上架 Chrome Web Store**。Tampermonkey 使用 `.user.js` 單一檔案。**請勿同時在同一網站啟用 R5 與 R11。**

舊版 R5 原始碼與安裝資料夾仍保留在 `dist/chrome/` 及 `dist/userscript/`，供相容性回測與必要時回退；建議一般使用者從 Releases 取得版本化安裝包。

詳見 [Chrome 安裝說明](docs/INSTALL_CHROME.md)、[Tampermonkey 安裝說明](docs/INSTALL_TAMPERMONKEY.md)、[R11 操作及安全限制](docs/R11_SITE_GLOSSARY.md)。

## 我們與 TAIDE／Taiwan-LLM 的區別

- **TAIDE、Taiwan-LLM 著重語言模型的理解與生成；我們著重任何翻譯結果如何被檢查、控制、在地化並安全套用到實際內容。** 模型可以成為未來經授權的 Provider，但本專案目前沒有內建、訓練或重散布 TAIDE 模型權重。
- **翻譯不等於亂改原始資料**：優先保護程式碼、專有名稱、JSON 鍵、網址與佔位符，遇到不明語境可保留原文。
- **使用者選詞自由**：例如 `menu` 在網站操作介面可為「選單」，在餐飲情境可為「菜單」，允許不同說法並存。
- **可驗證而非口號**：公開已凍結 R6 的 100 題回歸測試、結構檢查與人工審閱流程；**尚無獨立真人驗證的模型自然度成績**。

參考：[TAIDE 官方網站](https://www.taide.tw/) · [MiuLab/Taiwan-LLM](https://github.com/MiuLab/Taiwan-LLM)。專案互不隸屬，第三方模型使用須另外遵守其授權。

## 安全、隱私與詞庫原則

- **本機優先、無自家內容接收服務或背景遙測**。R11 使用者自己匯入的詞庫按網站分開保存在本機；可由使用者停止或還原。Chrome 的語言模型下載與原網站連線屬不同邊界，詳見 [隱私政策](PRIVACY.md)。
- 公開詞庫有 **883 筆待審候選、67 筆編輯種子**，R10 有 **40 筆尚未獨立驗證的語境案例**；數量不代表準確度，不自動將候選升級成可套用規則。
- R12 是**研究工具，不是新的翻譯引擎**；部分網站、手機瀏覽器、Canvas／WebGL、圖片／OCR、PDF 與完整自然文風控制仍未完成或未驗證。
- 不要求提供網頁原文與個資才能使用離線功能；分享詞彙、評測與 Issue 請先移除私人內容及受限第三方素材。

## 接下來的重點

**R13：** 小範圍、保留原文、可還原的雙語閱讀／選取翻譯原型；不直接升級 R11 正式網站替換行為。

**後續：** 可插拔且明確授權的 Provider、技術文件／Prompt 保真、可重現翻譯品質驗證與開源社群回饋。詳見 [簡明開發路線](docs/ROADMAP.md)、[功能狀態](docs/FEATURES.md)。

## 開發與參與

[GitHub Issue](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues) 歡迎提供**可公開、合法的**錯譯反例與使用問題；[貢獻說明](CONTRIBUTING.md) · [開發者指南](docs/DEVELOPER_GUIDE.md) · [Codex／Claude Skill](docs/AI_INTEGRATION.md) · [重點更新紀錄](CHANGELOG.md)。

開發者建置採 `tools/build.py`（R5）與 `tools/build_r11.py`（R11），CI 需通過 Node、Chromium、公開資料守門、原始碼與安裝產物一致性驗證。**任何未經授權的私人歷史、商業詞庫或機密都不會放入公開 GitHub。**

本專案獨立維護，不代表 OpenAI、Google、TAIDE 或其他第三方認可或背書；未來商業擴充獨立授權，不追溯限制已公開的 MIT 核心。
