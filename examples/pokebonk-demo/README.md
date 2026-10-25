# PokéBonk 臺灣繁體中文顯示層示範｜R7.2 v0.1.2

[返回 Taiwan-LLM-Sanitizer 首頁](../../README.md) · [R7.2 版本詳細差異與驗證](R72_UPDATE.md) · [R7.1 歷史使用手冊](R71_ARCHIVED_GUIDE.md)

這是獨立、**非官方**、可由使用者自行選擇的文字顯示層示範；**不是 PokéBonk 中文完整版、遊戲修改器，也未取得遊戲作者授權**。使用前應尊重遊戲網站條款。

## 它可以做什麼？

- **逐站手動啟用**：僅限 `pokebonk.com`、`www.pokebonk.com`；啟用前不修改文字。
- **臺灣常用顯示詞**：171 筆原創示例，其中 136 筆為 R7.1 舊示例，新增 35 筆合作房間、隊伍／衣櫥等介面的**編輯候選**；新增詞條**尚未經新版遊戲真站逐一核對**。
- **保守保護**：避開玩家名稱、聊天室、帳號、輸入欄位、隱藏節點與敏感文字；只在可見 DOM 上精確匹配，不修改 Canvas/WebGL、戰鬥、遊戲網路或存檔。
- **停用與條件式還原**：遊戲自己改寫過的內容，不強行用舊值覆蓋。

## 取得最新安裝檔

**[R7.2 v0.1.2 GitHub Release｜Chrome／Tampermonkey／SHA256](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)**

| 安裝方式 | 操作 |
| --- | --- |
| Chrome | 下載 `TLS_Pokebonk_TW_Demo_R7_2_Chrome_20261025.zip` 並解壓，開啟 `chrome://extensions` 的開發人員模式，載入含 `manifest.json` 的資料夾。 |
| Tampermonkey | 匯入 `TLS_Pokebonk_TW_Demo_R7_2_Tampermonkey_20261025.user.js`，完全自含、無外部 `@require`／`@connect`。 |

在遊戲頁點選「臺」字圖示，再點選「啟用臺灣用語」。需要停止時使用「停用／還原」。**先停用或移除舊 R7.1**，也請避免讓 R5／R11 等其他版本同時修改同一區域。下載檔可搭配 Release 的 SHA256SUMS 驗證。

## 限制與測試證據

- **真實遊戲相容性：NOT_VERIFIED**。本版測試的是原創合成 DOM 和 Chromium 操作，不代表最新 PokéBonk 官方網頁已端到端成功。
- 此工具不能修改遊戲畫面中的 Canvas／WebGL 文字，不讀取或上傳聊天與玩家資料；若官方條款不允許顯示層調整，請勿在正式遊戲啟用。
- 版本名稱 **R7.2／0.1.2 是此工具版本**，不是遊戲自己的版本。
- 此專案的原創工具以 MIT 公開；第三方遊戲、角色、商標、圖像及其他素材不包含在本授權範圍內。

更完整的改版細節、舊版差異、SHA 與安全限制請看 [R72_UPDATE.md](R72_UPDATE.md)。歷史 R7.1 文件仍獨立保留在 [R71_ARCHIVED_GUIDE.md](R71_ARCHIVED_GUIDE.md)，舊版安裝檔與 Release 不會被覆寫。
