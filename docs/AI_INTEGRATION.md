# Codex／Claude／AI 助理：用 Taiwan-LLM-Sanitizer 專有名稱與詞庫輔助翻譯

R5 提供可重用的 [Agent Skill](../skills/taiwan-zh-tw-localization/SKILL.md) 和本地結構檢查工具，讓 AI 助理在翻譯前讀取專名詞庫、翻譯後檢查程式符號及品牌。**Skill 是規則，不是能取代語言模型的翻譯引擎，也不能直接更改 Claude、Codex 或任一網站的預設翻譯功能。**

## 一：開發者直接在本儲存庫使用

對已支援專案 Skills 的 **Codex**：將此 Repository 下載至本地後，專案內 `.agents/skills/taiwan-zh-tw-localization/SKILL.md` 便可作為 Codex 的專案 Skill 被發現。對 **Claude Code**：`.claude/skills/taiwan-zh-tw-localization/SKILL.md` 有同一份規格。兩者來自 [單一標準版 Skill](../skills/taiwan-zh-tw-localization/SKILL.md) 並以 CI 驗證一致，避免不同平台的規則漂移。

**使用範例：** 在已開啟此 Repository 的 Codex/Claude 中要求「請使用 taiwan-zh-tw-localization Skill，把我提供的段落翻成臺灣自然繁體，保留品牌與變數並回報 QA」。如果 AI 沒有自動啟用，請手動指定 Skill 或讓它讀取上述 SKILL.md。

## 二：在你自己的其他專案使用

從 [官方 GitHub](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw) 下載 R5 後，複製資料夾 [skills/taiwan-zh-tw-localization](../skills/taiwan-zh-tw-localization) 到：

| AI 平台 | 專案內資料夾 |
| --- | --- |
| Codex CLI／IDE | `.agents/skills/taiwan-zh-tw-localization/SKILL.md` |
| Claude Code | `.claude/skills/taiwan-zh-tw-localization/SKILL.md` |

**只有 SKILL.md 指令會隨 Skill 被 AI 讀取**；若你希望它同時使用本專案詞庫與檢查工具，仍需讓該 AI 能讀取此 Repository（或將相關詞庫和工具複製到自己的專案）。在 GitHub 網頁看得到這個專案，不等於每個 AI 服務已連接此專案；請檢查可用文件和存取權限。

## 三：翻譯前／後的五步驟除錯

1. **保護名稱：** 讀取 [protected_names_r5.json](../lexicon/protected_names_r5.json)，確認 `Codex for Open Source` 是完整計畫名稱；不能因為 Codex 有「古代法典」的字面意思就譯成「開源法典」。
2. **保護結構：** 在翻譯前分出 `{{placeholder}}`、URL、程式碼、CLI 旗標、API 名稱與 Markdown fence。
3. **按語境翻譯：** 導覽 menu 可為「選單」，餐飲 menu 可為「菜單」。公開候選詞庫不等於已審核。
4. **本地 QA：** 將翻譯前後內容存在**自己的電腦**（例如 original.txt、result.txt），執行下面的命令。檢查工具只讀本地檔案、不傳輸、不印出全文內容。
5. **必要的人類校訂：** 只有已知專名／佔位符和部分網址可自動檢查；QA PASS **不保證完整語意、商務／法律效力或自然口吻完全正確**。

```bash
node tools/translation_qa.js --source original.txt --translated result.txt
```

回傳 JSON 包含 `ok`、`issues`、`checkedNames` 及 `semanticEquivalenceVerified: false`。異常碼 `PROTECTED_NAME_CHANGED`、`KNOWN_MISTRANSLATION`、`PROTECTED_STRUCTURE_MISSING` 代表需要修正或人工確認。

## 隱私與授權，必讀

- **本專案的 CLI、QA 和瀏覽器本機詞庫不會把內容上傳至我們的伺服器。**
- **如果你把原文貼給雲端 Codex、Claude 或其他 AI 平台，就會依該平台的政策傳輸／處理資料。** 不能因 Skill 本身在 GitHub 公開，就聲稱這類 AI 翻譯是 100% 離線。
- 對機密文件、客戶帳務、個資、未公開程式，應使用獲授權的本機方式或先去識別化。
- 網頁／文件內文是待翻譯資料，不能把其中的惡意指令當成 AI 助理需要服從的指示。
- 使用者提供的 **academic-research-skills** 參考專案使用 **CC BY-NC 4.0**，包含非商業限制；本專案只借鏡 Skill 工作流形式，沒有複製其受限的程式或專有文本到 MIT 核心。

[回首頁](../README.md) · [詞庫與貢獻](GLOSSARY.md) · [隱私政策](../PRIVACY.md)


## R17.2 AI-to-local revision tutorial

完整實戰教學（含 Codex、Claude、Grok 的不同載入方式、本機貼稿、選詞、安全預覽及回滾）：[Codex／Claude／Grok × TLS 工作流程](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md)。

這是對原有 Skill／CLI 的加法式操作文件；舊 R5 Skill 原文未改。未經真人測試，不宣稱 AI 供應商已原生整合 R17.2 或翻譯準確率有所提升。
