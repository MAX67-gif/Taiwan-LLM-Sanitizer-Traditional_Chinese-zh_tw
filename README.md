# Taiwan-LLM-Sanitizer｜更安全的臺灣繁體中文在地化工具

**語言／Languages：** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> **本專案的工作是提供使用者可控的臺灣中文用語、翻譯顯示與技術內容保真工具，不是語言審查器，也不宣稱是任何第三方服務的官方產品。** 原創開源核心採 [MIT](LICENSE)；Founder／Steward：CA L.。

## 現在能使用什麼？

| 工具 | 現況 | 用途 |
| --- | --- | --- |
| **R13 安全雙語閱讀** | v0.6.0 Preview | 使用者明確啟用的網站：選取文字、原文與譯文對照、可選本機模型或手動貼入譯文；不修改原網頁 |
| **R11 逐站個人詞庫** | v0.5.0 Preview | 自行匯入用語、逐項預覽與確認、保守還原 |
| **R16 離線在地化安全工作台** | 獨立 Shadow Preview | 本機文件的保護檢查、人工候選、差異預覽與另存新檔；不會傳輸或覆寫來源 |
| **R14 Provider 能力檢查** | 獨立離線工具 | 檢查宣告的語言組、模型可用性、下載需求及逐站同意；**不會連接遠端翻譯服務** |
| **R15 技術文件結構保真** | 獨立離線 Shadow Preview | Markdown、JSON 與 Prompt 的保護區段、人工修改差異預覽、SHA256；**不會直接改寫原始檔案或呼叫翻譯模型** |
| **R12 翻譯品質稽核** | 獨立研究工具 | R6 凍結 100 題的覆蓋與結構檢查；**不是實際模型自然度認證** |
| **R5、R8／R9／R10、CLI／Skill** | 既有原型與研究工具 | 臺灣用語建議、人工選詞、有限文件處理與技術保護 |

**下載與使用：** [R13 雙語閱讀](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 逐站詞庫](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [所有目前可用的正式發布](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)。Chrome ZIP 需解壓並透過 `chrome://extensions` 載入未封裝擴充功能；Tampermonkey 匯入單一 `.user.js`，且須自行決定啟用網站。尚未通過 Chrome Web Store 驗證。保留既有 `dist/chrome/` 與 `dist/userscript/` 作為歷史 R5 本機相容性基準；一般安裝仍以經驗證的 Releases 為準。

## R16｜離線在地化安全工作台（獨立 Shadow Preview）

[開啟 R16 離線工作台](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [完整使用與安全限制](docs/R16_LOCALIZATION_STUDIO.md) · [三種原創文件範例](examples/r16/sample_readme.md)。把本機 Markdown／JSON／Prompt 的**結構保護、人工候選、差異預覽和另存新檔**整合為一條易懂的流程。來源只在本機瀏覽器記憶體中處理，報告不包含原文；下載預覽可能包含使用者輸入的全文，應自行保護。本功能**不會自動翻譯、不會把原文傳給雲端，也不會覆寫原檔**。仍是保守詞法掃描，不代表所有文件格式或語意均已驗證。

## R15｜技術文件安全預覽（獨立離線工具）

[開啟 R15 離線 Markdown／JSON／Prompt 結構保真工作台](examples/TW_Structured_Integrity_Lab_R15_20261025.html) · [查看安全 CLI 與格式限制](docs/R15_STRUCTURED_INTEGRITY.md)。R15 優先保留程式碼、JSON Key、網址、Prompt 角色與模板變數；僅由使用者選擇要預覽的修改，不提供自動翻譯、來源檔覆寫或任何遠端文字傳輸。這是保守 Shadow 工具，**不是完整格式 AST 或翻譯正確率驗證**。

## 九個可照著理解的實際範例

**[閱讀完整原創使用範例](docs/USAGE_EXAMPLES.md)**（含 `EX01–EX09`）：軟體／餐飲用語差異、R13 選取雙語閱讀、R11 個人詞庫、R14 模型可用性、R15 的 Markdown／JSON／Prompt 安全預覽，以及**一般網頁遊戲型網站的可行與不可行範圍**。

例如：如果一個自製測試網站把 `Open settings` 顯示為一般 DOM 文字，使用者可能透過 R13 手動選取顯示雙語對照；如果文字是 Canvas／WebGL 繪製，**現有工具就不能直接辨識或翻譯**。這是**原創合成示範**，不是任何第三方遊戲的相容性保證，且沒有重新發布任何專用腳本或詞庫。

**簡體中文使用者請看 [简体中文 README](README.zh-CN.md) 與 [简体中文示例](docs/USAGE_EXAMPLES.zh-CN.md)。** 六語內容需要同步更新，但真人母語審核尚待完成。

## 如何在第三方網站閱讀臺灣繁體中文？

**[通用網站翻譯與雙語閱讀教學](docs/WEBSITE_LOCALIZATION_GUIDE.md)**：說明使用 R13 選取與對照、R11 個人用語調整、取消與還原、Canvas／WebGL 的已知限制。這是通用工具教學，**不提供任何特定遊戲的安裝包、翻譯字庫、補丁、遊戲程式或非官方整合腳本**。使用者仍應自行確認網站條款及合法授權；教學並不構成第三方權利人的許可。

## 我們的產品特色

- **臺灣語境與選詞自主**：例如軟體 `menu` 可寫「選單」、餐飲 `menu` 可寫「菜單」；滑鼠 `click` 優先用「點選」，聲響與點閱統計不應一律套用。
- **優先保護程式與資料結構**：專名、網址、JSON keys、命令列旗標、模板佔位符及 Prompt 角色是重要保護對象；未驗證內容不應自動改寫。
- **可檢查與有條件還原**：區分模型能力、文字建議、結構檢查和人工品質評估，不以 CI 通過宣稱所有網站或語意正確。
- **隱私與合法來源**：使用者明確啟用、本機優先、沒有本專案自建的原文收集後端；第三方模型和網站有各自的資料政策及權利限制。

## 第三方著作權、商標與隱私

**[第三方內容與不侵權開發規範](docs/THIRD_PARTY_RIGHTS_POLICY.md)** · [安全政策](SECURITY.md) · [隱私政策](PRIVACY.md)。公開的文字、圖片、遊戲、程式碼或詞庫不表示可任意複製、翻譯、整合或再散布；非營利、註明出處或標示「非官方」都不是自動取得授權。若來源權利不明，預設不納入公共發行。

## 專案參與

[安裝說明](docs/INSTALL_CHROME.md) · [Tampermonkey 教學](docs/INSTALL_TAMPERMONKEY.md) · [功能與限制](docs/FEATURES.md) · [路線圖](docs/ROADMAP.md) · [貢獻指南](CONTRIBUTING.md) · [重要更新摘要](CHANGELOG.md)。技術資料和未經審核的私人內容不應提交到公開 Issues／PR。

**翻譯內容的法律責任與網站條款取決於具體使用情形；本專案不保證任何特定第三方網站授權或所有功能的普遍適用性。**
