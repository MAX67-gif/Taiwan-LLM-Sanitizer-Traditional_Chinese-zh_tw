<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:a88bd1d54da98ca299edaed3cec3d3948ff91df85c147626e048cb44ada6f5e8 -->

# Taiwan-LLM-Sanitizer — Safer Taiwanese Traditional Chinese localization

**Languages:** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

An open-source, privacy-minded layer for user-controlled Taiwanese terminology, bilingual reading and technical-content integrity; not affiliated with third-party services. **MIT** · Founder / Steward: CA L.

## What is available

| Release | Scope | Status |
| --- | --- | --- |
| **R13** | Local selection-based bilingual reading, no page-text rewrite | v0.6.0 Preview |
| **R11** | Explicit per-site personal glossary and conservative rollback | v0.5.0 Preview |
| **R14** | Offline provider capability / consent declarations; no remote transport | Research preview |
| **R15** | Offline protected segments and SHA256-based manual preview for Markdown/JSON/Prompt; no source rewrites or remote calls | Shadow preview |
| **R12 / R6** | Frozen 100-case coverage and structural audit; not model correctness | Evaluation only |
| **R5, R8–R10** | Earlier lexical, human-choice and offline research tools | Preview / prototype |

[Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [R13 bilingual reader](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 glossary](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0).

## R15 — Local structure-preview toolkit

The [R15 local structure lab](examples/TW_Structured_Integrity_Lab_R15_20261025.html) only previews user-selected text changes and protects code, JSON keys, URLs, roles, and placeholders. This is not automatic translation or a full parser.

## Translate ordinary websites with your own permission

Use the general reading guide to select text, compare original and translation, configure optional user-owned terminology, and undo changes. No game-specific scripts, proprietary game lexicons, patches or third-party assets are distributed. Always respect site terms and third-party rights. **[Universal website localization guide](docs/WEBSITE_LOCALIZATION_GUIDE.md)**.

## Why this project exists

Context-sensitive Taiwanese wording, protected code and JSON keys, visible approval and conditional rollback, local-first operation, and testable claims instead of unverified model-quality marketing.

## Copyright, trademarks, and privacy

Publicly visible text or source code is not automatically licensed for translation or redistribution. Nonprofit use, attribution and a non-official disclaimer are not automatic permission. [Third-party rights policy](docs/THIRD_PARTY_RIGHTS_POLICY.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md).

These are previews, not independent certification of translation accuracy, broad website compatibility or third-party permission.

## Documentation and participation

[Documentation](docs/FEATURES.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Major updates](CHANGELOG.md).

## Nine practical, original scenarios

[Read the nine original examples](docs/USAGE_EXAMPLES.en.md) (EX01–EX09), covering context-sensitive Taiwan terminology, R13 read-only selection, R11 manual per-site glossary, R14 capability declarations, and R15 Markdown/JSON/Prompt protection.

A **fictional browser-game-like page** with a normal, selectable HTML label such as `Open settings` may allow R13 selection or user-controlled R11 glossary behavior **only where site rules permit**. Text drawn in Canvas/WebGL is not supported. This is not evidence of real-game compatibility and no branded game script or dictionary is distributed. See the [general guide](docs/WEBSITE_LOCALIZATION_GUIDE.md).
