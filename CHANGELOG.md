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
| R6–R7（2026-10-24） | R6 100 題凍結品質評測基礎；R7.1 獨立網頁顯示示範 | 評測與可選示範 |
| R3–R5（2026-10-24） | 臺灣用語詞庫、領域偏好、隱私守門、品牌保護、CI／Skill、R5 v0.4.0 | 通用原型與基礎治理 |
| R1–R2（2026-10-23） | 共用核心、Chrome／Tampermonkey／CLI、實驗性本機 Provider、安全 DOM 還原 | 初版原型 |

**重要修復：** R11 v0.5.0 發布腳本已補上 Bash 語法檢查並成功正式發布；R12 CI 測試檔路徑問題也已修復。失敗歷史保留於 GitHub Actions，不假裝曾經沒有失敗。

**取得歷史版本與證據：** [GitHub Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [Git Commit 歷史](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/commits/main/) · [最新功能狀態](docs/FEATURES.md)。

專案遵守 MIT／Open-Core、資料隱私及來源授權。R6 凍結題庫、舊版 Release、私人完整歷程不得因縮短更新紀錄而覆寫或抹除。
