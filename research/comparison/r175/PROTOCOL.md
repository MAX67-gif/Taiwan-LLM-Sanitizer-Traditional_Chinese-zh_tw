# R17.5 OpenCC 1.4.2 native provenance：研究專用

本工具是與 R17.3 分開的 **原生來源探針**，不增加任何正式發行工具、詞庫或外部文字匯入權限。以 BYVoid/OpenCC 官方 `ver.1.4.2` Linux amd64 Debian Release ZIP（版本封存 SHA256 鎖定）在隔離 GitHub Actions Runner 內執行；**不把 OpenCC Apache-2.0 程式、二進位或字典納入 TLS MIT Release**。與 OpenCC 的依賴與授權保持獨立。

## 本機與 GitHub Runner 狀態分離

- 若本機或沙盒未具有官方資產（本次 ChatGPT 沙盒沒有網路 DNS），不得虛報原生測試。GitHub Workflow 採唯讀權限下載官方 Release、驗 SHA 後非 root 解包並執行原生 CLI `--version` 與 `-c s2twp.json`。
- 此文件的內部輸入 `fixture_native_original.md` 是自行編寫的公開研究文字。Node 腳本沿用 R17.3 的 R16 EDITABLE spans 分割；失敗就拒絕，不落地含使用者資料。
- 同一 source：L1 EQUAL_EDITABLE / L2 RAW_DIAGNOSTIC_ONLY；RAW 不能當公平詞彙對比數字。輸出是 SHA、計數、版本、來源與設定／字典雜湊，不含原文或生成全文。
- 缺 native 來源、版本、SHA、config 或 output 都為 `B_BLOCKED_NATIVE_EVIDENCE`；不是零分，也不是 OpenCC/TLS 勝負。
- `--ambiguities` 的實驗性候選不在本輪執行範圍。人類兩名獨立審閱之前，任何語意品質與臺灣慣用詞比率為 `NOT_MEASURED`。

## 本機重現（已有原生官方 ZIP 時）

`node research/comparison/r173/prepare_spans.js --input research/comparison/r175/fixture_native_original.md --output /tmp/tls-r175-spans.json`

`python research/comparison/r175/native_probe.py --archive /tmp/opencc-1.4.2-1-deb-amd64.zip --marisa-package /tmp/libmarisa1_0.3.1+git20250817-1build1_amd64.deb --fixture research/comparison/r175/fixture_native_original.md --spans /tmp/tls-r175-spans.json --output /tmp/tls-r175-receipts`


**額外原生依賴（不可省略）：**此 Linux 官方 ZIP 的 `opencc` CLI 在目前隔離 Runner 需要 `libmarisa1`。請從 Ubuntu 官方 Archive 取得 `libmarisa1_0.3.1+git20250817-1build1_amd64.deb`，先驗證下載的 SHA256 為 `befd1c30ac2163bb15ea83f26f92dbf4de39a00dcb0eaad133ee2c73306b268b`，再以 `--marisa-package` 提供給探針；OpenCC ZIP 本身的 SHA256 必須是 `5ec8bc9cd4aed58586af969a66e623b6fe22c24ac66af46aa6c81e8b75fea9e1`。來源皆為上游依賴，不可混入 TLS MIT 發行套件。缺任一雜湊或依賴時應回報 `B_BLOCKED_NATIVE_EVIDENCE`，**不要**改成系統上隨機找到的不同版本。

來源：<https://github.com/BYVoid/OpenCC/releases/tag/ver.1.4.2>、<https://archive.ubuntu.com/ubuntu/pool/main/m/marisa/>。

GitHub Actions `TLS R17.5 pinned official native evidence (read only)` 執行同樣流程，Runner 以官方 URL 和固定 SHA 查核，執行檔與 `.json`、`.ocd*` 的 SHA 記錄在 `NATIVE_SOURCE_RECEIPT.json`。此流程不讀 GitHub Secrets、不同意任何遠端客戶文字傳輸、也不變更公開 Release。

## 可公開的界線

本研究的輸出必須以 `SOURCE_VERIFIED_NATIVE_EXECUTED` 與 `HUMAN_REVIEW_PENDING` 分別標示；即便 native 執行完全成功，也不能宣稱已證明 OpenCC 比 TLS 好或差，或已有真實用戶採用。R17.4 27 個工具繼續保持不可變。
