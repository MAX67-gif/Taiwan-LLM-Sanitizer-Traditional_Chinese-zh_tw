# CHANGELOG — Taiwan-LLM-Sanitizer

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
