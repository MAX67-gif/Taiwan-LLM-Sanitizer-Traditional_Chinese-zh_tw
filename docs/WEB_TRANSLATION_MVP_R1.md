# Web Translation MVP R1｜通用網頁文字層原型

**用途：** 一般 HTTP(S) 網頁及動態 SPA；不專屬任何網站、服務或遊戲。

## 已有原型的需求

1. Chrome Manifest V3：每站由使用者明確請求網站存取許可；授權後持續啟用；關閉不留下網頁 DOM 改動。
2. Tampermonkey：單檔離線使用者腳本，自行選擇網站啟用；沒有 `@require` 外部程式依賴。
3. 共用 core：少量臺灣技術字詞與通用英文 UI 標籤；不改 script/style/pre/code/textarea/contenteditable；處理部分動態文字更新。
4. 當工具轉換後網站又改寫內容時，保留網站新內容；不能拿舊紀錄蓋回新資料。
5. 預設不傳送網頁內容到第三方、沒有帳號、沒有 API key、沒有背景遙測。

## 清楚的界線

離線短詞不是全文神經翻譯。R1 不保證 Open／Closed Shadow DOM、跨來源 iframe、Canvas/WebGL、圖片內文字、PDF 閱讀器、Chrome 內建保護頁面可被翻譯。瀏覽器內建 Translator API、各類本地模型、使用者自訂 API 是後續可插拔 Provider，須確認實際可用性與權限，不能偽稱已整合。

## 必要驗收

靜態節點、DOM Mutation、新文字變更、skip-code、skip-input、URL／placeholder 保護、停用還原、沒有死循環及持續大量觀察造成耗資源；Chrome／TM 生成物共享版本號且由同一核心產生。Chromium 與 Userscript stub 測試不是所有真實網站的適配證據。

## 用戶體驗

一鍵啟用、暫停／恢復、撤銷，明確標示 Offline Terms-only 模式；日後有 Provider 時，明確標示翻譯來源、成本、私密資料影響、失敗原因與原文恢復。