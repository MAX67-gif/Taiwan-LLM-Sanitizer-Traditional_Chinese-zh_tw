# Taiwan-LLM-Sanitizer｜臺灣繁中網頁／AI 技術內容在地化

> **Status: R1 prototype / 原型驗證中** · 2026-10-23 · MIT open core · zh-TW first

Taiwan-LLM-Sanitizer is an independent open-source project for making browser interfaces, open-source technical documents and AI prompts easier to use in **Traditional Chinese as used in Taiwan (zh-TW)**. It prioritizes meaning preservation, syntax safety, privacy, and reversible changes.

**This is NOT affiliated with OpenAI, Google, Tampermonkey or any website/game. No funding or approval is claimed.**

## 第一個可用方向：網頁即時繁中化

- **Chrome / Chromium Manifest V3 擴充功能**：使用者點擊工具列按鈕，選擇「翻譯此頁」或「還原原文」。僅使用 `activeTab` 的暫時權限，不要求讀取所有網站。
- **單檔 Tampermonkey 使用者腳本**：可按網站分別啟用、停用與還原；安裝後不需要第二個驅動腳本。
- **共用核心**：語境詞庫、文字保護、DOM 監控採同一原始碼，避免 Chrome 與 Tampermonkey 產生兩套互相矛盾的規則。
- **動態頁面**：監控新增與更新的可見 DOM 文字；跳過程式碼、編輯欄、密碼輸入、script/style/canvas 等。
- **翻譯策略**：優先使用瀏覽器本機 Translator API（支援及語言包具備時）；不可用時只做已知臺灣詞彙／介面短句轉換，**不宣稱完整翻譯**。不會私自將頁面文字送到雲端 API。

### 快速開始

**Chrome 擴充功能（尚未上架 Chrome Web Store）**

1. 在 [Repository](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw) 下載 ZIP 並解壓縮。
2. Chrome 開啟 `chrome://extensions` → 開啟「開發人員模式」→「載入未封裝項目」→ 選取 **`extension/`** 資料夾。
3. 開啟普通的 HTTPS 網頁，點擊「TW 網頁繁中化」擴充功能圖示 → **翻譯此頁**。
4. 需要取消時按 **暫停並還原**。瀏覽器內建翻譯 API 首次使用可能下載語言包。

**Tampermonkey（可獨立安裝）**

1. 安裝 Tampermonkey；新增使用者腳本，將 [userscript/TaiwanLLM-TW.user.js](userscript/TaiwanLLM-TW.user.js) 的完整內容貼入並儲存。
2. 到一般網頁，右下角點「TW」→「翻譯」啟用**該網站**。預設不翻譯。
3. 點「還原」恢復原文。每個網站啟用狀態只保存在本機的 Tampermonkey 設定。

**注意**：目前是開發版本。對於 Canvas／WebGL 繪製的遊戲內文字、跨來源 iframe、封閉 Shadow DOM、瀏覽器保護頁或圖片內文字，沒有保證可翻譯。跨語言全文翻譯依賴 Chrome 本機 Translator API 的實際可用性。尚未完成真實 PokéBonk 互動測試。

### PokéBonk 示例（與遊戲無關的獨立翻譯工具）

PokéBonk 官方網站原本就提供 **ZHT（繁體中文）**；**請優先使用遊戲原生 ZHT 選項**。本專案不提供自動遊玩、修改遊戲邏輯、封包攔截或數值修改，不包含遊戲素材與名稱商標；只在使用者授權時處理一般可見 DOM 文字。網站使用者仍應遵守該站條款。

## 開發規格及路線

- [R1 產品／授權正式基準](docs/PROJECT_BASELINE_R1.md)
- [Open-Core 與著作權政策](docs/OPEN_CORE_POLICY_R1.md)
- [網頁即時繁中化 MVP 設計及限制](docs/WEB_TRANSLATION_MVP_R1.md)
- [OpenAI Codex for OSS 申請：證據清單](docs/CODEX_OSS_EVIDENCE_R1.md)
- [安全揭露](SECURITY.md) · [參與貢獻](CONTRIBUTING.md) · [隱私](PRIVACY.md)

## 專案長期方向

1. **Tech-Term Localizer**：臺灣技術用語、上下文與專有名詞保護。
2. **Context-Aware Prompt Tuner**：保持 Prompt 權限、變數、角色及格式語意。
3. **Structured Data Pipeline**：清洗與可追溯 JSON／JSONL／RAG 文件處理。
4. **Browser Adapters**：Chrome MV3、Tampermonkey，以及經授權的其他瀏覽器／桌面情境。

## Licensing

Published code and public data in this repository are licensed under [MIT](LICENSE), except for assets with separately documented third-party terms. This is an **Open-Core** project: any future proprietary modules must remain separately packaged/licensed. Already published MIT versions retain their grant; MIT permits commercial use, redistribution and modification. Trademark rights are not granted. No hidden paid material or third-party copyrighted game resources are included.

Source and license references: [MIT](https://opensource.org/license/mit) · [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api) · [Chrome MV3 scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) · [Tampermonkey docs](https://www.tampermonkey.net/documentation.php) · [Codex for OSS](https://openai.com/form/codex-for-oss/).
