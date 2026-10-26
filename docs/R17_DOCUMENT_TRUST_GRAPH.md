# R17-P0｜離線文件完整性信任圖（Document Trust Graph）

> 版本 0.1.0 · 2026-10-26 · 獨立 Shadow／唯讀工具 · MIT 原創程式與測試 · **尚無真人或模型翻譯品質認證**。本工具不會修改原始檔，也不會把文件送到伺服器。

## 為什麼需要？

R15／R16 能安全預覽**單一** Markdown／JSON／Prompt 文件中的可編輯片段，但在多語文件專案裡，另一個危險是 README 裡的跨檔連結和章節錨點可能已失效。R17-P0 新增一個**離線、唯讀、明確允許清單**的專案級連結審計功能。

它**不能**判定譯文是否正確、語意是否一致、文字有無著作權授權，也不能取代 GitHub 的正式簽章／審核。六語翻譯的人工審查證據鏈屬 R17.1，不屬本次。

## 最容易的使用方式：單檔 HTML

1. 下載 [R17 離線文件信任圖](../examples/TW_Document_Trust_Graph_R17_20261026.html) 到自己的電腦，用一般支援的桌面瀏覽器開啟。
2. 點選「選擇資料夾」，由瀏覽器在**本機**列出 Markdown 候選。請注意各瀏覽器對資料夾選擇器的支援不同；不支援時改用 CLI。
3. 自行**明確勾選**要讀取的 `.md`／`.markdown` 檔案；未勾選的其他檔案不會被 R17 讀取。需要驗證一個目標檔案是否存在，就必須把它也加入清單；否則是 UNKNOWN。
4. 按「檢查已勾選文件」，閱讀 PASS／WARN／BLOCK／UNKNOWN。外部 `https://` 連結不連線驗證，只標 `EXTERNAL_UNCHECKED`／UNKNOWN。
5. 需要保存結果時，下載不含文件原文的 JSON 收據。預設將**相對路徑**轉為 SHA256 派生識別碼；選擇「包含相對路徑」時，僅限自行承擔檔名資訊曝露風險的本機工作流。

原創小專案範例：[首頁](../examples/r17/demo/index.md) 連到 [安裝指引](../examples/r17/demo/docs/guide.md)。沒有遊戲、受限詞庫、玩家資訊或真實商業文件。

## 核心概念與裁決

| 裁決 | 含義 | 使用者該做什麼 |
| --- | --- | --- |
| `PASS` | 已獲明確允許掃描的本機 Markdown 目標與保守可辨識錨點符合契約 | 僅代表此次檢查的結構，非翻譯品質 |
| `WARN` | 檔案大小寫不一致或可能因不同檔案系統而失效 | 請自行統一檔名大小寫 |
| `BLOCK` | 根目錄逃逸、已確認的允許檔案缺失、不存在的明確錨點或危險 URI | 在合法原始碼中手動修復，不由工具自動改動 |
| `UNKNOWN` | 外部網址、未列入允許清單的目標、參照式連結或無法可靠解析的語法 | 增加合法允許範圍，或轉人工審查；**不可當成 PASS** |

R17-P0 非 CommonMark／GFM 完整解析器；複雜 Markdown、未知參照定義、原始 HTML 錨點與特殊自動錨點生成方式以 UNKNOWN 為安全預設。未閉合程式碼或 HTML 區塊即使沒有可解析連結，也標示文件解析不確定，而不是誤判 PASS。重複標題使用保守的 `-1`、`-2` suffix；不保證涵蓋所有渲染平台。

## Node CLI：本機目錄的強化驗證（選用）

需要在 CI／開發者工作流明確檢查檔案的真實路徑、符號連結與來源新鮮度，可使用 Node 22+ CLI；瀏覽器資料夾選擇器**沒有 OS 層 symlink 保證**。

```bash
node tools/r17_document_trust_cli.js --root examples/r17/demo --allowlist examples/r17/allowlist.json --report /tmp/tls-r17-report.json
```

