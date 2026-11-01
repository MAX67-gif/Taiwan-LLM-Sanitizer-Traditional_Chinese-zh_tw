# R17.3 — Fair comparisons and real-user evidence (research only)

> **STATUS: ENGINEERING_RESEARCH_ONLY. No independent translation-quality or actual-user results have been collected.** R17.3 identifies this historical research stream; as of 2026-10-31 [Suite 17.3.0](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0) is the current complete download, and the R17.2 wording assistant stays unchanged. This is not another translation engine or a claim that TLS beats an alternative.

## One valuable first task

Download the full Suite → extract → open `START_HERE.html` → choose the Taiwan wording assistant → paste your *own authorized* Chinese Markdown → inspect one suggestion at a time → check protected code, links and placeholders → save a new copy. You can prepare a draft with [Codex / Claude / Grok](AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md), but any cloud upload is governed by that provider, not TLS's local-only privacy promise.

## Two distinct comparison lanes

**L1 — fair editable-text comparison:** TLS, a simple frozen six-alias literal rule set, official OpenCC `s2twp`, and independently supplied authorized LLM output must operate on the *same* R16-approved editable prose spans. No model or human review has been run. Literal replacement is an engineering baseline, not a comprehensive competing translator. OpenCC [official README](https://github.com/BYVoid/OpenCC/blob/master/README.md) and [Taiwan phrase configuration](https://github.com/BYVoid/OpenCC/blob/master/data/config/s2twp.json) are the authoritative references; this MIT project does not redistribute OpenCC dictionaries or binaries.

**L2 — native full-document workflow and equal protection:** both unwrapped `RAW` and equally protected `EQUAL_EDITABLE` variants must be reported. Unprotected raw output is a *risk diagnostic*, never a fair text-quality win claim for TLS. Quality, protected-content preservation, human corrections, completion time, refusal rates and subsequent actual use are different measures. Never compress these into one promotional score.

## Developer-only, reproducible checks

```bash
node --test tests/test_comparison_r173.js
python -m unittest tests/test_comparison_r173.py -v
node research/comparison/r173/naive_baseline.js --input research/comparison/r173/fixtures_first_task.md
python research/comparison/r173/opencc_adapter.py --probe
```

`naive_baseline.js` prints de-identified DEV_ONLY engineering counts; it never overwrites user files. `prepare_spans.js` writes a local, linkable source-hash manifest that must remain private. The OpenCC adapter uses **only a genuine installed runtime** with `s2twp.json`; if not available, it reports `BASELINE_NOT_AVAILABLE`, never a fabricated OpenCC score. `import_model_result.py` only reads a voluntarily supplied, already executed model result **offline**; no API calls are made. `score_and_audit.py` separates DEV, user self-report, reviewer report, unavailable and unexecuted results, with explicit null denominators.

The sample [`fixtures_first_task.md`](../research/comparison/r173/fixtures_first_task.md) is synthetic and design-visible; it is not independent Fresh OOS. [Methodology](../research/comparison/r173/methodology.json).

## Voluntary participation and privacy

Participation is **opt-in**. The [local consent template](../research/comparison/r173/feedback_template.md) and [minimal JSON schema](../research/comparison/r173/consent_schema.json) prohibit raw personal documents, identifying details, contacts, local file paths, and linkable document hashes in public reports. There is no analytics, automatic telemetry or automatic recruitment.

Previous project goals remain *unmeasured targets*: 8/10 first-time users understand the task in 15 seconds, 8/10 finish in 3 minutes, median duration decreases 30% vs. R16, and 3 of the first five genuine completers actually return for a second task within seven days. A willingness statement is not completed repeat use; a GitHub clone is not a verified user.

This research did not modify R17.2 runtime logic or relax third-party exclusions. Historical 17.1/17.2 combined ZIPs have since been withdrawn; use Suite 17.3.0 for the complete release. Git history is not claimed to be purged.
