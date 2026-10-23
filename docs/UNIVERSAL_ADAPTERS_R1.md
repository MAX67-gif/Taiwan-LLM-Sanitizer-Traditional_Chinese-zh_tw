# 通用多通路在地化架構 R1（2026-10-23）

**產品北極星：一個臺灣繁體中文（zh-Hant-TW）在地化核心，讓使用者自由選擇不同網頁、技術文件、AI Prompt、CLI、SDK 或其他可合法處理的內容。** 不指定或限制任何網站、遊戲、產業；Tampermonkey 只是輕量介面之一。

## 核心處理鏈

Input Adapter → Capability Probe → Structure/Code Protector → Language Detection → Translation Provider + Tech-Term Localizer → Semantic Integrity Guard → Preview/Diff → Output Adapter → Rollback/Audit。

**R1 實作包含：DOM Adapter、少量離線規則替換、部分結構保護、關閉還原，以及共用核心的本機檔案 CLI（保守模式）。** 不可把上述架構圖當作已完整實作。

## Adapter 與 Provider 擴充契約（規劃）

- Adapter 宣告 `id`、`supported_inputs`、`supported_outputs`、`required_permissions`、`capabilities`、`known_limitations`。
- Provider 宣告 `id`、`offline`、`supported_languages`、`max_payload`、`cost`、`data_transfer_policy`、`placeholder_integrity`。
- Input 不可直接呼叫 Chrome／Tampermonkey 的私有 API。通用轉換邏輯放 core，介面僅做授權、讀取、輸出與控制。
- 資料預設本地處理；需要傳雲端才能翻譯時，必須提供使用者可理解的明確同意與撤銷機制。

## 多通路支援矩陣

| 使用介面 | 正式目標 | R1 實際狀態 |
| --- | --- | --- |
| Chrome／Chromium MV3 | 各種網頁、SPA | PROTOTYPE：有限 DOM 字詞 |
| Tampermonkey | 任意使用者自行選擇之普通網頁 | PROTOTYPE：有限 DOM 字詞 |
| Edge／Firefox | 跨瀏覽器 | PLANNED；Chromium 相容不等於已完成驗證 |
| Markdown／HTML 文件 | 專案 README、開源文件、說明書 | Markdown 部分詞彙轉換為 PROTOTYPE；HTML 文件解析仍 PLANNED |
| PDF／Office／圖片 | 文件與 OCR | PLANNED／RESEARCH |
| CLI／批次處理 | 本地檔案批次、Pipeline | PROTOTYPE：Node.js CLI 保守處理部分 Markdown／TXT／JSON／JSONL |
| API／Python SDK | 供任何其他開源專案重用 | PLANNED |
| AI Prompt Tuner | 保留角色與結構語意 | PLANNED |
| JSON／JSONL | Structured Data Pipeline | PROTOTYPE：明確加 --json-strings 才修改部分字串值，保留欄位鍵與機器識別 |
| Translation Providers | Chrome 本地模型／自訂本地模型／使用者授權雲端 | PLANNED；本版只提供簡單離線規則 |

## 非二元路由

- `SUPPORTED_LOCAL`：明確離線可處理且通過安全檢查，才改寫。
- `SUPPORTED_PROVIDER_OPT_IN`：需要使用者授權的翻譯 Provider，等待授權與可用性確認。
- `PARTIAL_SAFE`：只處理不破壞結構的片段，其餘留原文。
- `REVIEW_REQUIRED`：歧義、專名、法律／醫療、含指令語意的 Prompt，先預覽。
- `PROTECTED`：程式碼、網址、JSON Keys、私密輸入欄位，不改。
- `DEFERRED`：處理中、模型尚不可用，顯示原文與原因。
- `UNSUPPORTED_SURFACE`：圖片文字、Canvas、WebGL、隔離 iframe，僅告知限制。
- `BLOCKED_BY_PERMISSION`：未授權或瀏覽器不可存取，不嘗試繞過。

**品質承諾不是 100% 保證，而是可驗證的覆蓋率、誤譯率、還原率與明確限制。** 網站類型不構成阻擋，只有授權、結構風險或實際支援能力影響對應功能。

## 使用體驗路線

跨介面相同詞庫／規則、自訂詞彙、兩欄 diff、單擊還原、逐站設定、離線與使用者選擇的翻譯提供者、使用前安全預覽、效能上限、無障礙與正規化 UTF-8；真正有使用者的社群回報後，才考慮擴充產品範圍。

## R1 已實作的第三種入口：本機 CLI

`node tools/localize_cli.js --input ./documents --output ./localized` 可處理部分 Markdown/TXT，`--json-strings` 可以明確選擇轉換 JSON／JSONL 的非機器識別字串。`--dry-run` 不寫檔。核心規則與瀏覽器同源，不依賴 Tampermonkey、網路翻譯 API 或 Python 外部套件；輸出不可指向來源資料夾，程式碼區塊、網址及部分佔位符受保護。這是離線詞彙原型，不是任意語言全文翻譯。
