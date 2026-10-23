# Taiwan-LLM-Sanitizer｜臺灣繁中網頁／AI 技術內容在地化

> **Status: R3 preview 0.3.0 / 原型驗證中** · 2026-10-23 · MIT open core · zh-TW first

Taiwan-LLM-Sanitizer is an independent open-source project for making browser interfaces, open-source technical documents and AI prompts easier to use in **Traditional Chinese as used in Taiwan (zh-TW)**. It prioritizes meaning preservation, syntax safety, privacy, and reversible changes.

**This is an independent project; it is not affiliated with OpenAI, Google, Tampermonkey, any particular website, game or translation service. No funding or approval is claimed.**

**正式定位：通用型臺灣繁體中文在地化平台。沒有任何指定網站、遊戲或產業是產品的必要條件；Tampermonkey 只是其中一個可選擇的轉接器，不是產品本身。**

## R3 新功能：臺灣語境詞庫與非文字審查原則（2026-10-24）

- **883 筆分類候選詞條**：保存在 [R3 多領域詞庫](lexicon/candidates_r3.json)，涵蓋 UI、工程、AI、金融、旅遊、醫療、教育、遊戲、媒體、日常等 16 類。這些是**編輯產生、待獨立審核的候選**，**不會自動替換**，不可宣稱官方認證。
- **67 筆保守啟用種子詞**：[approved_r3.json](lexicon/approved_r3.json)，其中 35 筆預設適用，32 筆須明確領域。既有 R2 規則保留，不以地區用語進行懲罰或審查。
- **Menu/菜单 多義處理**：UI 導覽「選單」、餐飲「菜單」，未確認語境即保留原文。個人與網站翻譯偏好未來可繼續擴充。
- **本機 CLI 可指定領域**：加 `--domain ui`、`--domain food` 或其他已列出的領域；預設 general 以降低過度轉換。
- **沒有文字獄**：使用者有權選擇原文、臺灣說法或其他慣用語。技術詞庫是可審查的語言資料，不是強制語言正確性清單。
- **Privacy-first 架構**：不自行蒐集或外傳造訪內容，不安插背景追蹤；逐站模式設定僅本機保存。瀏覽器可能下載翻譯語言包，應與「偷偷上傳頁面文字」分開理解。

**不用寫程式的離線示範：** 下載並開啟 [臺灣語境詞庫探索器（單一 HTML）](examples/TW_Lexicon_Explorer_R3_20261024.html)。它提供 883 筆候選搜尋、領域與審核狀態篩選，資料完全內嵌、不呼叫網路。亦可從 GitHub Raw 下載原始 HTML。

**瀏覽器新增功能：** 使用者可在 Chrome 擴充功能或 Tampermonkey 面板自行選擇「自動／介面／餐飲／AI／軟體／金融等詞彙領域」，設定只存在本機且可停用；CLI 可使用 `--domain` 指定相同範圍。

說明： [詞庫治理](docs/LEXICON_GOVERNANCE_R3.md) · [市場差異化](docs/COMPETITIVE_RESEARCH_R3.md) · [網頁 Overlay 規格（尚未完成）](docs/WEBSITE_OVERLAY_ARCHITECTURE_R3.md) · [隱私技術契約](docs/PRIVACY_FIRST_TRANSLATION_R3.md) · [R3 階段接續](docs/R3_PHASE_HANDOFF_20261024.md)。

## R2 操作重點

**一般使用者不用寫程式。** 下載倉庫 ZIP，Chrome 直接載入 `dist/chrome/` 或 Tampermonkey 直接安裝 `dist/userscript/TaiwanLLMSanitizer.user.js`。離線詞彙模式不需模型；想做英／日／韓等完整句子翻譯時，手動切換到「Chrome 本機 AI（實驗性）」並選擇原文語言。R2 使用 Chrome Translator API，本機模型功能依實際瀏覽器能力提供；可撤回、可還原、無遠端 API 金鑰。

**哪些仍未完成：** Canvas／WebGL／圖片 OCR、跨來源受限頁面、完整 HTML/PDF 文件處理、Prompt 安全語意重構、人工審稿品質承諾、Firefox 本機模型相容。完整需求仍在 roadmap，不會為了短期發布而限制你能使用的合法網站。

## 第一個交付介面：網頁文字在地化（非產品範圍上限）

- **Chrome / Chromium Manifest V3 擴充功能**：使用者點擊工具列按鈕，選擇「翻譯此頁」或「還原原文」。僅使用 `activeTab` 的暫時權限，不要求讀取所有網站。
- **單檔 Tampermonkey 使用者腳本**：可按網站分別啟用、停用與還原；安裝後不需要第二個驅動腳本。
- **共用核心**：語境詞庫、文字保護、DOM 監控採同一原始碼，避免 Chrome 與 Tampermonkey 產生兩套互相矛盾的規則。
- **動態頁面**：監控新增與更新的可見 DOM 文字；跳過程式碼、編輯欄、密碼輸入、script/style/canvas 等。
- **翻譯策略：** R2 提供兩種明確模式：R1 離線詞彙與通用 UI 短詞校正，以及使用者自行切換、依環境可用性執行的 Chrome 本機 AI 翻譯（R2 Preview）。不會把頁面內容私自傳送到雲端。來源語言不明、模型不可用或佔位符錯亂時，保留原文或安全降級為離線詞彙。

