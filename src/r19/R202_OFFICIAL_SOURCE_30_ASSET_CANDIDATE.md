# R202｜Suite 17.5 官方原始來源 30 工具候選整合（NOT RELEASED）

**狀態：工程候選。沒有 17.5 正式 Release，不能對外宣稱產品更新成功。**

## 依據及目標

- 最新正式套件：17.4.0，29 工具／24 個獨立工具資產／29 件發行附件。原版 Tag 與 ZIP SHA 必須維持不動。
- R198 已通過 30 工具合成套件架構，但 R5/R6 使用測試替身，不能拿它做正式發行。
- R199 在 GitHub PR #60 已真正重新下載官方 17.4 的 29 件附件，共 7,772,525 bytes，全部 SHA256 符合固定來源。
- R202 把這些真正原始附件與 R19 R3 的 SHA 固定原創 HTML 組成 **30 工具、25 獨立資產、30 件完整候選附件**。不是更改既有 17.4 發行器，也不更新任何既有工具版本。

## 兩個獨立工程入口

1. `tools/build_suite_175_official_candidate.py`：必須取得全部 29 件官方附件及官方 metadata JSON，拒絕外部假來源、少檔、重複檔、損壞或變更原始來源 SHA；重新建置新的 Developer ZIP，完整保留舊原始 23 個直接資產、R19 R2 舊版工具，另追加 R19 R3。
2. `tools/check_suite_175_official_candidate.py`：獨立再看原始 29 件來源、輸出 30 件、內外 checksum、Suite ZIP、Developer ZIP、29 個舊工具、R19 R3 新增檔、Metadata 與 publication flags，不能只憑 Builder 自我宣稱成功。
3. `tests/test_suite_175_official_candidate.py`：負例檢查缺失、非法文件路徑、惡意修改舊工具、假原始資料、Git SHA 不一致、重複 checksum、狀態冒充及禁止發布權限。

## 現階段發行紅線

- 從 GitHub Actions 的正式公共 Release 重新下載與逐檔 SHA 比對，不能拿 synthetic fixture／舊 cache／純 Release metadata 代替。
- Candidate 路徑名稱固定含 `CANDIDATE_NOT_RELEASED`，所有輸出 `publication_permission=NONE`。
- 原正式 `release/all_tools_registry.json` 在本輪保持 17.4.0，候選 Registry 另存於 Developer ZIP，**不能用候選取代正式 Registry**。
- 不執行發布 GitHub Release、不能覆寫 Tag、不合併到 main 的既有 17.4 發行流程；R19 R2 以及舊版已核准來源保持不變。
- 真正正式發布還要設計與驗收：17.5 canonical Registry、六語檔案與入口、專屬發行驗證器與 Publisher、Draft 與 Published 兩次全新下載 30 件附件、Main CI、發行檔 SHA。
- 自動測試不是人類翻譯自然度、採用量或 OS 選檔視窗取消測試。

## 驗收命令

在 GitHub PR #60 機器的 `R199 official 17.4 source byte gate` 完成後，使用同一組 freshly-downloaded 官方來源：

```bash
python -m unittest tests/test_suite_175_official_candidate.py -v
python tools/build_suite_175_official_candidate.py --release-json "$RUNNER_TEMP/tls-r199-release-174.json" --official-assets "$RUNNER_TEMP/tls-r199-fresh-official-174" --out "$RUNNER_TEMP/tls-r202-official-candidate" --expected-sha "$GITHUB_SHA"
python tools/check_suite_175_official_candidate.py --stage "$RUNNER_TEMP/tls-r202-official-candidate" --official-assets "$RUNNER_TEMP/tls-r199-fresh-official-174" --release-json "$RUNNER_TEMP/tls-r199-release-174.json" --expected-sha "$GITHUB_SHA"
```

產生工程附件在 GitHub Actions 下方，以 `NOT_RELEASED` 清楚區分，不能傳去 Release。原版 17.4.0 及整體 Public/Private 分工不變。
