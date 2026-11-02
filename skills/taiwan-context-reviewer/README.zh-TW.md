# Taiwan Context Reviewer 2.0.0｜臺灣語境審閱與譯稿保真檢查

這是可單獨使用的 Skill 與 Python 本機工具。它不是全文翻譯模型，不會自動替換原稿，也不代表已整合至 TLS 正式 Suite。

## 這一版改善什麼

同一個 menu 在軟體與餐飲語境可有不同候選；程式碼、網址及其他句子的詞彙不應誤導這一處。中文直接接英文（例如「軟體menu」）也能被檢查。「默認了這項安排」保留接受的意思，不強制改成「預設」。

新功能可比對原稿與另一份譯稿，檢查辨識到的程式碼、網址、佔位符、正負數、選定專名及 Markdown 結構是否被改動。受保護程式區段的空白行及換行也要保留。否定訊號變動只列為人工複核，不聲稱能理解完整語意。

## 不寫程式的使用方式

把整個 `taiwan-context-reviewer/` 資料夾交給你已授權、可讀取檔案的 AI 開發工具，明確請它先讀 `SKILL.md`，只提出逐處建議，再由你確認。一般聊天網頁不會自動讀取本機資料夾。不要只複製 SKILL.md 而遺漏 references、assets 或 scripts。

## 本機檢查（有 Python 時）

在此資料夾執行：

```text
python scripts/audit_markdown.py --input assets/ORIGINAL_PRACTICE.md
python scripts/audit_markdown.py --input assets/COMPARE_ORIGINAL.md --compare assets/COMPARE_REVISED_OK.md
python scripts/audit_markdown.py --input assets/COMPARE_ORIGINAL.md --compare assets/COMPARE_REVISED_BAD.md
python -m unittest discover -s tests -v
```

第二條應回傳 `CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED`。第三條故意提供損壞的自製譯稿，應回傳 `BLOCKED_INTEGRITY`、退出碼 3；這是預期拒絕，不是工具故障。

## 安全與限制

只處理你有權使用、最多 64 KiB 的 UTF-8 Markdown/TXT。預設 JSON 只含計數與布林檢查，不含原文、檔案路徑或文件雜湊；`--local-detail` 的位置報告應私人保存。工具不連網、不覆寫原稿／譯稿。雲端 Agent 仍可能接收你交給它的內容，不能因此宣稱整個 AI 流程離線。

結構檢查通過不等於翻譯正確，也不能證明所有文法、品牌、數值單位或語意都被覆蓋。原創測例是工程回歸，非真人語言品質評測。MIT 授權見 LICENSE。
