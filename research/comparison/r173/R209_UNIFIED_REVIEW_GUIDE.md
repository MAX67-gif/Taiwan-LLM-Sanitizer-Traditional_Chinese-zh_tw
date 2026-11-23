# R209｜臺灣用語一頁整合式離線審稿台（研究預覽）

**狀態：**研究預覽 / NOT RELEASED / 不自動改稿 / 無外部資料傳輸。不是新的翻譯模型、不是 Suite 17.5 正式發行，也沒有真人語言品質認證。

## 為什麼新增這一版？

R205 用附近字面線索提醒 `menu` 可能是 UI「選單」或餐飲「菜單」、R207 一次只顯示一筆待審候選、R208 引導新使用者由原創示範到自願本機回饋。三者此前分別在不同離線 HTML。本版只做**一頁整合**，重用原有核心與原始程式、不擴充字典、不要求雲端帳號、不默默採用候選。

## 一次完成的操作

1. 解壓 GitHub Actions 的 `TLS_R209_UNIFIED_OFFLINE_REVIEW_NOT_RELEASED`，直接用瀏覽器開啟 `TW_Unified_Review_R209_20261124.html`（沒有伺服器、CDN、外部 API 或安裝器）。
2. 點選 R208「載入示範並開始」，或貼上自己有權處理的 Markdown／文字；在本機安全分析。
3. R209 在候選卡上標示 R205 的 **HIGH／MEDIUM／LOW／LOCKED** 規則式風險提示；可切換「高風險先看／原文位置順序／只看高風險」。
4. 若覺得列表太長，使用 R207「單筆專注模式」；上一筆、下一筆依**當前風險排序**切換，使用者親自按「採用／保留／取消」，不自動決定任何一筆。
5. 依 R208 引導，主動產生 R16 保護後的安全差異預覽，核對原稿與新稿；按下載只是觸發瀏覽器另存，不代表作業系統磁碟保存成功。
6. 自願回饋維持 R208 既有 **自行選取＋明確同意＋主動下載** 的本機 JSON；不含原稿、文件 SHA、候選 ID 或身分資訊。不會自動傳給維護者。

## 非二元風險顯示

| 例子 | 唯讀提示 | 實際動作 |
|---|---|---|
| `介面 menu` | 附近 UI 線索／MEDIUM | 人工可採「選單」、餐飲詞或保留；無自動答案 |
| `餐廳 menu` | 附近餐飲線索／MEDIUM | 人工自行核對 |
| `餐廳設定 menu` | 同時有 UI／餐飲線索／HIGH | 高風險先看，仍由人決定 |
| `未知 menu` | 無法判斷／HIGH | 高風險、要求人工核對 |
| `介面 menu` 人為選「菜單」 | 已選詞與字面線索衝突／HIGH | **警告但不撤銷既有人工選擇** |
| 受保護程式碼、URL、模板變數 | 原始 R16/R15.1 保護優先 | 不新增可改寫部位 |

R205 只用局部標點界線內的原創字面線索，**不能宣稱可準確理解完整語意**。遇到未知或矛盾應保留人工決定。新版不增加詞庫，R203 同源審稿 JSON、R204 復原／重做、R207 專注功能、R208 五步引導與回饋 Schema 都保持原版。

## 程式與來源

- `review_unified_r209.js`：唯讀 `route / focus / nextPending / summary`，將風險顯示順序交給單卡導航；所有摘要不含原文、文字、替換建議、來源 SHA 或身分。
- `build_unified_review_r209.js`：以已驗收的 `build_first_task_r208.js` 產生完整原稿，僅在記錄過的唯一模板錨點加上 R205＋R209 腳本、風險卡與必要調整後的 R207 UI；任何來源錨點不符合即拒絕。
- `test_unified_review_r209.js`：7 組 Node 反例，檢查排序、焦點、待決跳轉、原使用者選詞、無外傳、來源錨點與原版保護。
- `test_unified_review_browser_r209.py`：Chromium 真正本機 `file://` 的 13 項端到端驗收；若沙盒管理政策阻擋，必須明確記錄 `content` 模式，不能冒充原生檔案驗證。

開發者執行：

```sh
node research/comparison/r173/build_unified_review_r209.js --build
node research/comparison/r173/build_unified_review_r209.js --check
node --test research/comparison/r173/test_unified_review_r209.js
python research/comparison/r173/test_unified_review_browser_r209.py
```

**既有正式 Suite 17.4.0（29 件附件）不可覆寫。** R202/R206 的 Suite 17.5 候選仍為另一個 Draft，需要完整 canonical Registry、來源 SHA、權利與 30 附件新鮮下載驗證，不能因本研究版測試通過就發行。

## 驗收、隱私與回滾

每個新風險結果只有 `approval=NONE`、`auto_apply=false`。檔案與選項完全留在瀏覽器記憶體，沒有 localStorage、遙測、CDN、外部 API、原始文件備份或自動寄送。完整性測試只證明這些行為符合本輪合成案例；人類翻譯自然度、真正外部使用者採用、OS 原生檔案選取取消與 Codex for Open Source 入選皆尚未得到證據。

回滾：撤銷本次獨立研究 PR 即可，原有 R205／R207／R208 單檔與正式發行版本均不受影響。
