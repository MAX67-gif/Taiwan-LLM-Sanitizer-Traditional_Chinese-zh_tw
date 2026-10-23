# Taiwan-LLM-Sanitizer｜讓中文讀起來更像你熟悉的臺灣用語

**把外文網頁、常見介面文字及部分技術內容，轉成自己看得順眼的臺灣繁體中文。** 可以保留原詞，也可以選輕度臺灣化、自然平衡或臺灣用語優先；不搞禁語、不強制改寫。

**若本專案對你有幫助，歡迎加星號以及Watch隨時注意專案更新進度**

**有任何問題歡迎到Issues中提出**
**版本：R5 Preview 0.4.0｜開源 MIT 核心｜專案發起及維護治理：CA L.**

> **隱私承諾：本專案不收集個資、瀏覽紀錄、網頁原文或翻譯結果，不建立接收內容的後端服務，也沒有追蹤或遙測功能。正在翻譯的文字由你的瀏覽器或自己的電腦在本機處理，工具不會自行把它上傳到任何翻譯伺服器。** Chrome 可能為本機翻譯下載語言模型；原網站和瀏覽器本身的網路行為不是本工具的傳輸。詳見 [隱私政策](PRIVACY.md)。

## 直接下載安裝（無須寫程式）

**[GitHub Releases：Chrome ZIP、Tampermonkey 單檔與 SHA256](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)**

如果目前尚未出現 R5 Release，也可用 [dist/chrome 已完成組裝的擴充功能目錄](dist/chrome) 或 [dist/userscript 單檔腳本](dist/userscript/TaiwanLLMSanitizer.user.js)。Chrome ZIP **要先解壓，再從 chrome://extensions 選「載入未封裝項目」**；它不是可以雙擊直接安裝的 Chrome 商店版。

- **[Chrome 圖解式文字教學、更新與常見問題](docs/INSTALL_CHROME.md)**
- **[Tampermonkey 完整安裝與啟用教學](docs/INSTALL_TAMPERMONKEY.md)**
- **[Codex／Claude Agent Skill 使用說明](docs/AI_INTEGRATION.md)**

> 不要從陌生網站下載重新封裝的擴充功能；確認 GitHub 官方 Release 的來源及檔案 checksum。

## R5：不再把品牌直譯成普通詞

例如 **Codex for Open Source** 是 OpenAI 計畫名稱，應保留官方英文，不可翻成「開源法典」。R5 增加 [受保護的專有名稱庫](lexicon/protected_names_r5.json) 及本機 [翻譯前後 QA 工具](tools/translation_qa.js)；模型若損壞專有名稱、URL 或重要占位符，會拒絕不安全的結果或提示人工檢查。

**網站右下角的固定圓形狀態**：轉動代表正在處理；勾號代表目前可翻譯的區域已完成；橘色表示有部分區域未完成。它不會因出現長訊息而推擠站上其他按鈕。Chrome 設定視窗中的操作列也固定在底部，不會因狀態變動而位移。

## R6：如何知道翻譯真的自然、沒有翻壞？

**R6 是獨立的翻譯品質評測預覽，不更動目前正式 R5 0.4.0 翻譯引擎。** 我們已準備 100 題公開凍結測試，涵蓋技術文件、商務、網頁、專有名稱及 Prompt，每類 20 題；並提供完全本機的自動 QA、雙語人工審閱和桌面 Chrome 本機 Translator API 執行入口。

- [閱讀公開評測方式與重要限制](docs/QUALITY_EVALUATION.md)
- [雙語審閱室（可在手機閱讀／離線操作）](examples/TW_R6_Bilingual_Quality_Review_20261024.html)
- [桌面 Chrome 真實本機 Translator API 測試頁](examples/TW_R6_Local_Chrome_Model_Run_20261024.html)
- [100 題凍結 JSONL](benchmarks/r6/public_frozen_v1.jsonl) · [資料集 SHA256](benchmarks/r6/frozen_manifest_v1.json)

**重要：目前只完成測試設施，還沒有經獨立評審驗證的真實模型自然度成績。** R5 的離線詞彙模式不是全文翻譯模型；QA 通過也不代表譯文已忠實且自然。

## PokéBonk 臺灣繁中示範（獨立可選用）

我們新增了 **[PokéBonk 專用的臺灣中文試玩 Profile](examples/pokebonk-demo/README.md)**，目前有 136 筆自行整理的短詞與寶可夢／招式名稱示例。提供 [GitHub 獨立示範 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.0) 內的 Chrome ZIP 與 Tampermonkey 單檔。

**重要：** 這是僅限 pokebonk.com 的非官方、需手動啟用顯示層示範。它不修改戰鬥、登入、存檔或網路，不保證能翻譯 WebGL／Canvas，也沒有將其他遊戲的完整程式碼或素材放進 MIT。PokéBonk 自身使用條款可能限制頁面修改，啟用前請自行確認。**通用 TLS R5 擴充功能仍獨立，未因示範而強制加入遊戲特殊邏輯。**

## 你可以用它做什麼？

| 使用方式 | 現況 | 適用情境 |
| --- | --- | --- |
| **Chrome／Chromium 擴充功能** | R5 原型 | 使用者自行允許的網站、SPA 上部分 DOM 文字 |
| **Tampermonkey 單檔腳本** | R5 原型 | 不需額外驅動腳本的逐站翻譯與詞彙校正 |
| **Node.js CLI** | 保守離線原型 | Markdown、TXT、部分 JSON／JSONL 批次處理 |
| **本機詞庫探索器** | 可直接使用 | 查詢臺灣／中國／英文技術詞、按領域比較 |

