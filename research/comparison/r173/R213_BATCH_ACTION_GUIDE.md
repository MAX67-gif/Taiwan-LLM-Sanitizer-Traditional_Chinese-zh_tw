# TLS R213｜多檔 Markdown PR 審稿 GitHub Action（研究預覽）

**定位：**一個可被其他 GitHub 倉庫明確引用的唯讀 composite Action，可一次分析最多 20 份由維護者**逐一列出**的 Markdown／純文字文件。它不是模型翻譯器、未經母語審閱的自動修稿器，也不是正式 Suite17.5 發行工具。

## 比 R212 單檔有什麼新功能？

R212 只能 `input: README.md`。R213 接受多行 `files` 清單，逐檔重用已驗證的 R211 protected scan／R205 risk tiers。結果合併成**沒有原稿、候選詞、檔名或 SHA**的 JSON，並產出整體是否有待人工複核位置及風險級數。

R212 舊檔完全不改；R213 是另一個研究入口，適用已擁有檔案權限的開源維護者。**不接受自動 glob、不遞迴遍歷、不偷偷掃到私人路徑。**

## 可直接複製的外部 GitHub 工作流程

```yaml
name: Taiwan Markdown review (report only)
on:
  pull_request:
permissions:
  contents: read
jobs:
  local-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Check explicitly listed documents without rewriting
        id: tls
        uses: MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/research/comparison/r173/action_r213@main
        with:
          files: |
            README.md
            CONTRIBUTING.md
          strict: 'false'
      - name: Show metadata only
        env:
          TLS_STATUS: ${{ steps.tls.outputs.status }}
          TLS_FILES: ${{ steps.tls.outputs.input_files }}
          TLS_REVIEW: ${{ steps.tls.outputs.review_required }}
        run: |
          echo "TLS status: $TLS_STATUS"
          echo "Files checked: $TLS_FILES"
          echo "Review required: $TLS_REVIEW"
```

這是研究示範：`README.md`、`CONTRIBUTING.md` 必須真的存在於**呼叫者自己的 Repo**，可依需要改為 `docs/guide.md`、`README.zh-TW.md` 等實際相對路徑。**正式長期使用應將 `@main` 改成經確認的完整 40 位 Commit SHA pin**；這樣上游改版不會在未經確認下改變你的 CI 行為。

預設 `strict:'false'`，只產出結果且返回 exit 0，不會因用語候選阻擋 PR。只有維護者明確使用 `strict:'true'`，當檔案需人工複核或候選掃描有部分涵蓋時才返回 exit 2。**風險提示不是翻譯錯誤判決**，不能將 0 候選當成全文母語品質證明。

## 輸入、輸出與安全界線

| 項目 | 限制／用途 |
|---|---|
| `files` | 1–20 個以換行分隔的明確相對路徑，不允許 glob、重複路徑、`../`、絕對路徑、目錄或 symlink |
| 支援格式 | `.md`、`.markdown`、`.txt`，經嚴格 UTF-8 驗證；每檔最多 65,536 bytes，總和最多 1 MiB |
| `strict` | 精確 `true`／`false`，預設 `false`，不存在模糊 truthy 值 |
| `report` | 預設 `RUNNER_TEMP/tls-r213-batch-review.json`；可指定 workspace 或 runner temp 內**不存在**的新 JSON；不得覆寫原稿／報告，也不能經 symlink 寫入 |
| 輸出 JSON | `tls.r213.batch-wording-audit.v1`：只含檔案數、匿名順序 ordinal、候選數、風險分級、待審／部分涵蓋數、非認證旗標 |
| Action outputs | `status`、`review_required`、`input_files`、`files_needing_review`、`risk_high`、`risk_medium`、`report_path`、`exit_code` |

任一輸入失敗即拒絕整批，不留下半套 JSON；相同文件路徑不得在清單中重複計入。沒有任何自動 GitHub PR 評論、雲端連線、CDN、翻譯修改、遙測、持久性使用者資料庫或 Token 請求。

JSON **沒有文件正文、替換詞、檔名、原文 SHA 或個資**，但包括不同檔案的候選數與風險級別，仍可能間接透露文件特徵；敏感 Repo 的維護者應按需求自行決定是否保存／分享。TLS 本身不會自動透過 `actions/upload-artifact` 送出報告。

注意：GitHub Actions 的 `actions/checkout`、下載第三方 Action 與安裝 Node，仍使用 GitHub 平台的網路服務；**只有 TLS 的本機掃描核心不呼叫網路 API**，不是宣稱整個 GitHub 工作流程完全離線。

## 開發者重現、測試及回滾

```sh
node --test research/comparison/r173/action_r213/test_batch_r213.js
node --test research/comparison/r173/action_r212/test_runner_r212.js
node --test research/comparison/r173/test_pr_wording_gate_r211.js
python tools/publication_guard.py --self-test
```

本專案 GitHub CI 會額外以 `uses: ./research/comparison/r173/action_r213` **真正執行**兩份公開、原創的 Markdown fixture，核對匿名 aggregate JSON 與 Action outputs，不是假設原理可行。GitHub PR exact-head Push/PR CI 和合併後 MAIN Release Gate 都需 PASS 才能稱工程完成。

如需回滾，只撤銷 R213 獨立研究 PR；原 R212 單檔 Action、R211 CLI、R209 一頁工作台、R6 frozen 與正式 Suite17.4 的 29 件已發行附件完全不動。R202/R206 17.5 Draft PR#60 仍為未發行候選。

**不能由此推論：**外部維護者安裝率、實際完成率、母語翻譯品質、獨立真人數、OpenAI Codex for Open Source 入選或 OS 原生選檔取消測試。
