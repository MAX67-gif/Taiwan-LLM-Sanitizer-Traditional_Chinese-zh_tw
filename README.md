# Taiwan-LLM-Sanitizer｜讓外語與技術內容更符合臺灣人的閱讀習慣

**語言 / Languages：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

**開源、可選詞、重視隱私的臺灣繁體中文在地化工具。** 不做文字審查，不宣稱所有譯法只有一個標準答案；使用者可以保留原文、決定用語，並在修改前查看差異。

> **產品定位：跨模型的臺灣繁中在地化控制與品質驗證層。** 我們提供跨模型的安全在地化、明確選詞與品質檢查，而非自行訓練大型語言模型。公開核心依 [MIT 授權](LICENSE)；專案發起及治理：**CA L.**。

## PokéBonk｜臺灣繁中顯示層示範（R7.2／v0.1.2）

**[PokéBonk 專用 README／安裝與安全說明](examples/pokebonk-demo/README.md)** · [直接取得獨立安裝檔](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)

可選擇的非官方 **Chrome／Tampermonkey 單檔示範**：以 171 筆原創示例詞條呈現部分臺灣常用語，新增合作房間等 35 筆**尚未經真站核對**的編輯候選，並加強玩家名稱、聊天與輸入欄位的保護。手動啟用、只處理可見 DOM 文字、支援條件式還原；**不修改遊戲狀態、存檔或網路，也尚未完成最新官方遊戲的端到端驗證。**

## R14：翻譯前能力與授權檢查（純離線 Shadow Preview）

新增 [R14 離線能力與授權檢查示範](examples/TW_Provider_Capability_Lab_R14_20261025.html) 與 [CLI／API 契約](docs/R14_PROVIDER_CAPABILITY.md)。可核對語言組、模型宣告可用性、下載需求與當次網站同意；**不連接遠端模型、不讀取網頁原文、不傳資料，也不取代 R13 v0.6.0 正式閱讀工具。** 示範資料不是裝置實機模型檢測。

## R13：安全雙語閱讀側車（獨立 v0.6.0 Preview）

可在已手動授權的網站**反白文字、原文／譯文對照、試用 Chrome 本機 Translator API 或自行貼譯文**。只讀選取、原網頁文字不改寫，不傳至本專案伺服器；模型不可用就明確告知，不假裝翻譯成功。新 R13 Chrome／Tampermonkey 版本與 R11 v0.5.0 獨立，詳見 [R13 操作與安全規格](docs/R13_BILINGUAL_READER.md)。

**UI 用語偏好：**滑鼠 `click／点击` 操作優先用「點選」；聲響或點閱統計不可一律套用。見 [R13 臺灣介面用語](docs/TAIWAN_UI_TERMS_R13.md)。

## 現在能使用什麼？

| 入口 | 最新可用版本 | 主要用途／限制 |
| --- | --- | --- |
| **PokéBonk 專用示範** | **R7.2 v0.1.2 Preview** | [獨立 README](examples/pokebonk-demo/README.md)；僅限非官方可見 DOM 示範，尚未取得真站完整驗收 |
| **Chrome／Tampermonkey（選取閱讀）** | **R13 v0.6.0 Preview** | 反白文字的原文／譯文側車，模型可用才試用 Chrome 本機翻譯；不修改網頁原文 |
| **Chrome／Tampermonkey（詞庫操作）** | **R11 v0.5.0 Preview** | 逐站授權、匯入自己的 R9 詞庫、預覽、明確勾選套用、還原；不是自動翻譯全網 |
| Chrome／Tampermonkey 舊版 | R5 v0.4.0 Preview | 離線用語校正及實驗性 Chrome 本機翻譯；保留作為舊版回退 |
| **品質稽核工作台** | **R12 獨立離線 HTML** | 匯入 R6 同題 A/B 譯文，檢查覆蓋與已知結構警示；**不代表模型品質已獲認證** |
| 研究／選詞工作台 | R8／R9／R10 獨立 HTML | 查詢語境、人工選詞、來源與反例；尚未驗證的詞不會自動變成翻譯規則 |
| 本地 CLI／AI Skill | 原型 | Markdown／TXT／部分 JSON/JSONL 安全詞彙處理、Codex／Claude 輔助規則 |