有兩種網頁處理模式：**離線用語校正**與使用者自行啟用的**Chrome 本機 AI 翻譯（實驗性）**。後者只在 Chrome 的模型及語言組合可用時運作；不可用時保留文字或回退到安全詞彙校正。

### 臺灣用語不是「唯一正確答案」

例如 `menu` 在軟體導覽可能譯為「選單」，餐飲情境則是「菜單」。使用者能選擇保留原文；產品不會因某個詞常見於不同地區就禁止它。公開詞庫目前包含 **883 筆待審核候選**與 **67 筆編輯種子詞**；候選**不會全部自動套用**，並非官方用語認證。詳見 [詞庫與貢獻方式](docs/GLOSSARY.md)。

## 安裝

### Chrome／Chromium

1. 在 GitHub 右上角選 **Code → Download ZIP**，解壓縮專案。
2. 開啟 `chrome://extensions`，啟用「開發人員模式」，選擇「載入未封裝項目」，指定 **`dist/chrome/`**。
3. 在一般 HTTP(S) 網頁點選擴充功能，選擇處理模式、用語偏好及來源語言，按**啟用本站**。第一次啟用才會要求該網站權限。
4. 隨時可停用並還原；其他先前開啟的分頁可能要重新整理。

**目前尚未上架 Chrome Web Store。** 部分 Chrome 版本或裝置不支援內建翻譯模型，非所有 Chromium 瀏覽器均可用。

### Tampermonkey

1. 安裝 Tampermonkey 後，匯入[完全自含的單檔腳本](dist/userscript/TaiwanLLMSanitizer.user.js)。
2. 進入想使用的網站，從腳本選單明確**啟用本站**；預設不改寫網站內容。
3. 使用浮動面板切換翻譯模式、臺灣用語偏好、領域與來源語言；可暫停或還原。

### 本機 CLI

需 Node.js 20+。輸入不會上傳，也不覆寫原資料夾；使用者指定的輸出檔案會儲存在自己的電腦。

```bash
node tools/localize_cli.js --input ./docs --output ./localized
node tools/localize_cli.js --input ./docs --output ./localized --domain ui --regional-preference light
node tools/localize_cli.js --input ./data.json --output ./localized --json-strings
```

## 自己試試看

- [離線詞庫探索器](examples/TW_Lexicon_Explorer_R3_20261024.html)：查詢與篩選詞彙。
- [翻譯偏好示範頁](examples/TW_Translation_Style_Lab_R3_20261024.html)：純 CSS／HTML 的手機友善互動示例，**譯文為人工示意，不代表模型已支援文風控制**。

## 目前的限制

R5 是原型，不保證任意語言的全文品質。圖片／OCR、Canvas／WebGL、跨來源 iframe、封閉 Shadow DOM、部分 PDF、特殊網站結構，以及真正可由模型控制的「自然、正式、口語」文風尚未完整支援。詳見 [功能與限制](docs/FEATURES.md)。

## AI 平台的安全用語技能

R5 新增可由 **Codex 與 Claude Code** 讀取的同一份 [taiwan-zh-tw-localization Skill](skills/taiwan-zh-tw-localization/SKILL.md)。把這份 Repository 交給有實際檔案權限的 AI，或按 [AI 整合教學](docs/AI_INTEGRATION.md) 放入自己的專案，即可讓 AI 用專有名稱及詞庫輔助翻譯、執行本機 QA。

Skill 不等於 AI 翻譯模型，也不會自動接管任何雲端 AI 平台。**若你把私人文字直接貼到雲端 Codex／Claude，該平台另有自己的資料處理政策**，不能因我們的本機擴充功能沒有上傳文字，就把雲端對話說成完全離線。

## 了解與參與

- [簡短公開開發方向](docs/ROADMAP.md) · [架構與建置](docs/DEVELOPER_GUIDE.md)
- [隱私政策](PRIVACY.md) · [安全政策](SECURITY.md) · [貢獻規範](CONTRIBUTING.md)
- [MIT 授權](LICENSE) · [署名及權利](AUTHORS.md) · [更新紀錄](CHANGELOG.md)

核心原創程式以 **MIT** 提供，可依授權商用、修改與再散布。未來如有另外開發的進階服務／產品，可獨立授權，但**不追溯限制已公開的 MIT 版本**。第三方來源另依其有效授權處理。

本專案為獨立開源作品，不代表 OpenAI、Google、Chrome 或 Tampermonkey 的官方產品或背書。

---

## 詳細安裝說明與下一步

**Chrome 擴充功能：** [從 Releases 取得 ZIP](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) → 解壓 → 在瀏覽器手動輸入 chrome://extensions → 開發人員模式 → 載入含 manifest.json 的資料夾 → 授權需要翻譯的網站。**[查看完整 Chrome 教學](docs/INSTALL_CHROME.md)**。

**Tampermonkey 腳本：** [下載 .user.js](dist/userscript/TaiwanLLMSanitizer.user.js) → 透過 Tampermonkey 匯入 → 進入網站 → 選單手動啟用本站 → 右下角圓形點開設定。**[查看完整 Tampermonkey 教學](docs/INSTALL_TAMPERMONKEY.md)**。

**Codex／Claude：** [AI 平台 Skill 安裝與驗證](docs/AI_INTEGRATION.md)。本地檢查工具只會輸出診斷碼，不印出整篇翻譯文字。
