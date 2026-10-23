# CHANGELOG — Taiwan-LLM-Sanitizer

## R10 · 2026-10-24 · 來源可追溯的臺灣語境人工審查（獨立 Preview）

- 新增 40 筆未經獨立驗證的原創編輯案例，28 筆逐欄追溯 R9 已公開例句，另有 12 筆新增正反語境；無自動套用權限，也不提升 R3 883 候選權限。
- 增加嚴格 Schema、來源 SHA256 manifest、人工審查 JSON 匯入／匯出；不會自動保存使用者文字，只有個人明確選擇的結果。
- 新增可直接離線開啟的單一 HTML、手機友善介面、CSP 無外連、Node 與 Chromium 安全及操作測試。
- 保留 R5 v0.4.0 通用工具、R6 凍結 100 題、R7.1 獨立 Demo、R8/R9 工具及 MIT/Open-Core 權利界線。
- 增加 GitHub Actions 可重建的**公開來源快照**與 R10 獨立發行流程；私人完整歷程不放入公共 Repo。

## R9 · 2026-10-24 · 離線個人用語選擇與對照工作台（獨立預覽）

- 新增全本機且不持久儲存的 R9 語境選詞頁：原文／人工選詞後文字並排、每項差異、正反例提示。
- 新增 schema 固定的個人詞條 JSON 匯入／匯出（手動、上限與欄位驗證）；保留原詞也是正常選擇。
- 新增 28 筆原創編輯情境例，仍未經獨立審查，不能提升 883 筆未審候選或 R5 引擎的自動轉換權限。
- 新增 Node 與 Chromium 回歸、可重現的獨立 HTML 與 GitHub 發布流程；未修改 R5/R6/R7.1/R8 既有行為。
- 公開檔案檢查器仍以敏感路徑阻擋為原則，僅新增明確允許的 R9 公開文件。

## R8 分發改善 · 2026-10-24

- GitHub Actions 通過驗證後，自動建立獨立的 R8 離線工作台 Release，包含單一 HTML 與 SHA256，不覆寫先前已發布的資產。
- README 加入一般使用者直接下載入口；R5/R6/R7 下載維持各自獨立。

## R8 · 2026-10-24 · 離線臺灣語境審查工作台（獨立 Preview）

- 重用 883 筆候選詞、67 筆編輯種子；一詞多義採語境提示、不把候選直接升級為 runtime 自動替換。
- 新增 100% 本機的單檔 HTML 審查工具、語法保護、Node/Chromium 測試及 deterministic build。
- 新增詞彙投稿 Issue form、公開產品定位與第三方詞庫授權注意事項。
- R5 引擎、R6 凍結 100 題及 R7.1 網站特定示範均未修改。

## R7.1 · 2026-10-24 · 顯示範圍安全修補（獨立選用示範）

- 修正玩家／聊天欄位的 title、aria-label 與可見文字適用範圍不一致問題。
- 對 hidden、aria-hidden、inert 及 CSS 隱藏元素不再執行字串改寫，增加合成回歸測試。
- 新發布版本為 `0.1.1`，不覆寫原本 `0.1.0`；通用 TLS R5 引擎與 R6 凍結題庫不變。
- 此版本仍未驗證實際遊戲相容或網站官方允許；未匯入任何私人回傳／受著作權保護遊戲資產。

## R7 · 2026-10-24 · Opt-in PokéBonk display-only demo (separate release)

- 新增可選用、非官方的 136 筆臺灣用語對照，僅供特定網站的文字顯示層精確配對。
- 顯示層使用者必須手動啟用；可嘗試安全還原原本呈現的內容，版本與舊快照不同只提示，結構不符只略過受影響區塊。
- 由同一份原創資料產出 Chrome MV3 壓縮包及完全自含的 Tampermonkey 腳本，另行獨立 Release，不改 R5 通用翻譯主鏈路。
- 無遊戲戰鬥、帳號、存檔、網路、Canvas/WebGL 操作。真實最新版網頁尚未端到端驗證；PokéBonk 官方使用條款可能禁止修改遊戲。
- R6 實測結果僅在私人研究文件進行分析，**沒有提交原始候選、AI 評審資料、真人資訊或商業備忘至 GitHub**。


## R6 · 2026-10-24 · Quality evaluation infrastructure (no runtime engine promotion)

- 建立 100 筆公開凍結的原創編輯測試題，五類各 20 題，SHA256 封存，不可偷改已曝光 V1。
- 新增零雲端依賴的 QA 評測 CLI、保守離線詞彙基線、資料覆蓋/結構損壞報告；**不把這些分數當作翻譯品質**。
- 新增真人四維評分 rubric、離線雙語人工審閱室與本機 JSONL 匯出。
- 新增桌面 Chrome Built-in Translator API 的使用者自行測試頁，可下載真實候選譯文，但 CI 只測試模擬 API，沒有完成獨立的真實模型品質測試。
- 新增 benchmark 公開檔案白名單與私密結果 .gitignore。**R5 0.4.0 Chrome/Tampermonkey 正式執行行為未修改**。
- 公開基準資料屬回歸測試，不等於 Fresh OOS。參考譯文仍待人工獨立審稿；未獲任何策略/模型「升級」結論。