Windows 上請把 `/tmp/tls-r17-report.json` 改成所選資料夾**以外**、尚未存在的目的路徑；來源檔與報告檔不得互相覆寫。輸出使用 `wx` 建立新檔，預設 0600 最小權限。CLI 不會把允許清單中的絕對路徑回寫到 JSON 報告。

可額外加 `--baseline previous-report.json` 比對來源雜湊與允許清單是否變更；如果不同，報告標 `BLOCK_STALE`。使用 `--include-paths` 才會將相對路徑明文放入 JSON；未明確選擇前預設不輸出。

`--allowlist` 是使用者自行準備的本機 JSON，例如本專案 [示範清單](../examples/r17/allowlist.json)，列出 `file_allowlist`（`index.md`、`docs/guide.md`），可選 `locale=zh-TW`。必須是自己具有合法存取與處理權限的專案。允許檔案目前限定 Markdown；其餘一律不得讀取或視為通過。

## v1 資料契約

- Request：`tls.repo-audit-request.v1`，含使用者明確授權的 `file_allowlist`、可選的 `locale`（zh-TW、zh-CN、en、ja、ko、es），以及固定 `check_external=false`、`network_requested=false`。Node `root` 是本機 CLI 的輸入，不回傳到收據。
- Report：`tls.repo-integrity-report.v1`，包含 `scanner_version`、`request_sha256`、`snapshot_sha256`、`source_files[{file_id,relative_path_or_hash,source_sha256,validation_status}]`、`edges[{from_file_id,target_file_id_or_hash,link_kind,fragment_hash_or_normalized_id,decision,reason_code}]`、`summary`、`approval=NONE`、`transport=NONE`、`contains_original_text=false`。
- 報告中的檔名 SHA 識別碼是**假名化，不等同強匿名化或數位簽章**。SHA 仍可能受到來源已知時的猜測攻擊。不得將含私人路徑或來源雜湊的報告未經許可上傳公開 GitHub Issue／Actions。
- 文件限 **200** 個；單檔最大 **1 MiB**；總量最大 **16 MiB**；連結最多 **10,000**。超過上限會拒絕，沒有偷偷擴大或遙測。
- 路徑：必須位於選定根目錄之內且在允許清單中；禁止 `.env`、隱藏私有目錄、Traversal、Windows 絕對路徑、symlink 與不安全編碼。CLI 會檢查磁碟實體路徑及檔案變更；**無法保證對同時由惡意程序改寫的路徑達到作業系統沙盒等級隔離**。
- 不讀取一般網站／遊戲內部素材、不截圖、不連接遠端 Provider、不保存玩家或使用者個資。既有 R5/R11/R13/R14/R15/R15.1/R16 與 R6 Frozen 版本保持原樣。

## 測試與回滾

```bash
node --test tests/test_document_trust_graph_r17.js
node --test tests/*.js
python tests/test_document_trust_browser_r17.py
node tools/build_document_trust_r17.js --check
python tools/check_release_workflow_r17.py
python tools/check_readme_i18n.py
python tools/check_examples_i18n.py
python tools/publication_guard.py
python tests/test_public_rights_withdrawal.py
```

只有 PR 最終提交的 `verify`、`browser-integration` 成功，且 main 正式 GitHub Actions 的發行工作與實際資產 SHA256 也驗證後，才可以宣稱已公開發布。安全回滾只撤回新增 R17 模組／CI／文件；不更改 R16、R15.1 歷史檔、R6 Frozen 或第三方權利清理。A 已預註冊的 80 筆案例不是 Fresh OOS；這次 P0 只執行能力對應的原創測試，不宣稱「80/80 通過」。

**後續研究：**R17.1 才考慮六語人工審閱狀態與來源版本對應；R18 有型別 AST 擴充、R19 PR Checker 另行授權。R17-P0 不會自動發 PR 或套用建議修補。
