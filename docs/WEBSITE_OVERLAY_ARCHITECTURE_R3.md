# R3｜即時網頁在地化覆蓋層（Overlay）架構規格

## 要解決什麼？

現有 R2 是直接修改可見 DOM 文字節點，已能回復且處理部分動態更新，但對大型 SPA、互動式選單、位置布局、語意/無障礙朗讀可能有影響。**R3 應設計可選擇的非侵入式翻譯覆蓋（Overlay Mode）**，讓使用者能看繁中而不用改壞原網站互動。

**本文件是規格和驗收標準；不是聲稱已完成 Overlay 產品。**

## 架構

User Gesture + Site Permission → Viewport Analyzer → Visible Text Extraction (不含私密欄位) → Protected Text Segmentation → Local Provider Router → TW Terminology Context Resolver → Overlay Layout Engine → Accessibility/Original Comparison → Reversible Session.

- 原站 DOM 優先保持不動；在擴充功能控制的隔離 ShadowRoot 提供浮動繁中層，使用 Range.getClientRects() 或適當錨點定位，並使用 scroll/resize/Mutation/Intersection Observer 更新位置。不能讓 overlay 擋住原站按鈕或輸入。
- 使用者按需選擇：**原文**／**純繁中**／**雙語上下對照**／**滑鼠懸停看原文**／**滑鼠選取段落翻譯**／**整站翻譯**；任何模式都要有立即關閉與還原。
- 僅翻譯可見視窗及鄰近少量內容，段落批次、防止翻譯重複、並行上限和取消；不在背景追蹤瀏覽歷史。
- 語境判斷不依「某國用語不能出現」；以導航 UI、開發文件、餐飲內容等領域線索和使用者選擇為主。
- 台式術語可用下劃線/tooltip 選擇替代詞，並提供原文、候選及「此站永遠保留本詞」設定；預設不將詞條建議送出。
- 畫布/WebGL/OCR、圖片字幕、跨來源 iframe、PDF viewer、closed Shadow DOM 分開做專用 Adapter；不得繞過站方安全界線或反作弊機制。
- 原文、譯文與定位資訊只在分頁記憶體中短暫保留，停用清除；無自動上傳雲端。

## 主要安全與體驗驗收

1. **不破壞網站：** 站內點擊、拖動、選取、輸入、表單送出、焦點、螢幕閱讀器仍正常；overlay 預設 pointer-events:none，只有個別工具控制開啟事件。
2. **無重影／無遮擋：** 動態內容變更、頁面捲動、視窗大小、縮放、字型變更能更新對位；必要時自動停用有問題區塊並提示。
3. **不閃爍：** 分批發布、離線快取、限速與畫面可視化資源預算，減少 MutationObserver 回饋迴圈。
4. **原文可見：** 一鍵雙語、對照顯示，不將整站文字永久替換掉。
5. **平台中立：** Chrome、Userscript、CLI 共享文字與語境核心，覆蓋層僅是 Browser Adapter 的一種 rendering strategy。
6. **分層狀態：** `DOM_SAFE`、`PARTIAL_OVERLAY`、`OVERLAY_ALIGN_FAIL`、`CANVAS_NEEDS_SPECIAL_ADAPTER`、`PERMISSION_REQUIRED`，並顯示原文或降級，絕不能謊稱翻譯成功。

## 先行實作次序

R3-a：持續完善詞庫/模式、語境分類與用戶自訂。
R3-b：純文字頁、導航列與清單做 `hover-original` 與雙語 Preview；可回復。
R3-c：長頁面 Overlay anchor、Mutation/IntersectionObserver、螢幕閱讀器安全及實網站回歸。
R4+：需要圖片的 OCR/畫布文字等依使用者同意、法律權利及測試逐項研究。

## 技術警告

不應為了做「完全適配」而操作封閉站點內部遊戲物件、網路封包、系統保護資源；必須以可維護的公開 DOM/授權輸入及專用 Adapter 解決。
