# Codex／Claude／Grok × Taiwan-LLM-Sanitizer：從 AI 初稿到可交付的臺灣中文

> 適用：一般 ChatGPT/Codex、Claude、Grok 對話使用者；Codex CLI／IDE、Claude Code、Grok Build 等可讀取本機專案的開發者。更新日：2026-10-27。外部 AI 功能、方案與價格可能變動，使用前請以官方說明為準。本文使用自製文字；**沒有宣稱曾在這三家服務實際連線執行完整任務**。

**一句話：AI 協助產生內容；TLS 負責本機、明確選詞及技術結構安全預覽。** TLS 不是另一個聊天模型，不會替 Codex、Claude 或 Grok 自動翻譯，也不會在你不知情的情況下把文字傳送給 AI。AI 內容的原意與文風仍需由人確認。

## A. 完全不會寫程式，也可以完成（建議先用這條路）

1. **自行在喜歡的 AI 中產生初稿。** 使用下方通用提示詞請 AI 編輯「已授權的原創內容」。要上傳機密或他人文件前，先確認該 AI 服務的資料使用與儲存規則。AI 互動可能是雲端，不屬於 TLS 的離線保證。
2. **下載全工具 Suite。** 到 [最新版正式 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest) 下載 `TLS_ALL_TOOLS_SUITE_17_2_0.zip`（本說明依預定 R17.2 發版；若該版本尚未出現，請先使用仍已發布的 R17.1 工具），或選獨立 `TW_Wording_Assistant_R172_20261027.html`。注意 GitHub `blob` 原始碼頁不是已部署的線上編輯器。
3. **不用安裝 AI 插件即可修稿。** 解壓 ZIP → 開啟 `START_HERE.html` → 選「修整已寫好的中文」，或直接用瀏覽器開啟下載的獨立 HTML。在本機貼上 AI 回傳的中文／Markdown。
4. **逐項看建議。** `menu` 在軟體介面可能是「選單」，餐飲可能是「菜單」。`click` 在介面操作可以選「點選」，「點擊率／點擊聲」不能直接換。新增六個技術用語候選是待審建議，並非全自動繁簡轉換。未決定的詞維持原文。
5. **核對並匯出。** 點選「產生安全差異預覽」→ 比對程式碼、連結、佔位符 → 複製或下載新 Markdown。系統不覆寫輸入來源；單檔上限 64 KiB，最多 120 個候選，長段或不安全格式可能會受限／拒絕。再將**你確認過的新稿**帶回原 AI 要求潤色或評估，但再次傳回雲端前自行檢查敏感資訊。

**通用提示詞（複製到任何 AI 對話）：**

```text
請協助把以下「我有權處理」的中文技術說明潤稿成自然的臺灣繁體中文。請保持原意，保留程式碼、Markdown 語法、CLI 指令、API 名稱、網址、JSON keys、{{variables}}、${variables}、產品專有名稱，不要自行編造功能或引用來源。介面上的 click／点击／點擊 在明確滑鼠操作情境優先譯為「點選」；統計數字或聲音請保留原義。menu 在 UI 為「選單」、餐飲可能是「菜單」，不確定請列為待確認。請輸出完整候選稿、你不確定的用語清單與應由我人工確認的項目。不要宣稱你已執行 TLS；我會自行在本機 TLS 工作台逐項檢查。
```

**可重現的原創練習：** 「請 click 主選單，修改軟件中的數據庫設定；餐廳 menu 依餐飲語境，點擊率不要改。」先讓 AI 提議，再用 `examples/r172/first_revision.md` 或 R17.2 工作台的「載入原創範例」操作。程式碼、HTML 註解及 `{{USER_PATH}}` 應維持原文。

## B. Codex CLI／IDE：放入專案並讓 Codex 讀 Skill

若你正在維護程式庫：下載或 clone 本儲存庫，以**專案根目錄**在 Codex（桌面、IDE 或 CLI）開啟。現有 Skill 位於：

- `.agents/skills/taiwan-zh-tw-localization/SKILL.md`（與 `skills/taiwan-zh-tw-localization/SKILL.md` 同源）；
- `AGENTS.md` 內有公開專案約束與結構保真範圍，勿把私人 Project Brain 上傳公開專案。

**對 Codex 說：**

```text
請先閱讀 AGENTS.md、.agents/skills/taiwan-zh-tw-localization/SKILL.md 和 docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md。請在新分支處理我授權的 docs/guide.md，保留程式碼、網址、JSON keys 和 placeholders；只產生可審查的修稿差異，不要直接發布 Release。請讓我用 R17.2 離線 HTML 逐項確認臺灣術語，再執行 node tools/translation_qa.js --source original.txt --translated result.txt。回報任何保真警示、未知語境與回滾方式；QA PASS 不代表語意已由真人驗證。
```

如果沒有看見 Skill 自動啟用：手動告知 Codex 讀取上述路徑；AI 無法自動讀取你電腦上的檔案時，要先開啟專案或另外分享**已去敏**的範例。Codex 的工具執行／檔案修改仍取決於你的裝置與授權。

