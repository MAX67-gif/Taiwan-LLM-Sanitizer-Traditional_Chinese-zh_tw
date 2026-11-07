# R19｜驗證方式與證據邊界

原 R19 R2 候選已在 [GitHub Actions run 42377187266](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266) 通過十個原生情境，狀態為 `NATIVE_10_SCENARIOS_VERIFIED_WITH_SCOPE`。這筆紀錄對應 source head `439041ceaae40f8c985d4c5ba3b34c37dcb61302`，實際測試的是 PR merge commit `7fd1e85411ab1de8e1beac4f73799485e7c59050`。精確版本、檔案雜湊與原附件見[原生驗收紀錄](NATIVE_ACCEPTANCE_R2.md)。

Suite 17.4.0 的最終 PR、main、封包與發布驗證仍是另外的必要檢查；不得把這筆較早的收據改標為最終發行成功。

## 本機可重跑的工程檢查

```sh
node tests/test_review_helpers_r19.js
node tests/test_first_result_studio_r19.js
node tools/build_first_result_studio_r19.js --check
python tests/validate_r19_native_receipt_r2.py --self-test
node --test tests/*.js
python -m py_compile tests/*.py tools/*.py
python tools/publication_guard.py --self-test
python tools/publication_guard.py
python tools/check_readme_i18n.py
python tests/test_public_rights_withdrawal.py
python -m unittest discover -s tests -p 'test_all_tools*.py' -v
python tools/check_all_tools_release.py --check-workflow
```

`test_first_result_studio_r19.js` 在 VM 中執行真實凍結核心與真實 UI，用小型 DOM adapter 檢查使用者操作、Blob 下載內容、拒絕匯入、換行、偏好與過期預覽。它不是瀏覽器引擎，不能證明版面、原生選檔或作業系統下載行為。

helpers 的測試涵蓋原始 BOM bytes、無效 UTF-8、NUL、大小、Unicode、CRLF、長行與候選覆蓋計數。原 R18.3 的同一組新 UI 行為測試可用 `TLS_R19_BASELINE=1` 重現對應舊缺陷；這個模式預期失敗，不是正常 CI 指令。

validator 的 `--self-test` 只測報告格式的接受與拒絕，回傳 `full_native=NOT_RUN`。它不能代替以下原生執行，也不能把人工建立的 PASS JSON 變成真實執行證據。

## 原生 Chromium 驗收

使用 Node 20 以上、Node Playwright 1.55.0 及對應的已安裝 Chromium。在允許本機檔案存取及原生下載的環境，先核對 HTML 與原 runner SHA，再執行：

```sh
node tools/build_first_result_studio_r19.js --check
echo '33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a  examples/TW_First_Result_Studio_R19_20261101.html' | sha256sum -c -
echo 'f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8  tests/browser_first_result_studio_r19.cjs' | sha256sum -c -
NODE_PATH=/path/to/node_modules \
TLS_R19_BROWSER_OUTPUT=/path/outside/repository/r19-browser \
node tests/browser_first_result_studio_r19.cjs --run
python tests/validate_r19_native_receipt_r2.py \
  --root . \
  --output /path/outside/repository/r19-browser \
  --node-playwright-package /path/to/node_modules/playwright/package.json \
  --receipt /path/outside/repository/r19-browser/R19_NATIVE_VALIDATION_RECEIPT.json
```

請為每次執行使用 repository 外的新輸出目錄；validator 會拒絕覆寫既有 receipt。runner 也可用 `--output` 指定目錄。沒給 `--run` 會以 `NOT_RUN` 和非零狀態結束。若環境拒絕存取，保留實際失敗結果；不得改用 HTTP、`setContent`、另一個瀏覽器介面或取消管理政策來規避限制。

十個原生情境檢查：原創第一次使用與取消；上下文、偏好與新文；拒絕及取消匯入；CRLF 真實下載 bytes；130／120 部分覆蓋；長行與 emoji 差異；惰性 HTML 與受保護片段；等待中預覽的舊成功、舊錯誤與舊 finally；390px 與鍵盤；沒有頁面錯誤或外部網路請求。被阻擋的外部請求嘗試也算失敗。腳本不點選 GitHub 外部連結。

runner 實際等待 `download` event、檢查下載失敗狀態、取得本機下載路徑並讀取 bytes，比對指定 synthetic 輸出。匯入則使用 `setInputFiles`；應用內取消只測 staging 面板，沒有測作業系統檔案選擇器或它的取消行為。

## CI 與留存證據

Suite 17.4.0 的合約要求在既有 `browser-integration` job 內，於最終 PR 與 main 都實際執行原 runner 及 validator。發行 job 依賴 `verify` 與 `browser-integration`。原候選曾使用的分支限定 PR 條件不符合這個最終發行要求；skipped、echo 訊息或被忽略的錯誤不能當成原生通過。

每次結果應保留來源 head、實際 checkout SHA、run/job ID、執行 log、原 report、validation receipt、桌面／窄版 PNG 及各檔案摘要。記錄 GitHub PR 測試合併提交時，須與 branch head 分開，避免混淆實際測試對象。

原候選 artifact 只有 report、receipt 與兩張 PNG，沒有獨立 SHA manifest，也沒有保存每次下載的 Markdown／proof JSON 原始 bytes。其下載結論由原 runner 的真實斷言與 log 支持；無法從該 artifact 再讀回每份下載檔。後續若附加 sidecar manifest 或補充檢查，須清楚區分新增紀錄與原始 artifact。

原 validator 檢查來源 SHA、完整十情境格式、版本欄位與 PNG signature／IHDR／尺寸；不會解碼圖片、不核對 PNG chunk CRC、不自行啟動瀏覽器，也不驗證 report 確由哪個 CI process 產生。原候選 PNG 已另做完整 CRC 與解碼檢查；那是獨立補核對，不能歸功於原 validator。`real_download_checks=RUNNER_SCENARIOS_PASS` 也不是 validator 再次下載驗證。

## 不可混淆的結果

| 證據 | 能支持的結論 | 不能支持的結論 |
| --- | --- | --- |
| Node helpers / VM 行為測試 | 該輸入與操作序列的工程行為 | 真實瀏覽器畫面、真人語意品質 |
| HTML byte parity 與固定 SHA | 範本、核心及 UI 與指定交付 HTML 一致 | 所有環境都相容 |
| 原 runner 的 CI log、來源核對與十情境收據 | 指定提交、瀏覽器、產物 SHA 與所測場景 | 最終新套件已發布、所有平台相容 |
| validator self-test / report 檢查 | 已定義格式與拒絕條件通過 | 自行證明瀏覽器執行、圖片完整解碼或下載 bytes |
| 真實下載斷言 | 原 runner 當次取得的下載 bytes 符合指定結果 | 原始下載檔已留存於 artifact |
| 390px 截圖與焦點檢查 | 該 Chromium viewport 和所測操作的版面／焦點 | 實體手機、完整無障礙或螢幕閱讀器驗收 |
| publication guard / CSP | 所檢規則與配置通過 | 未來所有程式絕無風險 |
| 計數 JSON | 該次操作的數量及候選覆蓋 | 母語自然度、原意等價、真實採用 |

真人操作、E1/E2/E3/D7、獨立母語審閱、完成率與再次使用資料維持延後／未量測。工程原創案例及正式套件發布都不會自動補足這些證據。[發行條件](RELEASE_GATE.md)另外規定最終 CI、完整 Draft 下載及公開後再下載的必要步驟。
