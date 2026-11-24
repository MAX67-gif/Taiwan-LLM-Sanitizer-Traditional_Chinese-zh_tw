# R212｜臺灣用語 PR 唯讀檢查 GitHub Action（研究預覽）

**功能定位：可被其他 GitHub 倉庫引用的 composite Action。** 它重用已完成工程驗收的 R211 `pr_wording_gate_r211.js`，只讀取使用者在 GitHub Actions checkout 的一份 Markdown／純文字，產生不含原文的風險 JSON；**不是翻譯模型，不改稿，不把候選或原始資料上傳到開發者，也不是正式 Suite17.5 Release。**

## 直接從別的開源 Repo 試用

在**有權審閱**的公開或私人 GitHub Repo 中新增 workflow，例如 `.github/workflows/tls-wording-review.yml`：

```yaml
name: Taiwan wording review (report only)
on:
  pull_request:
permissions:
  contents: read
jobs:
  wording:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: R212 metadata-only wording check
        id: wording
        uses: MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/research/comparison/r173/action_r212@main
        with:
          input: README.md
          strict: 'false'
      - name: Print metadata only
        env:
          TLS_STATUS: ${{ steps.wording.outputs.status }}
          TLS_REVIEW: ${{ steps.wording.outputs.review_required }}
        run: |
          echo "TLS status: $TLS_STATUS"
          echo "TLS review required: $TLS_REVIEW"
```

此範例用 `@main` 是方便驗證的研究示範，**正式維護者應改為已核實的完整 40 位 Git Commit SHA pin**，以避免上游主線改版造成不可預期變動。此功能必須在公開 GitHub R212 PR 合併後才可由其他 Repo 用 `@main` 引用；不要用未發布的 Draft 當穩定版。

若只想看這份文件可能存在的臺灣用語風險，預設 `strict: 'false'`，即使找到候選仍**返回 exit 0**並提供 JSON。只有維護者確實想讓 PR 必須先完成人工檢查時，才改成 `strict: 'true'`。如果存在需要審核的位置或候選超出上限，該步會以 **exit 2** 失敗，仍會先產生 JSON。這不代表文法錯誤、中文翻譯錯誤或品質不合格，僅表示需要人工複核。

## 參數／輸出契約

| Action input | 預設 | 說明 |
|---|---|---|
| `input` | `README.md` | 必須在呼叫者 GitHub checkout 工作區內，支援 `.md`、`.markdown`、`.txt`；拒絕 symlink、非 UTF-8、空文件、超過 64 KiB 及離開工作區的路徑 |
| `report` | 空 | 預設寫入 `RUNNER_TEMP/tls-r212-review-report.json`；也可自訂 workspace／runner temp 內**尚不存在的**新報告路徑，不覆寫檔案、不接受 symlink 祖先 |
| `strict` | `false` | 僅接受精確 `true` 或 `false`；絕不把其他字串當 truthy |

Action outputs：`status`、`review_required`、`review_high`、`review_medium`、`report_path` 與 `exit_code`。其中 `report_path` 是 runner 本機絕對路徑，其他均為原 R211 已驗收的純 metadata。要保存報告，可由**使用者自己**另外明確使用 `actions/upload-artifact` 上傳，建議避免上傳私有原文與敏感報告；TLS 本身不會上傳資料。

**重要隱私說明：**R211 JSON 不包含原稿字句、檔名、文件 SHA、替換詞、帳號或 Token，但它包含 UTF-16 行／欄、候選數、風險類別和原因碼；這些仍可能揭露部分文件輪廓，不能宣稱完全匿名。GitHub Actions 平台下載 Action 原始碼與 checkout 呼叫者倉庫需要 Github 平台既有網路連線；「無網路」只表示 **TLS 自己的掃描 Node 程式沒有網路請求**，不是整個 GitHub 工作流程完全離線。

## 工程驗證／維護者可重現

```sh
node --test research/comparison/r173/action_r212/test_runner_r212.js
node --test research/comparison/r173/test_pr_wording_gate_r211.js
python tools/publication_guard.py --self-test
```

Repo 自有 GitHub Actions `verify` 工作中還會**真的執行** `uses: ./research/comparison/r173/action_r212`，使用專案內原創 Markdown fixture 產生報告，並驗證 `GITHUB_OUTPUT` 與 schema 一致。只有 GitHub push／PR 確切 head 都成功且 main Release Gate PASS 才可標示完成。原本的 R172/R205/R211 及所有已發布 Suite17.4.0 附件與原始 Tag 都保持原樣；此 Action 是研究新增入口，不獲得強制 17.5 發行權限。

## 拒絕案例／回滾

- 路徑穿越、input 及父目錄為 symlink、目標輸出既有、原稿與報告同檔或目錄超出 RUNNER_TEMP／GITHUB_WORKSPACE，拒絕；不會默默改寫。
- 非法 UTF-8、支援格式之外、空檔或來源過大，由 R211/R172 fail-closed，不輸出原始文字或檔案位置。
- 非法 strict 值、命令替代字串、未知輸入欄位，一律阻擋；所有外來參數透過環境變數與 Node 路徑 API，**不插入 Bash 來組指令**。
- 即使全部無需審核，只代表已知候選沒有觸發，**不等於全文語言品質或語意等價認證**。
- 如需要回退，撤銷此獨立 research PR；既有 R211 CLI、R209 工作台及正式 Release 完全不受影響。

**仍未取得的證據：**外部維護者成功安裝率、採用與回訪、母語自然度、跨領域 false positive、OS 原生選檔取消，以及 OpenAI Codex for Open Source 入選情況。
