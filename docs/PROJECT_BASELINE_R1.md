# Taiwan-LLM-Sanitizer 專案基準規格 R1

- **基準日期**：2026-10-23
- **倉庫**：https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
- **狀態**：規格已確認；程式 R1 是原型，未經真實網站全面驗證／尚未上架商店
- **治理規則**：本檔定義跨版本不可靜默更動的決策。新增功能只能加法式擴充；必要 breaking changes 必須另開 RFC、遷移計畫、回歸測試。

## 0. 決策來源與優先序

原始 Google AI 匯出對話有九輪：第六輪明確選 **B＝Open-Core（公開 MIT 核心＋獨立商用擴充）**；第九輪將目標擴充為外語／非臺灣用語的開源技術文件、程式註解、Prompt 翻譯與在地化。2026-10-23 最新使用者指令新增第一條實戰產品主線：Chrome 插件／可獨立運作的 Tampermonkey 腳本，以任意一般網站作為可選測試，不限定任何個別網站或遊戲；Tampermonkey 僅為一種交付轉接器。前期對話同名「方案 B＝AI Benchmark」**不是**此商業方案 B。若有衝突，以使用者後來的明確要求及合法合規限制為準。

## 1. 使命、定位與成功定義

使命：造福臺灣繁體中文使用者，把公開可依法處理的外語或非臺灣用語技術內容轉為符合臺灣語境、可理解又不損傷原語意的文本。人類不用懂程式也能用，進階開發者能嵌入工作流。

- **主要使用者**：臺灣一般網頁使用者、開源維護者、技術文件閱讀者、AI Prompt 作者、RAG／資料工程開發者。
- **核心差異**：不是通用「簡轉繁」、不是新語言模型、不是遊戲修改器；重視技術結構安全、語境及可逆性。
- **可檢驗指標**：可正常開關／還原、字詞準確率、程式區塊誤改數=0、UI 中斷率、相同輸入的重複轉換穩定性；後續獨立採用者、Issue／PR 與持續維護紀錄。
- **不宣稱**：已獲 OpenAI 贊助、已有使用者、100% 翻譯所有網頁，或取得任何第三方平台的正式授權。

## 2. 已鎖定的四條能力主線

**M1 Tech-Term Localizer（必要）**：臺灣用語字典、上下文規則、不得改寫的品牌／API 名稱／碼詞保護、詞庫來源及歧義標註、輸入輸出 diff、可逆記錄。

**M2 Context-Aware Prompt Tuner（規劃）**：多語 Prompt 在地化；保留 system/developer/user 邊界、Markdown code fences、JSON keys、指令語意、role、佔位符與資料界線。未取得足夠品質驗證不得自動覆寫原 Prompt；預設先提供預覽。

**M3 Structured Data Pipeline（R1 基礎 CLI 已實作／完整管線規劃）**：文件去雜訊、保留出處／權限／授權、可追溯 chunk metadata、JSON／JSONL，防止機密資料上傳及 RAG 垃圾內容污染。R1 不宣稱已完成 PDF OCR 或複雜版面還原。

**M4 Browser Adapters（R1 優先）**：Chrome Manifest V3 擴充功能及單檔 Tampermonkey userscript，採共用文字詞彙與 DOM 節點處理核心；翻譯引擎可插拔，先本機／離線優先。

## 3. 第一期產品：網頁繁中化

流程：使用者點擊啟用 → 判斷來源網站與文本類型 → 跳過敏感／不可改區域 → 本機翻譯能力探測 → 在臺灣詞彙層校正 → 只改 **可見 DOM 文字節點** → 監測動態新增 DOM → 隨時暫停及還原。

R1 策略：Chrome 擴充功能按頁面點擊後啟用；Tampermonkey 單檔腳本可逐網站開啟；無網路翻譯服務、無遙測、無伺服器側金鑰。Chrome 本機 Translator API 非必然可用，詞庫離線回退只涵蓋有限詞條。

**五態路由**：

| 狀態 | 條件 | 動作 |
| --- | --- | --- |
| LOCALIZED | 命中明確詞彙／本機翻譯且保護驗證通過 | 僅替換 DOM 文字 |
| UNCHANGED | 臺灣用語、專有名詞或無可安全更改之詞 | 保留原文 |
| DEFERRED | 等待模型下載、未確定語意、延後重試 | 先顯示原文，不編造翻譯 |
| PROTECTED | 程式碼、輸入框、密碼、隱藏欄、結構標記 | 不觸碰 |
| UNSUPPORTED | Canvas／WebGL、圖片文字、跨域 iframe、封閉 Shadow DOM | 明確告知限制 |

此五態用於程式內部決策；R1 的 UI 狀態輸出可簡化，但不能以「翻譯成功」誤包裝 DEFERRED 或 UNSUPPORTED。

## 4. 通用性與使用自由（2026-10-23 最新決策）

