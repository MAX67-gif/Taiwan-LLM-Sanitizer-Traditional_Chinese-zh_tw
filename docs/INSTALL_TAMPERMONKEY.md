# Tampermonkey 使用者腳本安裝｜完整教學（R5）

Tampermonkey 是 **Taiwan-LLM-Sanitizer 的其中一種使用方式**，不是整個專案的核心。R5 腳本為**一個自含的 .user.js 檔案**，不需第二段初始化指令、外部 CDN 或私人服務。

## 第一步：取得腳本

- **推薦**：[GitHub Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)：下載最新的 **TLS_Tampermonkey_R5_20261024.user.js**。
- **直接下載／查看原始檔**：[dist/userscript/TaiwanLLMSanitizer.user.js](../dist/userscript/TaiwanLLMSanitizer.user.js)。Github 頁面可按 **Raw** 取得原始檔。請注意，直接開啟 Raw 不一定會自動安裝，取決於 Tampermonkey 和瀏覽器設定。
- 另一方法：在主專案頁面 **Code → Download ZIP** 解壓後找到 `dist/userscript/TaiwanLLMSanitizer.user.js`。

## 第二步：加入 Tampermonkey

1. 先從瀏覽器官方擴充功能商店安裝 **Tampermonkey**，再開啟其管理面板。
2. 在 Tampermonkey 的 **Utilities（實用工具）／匯入**，選擇下載的 .user.js；有些版本也可以使用管理面板的新增腳本，直接貼入 .user.js 原始內容。不同版本的按鈕名稱可能略有差異。
3. 確認安裝頁面上只看到 **Taiwan-LLM-Sanitizer R5**，以及其腳本來源是官方 Repository。腳本宣告 `@grant GM_getValue`、`GM_setValue`、`GM_registerMenuCommand`；不要求 `GM_xmlhttpRequest` 或遠端 `@require`。
4. 按安裝／儲存，重新整理你想翻譯的網站。

## 第三步：啟用和調整

1. 一開始**所有網站都不會自動改寫內容**；打開 Tampermonkey 工具選單，按 **TLS：啟用／停用本站**。
2. 啟用後，右下角會有**位置固定的圓形進度指示器**。轉動＝正在處理，勾勾＝目前已處理完成，橘色＝部分未完成。
3. **點圓形指示器可展開設定面板**。可切換離線詞彙／本機 AI、來源語言、臺灣用語偏好、領域；設定面板與按鈕各自固定，不因狀態文字改變位置。
4. 若頁面反應慢、排版有影響，可以按面板「暫停／還原」或在 Tampermonkey 選單停用本站；停用時會嘗試還原仍由工具改寫的文字。

## 常見問題

- **匯入後不出現：** 確認 Tampermonkey 已啟用腳本，目標為一般 HTTP(S) 網頁，而非瀏覽器保護頁面；重新整理，從腳本選單啟用本站。
- **Chrome 本機 AI 選項不可用：** 依瀏覽器及系統實際支援狀態；使用離線詞彙模式不需下載語言模型。
- **浮動按鈕會擋住網頁？** R5 將工具固定在右下角小圓形，面板可收合，不攔截整頁點選；若網站本身在同一角落有按鈕，仍有可能相互遮擋，屬需實測的相容性限制。
- **中文不夠自然：** 詞彙模式只轉換少數術語。完整語句翻譯及風格控制仍需適當 AI 模型，不能因設定有口語選項就宣稱模型已支援。
- **與 Chrome 擴充功能重複：** 不建議在同一網頁同時啟用兩套版本。
- **怎麼更新：** 從 Release 重新下載最新版 .user.js，在 Tampermonkey 中更新該腳本。不要把原站字詞或登入資料提交到公開 Issue。

**隱私：** 本腳本沒有自行向外傳送網頁文字的程式碼，也不含遠端翻譯 API。你的網站啟用偏好存在 Tampermonkey 本地儲存中；詳見 [隱私政策](../PRIVACY.md)。

[回首頁](../README.md) · [Chrome 詳細安裝](INSTALL_CHROME.md) · [AI Skill 安裝](AI_INTEGRATION.md)


## R11 v0.5.0 另外提供的個人詞庫模式

R5 v0.4.0 安裝包不會被覆寫；R11 是另一份獨立的可下載 Preview。請使用 R11 Release 的 Chrome ZIP（解壓載入）或 Tampermonkey 單檔 .user.js，**不要在同一個網站並用 R5 與 R11**。具體的 R9 JSON 匯入、逐站權限、人工預覽、勾選、還原與個人資料限制請見 [R11 使用說明](R11_SITE_GLOSSARY.md)。


### R13 獨立雙語閱讀版

匯入 `TLS_Tampermonkey_R13_20261025.user.js` 後預設為**關閉**。從 Tampermonkey 腳本選單**點選「TLS R13：啟用／停用本站雙語閱讀」**才在指定網站顯示側車。反白網頁文字後點選面板中的「讀取反白原文」，不修改網頁節點。若同時使用 R11 改寫網站，請留意取得的可能已非初始原文。詳見 [R13 規格](R13_BILINGUAL_READER.md)。
