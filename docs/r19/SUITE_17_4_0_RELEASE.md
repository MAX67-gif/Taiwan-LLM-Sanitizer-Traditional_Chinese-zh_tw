# Suite 17.4.0｜R19 整合與發行契約

本文件定義將原樣 R19 R2 加入完整套件的工程契約。原候選已有十個原生情境 PASS；最終套件驗證與正式發行仍須完成下列 gates，不能從既有收據直接推定成功。R19 在套件中維持 `PREVIEW`，本次不更換 R17.2 修稿核心、不擴充詞庫、不加入遠端 Provider。

[R19 使用方式](README.md) · [原生驗收紀錄](NATIVE_ACCEPTANCE_R2.md) · [驗證方式](TESTING.md) · [發行條件](RELEASE_GATE.md)

## 版本與完整清單

| 項目 | 本次固定契約 |
| --- | --- |
| Suite version | `17.4.0` |
| 新 Release tag | `all-tools-suite-v17.4.0` |
| 完整套件 | `TLS_ALL_TOOLS_SUITE_17_4_0.zip` |
| 已登記工具身分 | 29：保留舊 28 項，新增 R19 一項 |
| 獨立資產 | 24，包含開發者來源彙整包 |
| 離線 HTML | 15，包含 R19 |
| Release 附件總數 | 29：24 個獨立資產、1 個完整套件 ZIP、4 個完整性附件 |
| 四個完整性附件 | `ALL_TOOLS_MANIFEST.json`、`BUILD_PROVENANCE.json`、`VALIDATION.json`、`SHA256SUMS.txt` |
| 文件語言 | zh-TW、zh-CN、en、ja、ko、es；六語來源與入口同步 |

工具身分數、獨立資產數與 Release 附件數不同。完整套件不能只包新 R19 或只有下載連結；所有合法受支援的既有工具及必要來源仍須實際納入，並由 manifest 指到封包內的確切位置。

## R19 的來源固定值

| 欄位 | 固定值 |
| --- | --- |
| `tool_id` | `tls.html.tw-first-result-studio-r19-20261101` |
| `status` | `PREVIEW` |
| `source_kind` | `git_source` |
| 原始來源提交 | `439041ceaae40f8c985d4c5ba3b34c37dcb61302` |
| 來源路徑 | `examples/TW_First_Result_Studio_R19_20261101.html` |
| 獨立檔名 | `TW_First_Result_Studio_R19_20261101.html` |
| 完整套件內路徑 | `TOOLS/html/TW_First_Result_Studio_R19_20261101.html` |
| HTML bytes | 136,680 |
| HTML SHA256 | `33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a` |
| 原 runner SHA256 | `f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8` |

runtime、helper、template、builder、HTML 與十情境 runner 沿用原公開來源。Suite 整合可以更新登記、入口、文件與發行驗證，但不能重新實作 R19 或修改原 runner 來取得 PASS。其他獨立研究的檔案匯入與安全守門工作不在這次 R19 整合範圍。

## 舊 28 項必須保持的資料

前 28 項的完整 metadata 必須與 Suite 17.3.2 基準一致，不能只保留相同 `tool_id` 卻偷偷改版號、來源種類、來源提交、產物檔名或 SHA。發行驗證器須以固定摘要檢查完整舊列及工具 ID 集合，並在不相符時拒絕建置或發布。

| 固定集合 | SHA256 |
| --- | --- |
| 舊 28 列完整 metadata | `340de86fdb49ca201aad6317c7769c6dfefde2d3ad997172cc2bbc97ca1bb5cb` |
| 舊 28 項工具 ID 集合 | `22cb8ad7ccdc6b9d468e2652407ee15e6288ce2c4a5e4f61fdf88b2cef9a0a57` |
| 加入 R19 後的 29 項工具 ID 集合 | `cf54846ecef37ae118b8bba1325f5214e8db00c9f4c404093eef69e664820404` |