使用者可以自行選擇任何合法且可存取的網站、文件或應用程式。**不得針對任一遊戲、網站、行業或產品硬編碼支援限制、商標或站點特有行為**。Chrome／Tampermonkey 是不同介面，專案真正核心是通用在地化引擎與其可插拔 Provider。安全授權控制屬瀏覽器要求，不構成產品用途限制。

Canvas／WebGL、OCR、跨來源 iframe、文件及桌面等屬未來需獨立適配的 Render/Input Surface；不得虛稱已能通用翻譯所有介面。產品需要 `SUPPORTED_LOCAL`、`PARTIAL_SAFE`、`PROTECTED`、`DEFERRED`、`UNSUPPORTED_SURFACE`、`BLOCKED_BY_PERMISSION` 等非二元路由，優先保留不能安全處理的原文。

## 5. 跨平台契約

- **唯一核心**：`src/core/engine.js`（通用規則與 DOM 原型），由 `tools/build.py` 產生 Chrome 交付檔與單檔 userscript；後續對多平台抽取 core API。
- **擴充權限**：Chrome 採 MV3 + `activeTab` + `scripting` + 使用者逐站選用的 optional host permission，不在安裝時取得所有網站讀取權；禁止遠端執行碼、CDN、未經同意雲端翻譯。
- **TM 獨立**：腳本發布後可單檔運作，逐網域預設關閉；不能依賴第二支初始化碼、額外線上資源或私有伺服器。
- **UI**：啟動、停止、還原、能力／翻譯狀態提示；絕不可攔截網頁按鍵及站方按鈕。
- **可逆性**：只回復由本工具更改且沒有被網站再度改動的內容，避免覆蓋頁面本身的新狀態。
- **回歸門檻**：程式／JSON 靜態檢查、核心測試、userscript 產生物一致性、瀏覽器實際啟停回復測試。

## 6. 授權／商業決策（第六輪不可矛盾）

採 **Open-Core**，本公開倉庫所有自行發布之核心碼原則採 MIT；對公眾實際可用，不是故意限制功能的空殼。已公開 MIT 程式容許商用、修改、散布，不能事後單方撤回既有授權。未來獨立進階字典、企業整合、託管服務等可另採付費協議，但不得偷用開源社群 PR 貢獻者未授權之作品。公眾 GitHub 不上傳付費商業祕密、API 密鑰、私有詞庫；品牌／商標授權另行處理。詳細見 OPEN_CORE_POLICY_R1.md。

## 7. 版次與交付

- R1：GitHub 產品基準、MIT、Chrome／TM 離線 DOM 原型、共用核心的保守 Node.js CLI（Markdown／TXT／部分 JSON/JSONL）、隱私、測試、來源標示；多語整頁翻譯、完整文件／SDK／OCR 等不在已實作能力清單。
- R2（需驗證再升級）：翻譯品質研究、語言偵測穩健性、差異預覽、Chrome 翻譯可用性矩陣、對 Shadow DOM／受限網頁的支援研究。
- R3（長期）：強化現有 CLI 的語法級文件解析、多檔技術文檔與 Prompt 管道、JSONL 語意驗證、插件 API、獨立詞庫品質評測與社群詞彙貢獻流程。

**禁區**：不得以 MIT 限商；不得引用虛構用戶數／申請成功；不得將付費功能依賴本專案所獲 OSS API credits 作私人研發；不得假借在地化名義宣稱取得第三方系統控制權。

## 8. 完成與未完成

目前完成：規格基準、MIT 開源核心、瀏覽器兩種原型、保守 CLI、單元測試與 CI 建置。未完成：跨語言全部語料翻譯的全面驗證、Chrome Web Store 發布、任意目標網站逐一完整驗證、真實開源採用率與 OpenAI 申請通過證據。應逐步以可重現結果更新，不可提前宣稱成功。

## 9. 參考來源

- 使用者提供之 Google AI 九輪對話匯出（**個人內容不複製進公開 Repo**）
- https://opensource.org/license/mit
- https://developer.chrome.com/docs/ai/translator-api
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://www.tampermonkey.net/documentation.php
- https://openai.com/form/codex-for-oss/

## 10. 全域產品願景、能力分層與正式路由

從「可在 Chrome 翻譯文字」升級為「一個核心／多個使用介面」，必須逐階段涵蓋：標準網頁及 SPA、跨瀏覽器、獨立 Userscript、技術文檔（Markdown／HTML／PDF／Office）、CLI／API／SDK、AI Prompt 保真處理、JSON／JSONL、模型 Provider、可選 OCR 與非 DOM 畫面。任何一個轉接器都不得主導整個專案；每種能力應公開標記 `IMPLEMENTED`、`PROTOTYPE`、`PLANNED` 或 `UNSUPPORTED`。詳細契約見 `UNIVERSAL_ADAPTERS_R1.md`。