**下載入口：** [PokéBonk R7.2 非官方示範](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) · [R13 安全雙語閱讀 v0.6.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 Chrome ZIP＋Tampermonkey 單檔（v0.5.0）](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12 離線品質工作台](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [所有歷史 Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Chrome ZIP 必須先解壓縮，再到 `chrome://extensions` 開啟開發人員模式並載入含 `manifest.json` 的資料夾；**尚未上架 Chrome Web Store**。Tampermonkey 使用 `.user.js` 單一檔案。**請勿同時在同一網站啟用 R5 與 R11。**

舊版 R5 原始碼與安裝資料夾仍保留在 `dist/chrome/` 及 `dist/userscript/`，供相容性回測與必要時回退；建議一般使用者從 Releases 取得版本化安裝包。

詳見 [Chrome 安裝說明](docs/INSTALL_CHROME.md)、[Tampermonkey 安裝說明](docs/INSTALL_TAMPERMONKEY.md)、[R11 操作及安全限制](docs/R11_SITE_GLOSSARY.md)。

## 我們的特色｜與一般翻譯工具的不同定位

- **不是另一個大型語言模型**：本專案提供翻譯前後的詞彙選擇、結構保護、授權判斷及結果預覽；模型能力與本工具的驗收能力分開看待。
- **安全優先、使用者決定**：盡可能保留原文，先檢查程式碼、專有名稱、JSON Key、URL、模板變數與其他重要結構；遇到不明語境不強制替換。
- **臺灣用語取決於語境**：例如軟體 `menu` 可寫「選單」，餐飲 `menu` 可寫「菜單」；滑鼠操作 `click` 優先寫「點選」，不把所有用詞硬改成唯一標準。
- **可驗證、可回復**：維持可重現測試、人工審查和版本化發布；已公開的 R6 100 題屬回歸資料，**不是已經證實的翻譯自然度成績**。

此處介紹本專案實際提供的功能與限制，**不對其他專案做性能排名、模仿指控或官方關聯暗示**。

## 安全、隱私與詞庫原則

- **本機優先、無自家內容接收服務或背景遙測**。R11 使用者自己匯入的詞庫按網站分開保存在本機；可由使用者停止或還原。Chrome 的語言模型下載與原網站連線屬不同邊界，詳見 [隱私政策](PRIVACY.md)。
- 公開詞庫有 **883 筆待審候選、67 筆編輯種子**，R10 有 **40 筆尚未獨立驗證的語境案例**；數量不代表準確度，不自動將候選升級成可套用規則。
- R12 是**研究工具，不是新的翻譯引擎**；部分網站、手機瀏覽器、Canvas／WebGL、圖片／OCR、PDF 與完整自然文風控制仍未完成或未驗證。
- 不要求提供網頁原文與個資才能使用離線功能；分享詞彙、評測與 Issue 請先移除私人內容及受限第三方素材。

## 接下來的重點

**R13 已提供：** 小範圍、保留原文的雙語閱讀／選取翻譯獨立預覽，沒有修改 R11 的網站詞彙替換行為；真實桌面 Chrome 語言模型品質仍待使用者端驗證。

**後續：** 可插拔且明確授權的 Provider、技術文件／Prompt 保真、可重現翻譯品質驗證與開源社群回饋。詳見 [簡明開發路線](docs/ROADMAP.md)、[功能狀態](docs/FEATURES.md)。

## 開發與參與

[GitHub Issue](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues) 歡迎提供**可公開、合法的**錯譯反例與使用問題；[貢獻說明](CONTRIBUTING.md) · [開發者指南](docs/DEVELOPER_GUIDE.md) · [Codex／Claude Skill](docs/AI_INTEGRATION.md) · [重點更新紀錄](CHANGELOG.md)。

開發者建置採 `tools/build.py`（R5）、`tools/build_r11.py`（R11）及 `tools/build_r13.py`（R13），CI 需通過 Node、Chromium、公開資料守門、原始碼與安裝產物一致性驗證。**任何未經授權的私人歷史、商業詞庫或機密都不會放入公開 GitHub。**

本專案獨立維護，不代表任何第三方認可或背書；未來商業擴充獨立授權，不追溯限制已公開的 MIT 核心。