# R14｜Provider Capability & Consent Router（離線安全決策預覽）

> 2026-10-25 · 獨立 R14 Preview · MIT 核心 · 不含模型權重、雲端請求、資料外傳或任何實際翻譯行為。

## 使用者真正需要知道什麼？

在翻譯前確認：翻譯來源是本機規則、本機模型、或遠端服務？裝置是否已宣告支援指定語言組？需要使用者明確下載模型嗎？可能涉及費用、保留資料、對外網路嗎？若未知，應清楚顯示 UNKNOWN、保留原文，而非假裝一切都能翻譯。

這個工具本身**不呼叫 Chrome Translator API，也沒有檢測真實裝置模型可用性**。能力來自示例的或呼叫者提供的結構化欄位，不是由第三方證明。公開 R6 固定 100 題的品質結果、R11 詞庫改寫、R13 雙語閱讀均不在此版升級。未經真人審查的中文自然度或安全保證不可宣稱已完成。

## 可直接使用的三種入口

1. 單檔離線頁：[R14 Provider 安全能力與授權預覽](../examples/TW_Provider_Capability_Lab_R14_20261025.html)；下載後開啟，選來源模式、語言、網站、模擬授權狀態，按「檢查能力與授權」。**完全不會下載模型、連雲端或保存網頁內容。**
2. Node CLI：`node tools/r14_capability_cli.js --input examples/TLS_R14_Provider_Capability_Demo_20261025.json`。讀取自己電腦上的 JSON，輸出不含原始文字的判定 JSON；不覆寫來源檔。
3. CommonJS 模組：`require('./src/core/provider_capability_r14.js').evaluateProviderCapability(input)`；瀏覽器可透過 `globalThis.TLSProviderCapabilityR14` 使用，無外部依賴。

## v0.1 安全 Schema

純函式 `evaluateProviderCapability({provider,request,site,consent,now})`：

- `provider`：`id`, `version`, `mode`（`offline_rules`、`on_device`、`remote_opt_in`）、精確宣告的 `languagePairs` 二維陣列、`availability`（`available`、`downloadable`、`downloading`、`unavailable`、`unknown`）、布林 `requiresNetwork`, `requiresDownload`、`pricing`, `retention`, `privacyUrl`。
- `request`：`sourceLanguage`, `targetLanguage`（簡化 BCP 47 形式，精確匹配，不自動把 `zh` 當 `zh-Hant`）、正整數 `sequence`、12–96 字元 `nonce`、布林 `cancelled`。
- `site`：僅限**完整且規範化的 HTTP(S) origin**，例如 `https://example.org`；不收 path/query/fragment，拒絕 `file://`、帳密 URL、不規範 port 大小寫等，避免權限誤判。
- `consent`：可為 `null`，或完整 `{origin,providerId,status,expiresAt,sequence,nonce}`；`status` 僅能 `explicit_granted`、`denied`、`revoked`、`expired`、`unknown`。跨網站、不同 Provider、過期、nonce/sequence 不一致一律拒絕。這是**當次授權憑證的靜態檢查**，不提供具有權威性的伺服器防重放儲存。
- `now`：輸入者提供的 Unix 毫秒整數；為了測試可重現，不讀取裝置系統時鐘。

輸出：`schema: tls.provider-capability-decision.v1`、`decision` / `reason`、`supportedPair`、`networkRequested: false`、`contentTransmissionPermitted: false`、`allowedForLocalOperation`、`requiresDownload`、`disclosures`、`studyOnly: true`、`rawTextIncluded: false`。

**任何遠端 Provider 都被封鎖。** 即使存在 `explicit_granted`，仍回傳 `REMOTE_DISABLED_IN_MVP`，因為沒有授權的傳輸實作；未授權則回 `CONSENT_REQUIRED` 或 `CONSENT_REVOKED`，取消回 `CANCELLED`，過期/跨站等回 `STALE_REQUEST`。模組不保管任何翻譯文字或 Secret，不會生成傳輸命令，也不讀任何網頁 DOM。

## 准許與不准許的宣稱

- `ON_DEVICE_READY` 表示「呼叫者**宣告**本機模型已就緒」，並非 Chrome API 已經證實；Browser UI 示範的 Provider 都是模擬資料。
- `ALLOW_LOCAL_RULES` 表示使用本機規則的能力宣告，並不代表任何字詞準確率。
- `REQUIRES_USER_DOWNLOAD_ACTION` 表示下載模型可能需要網路，但**不是**將原始文字傳輸雲端；真正裝置模型下載必須另外遵守瀏覽器許可。
- `networkRequested:false` 代表 R14 這份模組沒有執行網路請求，不能冒稱原網站、Chrome、第三方 SDK 都沒有網路行為。
- R14 不是遠端雲端翻譯器、API Key 管理器或使用者授權存取系統，沒有引入新 host 權限或遙測。

## 測試、發布與相容性

```bash
node tools/build_provider_capability_r14.js --check
node --test tests/test_provider_capability_r14.js
node --test tests/*.js
python tests/test_provider_capability_browser_r14.py
python tools/check_release_workflow_r14.py
python tools/publication_guard.py
python -m py_compile tests/*.py tools/*.py
```

GitHub 的 `verify` 與 `browser-integration` 必須在相同最終 PR commit 都通過，合併後 `main` CI 再成功，R14 HTML＋SHA256 的獨立 release 資產才算正式可下載。舊 R5 v0.4.0、R11 v0.5.0、R13 v0.6.0 安裝檔和 R6 frozen 題庫不改動；若要回滾，revert 該 PR 而非 force-push 或覆寫歷史 tag。

## 遺留風險及後續研究

- 僅採保守的 BCP 47 子集、canonical Origin：不是所有合法語言 tag/URL 都能通過，需公開版本化擴充而非默默 normalize；目前未接入瀏覽器的真實 Permission Manager 或 OS 模型 API。
- 模組不提供持久 nonce 使用紀錄、防跨裝置重放或遠端同意的真實授權信任根；真正遠端 Provider 需要另設用戶授權、隔離、撤銷、成本、保存與可靠的 permission store。
- 本頁使用了示範用能力資料，**不可用它宣稱 Chrome 或其他真實模型可用／品質提升**。
- 先比較合法且可重現的使用者案例與模型不支援狀態，再決定 R15 何時把路由整合進 R13，而不是現在直接加入不受控的外部傳送。
