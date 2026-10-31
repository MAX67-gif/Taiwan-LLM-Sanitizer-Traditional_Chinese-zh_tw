# First result in 3 steps | Taiwan-LLM-Sanitizer R17.2

> Originally checked 2026-10-28; download location reverified 2026-10-31. R17.4 is an **onboarding documentation update**, not a new translation engine or new release. The R17.2 app stays unchanged. Native-speaker translation validation remains pending.

## 1. Download a runnable file from the official release

**[Open the latest official GitHub Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)**. Under **Assets**, choose the full `TLS_ALL_TOOLS_SUITE_17_3_0.zip` for the verified complete Suite 17.3.0, or `TW_Wording_Assistant_R172_20261027.html` on its own. Future releases may use new names; check the actual assets.

**Historical download notice:** The full-suite and developer ZIPs from Suite 17.1/17.2 were withdrawn after a public-distribution-boundary review. Their old manifests may still name retired files; use the [verified Suite 17.3.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0) for a complete download. The R17.2 wording assistant itself remains version-locked.

A repository link ending in `examples/*.html` opens the **source file view** on GitHub, not a hosted web app. Download the release HTML first and open it locally in your browser.

## 2. Open the offline assistant and try original content

Unzip the suite, open `START_HERE.html` in your local browser, then choose the R17.2 wording assistant. Load the original sample or paste Markdown you are entitled to edit. The [original practice text](R174_ORIGINAL_FIRST_TASK.md) includes UI, food and technical terms along with code/URLs/templates that should remain protected. No AI service is called by the local assistant itself.

## 3. Review each proposed term before exporting

Choose **find suggestions**, then decide **accept** or **keep original** for each occurrence. The word `menu` may mean an app menu or a restaurant menu. If its context is uncertain, leave it unchanged. Inspect the protected-structure diff; only export a new Markdown file after manual meaning review. The original is not overwritten by the app.

No suggestions does **not** mean perfect Chinese. Structure checks are not semantic certification. The app uses a conservative Markdown scan, with a 64 KiB input limit and at most 120 candidate occurrences; it is not a general JSON, PDF or full-document translation tool.

For AI-authored drafts, use the [Codex / Claude / Grok workflow guide](AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md). Cloud AI may receive user-submitted text; the TLS local browser tool does not automatically submit it.

Human first-use and retention metrics have **not been collected**. No hidden telemetry, personal document uploads or identity tracking are part of this quick start.

[README](../README.en.md) · [Official release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest)
