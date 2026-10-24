# R13｜選取文字安全雙語閱讀 · 0.6.0 Preview

> 公開技術文件｜MIT｜2026-10-25｜專案治理 CA L.。此版本是**獨立、可選用的閱讀側車**，不覆寫 R5 v0.4.0、R11 v0.5.0，也不變更 R6–R12 的研究成果。

## 使用者實際能做什麼？

- 安裝獨立 Chrome MV3 ZIP（解壓後從 `chrome://extensions` 載入），**僅在點選「啟用本站」後**授權本網站；右下角的閱讀側車供使用者反白選取文字後點選「讀取反白原文」。
- 或安裝完全自含的 Tampermonkey 單檔，預設停用；到需閱讀的網站，從腳本選單逐站明確啟用／停用。
- 原文與譯文並排置於封閉 Shadow DOM 的面板，使用者可以自行貼上譯文；按「試用 Chrome 本機翻譯」才會偵測並呼叫本機 Translator API。瀏覽器若沒有提供模型或不支援語言組合，僅顯示限制，**不呼叫遠端第三方翻譯服務**。
- 按「檢查譯文」只檢查部分受保護專名、URL、`{{...}}`、`${...}`、CLI `--flag`、反引號程式碼的可見保留情形；結構檢查通過**不代表語意／語氣／自然度通過**。
- 按「清除」只清除側車暫存；按「關閉」移除側車。任何時候不修改網頁原文節點，因此無需恢復受外部程式改動的原始 DOM。

## 嚴格的安全與隱私邊界

1. 來源僅限單一使用者主動選取的、長度不超過 6,000 字元的可見文字；排除可編輯欄位、程式碼、隱藏／敏感元素、`translate=no`。跨 frame 不載入；無選取即拒絕。
2. 使用者手動貼入候選譯文，最多 12,000 字元，僅存於當前面板記憶體，不寫入 localStorage、IndexedDB、檔案、伺服器或遙測。
3. Chrome MV3 不含背景伺服器、`fetch`、XMLHttpRequest、WebSocket；只依站點權限注入。Tampermonkey 不用 `@connect`、`@require` 或遠端腳本。Chrome 瀏覽器自己的語言包下載不代表本擴充功能會向專案伺服器傳送文字。
4. 翻譯為非同步：使用者清除或關閉後，晚到的翻譯結果必須作廢；僅在使用者再次主動執行才生成新候選。
5. R13 面板只是**讀取原本頁面選取的文字**。若使用者同時啟動其他改寫工具（包括 R11），讀到的可能已非網站最初原文；因此建議需要原始對照時先暫停其他改寫工具。
6. 沒有 TAIDE、其他雲端 Provider、語意等價證明、OCR、PDF、Canvas／WebGL、Chrome 商店審查或手機版完整支持；不可聲稱它們已經完成。

## `click` →「點選」的 R13 使用者明確決定

在滑鼠與 UI 操作情境，`click`、`点击`、`點擊` 統一**建議**寫「點選」，例如「點選『設定』按鈕」；按一下時發出的聲音、統計上的點閱／點擊數不應全域替換。`lexicon/ui_actions_r13.json` 保存語境與反例；`examples/TLS_R13_UI_Click_Glossary_20261025.json` 是可選匯入 R11 的 `tls.personal-glossary.v1`。使用者仍需逐站授權、預覽並點選需改寫的位置；不自動套用，也不覆寫 R3/R9/R10 的歷史例句。

## 版本、建置與驗收

- 新版本 R13 v0.6.0 Preview 與 R11 v0.5.0、R5 v0.4.0 各自獨立安裝／Release。檔名 `TLS_Chrome_MV3_R13_20261025.zip`、`TLS_Tampermonkey_R13_20261025.user.js`，含 SHA256。
- 共用 R13 純函式：`src/core/bilingual_reader_r13.js`；Chrome 與 Tampermonkey 共用隔離面板：`src/r13/reader_ui_r13.js`；兩者只讀不寫網站內容。
- `python tools/build_r13.py` 產出 `dist/r13/`；`--check` 會嚴格比對所有已產生成品、ZIP 與 SHA。 
- `node --test tests/*.js`、`python tests/test_install_r13.py`、`python tests/test_bilingual_reader_browser_r13.py`、`python tools/publication_guard.py` 必須通過；GitHub Actions 的 verify/browser-integration 都過後才可發布獨立 R13 Release。

## 安全回滾與下一步

如果存在與網站不相容的情形，從 Chrome Popup 停用本站並移除本版，或從 Tampermonkey 腳本選單停用本站；舊 R11／R5 與 R6 固定基準不受更動。未來才評估對整頁文字分段雙語展示、模型無關 Provider Router、技術文件語法樹保真，不應把本版改成強制自動網頁翻譯。
