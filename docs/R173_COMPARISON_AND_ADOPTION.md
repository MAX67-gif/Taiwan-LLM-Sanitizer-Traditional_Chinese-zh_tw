# R17.3｜開源公平比較與真實使用證據（研究期，不是新的翻譯引擎）

> **狀態：ENGINEERING_RESEARCH_ONLY／真人品質 NOT_RUN。** R17.3 是這份歷史研究的名稱；截至 2026-10-31，現行完整可用版本是 [Suite 17.3.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0)，R17.2 修稿工具仍維持原版。R17.3 是可重現的比較研究程式、最小資料收集範本與透明說明；沒有新版本翻譯模型、沒有自動套用、更不宣稱超越競爭者。

## 先做一件真正有用的事

**先從使用者完成的工作開始**：下載官方 Suite → 解壓 → 開啟 `START_HERE.html` → 選「修整已寫好的中文」→ 貼入自己有權使用的 Markdown → 確認每處用語 → 檢查受保護內容 → 另存新稿。進階使用者可再配合 [Codex／Claude／Grok 教學](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md)。

- 本專案目前沒有統計到真人完成率；未安裝追蹤 SDK，也不會將使用者原稿秘密傳送到研究端。
- 沒有候選詞 ≠ 文件已完美；有候選 ≠ 人類認證可用。按下預覽也不是原稿已被修改。
- 技術結構檢查只能覆蓋已公開支援的範圍，不保證語意正確、臺灣口吻自然或所有 Markdown 解析完美。

## 兩種不能混為一談的比較

| 賽道 | 研究什麼 | 對等條件 | 尚缺什麼 |
|---|---|---|---|
| **L1 文字與用詞** | 六個凍結技術別名的直接替換、R17.2 候選、真實 OpenCC `s2twp`、已授權人工取得的 LLM 輸出 | 都只取得**相同的 R16 可編輯文字片段**；沒有一方偷看受保護內容 | 需真實 OpenCC 安裝與模型來源、兩位獨立語言審閱者；目前不排名 |
| **L2 完整文件安全與任務** | 原生全文轉換可能造成的風險；以及同等結構保護後的差異 | 同時報 RAW（僅診斷，**不公平的用詞勝負賽道**）與 EQUAL_EDITABLE（同保護範圍） | 需測量操作時間、原意保真、人工修訂成本與被拒絕案例 |

R16/R17.2 只是檔案保護工具，不應因為 OpenCC 原本是純文字轉換器，就靠「讓 OpenCC 改壞 Markdown」宣稱 TLS 的詞彙更準確。OpenCC 官方提供的臺灣慣用詞轉換設定是 `s2twp.json`，不能故意改用 `s2t.json` 來削弱它。OpenCC 為外部獨立軟體；**我們沒有將其字典、二進位檔或模型權重納入本倉庫**。官方文件：[OpenCC README](https://github.com/BYVoid/OpenCC/blob/master/README.md)、[s2twp 設定](https://github.com/BYVoid/OpenCC/blob/master/data/config/s2twp.json)。

## 真正可重現的沙盒檢查

以下為**工程師**本機或 GitHub CI 可選的命令。一般使用者不用執行指令，直接使用上方已發布的 HTML 即可。

```bash
node --test tests/test_comparison_r173.js
python -m unittest tests/test_comparison_r173.py -v
node research/comparison/r173/naive_baseline.js --input research/comparison/r173/fixtures_first_task.md
python research/comparison/r173/opencc_adapter.py --probe
```

- `naive_baseline.js`：只讀檔案，輸出**不含原文與路徑**的 DEV_ONLY 結構事件統計；它不是高品質翻譯器。
- `prepare_spans.js`：需要本地正式比較時建立**私人 SHA 綁定**的 UTF-16 可編輯區段清單，不應上傳、貼上 Issue 或提交 PR。
- `opencc_adapter.py`：只使用本機已合法安裝的 `opencc.OpenCC('s2twp.json')`，可分 RAW／EQUAL_EDITABLE 跑真正原生基準；缺安裝回 `BASELINE_NOT_AVAILABLE`，**不能用自製詞庫冒充**。輸入/輸出需要人工指定本機路徑，輸出只能存於原始碼資料夾之外。
- `import_model_result.py`：只有獲同意並已由使用者在外部執行的模型輸出，才能**離線**產生來源聲明回執；它不會呼叫 Codex、Claude 或 Grok API，亦不宣稱真實模型版本獲獨立驗證。
- `score_and_audit.py`：接受自願的去識別觀察 JSONL，只在同一賽道／同一證據類型彙總；零分母用 `null`；任何已觀察到的危險改動都會優先標記 `BLOCKED_CRITICAL_SAFETY`。非真人語言評分不能冒充母語品質。

### 研究範例的實際意義

在附帶原創工程例中，純字面替換若直接掃描全文，可能改到 `<!-- 註解 -->`、程式碼或模板文字；以 R16 可編輯區段保護後，這類技術風險可避免。這**只代表本組設計期樣本的安全守門**，不是模型品質比較結果，也不是 Fresh OOS。

研究契約為 [`research/comparison/r173/methodology.json`](../research/comparison/r173/methodology.json)。樣本 [`fixtures_first_task.md`](../research/comparison/r173/fixtures_first_task.md) 由專案原創。單純 SHA/CI 並不代表 OpenCC 已執行、真人已審，或人群採用已發生。

## 自願使用與開源貢獻

有意分享經驗者，可先閱讀 [本機自願試用範本](../research/comparison/r173/feedback_template.md) 與 [最小資料格式](../research/comparison/r173/consent_schema.json)。**不收集私人原稿、可識別身分、Email、IP、使用者路徑或文稿雜湊**；沒有自動傳送功能。未經同意不可發布，即使是 GitHub Issue 也不應貼敏感內容。

既定的使用者體驗目標**尚未執行**：10 位新使用者中至少 8 位能在 15 秒說對用途、至少 8 位在 3 分鐘完成任務；中位時間相對 R16 減少 30% 為目標；先固定 5 位真正完成首項任務的自願者，觀察其中至少 3 位是否在 7 天內完成第二個任務。這些數字**均不是目前成績**。意願不等於真正回訪；CI clone/download 不等於人。

**R17.3 比較研究本身未變更 R17.2 修稿引擎；舊版 17.1／17.2 的整合 ZIP 現已撤回，請使用 Suite 17.3.0 取得完整工具包。新正式發行仍須包含所有合法受支援工具。**
