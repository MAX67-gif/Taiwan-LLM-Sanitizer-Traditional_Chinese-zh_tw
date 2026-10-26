## R16 · 2026-10-26 · 本機在地化安全工作台（Shadow Preview）
- 將已隔離的 R15.1 保護範圍檢查、人工候選與差異預覽，整合成單檔離線 HTML／Node API／CLI。新來源檔不覆寫，無模型／遠端傳輸；回歸 R15 及 R15.1 安全契約。
- 六語 README／範例增補，僅使用原創合成文件；第三方權利與隱私安全守門保留。發版結果以 GitHub CI 與實際 Release 為準。

## R15.1 · 2026-10-26 · 保守 Markdown／HTML 保護邊界修復
- 強化跨行 HTML、平衡括號連結及 GFM 任務標記的保真測試，歷史 R15.0 HTML／Release 不覆寫；原創 180 例固定反證。

## R15 · 2026-10-25 · 離線技術文件結構保真 Shadow Preview
- 獨立 Markdown／JSON／Prompt 保護片段與 SHA256 驗證，人工批准的安全預覽，Node CLI 和單檔離線 HTML。無自動翻譯、無雲端傳輸、不覆寫來源檔。
- 不改 R5／R11／R13 的使用者執行期及 R6 凍結題庫；法律權利清理與五語 README 同步守門保持有效。

## 2026-10-25 · 第三方權利保護與通用教學轉型
- 停止公開提供個別第三方遊戲專用腳本、詞庫、安裝包與自動發版；以通用網站閱讀教學取代，並保留必要私人法律審查與來源追溯。
- 更新繁體中文、英文、日文、韓文、西班牙文首頁，加入 MIT/第三方著作權與隱私權邊界，以及 CI 防再散布守門。
- 舊 Git 歷史或外部快取不會因從目前主分支移除資料而自動消失；任何歷史發布資產下架須另行驗證。

## R14 · 2026-10-25 · Provider 能力與同意安全決策（獨立離線 Preview）
- 加入模型能力／語言組／下載及 per-origin consent 保守判定，未知、跨站、撤銷、逾期、取消 fail-closed；本版所有遠端 Provider 仍禁止傳輸。
- 提供可直接開啟的單檔離線 HTML、CLI、嚴格 Schema、Node／Chromium 回歸及可重現建置；不修改 R5／R11／R13 安裝版本或 R6 Frozen。

# Taiwan-LLM-Sanitizer｜重要更新大綱

## R13 · 2026-10-25 · 雙語閱讀獨立 Preview 0.6.0
- 新增 Chrome／Tampermonkey 獨立逐站選取閱讀面板、原文/譯文對照、條件性 Chrome 本機翻譯、只讀原始網頁；沒有新增網頁全文外傳或自動替換。
- 新增 UI 操作 `click／点击／點擊 → 點選` 使用者用語偏好、非 UI 反例、R11 可選個人詞庫及 Node／Chromium／發版回歸；歷史 R3/R9/R10 語料不回寫。

# Taiwan-LLM-Sanitizer｜版本更新重點

> **這裡僅保留重要里程碑。** 舊版詳細開發與除錯過程不再堆放在首頁或本頁；已發布檔案、Git 提交／PR、既有技術文件及私人完整封存仍保留供查證。新功能必須區分正式執行期與獨立研究工具。

| 階段 | 重點更新 | 性質 |
| --- | --- | --- |
| **R12（2026-10-25）** | 離線品質稽核：R6 100 題固定測試、A/B 覆蓋與結構警示、人工審閱摘要 | **獨立研究工具**；無真實模型品質認證 |
| **R11 v0.5.0（2026-10-25）** | Chrome／Tampermonkey 逐站個人詞庫：匯入、人工預覽、勾選套用、安全還原 | **可安裝預覽**；不自動啟用候選詞 |
| **R10（2026-10-24）** | 40 組來源可追溯正反語境案例、人工審查與本機匯出 | **研究工具**；尚未獨立審稿 |
| R8–R9（2026-10-24） | 離線語境查詞與自主選詞工作台、JSON 備份 | 獨立工具 |
| R6（2026-10-24） | R6 100 題凍結品質評測基礎 | 評測與可選示範 |
| R3–R5（2026-10-24） | 臺灣用語詞庫、領域偏好、隱私守門、品牌保護、CI／Skill、R5 v0.4.0 | 通用原型與基礎治理 |
| R1–R2（2026-10-23） | 共用核心、Chrome／Tampermonkey／CLI、實驗性本機 Provider、安全 DOM 還原 | 初版原型 |

**重要修復：** R11 v0.5.0 發布腳本已補上 Bash 語法檢查並成功正式發布；R12 CI 測試檔路徑問題也已修復。失敗歷史保留於 GitHub Actions，不假裝曾經沒有失敗。

**取得歷史版本與證據：** [GitHub Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [Git Commit 歷史](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/commits/main/) · [最新功能狀態](docs/FEATURES.md)。

專案遵守 MIT／Open-Core、資料隱私及來源授權。R6 凍結題庫與私人開發決策須保留；第三方權利不明的公開程式及下載資產則優先下架，並保留必要的治理稽核索引。

## R17-P0 · 2026-10-26 · Document Trust Graph (offline/read-only)
- New optional project-scoped Markdown link and anchor validator, explicit local file allowlist, no network, metadata-only receipt, safe CLI and standalone HTML.
- PASS/WARN/BLOCK/UNKNOWN separate confirmed invalid targets, unsupported syntax, external unchecked links and missing allowlist permissions.
- R16/R15.1/R15.0/R14 and R5/R11/R13 releases preserved. No remote translation, file rewrite or third-party branded game content.
- Technical integrity evidence is not linguistic quality or copyright authorization; six documentation languages require later native review.
