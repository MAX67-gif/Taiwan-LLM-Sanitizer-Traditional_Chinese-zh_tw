# Taiwan-LLM-Sanitizer｜讓中文讀起來更像你熟悉的臺灣用語

**把外文網頁、常見介面文字及部分技術內容，轉成自己看得順眼的臺灣繁體中文。** 可以保留原詞，也可以選輕度臺灣化、自然平衡或臺灣用語優先；不搞禁語、不強制改寫。

**版本：R3 Preview 0.3.0｜開源 MIT 核心｜專案發起及維護治理：CA L.**

> **隱私承諾：本專案不收集個資、瀏覽紀錄、網頁原文或翻譯結果，不建立接收內容的後端服務，也沒有追蹤或遙測功能。正在翻譯的文字由你的瀏覽器或自己的電腦在本機處理，工具不會自行把它上傳到任何翻譯伺服器。** Chrome 可能為本機翻譯下載語言模型；原網站和瀏覽器本身的網路行為不是本工具的傳輸。詳見 [隱私政策](PRIVACY.md)。

## 你可以用它做什麼？

| 使用方式 | 現況 | 適用情境 |
| --- | --- | --- |
| **Chrome／Chromium 擴充功能** | R3 原型 | 使用者自行允許的網站、SPA 上部分 DOM 文字 |
| **Tampermonkey 單檔腳本** | R3 原型 | 不需額外驅動腳本的逐站翻譯與詞彙校正 |
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

R3 是原型，不保證任意語言的全文品質。圖片／OCR、Canvas／WebGL、跨來源 iframe、封閉 Shadow DOM、部分 PDF、特殊網站結構，以及真正可由模型控制的「自然、正式、口語」文風尚未完整支援。詳見 [功能與限制](docs/FEATURES.md)。

## 了解與參與

- [簡短公開開發方向](docs/ROADMAP.md) · [架構與建置](docs/DEVELOPER_GUIDE.md)
- [隱私政策](PRIVACY.md) · [安全政策](SECURITY.md) · [貢獻規範](CONTRIBUTING.md)
- [MIT 授權](LICENSE) · [署名及權利](AUTHORS.md) · [更新紀錄](CHANGELOG.md)

核心原創程式以 **MIT** 提供，可依授權商用、修改與再散布。未來如有另外開發的進階服務／產品，可獨立授權，但**不追溯限制已公開的 MIT 版本**。第三方來源另依其有效授權處理。

本專案為獨立開源作品，不代表 OpenAI、Google、Chrome 或 Tampermonkey 的官方產品或背書。
