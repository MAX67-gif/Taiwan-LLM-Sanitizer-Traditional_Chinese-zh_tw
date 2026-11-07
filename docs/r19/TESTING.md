# R19｜驗證方式與證據邊界

## 本機可重跑的工程檢查

```sh
node tests/test_review_helpers_r19.js
node tests/test_first_result_studio_r19.js
node tools/build_first_result_studio_r19.js --check
node --test tests/*.js
python -m py_compile tests/*.py tools/*.py
python tools/publication_guard.py --self-test
python tools/publication_guard.py
python tools/check_readme_i18n.py
python tests/test_public_rights_withdrawal.py
```

`test_first_result_studio_r19.js` 在 VM 中執行真實凍結核心與真實 UI，用小型 DOM adapter 檢查使用者操作、Blob 下載內容、拒絕匯入、換行、偏好與過期預覽。它不是瀏覽器引擎，不能證明版面、原生選檔或作業系統下載行為。

helpers 的測試涵蓋原始 BOM bytes、無效 UTF-8、NUL、大小、Unicode、CRLF、長行與候選覆蓋計數。原 R18.3 的同一組新 UI 行為測試可用 `TLS_R19_BASELINE=1` 重現對應舊缺陷；這個模式預期失敗，不是正常 CI 指令。

## 原生 Chromium 驗收

使用 Playwright 1.55.0 及對應的已安裝 Chromium。在具備本機檔案存取權的環境執行：

```sh
NODE_PATH=/path/to/node_modules \
TLS_R19_BROWSER_OUTPUT=/path/outside/repository/r19-browser \
node tests/browser_first_result_studio_r19.cjs --run
```

也可用 `--output` 指定 repository 外的輸出目錄。沒給 `--run` 會以 `NOT_RUN` 和非零狀態結束，不會把沒有執行當成成功。不可因執行環境拒絕存取而改用另一個瀏覽器介面規避限制。

十個原生情境檢查：原創第一次使用與取消；上下文、偏好與新文；拒絕及取消匯入；CRLF 真實下載 bytes；130／120 部分覆蓋；長行與 emoji 差異；惰性 HTML 與受保護片段；390px 與鍵盤；等待中預覽的舊成功、舊錯誤與舊 finally；沒有頁面錯誤或外部網路請求。被阻擋的外部請求嘗試也算失敗。腳本不點選 GitHub 外部連結，不宣稱測試作業系統檔案選擇器。

實跑會產生 `R19_NATIVE_BROWSER_REPORT.json`、產物 SHA、瀏覽器版本與畫面。只有實際執行完成且逐項通過的收據，才能把原生 Gate 從 `NOT_RUN` 改成 `PASS`。

## 不可混淆的結果

| 證據 | 能支持的結論 | 不能支持的結論 |
| --- | --- | --- |
| Node helpers / VM 行為測試 | 該輸入與操作序列的工程行為 | 真實瀏覽器畫面、真人語意品質 |
| HTML byte parity | 範本、核心及 UI 與交付 HTML 一致 | 所有環境都相容 |
| 原生 Playwright 收據 | 指定瀏覽器、產物 SHA 與所測場景 | 所有平台、作業系統選檔對話框 |
| publication guard / CSP | 所檢規則與配置通過 | 未來所有程式絕無風險 |
| 計數 JSON | 該次操作的數量及候選覆蓋 | 母語自然度、原意等價、真實採用 |

獨立母語審閱、真實使用者完成率與再次使用資料仍待取得，不以工程原創案例替代。
