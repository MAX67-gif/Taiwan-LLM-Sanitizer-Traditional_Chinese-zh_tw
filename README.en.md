<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:c4e5f24061fd15beef7c6226f0facf66c8beffcb853cd00771fd72e10075d14a -->

# Taiwan-LLM-Sanitizer — Safer Taiwanese Traditional Chinese localization

**Languages:** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

An open-source, privacy-minded layer for user-controlled Taiwanese terminology, bilingual reading and technical-content integrity; not affiliated with third-party services. **MIT** · Founder / Steward: CA L.
### R17.2 | Review AI-written Chinese for Taiwan, safely

[Start here](START_HERE.html) · [Offline Taiwan wording assistant](examples/TW_Wording_Assistant_R172_20261027.html) · [Codex, Claude and Grok workflow guide](docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md). Paste your own Chinese Markdown, review each suggestion and download a new safety-checked preview. No automatic cloud translation, no native Grok integration, no certified linguistic accuracy. All earlier supported tools remain available in the full suite.


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

## R16 — Offline Localization Safety Studio (standalone Shadow Preview)

[Open the R16 offline studio](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [Usage and safety contract](docs/R16_LOCALIZATION_STUDIO.md) · [Original Markdown example](examples/r16/sample_readme.md). Scan protected Markdown/JSON/Prompt spans, enter candidate wording manually, review differences, and download a **new** preview. Metadata exports contain no source text, although an explicitly downloaded preview includes what you entered. **No automatic translation, cloud upload, or source-file overwrite.** This remains a conservative scanner, not a full grammar or translation-quality certification.

## R17 — Offline project document integrity audit (read-only)

[Open R17 Markdown link audit](examples/TW_Document_Trust_Graph_R17_20261026.html) · [R17 usage and limits](docs/R17_DOCUMENT_TRUST_GRAPH.en.md). Explicitly select Markdown files you own or may process, inspect relative links and headings, then download a source-text-free metadata report. External and unresolved links are UNKNOWN, never verified silently. This is **not translation, semantic certification, network checking, or file modification**.

## R17.1 | Every Release includes the complete supported tool suite

Read the [All-Tools installation and integrity guide](docs/ALL_TOOLS_RELEASE.md). Each new release must include every legally distributable, still-supported Chrome extension, Tampermonkey userscript, 13 offline HTML labs, the R6 public quality kit, and the self-contained CLI/Skill developer bundle. Unchanged tools retain their original versions and SHA256 digests. The Draft release is verified before publication. Previously withdrawn third-party-specific packages remain excluded. Only use the [R17.1 suite release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0) after its GitHub main CI and assets have actually passed.

**R17.3 research only:** Read the [fair editable-span comparison and opt-in usage evidence guide](docs/R173_COMPARISON_AND_ADOPTION.en.md). **No native OpenCC/LLM superiority or independent human quality results exist yet.** Suite 17.2.0 and all prior supported tools remain unchanged.

<!-- ALL_TOOLS_CATALOG: suite=17.2.0; tools=27; standalone=22; tool_ids_sha256=f1c06a60d53960a91e68f3b6184e801bffc6c5442774097a1e167a38f97aa769 -->

Release checks compare the actual tool and downloaded bytes with the original pinned SHA256 and Git revision. Draft and published assets are downloaded separately; an existing tag is verified without overwriting it. All six language guides still require human review (HUMAN_TRANSLATION_REVIEW_PENDING).
