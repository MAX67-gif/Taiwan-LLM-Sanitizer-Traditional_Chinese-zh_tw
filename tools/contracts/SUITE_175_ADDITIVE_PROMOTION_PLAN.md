# TLS 新版 Suite 17.5.0｜29→30 加法式升版契約（R195，未發行）

**狀態：DRAFT PRODUCT CANDIDATE／CONTRACT ONLY／NO MERGE／NO RELEASE。**

## 結論

上一版公開的 `all-tools-suite-v17.4.0` 具有 **29 項已註冊工具、24 份獨立工具附件、總計 29 個 GitHub Release 附件**。在保留舊版原始檔、源頭版本、SHA256、權利範圍與歷史驗收的前提下，下一版先規劃**追加一項 R19 R3 安全候選**。計畫數量為 **30 工具、25 獨立工具、30 Release 附件**，但目前**沒有產生／發布 17.5.0 的套件、Tag、Draft 或任何附件**。

這裡的 **30 是計畫數，不是已驗收或已發行數**。

## 真正能檢查的條件

來源：`tools/contracts/suite_175_r19_r3_proposal.json`。

唯讀檢查程式：`tools/check_suite_175_promotion_plan.py --check`。

1. 使用既有 `build_all_tools_release.validate_registry()` 重新驗證 **17.4.0 全部 29 項**：舊工具身份與來源不允許任意替換／削減。
2. 使用已公開的 R193 **29 附件固定元資料**與正式版完整 ZIP 雜湊做獨立身分比對；此步只是元資料核對，並**不是**下載 29 件檔案重新驗位元組。
3. 以 SHA256 `33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a` 保留 R19 R2。
4. 以 SHA256 `e0e9f895d01e75cac43a3bcd1a8312b2a5b39f74eb92b366508e98c92a40fed1` 鎖定 **R19 R3 獨立候選 HTML**。
5. 唯一提案新工具 ID `tls.html.tw-first-result-studio-r19-r3-20261113`，不可碰撞任一舊 ID、檔名或來源。
6. 維持 zh-TW／zh-CN／en／ja／ko／es 六種語系與遊戲相關撤回資產排除政策；拒絕虛構真人品質及採用率證據。
7. `publication_permission=NONE`、`merge_permission=NONE`，唯讀 CLI 不得呼叫 GitHub 發行 API 或寫入任何產物。
8. 新增加的負面測試會竄改舊 ID、Tag、數量、來源雜湊、權利、完整性、曾發布狀態等，檢查會直接失敗。

## 可直接審查的 30 項候選清單（本輪完成）

- 執行 `python tools/render_suite_175_registry_preview.py --check`，會核對舊 29 項、提案第 30 項、來源 SHA 與權限，不輸出正式產品。
- GitHub CI 另會把 `SUITE_175_THIRTY_TOOLS_REGISTRY_PREVIEW.json` 放入 `TLS_SUITE_175_30_TOOL_REGISTRY_REVIEW_ONLY` Actions 附件。包含**完整舊 29 項原始註冊資料＋新增 R19 R3 一項**，方便逐欄查差異。
- 因官方 17.4.0 註冊表中的 6 個開發工具共用一個 Developer Bundle，所以獨立附件數計算為 **24 個直接 standalone 候選＋1 個 Developer Bundle＝25**；不是把 30 個工具全部當成 30 個獨立檔案。
- 此 JSON 的 schema 是 `tls.suite-175-registry-preview.v1`，**不是目前正式 `tls.all-tools-registry.v1` 的可直接發布替代檔**。內容強制記錄 `publication_permission:NONE`、`complete_future_suite_generated:false`，不得跳過新版 Builder/Validator/Publisher 正式開發。

## 仍未完成、不可繞過的正式升版工作

| 範圍 | 目前狀態 | 要求 |
|---|---|---|
| 17.4.0 正式套件 | 已發布；不得覆寫 | 舊 29 項與歷史 SHA 不變 |
| R19 R3 候選 HTML | 已驗證，未發行 | 9／9 新原生情境＋舊 R19 10／10 |
| 升版提案靜態契約 | 本輪新增 | 通過正負向測試 |
| 17.5.0 生產用 Registry | **NOT_CREATED** | 新 Schema、欄位版控、舊 29 項遞增 |
| 17.5.0 Builder／Validator／Publisher | **NOT_CREATED** | 新工具與數量、來源 SHA、完整 30 附件防漏 |
| 六語 Release 索引及使用說明 | **NOT_UPDATED** | 跨語系目錄與標示一致，人工審核仍待證據 |
| GitHub 17.5.0 Draft 新鮮下載 | **NOT_RUN** | 全部附件重新下載、驗 SHA 與來源 |
| GitHub 17.5.0 Published 再驗 | **NOT_RUN** | 先發布後新鮮重下載全附件、封存不可變收據 |
| Windows/macOS 原生選檔取消 | **NOT_TESTED** | 不可用 `set_input_files` 冒充 |
| 真人語言品質、真實使用者採用 | **NOT_MEASURED** | 不可由自動化工程測試推定 |

**重要區分：** `R195` 屬於新版發行系統的安全前置規格，不是新版完整發行實作。不可把 `CONTRACT_ONLY_STRUCTURAL_PASS_NO_RELEASE` 宣稱為 17.5.0 的 Alpha／Ready／Published。

## 發行路由與錯誤防呆

正式發行版本需有獨立新 Tag `all-tools-suite-v17.5.0`。如發現此 Tag 已存在、原始工具消失、不可追溯來源、舊版 SHA 修改、來源私有、驗收跳過或附件缺漏，應直接 **BLOCK**，不應嘗試強制覆寫、重建舊 Release 或降級驗證器。

禁止直接把本 PR 的新 R19 R3 程式和目前仍硬鎖 17.4.0 的發行器一同合併主線；舊版 `tools/publish_all_tools_release.py` 沒有因這份提案獲得發布新版本的能力。

## 下一輪實作順序

1. **先建立獨立的 17.5.0 Builder/Validator/Pub­lisher 原型**，不修改既有 17.4.0 的可追溯版本。
2. 重新設計來源 Registry 與新增第三十項註冊，固定欄位與向下相容。
3. 先以測試用資產完成 30 附件正反驗收；不得拿模擬 PASS 當真實下載結果。
4. 六語說明、README、下載入口及 CI 舊版驗收完整更新後，才考慮全新版本的 Draft 發行；正式發布仍須獨立驗收。

**可重用規則：** 歷史版本 immutable；保留舊路徑＋增量新路徑；Schema、CI、原生瀏覽器與發行器必須一起版控。從判斷「可更新」到「有權發布」之間，需要真正可反證的收據。
