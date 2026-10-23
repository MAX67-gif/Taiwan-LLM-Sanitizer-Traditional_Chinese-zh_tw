# R2 發布驗證／測試矩陣（持續更新）

| 測試層 | 檢查項目 | 狀態 |
| --- | --- | --- |
| Node 核心回歸 | R1 詞彙、字串保護、CLI 機器欄位 | 由 GitHub CI 執行 |
| Provider 單元測試 | \`Translator.availability/create/translate\` mock、語言回退、佔位符驗證、cache、circuit breaker、無雲端 fetch | 由 GitHub CI 執行 |
| Headless Chromium | 文字/屬性翻譯、跳過 code/textarea、動態 DOM、停用還原、非同步過期結果阻擋 | 由 GitHub CI 執行 |
| TM stub | 單檔腳本、GM 本機設定、逐站啟用、暫停/還原、模式選單 | 由 GitHub CI 執行 |
| Build parity | engine/provider/web_adapter/Chrome/userscript 同源；zip.testzip；版本一致 | 由 GitHub CI 執行 |
| 真實 Chrome 模型 | 不同語言包、不同硬體與模型下載行為 | 尚未在本次沙盒驗證 |
| 其他真實網站 | SPA、大型文件、跨來源及複雜 Shadow DOM | 尚未獲得廣泛驗證 |
| Chrome Web Store | 正式上架審核 | 未申請／未驗證 |
| OSS 使用量 | 真實下載、獨立使用、社群 PR／Issue | 尚無可核實成果 |

請以 GitHub Actions 最新 main SHA 的 PASS 為功能 CI 證據；**不要把「CI PASS」理解成所有網站或模型都一定翻得出來**。

## 測試執行指令

- Node：\`node --test tests/*.js\`
- 打包：\`python tools/build.py\`
- Headless Chromium：\`python tests/test_browser.py\`、\`python tests/test_browser_r2.py\`、\`python tests/test_userscript_browser.py\`（需 Playwright + Chromium）
- 驗證產物：GitHub Actions 內 check artifact parity、JS syntax、ZIP CRC。
