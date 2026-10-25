# R15｜Markdown／JSON／AI Prompt 結構保真掃描與安全差異預覽

> 2026-10-25 · 獨立 MIT 原創 Shadow Preview 0.1.0。這不是自動翻譯引擎、Markdown 完整 AST 解析器、文字內容審稿器或真實模型品質認證。本次不修改 R5/R11/R13 已發布翻譯執行期、R6 凍結 100 題、R14 Provider Router。

## 使用者真正得到什麼？

R15 先解決「從模型拿到一段臺灣繁中候選後，不能因此把程式碼、URL、Markdown 語法、JSON Key 或 Prompt 角色意外改掉」的工程問題，第一版以**保守掃描＋人工選取修改建議＋SHA256 比對＋僅產生預覽**方式防止自動套用。

[R15 完全離線單檔 HTML](../examples/TW_Structured_Integrity_Lab_R15_20261025.html) 可以下載後直接開啟，不需安裝 Node，不使用遠端模型／CDN／追蹤服務。貼上合法可自行使用的 Markdown、JSON 或 Prompt，按「掃描保護範圍」，閱讀每段保護理由，只在要修改的可編輯文字旁**人工勾選及輸入**建議文字，產生對照預覽；可清除全部資料並手動下載**不含原文和候選全文**的 JSON 報告。頁面不替使用者判斷句子自然度，也不會修改原始網站或磁碟檔案。

## 語義和支援限制（不可隱藏）

| 格式 | R15 第一版可辨識／保護 | 保守限制 |
| --- | --- | --- |
| Markdown | fenced／inline code、標題、front matter、網址、連結／圖片、參照定義、表格分隔符、縮排程式碼、已知受保護專名、常見模板佔位符與 CLI 旗標 | 不是 CommonMark 完整解析器；有歧義、不平衡或未知結構可能整份拒絕或拒絕較多區域。為防錨點斷裂，目前**不修改標題／連結標籤** |
| JSON | 有效語法與重複鍵檢查；JSON Key、符號、未知欄位、敏感／機器欄位、URL 與有跳脫字符值保護；僅 `text`／`description`／`summary`／`message`／`label`／`title` 等明確欄位純文字允許預覽 | 不允許批次覆寫，數字/陣列純值與 JSON Schema 未明確授權不得改；`__proto__` 等特殊 key 整份拒絕。不是翻譯資料自動轉換器 |
| Prompt | 明確 `system:`／`developer:`／`user:`／`assistant:` 等角色行及常見 XML 角色標籤、程式碼區、佔位符、URL、CLI 選項保護 | 不做 prompt 的語義正確性保證；未帶角色的普通句子仍可能需要人工判斷。資料中的命令一律視為非可信文字 |

`click` 若語境為滑鼠／UI 操作，可由使用者自行選擇「點選」；點閱率或聲音情境不能一律強制改寫。`menu` 在 UI 為「選單」，餐飲情境為「菜單」。本工具不認證哪一個情境譯文正確，也不會將 883 待審詞條自動升格。

## Schema 與可靠性契約

`tls.structured-segments.v1`：`format=markdown|json|prompt`，`input_sha256`、`input_bytes`、`offset_unit=utf16`（不是 codepoint 或 UTF-8 bytes）、`segments[{id,start,end,type,policy,reason}]`、`protected_count`、`mutable_count`、`validation{status,errors}`、`approval=NONE`。所有 segment 半開範圍 `[start,end)` 串接後完全覆蓋輸入。錯誤／不平衡結構的 `validation.status=REJECTED`，可編輯數量歸零。

`tls.structured-edits.v1`：由使用者自行建立的 `{schema,input_sha256,edits:[{id,replacement}]}`；不可提供不存在、重複或被保護 segment ID。候選字串不得含 HTML、連結、變數模板、Markdown 結構與跨行控制文字。任何預覽前**重新掃描來源**並重新核對 SHA／分段／權限，防止偽造原始分析結果繞過保護。JSON 另驗證解析後物件鍵序與資料型別結構一致。輸出 `tls.structured-preview.v1` 狀態固定 `SAFE_PREVIEW_NOT_APPLIED`、`approval=NONE`，不含套用接口或遠端傳送。

大小與限制：原文最大 1 MiB；最多 20,000 segments、120 段手動修改，每段候選最多 1,000 字元；未支援／超限／惡意輸入 fail closed。來源 SHA 使用 UTF-8 位元組計算；離線瀏覽器沒有 `crypto.subtle` 時有等價 SHA256 回退演算法，已在 Node 與 Chromium 裡核對。

