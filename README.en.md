<!-- SOURCE_README_SHA256:b6e6bbd92d0e4678dea92d845dff58c18013802a07aa19ec8437de0b03925008 -->
<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# Taiwan-LLM-Sanitizer | Safer localization for Taiwanese Traditional Chinese

**Languages:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

An **open-source, privacy-first, user-controlled localization toolkit**, not a general-purpose language model or a prescriptive list of "correct" Chinese words. Choose terminology, keep original text where appropriate, preview changes and respect technical structure. MIT-licensed original core; Founder / Steward: **CA L.**

## Featured: PokéBonk Taiwanese text-display demo (R7.2 / v0.1.2)

**[PokéBonk project README, installation and limitations](examples/pokebonk-demo/README.md)** · [Download the separate optional release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)

This **unofficial**, opt-in Chrome / self-contained Tampermonkey demo maps some visible DOM labels to Taiwanese-style wording. It has **171 original example entries**, including **35 newly authored, unverified multiplayer/UI candidates**. It skips player names, chat and editable fields, and supports cautious restoration. **It never changes gameplay, saves or network traffic, and current live-game compatibility has not been verified.** It is not an official or complete translation of the game.

## What you can use today

| Component | Status | Purpose and limitations |
| --- | --- | --- |
| **PokéBonk demo** | **R7.2 v0.1.2 Preview** | Optional, visible-DOM-only; [dedicated README](examples/pokebonk-demo/README.md); real-game end-to-end testing remains pending |
| **Chrome / Tampermonkey bilingual reader** | **R13 v0.6.0 Preview** | Select text, compare original and translation; optional Chrome on-device Translator only when supported; original page text is not rewritten |
| **Site glossary application** | **R11 v0.5.0 Preview** | Import your R9 glossary per origin; preview and explicitly approve individual matches, then restore when appropriate |
| Earlier Chrome / Tampermonkey tool | R5 v0.4.0 Preview | Conservative offline terminology and experimental browser-local translation, retained for rollback |
| **Offline quality audit** | **R12 research-only HTML** | Compare coverage and known structural warnings on the frozen R6 100-case set; **not certified translation quality** |
| Term and context review | R8 / R9 / R10 standalone HTML | Examine ambiguous terms, choose preferred wording, and record review decisions; unverified terms never auto-promote |
| Provider capability / consent checker | **R14 offline Shadow Preview** | Inspect declared language pairs, availability, downloads and consent **without remote transport** |
| CLI / AI Skill | Prototype | Conservative Markdown / TXT / some JSON/JSONL terminology processing and Codex / Claude integration |

The R14 demonstration is [here](examples/TW_Provider_Capability_Lab_R14_20261025.html); its declarations are **not measurements from a real device**. The R13 browser reader can try Chrome's local Translator API where available, or accept a manually supplied translation. Unsupported languages and devices are not silently switched to remote providers.

**Downloads:** [PokéBonk v0.1.2](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) · [R13 Reader](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 Glossary](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12 Audit](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [All releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Unzip Chrome packages before loading the folder containing `manifest.json` via `chrome://extensions` (Developer mode); these are **not Chrome Web Store installs**. Tampermonkey scripts are standalone `.user.js` files. Avoid running R5 and R11 against the same site at the same time. See [Chrome instructions](docs/INSTALL_CHROME.md), [Tampermonkey instructions](docs/INSTALL_TAMPERMONKEY.md), and [R13 reader details](docs/R13_BILINGUAL_READER.md).

## What makes this toolkit different

- **Translation-independent control:** inspect terminology, permissions, protected structures and preview differences without claiming to train a language model.
- **Preserve before modifying:** protect source code, brand names, JSON keys, URLs and placeholders; ambiguous material should stay unchanged.
- **Context-aware Taiwanese preference:** software `menu` may be 「選單」 while a restaurant `menu` is 「菜單」; a UI mouse `click` is preferably 「點選」, not a global substitution of unrelated meanings.
- **Reproducible boundaries:** frozen R6 tests, independent research workbenches, opt-in use and reversible changes are distinguished from independent human translation-quality certification (which is **not yet available**).

This describes **our own features**, not a ranking or an accusation about other projects.

## Privacy, licenses and current limits

Local-first behavior, no project-operated service receiving page text, and no background telemetry. Chrome language-model downloads and the original website's connections are separate from this tool's data flow. The public glossary contains 883 **review-pending suggestions** and 67 editorial seed entries; the R10 context study has 40 examples lacking independent review. No candidate is automatically a validated rule. See [Privacy](PRIVACY.md), [Security](SECURITY.md) and [Features / limitations](docs/FEATURES.md).

Full Canvas / WebGL, OCR, all PDF handling, mobile extension support and independently verified language naturalness are not provided. This is independent community software without implied third-party endorsement. Separate future commercial modules cannot retroactively restrict the existing MIT-licensed core.

## Development and contribution

For safe, authorized and non-sensitive bug reports or terminology examples, use [Issues](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues) or [Contribution guidelines](CONTRIBUTING.md). [Roadmap](docs/ROADMAP.md) · [Developer guide](docs/DEVELOPER_GUIDE.md) · [AI integration](docs/AI_INTEGRATION.md) · [Changelog](CHANGELOG.md). Public release notes stay short; historical commits and original releases remain accessible.
