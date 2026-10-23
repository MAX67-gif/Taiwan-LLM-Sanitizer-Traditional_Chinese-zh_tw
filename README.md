# Taiwan-LLM-Sanitizer｜臺灣繁中網頁／AI 技術內容在地化

> **Status: R1 prototype / 原型驗證中** · 2026-10-23 · MIT open core · zh-TW first

Taiwan-LLM-Sanitizer is an independent open-source project for making browser interfaces, open-source technical documents and AI prompts easier to use in **Traditional Chinese as used in Taiwan (zh-TW)**. It prioritizes meaning preservation, syntax safety, privacy, and reversible changes.

**This is an independent project; it is not affiliated with OpenAI, Google, Tampermonkey, any particular website, game or translation service. No funding or approval is claimed.**

**正式定位：通用型臺灣繁體中文在地化平台。PokeBonk 只曾是發想案例，沒有任何網站或遊戲被寫成必備支援範圍；Tampermonkey 只是其中一個可選擇的轉接器，不是產品本身。**

## 第一個交付介面：網頁文字在地化（非產品範圍上限）

- **Chrome / Chromium Manifest V3 擴充功能**：使用者點擊工具列按鈕，選擇「翻譯此頁」或「還原原文」。僅使用 `activeTab` 的暫時權限，不要求讀取所有網站。
- **單檔 Tampermonkey 使用者腳本**：可按網站分別啟用、停用與還原；安裝後不需要第二個驅動腳本。
- **共用核心**：語境詞庫、文字保護、DOM 監控採同一原始碼，避免 Chrome 與 Tampermonkey 產生兩套互相矛盾的規則。
- **動態頁面**：監控新增與更新的可見 DOM 文字；跳過程式碼、編輯欄、密碼輸入、script/style/canvas 等。
- **翻譯策略：** R1 提供保守離線詞彙轉換；完整多語自然語言翻譯、瀏覽器內建 Translator API、可選自有 Provider 仍須逐一開發並驗證，不宣稱已完成或保證每頁可用。

### 快速開始

**Chrome 擴充功能（尚未上架 Chrome Web Store）**

1. 在 [Repository](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw) 下載 ZIP 並解壓縮。
2. 開啟 Chrome `chrome://extensions` → 開發人員模式 →「載入未封裝項目」→ 指定 **`dist/chrome/`** 目錄。
3. 開啟一般 HTTP(S) 網站後點擴充功能圖示 → **啟用本站繁中化**，授權此網站。
4. 可隨時按 **停用本站並還原**；其他已開啟分頁可能需重新整理。

**Tampermonkey（可獨立安裝）**

1. 安裝 Tampermonkey，直接匯入 [單檔 Userscript](dist/userscript/TaiwanLLMSanitizer.user.js)。
2. 到任意一般 HTTP(S) 網站，從 Tampermonkey 腳本選單按 **切換本站啟用／停用**；預設所有網站都不會主動改寫。
3. 浮動按鈕可暫停／恢復，停用時還原目前仍由工具修改的文字。

**注意**：目前是開發版本。對於 Canvas／WebGL 繪製的遊戲內文字、跨來源 iframe、封閉 Shadow DOM、瀏覽器保護頁或圖片內文字，沒有保證可翻譯。跨語言全文翻譯依賴 Chrome 本機 Translator API 的實際可用性。尚未完成真實 PokéBonk 互動測試。

### 通用、自由且可擴充的使用原則

本工具不把任何特定網站、遊戲、產業或框架做成必須匹配的條件。使用者自行選擇合法且技術上能處理的頁面、文件與應用流程；Chrome 的逐網站權限與 Userscript 的逐站啟用，是保護使用者的安全同意機制，不是對用途的限制。對畫布、圖片、跨來源 iframe、封閉 Shadow DOM、PDF、程式語意等未支援介面，後續以獨立轉接器與可選翻譯供應者擴充，**不是宣稱現階段百分之百完整適配**。

## 開發規格及路線

- [R1 產品／授權正式基準](docs/PROJECT_BASELINE_R1.md)
- [Open-Core 與著作權政策](docs/OPEN_CORE_POLICY_R1.md)
- [通用多通路架構與狀態路由](docs/UNIVERSAL_ADAPTERS_R1.md)
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

## 使用者真正需要的完整平台願景

長期採「一個可重用本地化核心＋多種獨立轉接器」架構：Chrome／Edge／Firefox、Tampermonkey、Markdown／HTML／PDF 文件、CLI／批次工具、Python API／SDK、AI Prompt、JSON／JSONL 與具隱私選項的翻譯 Provider／OCR。R1 已完成的只有部分 DOM 字詞轉換與 Chrome／Userscript 原型，其他為 roadmap。詳見 [通用適配契約](docs/UNIVERSAL_ADAPTERS_R1.md)。
