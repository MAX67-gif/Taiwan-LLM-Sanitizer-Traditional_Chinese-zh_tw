# Chrome／Chromium 擴充功能安裝｜完整教學（R5）

Taiwan-LLM-Sanitizer 目前使用 **Manifest V3**，不是 Chrome Web Store 官方商店上架版。安裝檔提供 **ZIP**，請先解壓再載入，**不能雙擊 ZIP 或將 ZIP 拖入 Chrome 當作商店擴充功能**。Chrome 會把它當成你自行安裝的開發者版本。

## 第一步：取得已打包的 Chrome ZIP

- **推薦**：[前往 GitHub Releases 頁面](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)，找到最新 R5 Release，下載 **TLS_Chrome_MV3_R5_20261024.zip**。如果 Release 暫時未發布，請至 [GitHub Actions](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/workflows/ci.yml) 開啟最新成功執行，從 Artifacts 下載 **Taiwan-LLM-Sanitizer-R5-Install**，解壓外層 ZIP 後取得 Chrome ZIP。
- **備用**：[專案內的可直接載入資料夾 dist/chrome](../dist/chrome)：於 Repository 頁面按 **Code → Download ZIP**，解壓整個儲存庫，指定其 **dist/chrome** 資料夾即可；不必自己寫程式或執行打包。
- 如果 ZIP 解壓後看到 `manifest.json`、`engine.js`、`popup.js`，表示解壓路徑正確。若進入資料夾後只有另一層資料夾，請選取真正含 `manifest.json` 的那層。

## 第二步：在 Chrome 啟用開發人員模式

1. 開啟桌面版 Chrome。於網址列**手動輸入** `chrome://extensions`，按 Enter。Chrome 內部頁面網址設計上無法由一般網頁超連結直接開啟。
2. 開啟右上角的 **開發人員模式（Developer mode）**。
3. 點擊 **載入未封裝項目（Load unpacked）**。
4. 選擇剛解壓後含 `manifest.json` 的資料夾，不是 ZIP 檔本身。
5. 成功後，點瀏覽器工具列的拼圖圖示，**將 Taiwan-LLM-Sanitizer 釘選**，方便日後操作。

## 第三步：實際使用

1. 到一個一般的 HTTP(S) 網站。點工具列的 TLS 圖示。
2. 選擇 **離線臺灣詞彙**（建議先試）或 **Chrome 本機 AI**（實驗性，可能下載語言模型）；可設定來源語言及用語偏好。
3. 點 **啟用本站繁中化**。Chrome 會在第一次對這個網站請求存取許可；由你決定是否同意。
4. 工具會在網站**右下角顯示固定大小的圓環**：轉動＝翻譯中，綠色勾勾＝目前可處理的內容已完成，橘色＝部分未完成。點圓環可暫停／恢復，不會因訊息長短而移動按鈕位置。
5. 要關閉本站功能：回到擴充功能視窗，按 **停用本站並還原**。其他已開分頁若仍保留效果，請重新整理。

## 常見問題

- **沒有翻譯英文長句：**「離線詞彙」只是有限詞庫，不是全文 AI 模型。需要完整句子請主動切至本機 AI，並確認 Chrome 版本與模型可用性。
- **本機模型不可用：** Google 官方 Translator API 僅於適用的桌面 Chrome 環境提供，首次可能下載語言包；目前**不支援手機 Chrome 的內建 Translator API**。版本需依當前官方文件；可先使用離線模式。
- **圖片／Canvas／WebGL 沒翻譯：** 文字不是普通 DOM 節點，這些需要另行開發的 adapter，目前不支援通用直接改寫。
- **Chrome 提示來源未驗證：** 這是自行載入的開發版，尚無 Chrome Web Store 審查認證；請從[本專案官方 Repository](../README.md)確認檔案與 SHA256，避免下載來路不明的改包。
- **與 Tampermonkey 同時啟用：** 同一頁避免同時啟用兩個版本，否則可能重複處理，建議僅選一種。
- **如何更新：** 取得新 Release ZIP、解壓到固定資料夾，再回 `chrome://extensions` 重新載入。同時留意使用者自訂每站設定可能受版本更新影響，先備份重要偏好。

**隱私：** 此版本沒有自家翻譯伺服器、不主動上傳頁面文字；每站啟用資訊在自己的瀏覽器儲存。Chrome 自行下載模型及原網站的網路行為與本工具的文字傳輸不同，詳見 [PRIVACY.md](../PRIVACY.md)。

[回首頁](../README.md) · [Tampermonkey 詳細安裝](INSTALL_TAMPERMONKEY.md) · [功能與限制](FEATURES.md)

