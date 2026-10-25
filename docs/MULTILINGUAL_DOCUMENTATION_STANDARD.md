# 六語 README 與使用範例同步標準｜文件治理 v1

> 適用於 Taiwan-LLM-Sanitizer 公開 GitHub。繁中 `README.md` 是「介紹內容的權威母版」，但翻譯頁應在各自語言自然表達；翻譯不改產品事實、版本、隱私、權利、限制或不支援項目。

## 六語必備路徑

- 繁體中文：`README.md`、`docs/USAGE_EXAMPLES.md`、`docs/WEBSITE_LOCALIZATION_GUIDE.md`。
- 简体中文：`README.zh-CN.md`、`docs/USAGE_EXAMPLES.zh-CN.md`、`docs/WEBSITE_LOCALIZATION_GUIDE.zh-CN.md`。
- English：`README.en.md`、`docs/USAGE_EXAMPLES.en.md`。
- 日本語：`README.ja.md`、`docs/USAGE_EXAMPLES.ja.md`。
- 한국어：`README.ko.md`、`docs/USAGE_EXAMPLES.ko.md`。
- Español：`README.es.md`、`docs/USAGE_EXAMPLES.es.md`。

## 每次文件修改都要執行

1. 先核對正式公開 `main`、Release 與 PRIVATE 狀態；**私人 A 計畫不可當成已公開產品**。README 不得把「待發布」說成「已發布」。
2. 修改繁中母版內容與原創案例。凍結穩定案例 ID `EX01..EX09`，增量只能補新 ID，不能靜默改掉舊 ID 所代表的行為。語言版都要有一模一樣的 ID 清單、功能限制、權利聲明。
3. 讓五份 README 翻譯在檔頭嵌入 `SOURCE_README_SHA256`（原母版 SHA256），五份範例翻譯在檔頭嵌入 `SOURCE_EXAMPLES_SHA256`（繁中範例母版 SHA256）。**這是來源同步雜湊，不代表真人翻譯審稿成功。**
4. 先跑 `python tools/check_readme_i18n.py` 與 `python tools/check_examples_i18n.py`；兩份自檢、`python tools/publication_guard.py`、權利下架防呆及完整回歸也必須通過。
5. 公開版不含遊戲專屬腳本、詞庫、素材、權利不明資料；通用教學中只能使用自行創作的合成資料，且不能表示已在真實遊戲完成測試或取得任何品牌授權。
6. GitHub PR 要有最終 head 的 verify/browser PASS、main CI PASS 才合併／宣稱完成；私人只追加原始決策、版本 SHA、失敗原因與回滾方法。不要為了 README 更新重新發布舊 tag。

## 人工品質 Gate

`HUMAN_TRANSLATION_REVIEW: pending` 表示尚無獨立母語審閱。CI 只能證明檔案齊備、來源 SHA 與範例 ID/連結一致，**不能代替自然度、術語地區適配或法律審查**。

## 使用範例的防誤導分類

- `CURRENT_SUPPORTED`：確實存在的操作層，例如 R13 只讀選取，R11 使用者逐站手動詞庫，R15 離線預覽。
- `CONDITIONAL`：需網站條款、裝置／模型能力與實際 DOM 支援；尤其任何網頁遊戲式網站只能稱條件性可能。
- `NOT_SUPPORTED`：目前的 Canvas/WebGL 文字、未經許可的專用遊戲中文化、私人聊天處理、無授權遠端資料傳輸。
- `RESEARCH_OR_PENDING`：私人已規劃或本機驗證但尚未公開 CI/Release 的功能。