## R5 · 2026-10-24 · Preview 0.4.0

- 新增專案／品牌名稱保護，修正「Codex for Open Source → 開源法典」等不可接受的直譯，且不全域封鎖一般詞語。
- Chrome 本機模型翻譯前保護完整名稱，還原後驗證；損壞名稱和技術占位符的結果不直接寫入 DOM。
- 新增可供 Codex 與 Claude Code 載入的 Agent Skill、公開專名庫及完全本機的翻譯 QA 指令。
- 新增瀏覽器內固定位置視覺進度環、可收合的 Tampermonkey 設定面板，Chrome Popup 固定底部操作列。
- 安裝包 ZIP、獨立 .user.js、SHA256 校驗由 CI 產生並作為 Release／Actions Assets；安裝教學公開。
- 既有 MIT/Open-Core、逐站授權、私隱不蒐集、R3 詞庫和 CLI 用語偏好保留。Skill 指令不可宣稱雲端 AI 也是純本地。
- 仍未解決 Canvas/WebGL、OCR、完整 PDF、模型自然語意品質、真正可控制文風等問題。


## R3 · 2026-10-24 · Preview 0.3.0

- 新增 883 筆跨 16 領域的編輯候選（`suggestion_only`，待人工審核），67 筆小型啟用種子；沒有任何地區用詞審查或「禁用詞」。
- `src/core/lexicon_pack.js` 提供有限的語境/領域路由、長詞優先、英文單詞邊界與用語候選說明；對 menu/菜单 在 UI 與餐飲之間保守區分。
- Chrome／Tampermonkey 共用新詞庫，沿用 R2 Provider 與回復機制；CLI 增加 `--domain` 明確選擇。
- 加入大型詞庫驗證、上下文回歸、R3 Chromium navigation/food 案例、詞庫資料與編譯檔一致性檢查。
- 產品與市場競品研究、零隱私蒐集契約、Overlay 產品規格與下一步里程碑；**Overlay 尚未完成，不作已發布宣稱**。
- MIT／Open-Core 授權保持不變；R1/R2 歷史完整保留。候選詞資料不能拿來宣稱已經官方驗證，也未複製第三方受限辭典。


## R2 · 2026-10-23 · Preview 0.2.0

- 新增 `src/core/provider.js`：可插拔 BrowserLocalProvider、Chrome Translator API 可用性檢測、下載狀態、來源語言選擇、詞彙 fallback、session cache、連續失敗降級。
- 新增 `src/core/web_adapter.js`：支援 async Provider 的 DOM 更新、MutationObserver、修改原文還原、停用後舊請求不得覆寫網站新內容。
- Chrome MV3 Popup 新增詞彙／本機 AI 模式、來源語言、持續逐站設定；預設不請求所有網站，儲存設定但不向外部翻譯 API 傳頁面內容。
- Tampermonkey 仍為**一個完全自含單檔**，增加本機翻譯模式與來源語言控制；不依賴 CDN、第二段驅動碼。
- 既有 Node CLI 與原 `TLSCore.createLocalizer` 相容保留。
- Node unit tests + 真實 Chromium／Userscript stub regression + reproducible ZIP/checksums/Actions artifact。
- 修復動態 DOM 某些元素因沒有 `title` 而跳過 `aria-label` 的漏譯缺陷。
- 仍為 Preview，模型環境差異、語意保真及全網覆蓋未獲得廣泛用戶驗證。

## R1 · 2026-10-23 · Prototype 0.1.0

**專案定位：通用臺灣繁體中文在地化平台**，不限定任何特定網站、遊戲或 Tampermonkey。

### 新增
- 正式 R1 基準規格；第六輪 Open-Core MIT 授權政策與第九輪多語內容在地化方向整合。
- `src/core/engine.js` 共用的保守離線術語與簡短 UI 字詞引擎。
- Chrome Manifest V3：使用者逐站授權、動態 DOM、可停用還原。
- Tampermonkey：完全單檔、自行啟用／停用、暫停與還原。
- 本機 Node.js CLI：Markdown、TXT、JSON／JSONL 安全字詞轉換原型；機器識別欄位保護及不覆寫來源。
- `tools/build.py` 可重建 Chrome + Userscript 交付檔；Node CI 與可選 Chromium 測試。
- Privacy、Security、Contributing、Open-Core、通用 Adapter、Codex OSS 準備文件。

### 限制與未完成
- R1 不是任意語言全篇 AI 翻譯器，只有部分已知 UI 和臺灣技術詞彙。
- 不含 Canvas／WebGL、OCR、PDF/Office、Chrome Web Store 正式上架、通用 SDK、完整 Prompt Tuner。
- 無第三方採用或 OpenAI 贊助核准證據。不得從 CI 通過推導所有網站相容。

### 授權
本 Repo 既有原創程式與文件依 MIT 釋出；未來獨立商業模組須另列授權，不對已有 MIT 授權加限制。