舊工具的固定來源或原始獨立資產沿用既有 bytes。R5／R6 等官方 Release 附件缺失或 SHA 不符時，必須停止，不能用新建置替代。MRFT 保留既有 generated artifact 特例與固定驗證。完整套件 ZIP 與開發者來源彙整包會納入本次新增內容，應以新版本 manifest 驗證其完整性；這不允許改動舊工具本身。

## 使用者入口

完整套件的預期路徑是：下載 `TLS_ALL_TOOLS_SUITE_17_4_0.zip`、解壓縮、開啟 `START_HERE.html`、選擇 R19、閱讀上下文並逐處決定、產生預覽、核對全文、下載新的 Markdown。入口應直接連到套件內實際存在的 R19 HTML。

R19 不覆寫磁碟原檔；未決定與未列出的候選保持原文。記住文件偏好只增加參考提示，不能替使用者批准其他候選。舊 R17.2 及其他工具仍可從清單進入。六語 README、usage marker 與套件入口必須指向一致的版本與工具清單。

## 已有證據與仍須取得的結果

| 狀態項目 | 本文件可記錄的結果 |
| --- | --- |
| 原 R19 HTML／runner 身分 | 已核對固定 SHA，詳見原生驗收紀錄 |
| 原候選 native 十情境 | [run 42377187266](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266) 的 `browser-integration` job 通過 |
| 實際測試提交 | PR merge `7fd1e85411ab1de8e1beac4f73799485e7c59050`，對應來源 head `439041ceaae40f8c985d4c5ba3b34c37dcb61302` |
| 最終 Suite 17.4.0 PR／main CI | 尚須由最後候選與實際合併提交分別完成 |
| 29 個正式 Draft 附件下載驗證 | 尚須完成 |
| 公開後 29 個附件重新下載驗證 | 尚須完成 |
| OS 選檔視窗／取消 | 未驗證 |
| 真人操作、E1/E2/E3/D7、語意自然度及採用 | 延後／未量測 |

原候選的十情境在既有 `browser-integration` job 中執行，沒有新增獨立 R19 job。Suite 17.4.0 必須在最終 PR 與 main 都實際執行同一個原 runner 及 validator；分支條件略過、錯誤被忽略或 echo 取代命令，都不得讓原生 gate 成功。中央 publisher 繼續依賴 `verify` 與 `browser-integration`。

原驗證器只檢查指定報告、來源 SHA、版本欄位和 PNG 標頭／尺寸，無法單獨證明瀏覽器確實執行或 PNG 完整可解碼。原 artifact 未留存每次下載的 Markdown／proof JSON 原始 bytes；真下載結論來自原 runner 的斷言與 CI log。這些限制不得因 Suite 發版而省略。

## 發行順序與失敗處理

1. 驗證固定來源、舊 metadata、完整 registry、六語文件、公開範圍及本機回歸；負面測例須拒絕 native gate 被略過、舊 metadata 被修改和新 HTML／封包 bytes 不符。
2. 審查最終變更，取得最後 PR CI 的實際結果，之後才合併。
3. main 的必要 CI 與原生十情境成功後，由中央 publisher 在該精確提交建置完整 staging。
4. 建立新 tag 的 Draft，核對提交、29 個附件名稱及數量，再將全部附件下載至空目錄，驗證 SHA、ZIP CRC、manifest、套件內來源與入口。
5. Draft 下載驗證成功後才公開；再以另一個空目錄重新下載全部 29 個附件並完成同樣核對，保留發布收據。

只有全部必要檢查完成，才能記錄 `RELEASE_OK`。fixture、API metadata、skipped publisher、局部附件下載、僅上傳成功或較早候選的 native PASS 都不構成完整發行驗證。

發生錯誤時停止後續步驟，保留實際失敗紀錄與既有 Suite 17.3.2。不得覆寫任何舊 Release tag 或原始附件，不得重用 `all-tools-suite-v17.3.2`，也不得恢復已撤回的整合包。若新 Release 已公開而後續驗證失敗，須明確記錄該狀態並依既有發行器的恢復程序處理，不能將它描述為已驗證成功。

真人品質與採用資料可以延後取得，但狀態必須繼續誠實標示。這次發行的是有範圍限制的工程預覽工具，不是語言品質認證。
