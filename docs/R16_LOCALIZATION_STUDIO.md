# R16 離線在地化安全工作台｜功能、使用方式與風控

> 2026-10-26 · **獨立 Shadow Preview 0.1.0** · MIT 原創實作。僅限合法自行使用的本機文件，不提供雲端翻譯、AI 模型服務、自動套用、網站寫入、遙測或商業品質認證。

## 快速使用（一般使用者不用裝 Node）

1. 下載並開啟 [R16 單檔離線工作台](../examples/TW_Localization_Safety_Studio_R16_20261026.html)；在繁中、简中、English、日本語、한국어、Español 的首頁皆有本頁連結。
2. 指定 Markdown、JSON 或 AI Prompt，貼入自己有權處理的文字，或明確選擇合法 UTF-8 本機檔（最大 1 MiB）。不會自動讀取其他檔案。
3. 點選「掃描保護範圍」；先確認內容是否 `OK`，再查看保護片段、UTF-16 範圍與來源 SHA256。遇到未知／不平衡格式可能 `REJECTED`。
4. **自己決定並手動填入候選**，勾選要變更的文字。沒有勾選的部分保留原文，保護段一律不可改。
5. 點選「產生安全預覽」；原文與預覽分開顯示，**不修改原始文件**。需要時點「另存新的預覽檔」，由瀏覽器管理新的下載檔名與位置。
6. 可另下載只含雜湊、座標與保護原因、不含原文及候選全文的 metadata 報告；結束後使用「清除全部內容」撤銷記憶體階段。

### 三種原創範例（不使用任何第三方遊戲、文件或品牌素材）

- [Markdown 示範](../examples/r16/sample_readme.md)：改寫操作描述，但不改 fenced code、多行 HTML 註解、URL 和模板佔位符。
- [JSON 示範](../examples/r16/sample_messages.json)：僅預覽 `text`、`description` 等允許欄位的文字；`id`、`url`、鍵名、數字與資料結構不得改。
- [Prompt 示範](../examples/r16/sample_prompt.txt)：保留角色標頭、網址、變數和 CLI 旗標；人工審查普通句子，不能把網頁文字當成應服從的指令。

## R16 Shadow 契約（新增、不破壞 R15）

`tls.local-workbench.v1` 報告欄位：

| 欄位 | 語意 |
| --- | --- |
| `format` | `markdown`、`json` 或 `prompt`，未知格式不自動 fallback |
| `source_sha256`, `source_bytes` | 本機來源的雜湊與位元組長度；不包含原始文字 |
| `protected_spans` | `id/start/end/type/reason`；UTF-16 半開區間 |
| `safe_edit_ids` | 只列可人工修改的片段 ID |
| `validation_status`, `reject_reasons` | `OK/REJECTED` 與明確的代碼；不默默略過錯誤 |
| `preview_output_sha256`, `preview_change_count` | 只有成功預覽後才有新雜湊與人工更動數 |
| `network_requested`, `transport`, `approval` | 永遠為 `false`、`NONE`、`NONE`；不等於遠端授權 |
| `contains_original_text`, `contains_replacement_text` | 永遠 `false`，只限 metadata 報告；使用者另存預覽檔**仍包含其自行輸入的全文** |

人工候選套用計畫沿用 `tls.structured-edits.v1`，並透過 **R15.1** 同一條 SHA、span、JSON 結構驗證鏈。回傳 `tls.local-workbench-preview.v1`、`SAFE_PREVIEW_NOT_APPLIED`，絕非 `APPROVED` 或已改寫正式文件。原 `tls.structured-segments.v1`、`offset_unit=utf16`、`tls.structured-preview.v1` 等所有欄位與語意不變。錯誤、取消、撤銷、來源 SHA 不符、重複 edit、惡意 HTML／模板符號、未知格式、惡意 Unicode、1 MiB 超限一律安全拒絕。

目前不是 CommonMark 完整 AST、不提供 YAML／XML／PDF／圖片 OCR，對巢狀複雜語法會保守拒絕；不自動判斷翻譯是否忠於原文或符合臺灣使用習慣。模型翻譯、下載、本機模型可用性仍由其他獨立研究功能決定。

## Node CLI（選用，沒有網路依賴）

```bash
node tools/r16_local_workbench_cli.js --input examples/r16/sample_readme.md --format markdown --report ./my_r16_report.json
```

若要另外輸出預覽，先依報告人工建立帶 `source_sha256` 的 `tls.structured-edits.v1` 計畫，再明確指定 `--edits <自己建立的檔案> --preview-output <新的不存在路徑>`；報告及預覽輸出採 `wx` 防覆寫，拒絕 symlink input/invalid UTF-8。**不用 CLI 也可直接在單檔 HTML 完成完整人工流程。**

## 驗收與回滾

- `node --test tests/*.js`：包含 R15.1 固定反證與新 R16 CLI／安全狀態測試。
- `python tests/test_local_workbench_browser_r16.py`：Chromium 零外連、編輯與拒絕、下載、清除、手機寬度。
- `node tools/build_local_workbench_r16.js --check`：單檔 HTML 與嵌入來源一致。
- `python tools/check_release_workflow_r16.py`：main-only Release／bash syntax／舊版保護。
- `python tools/publication_guard.py` 與 `python tests/test_public_rights_withdrawal.py`：權利及資訊安全守門。
- `python tools/check_readme_i18n.py`／`python tools/check_examples_i18n.py`：六語同步，**不代表母語審稿通過**。
- 歷史 R5/R11/R13/R14、R6 凍結題庫、R15.0 歷史 HTML 與 R15.1 新安全版完整回歸，前代 Release/Tag 不覆寫。

R16 採獨立 PR／獨立 Release，正式 CI、資產 SHA 與主分支 Commit 真實確認成功才能標正式發布。若出現安全回歸，可 revert R16 自身 PR，不 force push 或改寫歷史 Release；R15.1 安全修補不應因此被回滾。

## 法律與隱私

只使用原創合成樣本與本人有權處理的資料；網路可讀、非營利、AI 生成或註明來源都不是自動授權。不得恢復任何下架的第三方遊戲專用下載、字庫或執行腳本；示範功能不代表已驗證某特定網站的相容性或獲得其授權。完整規則見 [第三方權利政策](THIRD_PARTY_RIGHTS_POLICY.md)、[隱私聲明](../PRIVACY.md)。
