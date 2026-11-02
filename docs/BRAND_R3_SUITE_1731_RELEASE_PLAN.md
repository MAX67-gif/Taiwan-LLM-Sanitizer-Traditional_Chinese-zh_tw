# TLS Brand R3｜Suite 17.3.1 安全發行契約（工程候選）

狀態：**CANDIDATE／未發布**。本文件不授權略過 main 規則或直接發布。

## 公開基線與不可修改項目

- 已發布的 `all-tools-suite-v17.3.0` 標籤和全部附件不得刪改、覆寫或重用。
- R3 PNG 限定 `assets/branding/TLS_Premium_Banner_R3_2800x960.png`，SHA256 `4949e243b525e5a82af7fb53d254495b34ef15617233bc1b42db2bc1f2d7a1bb`。
- 六語 README 的 R17.6 showcase 區塊不得修改。R19 runtime 不屬於這個 R3 發行範圍。
- 完整工具 28 項／獨立工具 23 項／正式 Release 附件 28 項，原有工具的版本與檔案雜湊必須一致。
- 開發者 ZIP 必須實際包含本次 README 所引用的 R3 PNG，不能發行破圖版本。

## 正式發行閘門

1. GitHub `main` 規則 Active、禁止刪除與 non-fast-forward，要求 PR 與 `verify`、`browser-integration`。
2. PR 的公開／私人資料、授權與既有程式凍結界線經過正常稽核。
3. 在乾淨來源與對應 GitHub SHA 上執行完整 Node／Python／瀏覽器檢查，來源重建與發行資產雜湊一致。
4. 只使用新的 `all-tools-suite-v17.3.1` 標籤。若已存在且來源或檔案不一致，必須 BLOCK。
5. 先建立 Draft，下載全部檔案檢驗位元組，才發布；發布後再次從 GitHub 完整下載驗證。
6. 核對 `main` README 的 Premium 橫幅正常顯示。Social Preview 屬 GitHub Settings 的獨立設定。

## 失敗處置

任何 CI、資料權利、SHA、Draft 下載、發布後下載、分支保護或來源身分不一致都須停止，保留可追溯的失敗收據。不得使用強制推送、刪除舊標籤、覆寫舊資產或放寬 docs-only 白名單。

正式 17.3.1 發布前，既有 Suite 17.3.0 仍是最後已確認可下載的完整套件；此工程候選不能被宣稱已發布。
