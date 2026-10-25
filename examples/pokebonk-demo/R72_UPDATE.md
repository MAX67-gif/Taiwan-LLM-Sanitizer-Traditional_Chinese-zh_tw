# PokéBonk R7.2｜合作模式與新版顯示層安全示範（v0.1.2）

> 2026-10-25 · MIT 獨立原創程式 · 非官方、非遊戲模組、無遊戲端改動 · CA L. Founder / Steward
>
> **目前只通過原創離線 DOM 情境與 Chromium 測試；尚無 pokebonk.com 真站驗收、遊戲作者允許或最新官方 UI 字串逐項核對。** 不應把本工具的 v0.1.2 與遊戲自身的 v0.8.x 混為一談。

## 為什麼更新

新版遊戲據公開第三方更新追蹤新增了第 2 賽季、合作房間、團隊選角、快捷聊天、衣櫥及招式融合等介面。獨立版本追蹤頁於 2026-10-24 記錄遊戲版本 v0.8.31，但此頁並非 PokéBonk 官方來源，本輪環境亦無法讀取官方即時頁面與最新程式，**不能驗證 v0.8.31 仍是目前最新版本，或斷定新版 HTML 節點使用哪些文字**。

- 第三方更新脈絡：https://playpokebonk.com/updates
- 另一較舊追蹤頁：https://pokebonk.gg/updates
- 唯一授權使用網站範圍：https://pokebonk.com/ 和 https://www.pokebonk.com/

R7.2 **不是**把舊快照的遊戲模組硬改到新版本；只保留「可辨識、可見 DOM 的完整示範詞條」能力。更新遊戲的 Bundle 名稱只做診斷，不當成可修改遊戲狀態的理由。遊戲內容屬第三方權利人；不可將來源 JS、圖片、音效、Sprite、存檔或聊天資料收進 MIT Repo。

## R7.2 與 R7.1 的差異

| 項目 | R7.1 (v0.1.1) | R7.2 (v0.1.2) |
|---|---|---|
| 詞條 | 136 個原創示範 | 171 個原創示範（+35 類別相關候選，**不是 35 個真站確認字串**） |
| 舊映射 | Frozen | 逐條保留不動 |
| 多人合作與聊天室 | 玩家暱稱／常見 chat 樣式跳過 | 追加 role=log、textbox、data-testid、class/id 的保守防護；玩家、成員、聊天、帳號區不改 |
| 顯示邊界 | 精確匹配、手動啟用 | 同樣精確匹配、手動啟用及條件式還原；不讀取 game state |
| DOM 可見性 | 隱藏、CSS display:none、inert 跳過 | 保留且進一步跳過 forms／inputs，防止輸入欄受影響 |
| 遊戲版本 | 2026-10-18 舊主程式提示 | **來源未驗證** 的診斷資訊；不依 Bundle 名稱硬封鎖純 DOM 映射 |
| 安裝 | 0.1.1 舊 Release | 0.1.2 新 Release；**不可同時啟用** |

## 安裝說明（無須額外指令）

- 到 [R7.2 獨立 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) 下載 `TLS_Pokebonk_TW_Demo_R7_2_Chrome_20261025.zip` 或 `TLS_Pokebonk_TW_Demo_R7_2_Tampermonkey_20261025.user.js`，另外核對 `TLS_Pokebonk_TW_Demo_R7_2_SHA256SUMS_20261025.txt`。
- Chrome：先解壓縮 ZIP，再開 `chrome://extensions`，進入「開發人員模式」，載入包含 `manifest.json` 的解壓資料夾。Tampermonkey：直接匯入完整單檔，沒有外部 `@require`、`@connect` 或其他安裝指令。
- **先停用或移除 R7.1，再啟用 R7.2**；若同頁也使用通用 R5/R11/R13，應避免同時修改相同文字區域。
- 啟用後到遊戲原站，點選右下角「臺」字圓形圖示，再點選「啟用臺灣用語」。此動作前不會修改畫面文字。要停止時選「停用／還原」。
- 若不願承擔遊戲網站條款可能限制畫面修改的風險，請勿在正式遊戲啟用，可先閱讀詞庫或觀看本機原創測試例子。

## 重要限制

1. 不支援 WebGL、Canvas、WebAssembly 畫面文字、截圖、影像、Shadow DOM 內部或最新遊戲 i18n 資產轉譯；只處理目前一般 DOM。
2. 不會讀取帳號、玩家暱稱、聊天、隊友個資、比賽排名、存檔、地圖、角色能力或控制器狀態；會犧牲部分不確定的介面翻譯，優先確保安全。
3. 未重新讀取真站 JS、私有測試對話及動作錄製；不要宣稱通過最新版遊戲端到端測試、所有 171 筆對照都適用、遊戲官方授權或寶可夢商標許可。
4. 對已由遊戲在套用後改寫的文字，停用時不強行覆寫，只還原工具最後一次改寫且仍未被改動的內容。此為保守條件式復原，不保證跨版本絕對還原。
5. R7.1 原始碼、舊安裝檔及 Release 不變。R7.2 使用 `src/demos/pokebonk_r72/`、`dist/pokebonk/r72/`、`tools/build_pokebonk_demo_r72.py` 獨立重建，避免污染已驗收的通用 R5/R11/R13 核心。

## 開發／驗收

```sh
python tools/build_pokebonk_demo_r72.py
python tools/build_pokebonk_demo_r72.py --check
node --test tests/test_pokebonk_demo_r72.js
python tests/test_pokebonk_demo_browser_r72.py
node --test tests/*.js
python tools/publication_guard.py
```

Chromium 測試使用**原創合成頁面，不使用登入或連線 PokéBonk 真站**；在禁止訪問外站的沙盒，會獨立測試允許的主機清單，再於 `about:blank` 測試 DOM 顯示層。這不等於真站相容驗證。人類希望進一步確認真站時應使用自願、去識別化且不包含玩家聊天和憑證的 UI 範例，獨立存放私人檔案，不提交公共 Actions 或 Issue。
