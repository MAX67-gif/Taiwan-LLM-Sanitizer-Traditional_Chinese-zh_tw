# AI drafts it. You choose Taiwanese wording.

[繁體中文操作說明](README.md) · [Project](../../README.en.md)

**The same `menu` can receive a different decision at each occurrence.** This original Markdown example uses the existing, published R17.2 offline assistant. The input, explicit decisions and actual output are inspectable. This is a technical demonstration, not a human language-quality score or an adoption claim.

## 1. Download the real assistant

**[Start your first safer edit: official Suite 17.3.0 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0)**

Under **Assets**, download `TW_Wording_Assistant_R172_20261027.html` and open it in your local browser. Alternatively, download `TLS_ALL_TOOLS_SUITE_17_3_0.zip`, unzip it and open `START_HERE.html`. A GitHub HTML source page is not a hosted application. The assistant's controls are in Traditional Chinese; their exact labels appear below.

## 2. A four-action, 60-second tour

Sixty seconds is the designed length of this guide, **not an observed user completion time**.

1. **Load the original.** Save [source.md](source.md) using GitHub's Download raw file control, then select this UTF-8 `.md` file in the assistant. Click **尋找臺灣用語建議** (find suggestions). Use this fixture; the built-in sample button loads a different document.
2. **Make occurrence-level choices.** Apply the four replacements and two explicit KEEP choices in the table. Leave the other two items unselected; they remain unchanged.
3. **Inspect the preview.** Click **產生安全差異預覽** (generate safe preview) and compare [the actual preview.md](preview.md). The source input remains untouched.
4. **Save a new copy.** Click **下載新稿 .md** (download new draft). The download contains the document, so protect it yourself. Changing a choice invalidates the prior preview; regenerate it before export.

## 3. Before → your decision → actual preview

| Source occurrence | Explicit action | This output | What it demonstrates |
| --- | --- | --- | --- |
| `menu` in `software menu` | 採用「選單」（介面選單） | `software 選單` | English `software` has no candidate and stays unchanged; this is not full translation |
| First `軟件` | 採用「軟體」（軟體技術） | `軟體` | Limited suggestion, subject to your confirmation |
| First `數據庫` | 採用「資料庫」（軟體技術） | `資料庫` | Only this occurrence changes |
| Restaurant `menu` | 採用「菜單」（餐飲菜單） | `菜單` | Independent from the UI occurrence |
| `點擊` inside `點擊率` | `BLOCKED`; no apply control | `點擊率` | A click-rate statistic is not rewritten as a mouse action |
| Third `menu` | 保留這一處原文 | `menu` | Explicit KEEP |
| Second `軟件` | 保留這一處原文 | `軟件` | Does not inherit the earlier replacement |
| Last `數據庫` | No selection | `數據庫` | Unselected means unchanged, not reviewed |

Observed in this fixture: **8 inspection items, 4 confirmed replacements, 2 explicit KEEP choices and 2 unselected items (including 1 blocked item)**. The UI reports **2 changed segments**; segment count is different from replacement count.

## 4. Inspect the proof

- [Source](source.md) SHA256: `ed8231e55ea41cd777addcbca31477fec49300f0831812baa6a9aa7a17ad4488`.
- [Preview](preview.md) SHA256: `bbd1b88c96c0b7d96f918b08292e8cabb2d1918ad0752f3de059f519995c66eb`.
- [decisions.json](decisions.json) binds the source hash, candidate IDs, UTF-16 positions, options and KEEP choices. [verification.json](verification.json) binds the actual source/preview, immutable core and shipped HTML hashes, plus each protected span's equality.
- All **20 protected spans** in this fixture remain identical, including heading/newline segments, the HTML comment, inline code, template, code fence and Markdown link structure. This is a scanner segmentation count, **not 20 formats or 20 independent safety cases**.

The claim is limited to this original fixture, fixed version and explicit decisions. The conservative scanner is not a complete GFM parser or a guarantee of semantic equivalence. No suggestion does not mean the prose is correct.

## 5. Reproduce and protect your data

From the repository root, run `node tools/check_showcase_r176.js --check`. It replays the real R17.2 core and checks the committed artifacts without writing files. `tests/test_showcase_browser_r176.py` separately operates the shipped HTML in Chromium, checks input/choices/preview/download and stale-preview invalidation, and rejects HTTP(S) requests or page errors.

The offline assistant does not automatically send source text or feedback. If you separately provide a document to Codex, Claude or Grok, that platform's data rules apply; a cloud conversation is not entirely offline. See the [AI workflow guide](../AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md).

## 6. Optional feedback and honest boundaries

The [offline anonymous observation template](trial_observation.md) has no submission button, automatic upload or requirement to share source text, account names or contact details. Sharing a de-identified summary is optional; publishing it requires separate consent.

| Area | Status |
| --- | --- |
| This fixture's replay and protected-span checks | Reproducible technical evidence only |
| Human semantics, terminology and native-language review | `HUMAN_REVIEW_PENDING` |
| External completion, task time and return use | `NOT_COLLECTED` |
| Multiple arbitrary fixed translation regions (MRFT) | `DESIGN_ONLY`; not implemented in this assistant |

This adds documentation and verification. The example uses the unchanged R17.2 wording assistant; the complete current download is **Suite 17.3.0**. Legacy 17.1/17.2 combined ZIPs were withdrawn after a public-distribution review. It makes no unmeasured superiority claim or claim of program approval.