### Node CLI：無伺服器／不覆寫來源

本機安裝 Node 20+ 後：

```bash
node tools/r15_structured_localizer_cli.js --input tests/fixtures/r15/original_markdown.md --format markdown --report ./r15-report.json
node tools/r15_structured_localizer_cli.js --input tests/fixtures/r15/original_json.json --format json --report ./r15-json-report.json
```

第二步需要**人工建立** `tls.structured-edits.v1` JSON，包含剛剛報告的 `input_sha256` 和允許的 segment ID，才能選用 `--edits edits.json --preview-output new-preview.md`。preview 必須使用不同於來源、report、edits 的**全新且不存在的路徑**；舊文件不覆寫；沒有任何自動批准或雲端呼叫。報告只列 SHA、offset、type、reason，不含整段原始私人文字；使用者主動建立的預覽檔則會含自己提供的文字，請自行安全保管。

### 本地驗收命令

```bash
node tools/build_structured_integrity_r15.js --check
node --test tests/*.js
python tests/test_structured_integrity_browser_r15.py
python tools/check_release_workflow_r15.py
python tools/publication_guard.py --self-test
python tools/publication_guard.py
python -m py_compile tests/*.py tools/*.py
```

CI 主線要再驗證 R5/R11/R13 舊安裝包 parity、R6 frozen manifest、既有 R14 研究工具和公開權利安全門檻。公開標準只有在 final PR head 的 verify／browser-integration PASS、主線同 SHA CI 和 release jobs PASS 才宣稱已正式發表。失敗須保留診斷與回滾方法，不替換舊 tag；撤回採 revert R15 功能 PR。

## 研究缺口及下一步

- 本版不是完整 Markdown AST。任意 HTML、多層巢狀、複雜 GFM 表格及跨檔連結語義，需要分格式 parser 的新研究與差異證據，不可在缺少失敗案例時擴展。第一版先保守拒絕，以減少損壞風險。
- 這不是通用 LLM 訊息結構解析器，也不能以任意 Prompt 的安全性作保證；AI 模型回傳的中文語義仍需人工審核。
- 不提供遠端 Provider、API Key 上傳、Chrome 網站文字自動修改或自行修改 JSON 原始檔。這些都是獨立需求／授權 Gate。
- R16 若要做模型品質比較，仍須獨立真人評審與未曝光合法樣本；R6 100 題已公開，不可偽稱 Fresh OOS。


## 補充風控｜2026-10-25 B 正式整合

- 使用者先前已撤下所有第三方遊戲專用程式與來源，因此 R15 只使用原創技術文件、測試樣本與通用 CLI。不得因歷史 A 計畫曾提及遊戲示範而重新發布、加入 Release 或在 public README 中宣傳該內容。
- 對 Markdown 候選修改採取更保守的結構符號與雙向文字控制碼拒絕，避免修改段落時產生非預期的語法或造成視覺混淆；這是限制，不是完整 CommonMark 相容性保證。
- 輸入包含無法正確編成 UTF-8 的不成對 UTF-16 代理字元時，拒絕分析，避免不同來源文字被相同雜湊誤判為一致。
- 公開五語 README 必須按繁體中文母版的 SHA256 同步，且維持第三方權利安全規格；本 R15 僅新增 Shadow 原型，尚未驗證任何真實 AI 翻譯自然度。


## R15.1 安全修正（v0.1.1 · 新版獨立預覽）

R15.1 使用與 R15.0 分離的[離線安全預覽](../examples/TW_Structured_Integrity_Lab_R151_20261026.html)。針對已重現的跨行 HTML 區塊／註解、Markdown 平衡括號連結目的地與 GFM 核取方塊標記，補上拒絕或保護邏輯；另新增 180 筆固定原創反例及瀏覽器回歸。**歷史 R15.0 HTML 與既有 Release 原樣保留；新程式不是完整 CommonMark AST，無法保證所有 HTML／Markdown 格式。**

測試：`node --test tests/test_protected_segments_r151.js`、`node tools/build_structured_integrity_r151.js --check`、`python tests/test_structured_integrity_browser_r151.py` 與 `python tools/check_release_workflow_r151.py`。仍採 `approval=NONE`、來源 SHA256、UTF-16 offset、差異預覽、無外連及原文件不得覆寫。尚未正式驗收發布前，不能宣稱已上線。
