# R211｜臺灣用語 PR／CI 離線風險審查器（NOT RELEASED）

**研究性、原創、MIT 開源腳本。** 這不是自動翻譯模型、品質認證、GitHub App 或正式 Suite 17.5 新版；只提供本機 Markdown 需人工複核的風險位置及計數。

## 為什麼做？

R209 已讓非開發者使用離線單檔逐處審稿，R210 能在本機檢核自願回饋。開源維護者還需要**不必打開 HTML、可整合到 CI 的安全用語提示**。本版重用已存在的 R172 原文保護式候選掃描及 R205 Context Risk Lens，沒有新增未經審核詞庫，也不自動選詞。

## 使用流程（Node 22 或其他已確認支援環境）

在公開專案原始碼根目錄，開發者可以執行：

```sh
node research/comparison/r173/pr_wording_gate_r211.js \
  --input docs/your-owned-guide.md \
  --report /tmp/tls-r211-audit.json
```

只要檔案及輸出路徑安全，**預設回傳退出碼 0，即使找到需人工核對的詞也只產生報告**。報告內有候選在原稿中的行號、UTF-16 欄位、長度、風險等級、原因代碼；不含原詞、替換文字、路徑、文件 SHA／檔名、帳號或來源全文。

想要在**自己的 CI 主動啟用非零閘門**，明確加上 `--strict`：

```sh
node research/comparison/r173/pr_wording_gate_r211.js \
  --input docs/your-owned-guide.md \
  --report /tmp/tls-r211-ci-audit.json \
  --strict
```

- **退出碼 0**：輸入及報告有效；在 strict 模式下沒有可審或超限候選。**不代表品質已認證。**
- **退出碼 2**：只有明確使用 `--strict`，且存在需要人工核對的候選或掃描超限；報告檔仍會產生，方便檢查失敗原因。
- **退出碼 1**：缺必要參數、輸入不安全或格式不支援、非法 UTF-8、檔案超過 64 KiB、輸出路徑已存在／不能安全建立，或者原文保護式檢查未通過。這些情況不產生正常報告。

**Windows PowerShell 範例：**

```powershell
node .\research\comparison\r173\pr_wording_gate_r211.js --input .\README.md --report "$env:TEMP\tls-r211-audit.json"
```

目標報告若已存在，請手動改用新的檔名；**工具刻意不覆寫**任何已存在的檔案。若同一份自有文件中保護片段裡有 `menu`，它不會變成可自動修改的候選。

## 在自己的 GitHub Actions 中做可選的研究檢查

需要把 TLS 公開原始碼和自有文件都放到該 Runner 中；這個研究腳本並不是已發行的 Marketplace Action，也不是單一 `npx` 套件。以下示範**只檢查並輸出本地報告**，不使用 PR 寫入權限、不抓取 API Key、不回寫檔案：

```yaml
- name: Taiwan wording review — metadata only
  run: |
    node research/comparison/r173/pr_wording_gate_r211.js \
      --input research/comparison/r173/fixtures_first_task.md \
      --report "$RUNNER_TEMP/tls-r211-report.json"
```

在採用 `--strict` 前，先量測維護者的誤報與人工檢查成本；不得將它悄悄設成所有外部翻譯 PR 必須失敗的預設。輸出的 JSON 是 CI **本機機器報告**，本研究版不會將任何檔案自行送到 GitHub Artifact、Issue、網路或使用者端點。

## 目前做得到、做不到什麼？

輸入接受 `.md`、`.markdown`、`.txt`，每次**單一來源**，檔案上限 65,536 bytes（使用嚴格 UTF-8）。其他格式 JSON／Prompt 請使用現有 R16 安全工作台；這個 R211 不會擅自當 JSON 解析器。對 Unicode 位置採 UTF-16 欄位（與現有審稿 Core 相同），UTF-8 bytes 不等於 UTF-16 欄位長度。

工具回報 `tls.r211.pr-wording-audit.v1` 的風險分級 `HIGH`／`MEDIUM`／`LOW`／`LOCKED`，同時保留 `partial_coverage`、`omitted_candidates` 與 `full_document_certified=false`。若無候選，狀態為 `NO_CANDIDATES_NOT_CERTIFIED`；如果只有原生封鎖的候選，則為 `LOCKED_ONLY_NOT_CERTIFIED`。它們皆不代表文章已通過母語或語意品質審核。

**語境提醒只是白名單啟發式。** `menu` 在 UI 及餐飲不同情境的提示可被人工推翻；可能出現誤報或漏報，沒有真人未曝光品質、真實外部安裝量或 Codex OSS 計畫入選證據。

## 開發驗收與回滾

```sh
node --test research/comparison/r173/test_pr_wording_gate_r211.js
node --test tests/*.js
python -m unittest tests/test_r173_research_scope.py -v
python tools/publication_guard.py --self-test
```

- 先 Test RED（尚無 R211 CLI 模組，`MODULE_NOT_FOUND`）→ 補核心 GREEN；另有單元測試曾捕捉 `LOCKED_ONLY` 卻錯報 `REVIEW_REQUIRED`，修正狀態後重新 GREEN。這兩個失敗記錄須保留。
- 本功能只在 `research/comparison/r173/` 加法新增研究檔案與必要 GitHub CI／精確公開白名單；原 17.4 正式發行器、已發行 29 附件、R202/17.5 Draft PR #60 不變。
- 沒有雲端連線、CDN、auto-apply、原稿覆寫、LocalStorage 或新版本發布權限。
- 回滾只需 revert 本次獨立研究 PR；無須更動原已發布工具或任何外部使用者文件。