## C. Claude Code：同一規範，不另造彼此矛盾的詞庫

`.claude/skills/taiwan-zh-tw-localization/SKILL.md` 與 Codex Skill 的原文相同，`CLAUDE.md` 提供倉庫指引。用 Claude Code 在**本機專案資料夾**工作，對它說：

```text
先遵守 CLAUDE.md，閱讀 .claude/skills/taiwan-zh-tw-localization/SKILL.md 及 docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md。請用臺灣中文協助檢查我有權使用的 README 草稿，只提出修改，不要自動覆寫原始檔。先保護 code fence、URL、CLI flags、模板變數，將 menu 與 click 的語境列出供我逐項確認；再讓我使用 TLS R17.2 的安全預覽檢查。不可聲稱它具備完整語意認證或已審核詞庫。
```

如果你使用的是一般 Claude 網頁／手機對話，而非 Claude Code，不要假設它已經讀取你硬碟中的 `CLAUDE.md` 或 Skill；請走 A 的「AI 初稿 → 手動貼入 TLS」流程。**Claude Code 的帳號、API 或本機工具權限與其一般聊天產品並不完全相同**，以官方文件為準。

## D. Grok：先有通用流程，再選擇開發者整合

**一般 Grok 對話：** 使用 A 的通用提示詞，將 AI 回傳的非機密草稿手動貼回 TLS；不要聲稱 Grok 網頁已支援本專案的 Codex／Claude Skill 自動偵測。

**Grok Build（具備本機程式編輯權限時）：** 在該工具所開啟的專案中，明確指定讀取 `AGENTS.md`、`docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md` 與 `skills/taiwan-zh-tw-localization/SKILL.md`，產生修改提案，再利用 TLS 的 R16/R17.2 安全預覽和 CLI 校驗。這是**通用文件指引**；不是已發布的 Grok 專屬 Plugin/Skill 相容性聲明。

```text
請讀取本 repo 的 AGENTS.md 與 skills/taiwan-zh-tw-localization/SKILL.md，幫我列出 docs 內非臺灣用語的可選建議（不要自動改寫原始檔或送到未經同意的服務）。對 code、URL、Prompt roles、${...} 與 JSON keys 請優先保護。等我用 TLS 離線工具確認後，再提出可回滾的最小差異。未知語境請標 UNKNOWN，不能猜成已審核。
```

Grok Build 官方開發者入門：<https://docs.x.ai/build/overview>；Grok API 官方說明：<https://docs.x.ai/developers/quickstart>。使用 API 會涉及授權、可能的計費與內容傳輸；**本 TLS Preview 不主動呼叫任何 Grok API**。

## E. 讓 AI 協作時不踩雷

| 現象 | 正確處理 |
|---|---|
| AI 寫得很流暢但改掉 `{{variable}}` | 不採用，改回原文／以 R15／R16 檢查保護範圍，不能以翻譯自然取代結構完整 |
| AI 把所有 menu 都變成選單 | 逐項確認 UI／餐飲；不明確就 KEEP_ORIGINAL |
| R17.2 沒找到候選 | 這表示有限詞庫沒有命中，不表示中文或語意已正確 |
| 本機 Preview 無法解析完整 JSON／Prompt | 不強行以 Markdown 改寫；改用 R16 的 `json`／`prompt` 模式與已授權的人工修改流程 |
| Codex／Claude/Grok 無法看到 SKILL.md | 先開啟專案或明確貼出非機密 Skill/指令；不假設每家 AI 自動載入相同目錄 |
| 要使用真實客戶資料 | 先確認權利、去識別化、企業規範及 AI 供應商資料傳輸；TLS 本機處理與雲端 AI 必須分開告知 |
| GitHub CI 完全通過 | 只能說測試涵蓋項目通過；不等於母語審稿、模型安全或所有平台相容性已通過 |

### 非二元路由與責任

`MAKE_AI_DRAFT`（外部 AI、可能傳輸）→ `LOCAL_PROTECT`（TLS）→ `CONTEXT_REQUIRED`／`KEEP_ORIGINAL`／`CONFIRM`／`LIMITED` → `SAFE_PREVIEW_NOT_APPLIED` → `HUMAN_REVIEW` → 使用者自行交付。每個階段都能終止；不需要替任何 AI 提供長期憑證、把專案內容上傳公共 Repo、或授權 TLS 自行修改來源。

## 官方查核連結

- OpenAI Codex、專案 AGENTS/Skills：<https://developers.openai.com/learn/codex>、<https://developers.openai.com/blog/skills-agents-sdk>
- Claude Code：<https://code.claude.com/docs/en/overview>
- Grok Build：<https://docs.x.ai/build/overview>

[返回首頁](../README.md) · [全工具使用說明](ALL_TOOLS_RELEASE.md) · [現有 AI 整合規格](AI_INTEGRATION.md) · [私人資料規範](../PRIVACY.md)
