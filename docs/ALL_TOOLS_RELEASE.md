# All-Tools Full Suite R17.1｜每次 Release 都要有所有合法且受支援的工具

> 2026-10-27。此頁是公開操作與版本治理契約，不表示所有工具皆已取得真人翻譯品質認證。所有未變更舊工具保留自己的原版號與來源 SHA256；完整套件版號不等於工具更新。

## 為什麼新增完整套件？

舊 R17 Release 只附 R17 HTML + SHA，使用者必須翻找歷史 Release 才能安裝 R5/R11/R13 或取得其他工作台。新制把**同一次正式發布的合法且仍維護工具**全部收在同一個 Release，也提供各工具獨立下載。任何缺件會讓 CI 阻擋發布。

新完整套件標籤：[`all-tools-suite-v17.1.0`](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0)。只有 GitHub 實際顯示完整附件、CI 發布工作成功，才代表此版本可用。舊版 R5、R11、R13、R14～R17 的原始 Release／Tag **不會被修改**。

## 預定完整工具清單

| 類別 | 工具內容 | 個別可下載 | 原版號是否改變 |
| --- | --- | --- | --- |
| Chrome Extension | R5、R11、R13 原創擴充功能 ZIP（共三個） | 是 | **否**：0.4.0／0.5.0／0.6.0 |
| Tampermonkey | R5、R11、R13 單檔 `.user.js`（共三個） | 是 | **否**：0.4.0／0.5.0／0.6.0 |
| 離線 HTML | R3、R6、R8～R10、R12、R14～R17 共 **13 個**獨立工作台／研究頁 | 是 | 原始版號維持不變 |
| 公開品質套件 | R6 原始品質研究 ZIP（不是自然度認證） | 是 | 原版維持不變 |
| 開發者 CLI/Skill | 五個 Node CLI 加一個本機 Skill，含原始碼、依賴及六語文件 | 共一個完整開發者 ZIP | 原版維持不變 |

**機器記錄：**`release/all_tools_registry.json` 包含固定 `tool_id`、原始 Release 標籤與 SHA256、版本、法律狀態及在 Full Suite 中的路徑。共 **26 個工具項目、21 個獨立資產**。一個新正式 Release 還必須附上 `TLS_ALL_TOOLS_SUITE_17_1_0.zip`、`ALL_TOOLS_MANIFEST.json`、`BUILD_PROVENANCE.json`、`VALIDATION.json`、`SHA256SUMS.txt`，因此當輪預期 **26 個 GitHub Release 附件**。

## 如何下載／驗證

1. 到上述完整套件 Release。若 Release 不存在、附件數不足或 GitHub Actions 發布工作失敗，**不要當作正式完整版本**；仍可獨立使用舊版已驗證工具。
2. 一般使用者直接下載 `TLS_ALL_TOOLS_SUITE_17_1_0.zip`，或僅下載自己需要的 Chrome、`.user.js`、HTML。
3. ZIP 中包含同一批實體工具、六語導覽與完整雜湊，個別資產也有 SHA256；可用一般解壓軟體檢查 CRC。
4. Chrome ZIP 解壓後才可用 `chrome://extensions` 的「載入未封裝項目」；Tampermonkey 單檔匯入。**同一網站不要同時啟用 R5／R11／R13 而造成文字操作衝突**。
5. HTML 完全離線使用。不同工作台分別處理品質審閱、結構保真、人工預覽、專案連結等，**不會自行變成一套完整自動翻譯器**。

## 完整性 Gate 與原始來源差異

- R5 舊 Chrome ZIP 的原版 GitHub 發行檔，與目前重建 ZIP 的內容可以相同，但因舊時間戳而位元組不同；新套件必須從**官方既有專案 Release**取得固定 SHA `0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5` 的原資產，**不能**用看似等價的重打包檔案取代。
- R6 品質套件須以原已發布的 `r6-quality-v1` ZIP（SHA 鎖定）為準；若官方資產不可取得，整個新發行必須失敗，不可偽造完成。
- Node/CLI/Skill 若無法獨立建置、授權來源未知、缺少依賴或驗證失敗，一律阻擋完整新 Release。
- `python -m unittest tests/test_all_tools_release.py`、`python tools/check_all_tools_release.py --check-workflow` 可檢查已預先登記的「缺件、錯雜湊、重複、危險路徑、草稿未公開」等反例。
- 只有經人類明確批准的退役與合法安全事件可減少工具；先留下權利／版本／原因／回滾證據。已因第三方著作權風險下架的遊戲專用內容**永久不在本套件**，除非另有新的使用者及權利人的必要許可。

## 可追溯狀態

`SHADOW/PREVIEW`、`LEGACY_SUPPORTED`、`RESEARCH_ONLY_APPROVED` 會在 manifest 明示。不論未更新工具、研究用範例或 Extension，均不得藉套件版本號誤稱新的模型效果或已真人驗證。公開六語 README 提供不同使用語言入口，但依然以臺灣繁體中文在地化為產品目標。

## R17.1 發行驗證修復

Git 提交識別碼採 40 位十六進位；檔案 SHA256 採 64 位。兩者分開檢查，並要求實際 checkout、manifest、provenance、Release 目標及已解析的 Tag commit 一致。PR 階段會先以官方原始資產建置完整套件，避免只通過合成 fixture 後才在 main 發現發行錯誤。

每個獨立工具的實際位元組直接比對 registry 鎖定值。CLI/Skill 包比對來源中完整檔案集合與內容，不能只保留入口 JS 卻遺漏依賴。套件內另附 ALL_TOOLS_REGISTRY.json、VALIDATION.json 及使用實際相對路徑的 SHA256SUMS.txt；套件外的 VALIDATION.json 記錄整個 ZIP 的 hash，避免檔案自我雜湊循環。

中央發布器先驗草稿全部附件，再公開，然後重新下載全部附件到另一個空目錄核對；不以 GitHub API 宣告的 digest 取代實際下載。若同版本已發布且內容完全一致，回報 ALREADY_PUBLISHED_MATCH；任何差異一律 EXISTING_RELEASE_MISMATCH_BLOCKED。**下一次來源內容變更要正式發版，必須明確升級 suite 版號及相應契約；不能覆寫同一標籤。**各舊工具的原版本不因此改變。

封包驗證也拒絕重複 JSON key、未知授權、已撤回資產、密鑰指紋、非 UTF-8/BOM 文字、重複 ZIP 路徑、Windows 裝置名稱／資料流路徑與 symlink。這些檢查是完整性和發布規則，無法取代第三方權利調查或人工翻譯審閱。

維護驗證：`python -m unittest discover -s tests -p 'test_all_tools*.py' -v`。公開版本的實際可用狀態仍以對應 main CI 與上述 Release 附件為準。