### 快速開始

**Chrome 擴充功能（尚未上架 Chrome Web Store）**

1. 在 [Repository](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw) 下載 ZIP 並解壓縮；已內附 `dist/chrome/`，不需要額外執行程式。
2. 開啟 Chrome `chrome://extensions` → 開發人員模式 →「載入未封裝項目」→ 指定 **`dist/chrome/`** 目錄。
3. 開啟一般 HTTP(S) 網站後點擴充功能圖示。先選 **離線詞彙** 或 **Chrome 本機 AI（實驗性）**，可選來源語言，再按 **啟用本站繁中化** 並確認授權。
4. 可隨時按 **停用本站並還原**；其他已開啟分頁可能需重新整理。

**Tampermonkey（可獨立安裝）**

1. 安裝 Tampermonkey，直接匯入倉庫內的 [單檔腳本](dist/userscript/TaiwanLLMSanitizer.user.js)；不必另外產生驅動程式。
2. 到任意一般 HTTP(S) 網站，從 Tampermonkey 腳本選單按 **切換本站啟用／停用**；預設所有網站都不會主動改寫。
3. 浮動工具有 **暫停／還原、切換離線／本機 AI、選擇原文語言**；或從 Tampermonkey 選單操作。停用會還原仍由工具控制的文字。

**注意**：目前是開發版本。對於 Canvas／WebGL 繪製的遊戲內文字、跨來源 iframe、封閉 Shadow DOM、瀏覽器保護頁或圖片內文字，沒有保證可翻譯。R2 本機翻譯取決於 **桌面 Chrome 138+** 與語言模型是否可用；瀏覽器首次使用可能下載語言包。自動來源語言辨識無把握時請手動指定。Chrome/Edge/Firefox 的實際支援不同，不代表所有 Chromium 瀏覽器皆可使用本機模型。尚未完成跨網站的大規模相容性實測。

### 通用、自由且可擴充的使用原則

本工具不把任何特定網站、遊戲、產業或框架做成必須匹配的條件。使用者自行選擇合法且技術上能處理的頁面、文件與應用流程；Chrome 的逐網站權限與 Userscript 的逐站啟用，是保護使用者的安全同意機制，不是對用途的限制。對畫布、圖片、跨來源 iframe、封閉 Shadow DOM、PDF、程式語意等未支援介面，後續以獨立轉接器與可選翻譯供應者擴充，**不是宣稱現階段百分之百完整適配**。

已提交的 `dist/` 檔案可直接安裝；維護者修改 `src/` 後可用 `python tools/build.py` 重新產生，兩者應保持一致。

## 本機批次轉換（R1 已有基本功能）

除了網頁介面，目前也提供共用核心的 **Node.js CLI**。它並不依賴瀏覽器或 Tampermonkey，也不會將文件送上雲端。先安裝 Node.js 20+，即可在專案資料夾執行：

```bash
node tools/localize_cli.js --input ./documents --output ./localized
node tools/localize_cli.js --input ./data.json --output ./localized --json-strings
node tools/localize_cli.js --input ./documents --output ./localized --dry-run
```

支援部分 `.md/.txt/.json/.jsonl`。Markdown 程式碼區塊與程式用特殊字串會保留；JSON 預設不做內容變動，只有使用 `--json-strings` 才轉換部分人類可讀的值；欄位鍵名和機器識別欄位不修改。輸出必須是不同資料夾。CLI 目前仍只支援少量離線常見字詞，不是任意英文全文翻譯。

## 開發規格及路線

- [R2 Provider 架構與使用限制](docs/PROVIDER_ARCHITECTURE_R2.md)
- [R2 驗收與已知限制](docs/R2_RELEASE_VERIFICATION.md)
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

長期採「一個可重用本地化核心＋多種獨立轉接器」架構：Chrome／Edge／Firefox、Tampermonkey、Markdown／HTML／PDF 文件、CLI／批次工具、Python API／SDK、AI Prompt、JSON／JSONL 與具隱私選項的翻譯 Provider／OCR。R2 已增加可選 Chrome 本機翻譯 Provider、非同步 DOM、防停用後競態覆寫與回歸測試，但不保證每個 Chrome 環境都有模型；文件 SDK／OCR 等大型功能仍屬 roadmap。詳見 [通用適配契約](docs/UNIVERSAL_ADAPTERS_R1.md)。
