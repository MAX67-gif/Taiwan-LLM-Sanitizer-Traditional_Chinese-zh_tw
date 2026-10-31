<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_EXAMPLES_SHA256:3a7ad38727e421556466f409dc2ce6b8e2db5ed0535e44344c9334be467f1fd7 -->

# Nine original examples of Taiwanese Chinese localization (offline concepts)

**Languages:** [繁體中文](USAGE_EXAMPLES.md) · [简体中文](USAGE_EXAMPLES.zh-CN.md) · [English](USAGE_EXAMPLES.en.md) · [日本語](USAGE_EXAMPLES.ja.md) · [한국어](USAGE_EXAMPLES.ko.md) · [Español](USAGE_EXAMPLES.es.md)

> Every sentence is an original synthetic example. No third-party game content, real site screenshots, official endorsements, or live compatibility proof. The suggested translations are editorial examples, **not automated model output**. Current tools operate separately; no one-click pipeline exists.

## EX01 | Context matters for `menu` and `click`

In a software UI, `Open the menu` may become `開啟選單`; a restaurant's `Read the menu` can become `閱讀菜單`. A UI `Click Save` may use `點選「儲存」`, whereas a camera click is a sound. R11 enables user-defined choices; it does not automatically disambiguate all occurrences.

## EX02 | R13: read-only selection-based bilingual reading

On a fictional HTML page containing `Open settings to adjust the display.`, select the phrase. R13 can show the original alongside a manually supplied candidate such as `開啟設定以調整顯示方式。`. Local browser translation depends on a genuinely available model. **R13 does not rewrite the source page or auto-translate an entire website.**

## EX03 | R11: manual glossary by site

A user may define `Settings → 設定` and `Open menu → 開啟選單`, review changes, approve use for a selected permitted site, and opt out later. Restore behavior is conservative and conditional; this is not a universal semantic translator.

## EX04 | R14: unavailable is not permission to upload

If a hypothetical `en → zh-Hant` pair is `unavailable`, the offline capability preview should state the limitation. It must not silently switch to a remote provider. R14 test declarations do not prove real device model availability.

## EX05 | R15: Markdown text versus protected code

An original input `Run the tool with` + `--help` + `See https://example.org/help.` could receive human-reviewed Chinese explanatory text while retaining the **exact** backtick code, CLI flag, and URL. R15 is a conservative scanner, not a complete Markdown AST; the later R15.1 fix must not be called a release until verified on GitHub.

## EX06 | R15: JSON values versus schema keys

```json
{"title":"Help center","url":"https://example.org/help","enabled":true}
```

A user could preview changing the `title` **value** to `說明中心`, but not `title` as a key, `url`, or `enabled`. No direct rewrite of the original file is performed.

## EX07 | R15: Prompt roles and placeholders

```text
system: Preserve placeholders exactly.
user: Explain the settings for {{ACCOUNT_ID}}.
```

The role labels and `{{ACCOUNT_ID}}` remain protected. A safe preview of an ordinary prose span does not certify the resulting prompt's semantics.

## EX08 | Hypothetical web-game-like interface

On an entirely fictional HTML page, an ordinary selectable button `Open settings` and label `Start` might be readable through R13, or reviewed with a user-created per-site R11 glossary **if site terms allow**. Canvas/WebGL-drawn text is currently out of scope. Player names, chat, credentials and save files must be excluded. No game-specific script, dictionary, patch or download is provided; no actual game's compatibility has been verified.

## EX09 | Stop safely when unsupported or rights are unclear

Keep the original if text is inside a picture, Canvas, unauthorized game dialogue, someone else's chat or a website that prohibits modifications. Use original offline fixtures, not extracted third-party assets.

## Further reading

[General website guide](WEBSITE_LOCALIZATION_GUIDE.md) · [Third-party rights and privacy](THIRD_PARTY_RIGHTS_POLICY.md) · [R15 limitations](R15_STRUCTURED_INTEGRITY.md). Product usefulness must be demonstrated with permissioned user tasks, not invented accuracy percentages.

## R16 hands-on workflow with original examples

Open the [R16 offline studio](../examples/TW_Localization_Safety_Studio_R16_20261026.html) and paste the [original Markdown sample](../examples/r16/sample_readme.md). Inspect protected spans, manually type a suggestion, and download a **new** preview. Code, placeholders, HTML comments and URLs remain protected. **No automatic translation or network upload.**


#### EX10 | Use AI with TLS without automatic integration

Draft authorized Chinese Markdown with Codex, Claude or Grok; inspect it in the [R17.2 offline assistant](../examples/TW_Wording_Assistant_R172_20261027.html), manually confirm options, export, and review changes. [AI workflow guide](AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md). This is not a direct Grok plugin or quality certification.

<!-- ALL_TOOLS_CATALOG: suite=17.3.0; tools=28; standalone=23; tool_ids_sha256=22cb8ad7ccdc6b9d468e2652407ee15e6288ce2c4a5e4f61fdf88b2cef9a0a57 -->

## Complete tool download

The legally distributable tools used by these examples are collected in the [R17.1 All-Tools Suite and integrity guide](ALL_TOOLS_RELEASE.md). Chrome, Tampermonkey, offline HTML, and CLI have different installation steps. Original tool versions are retained; choose an entry point for your task and avoid enabling multiple versions on the same site. The suite does not certify human-reviewed translation quality.

<!-- R177_MRFT_EXAMPLE_BEGIN -->
## Separate R17.7 multi-region practice

EX01–EX09 are preserved. See [MRFT instructions and original multi-region practice](mrft/MRFT_DOM_PREVIEW.md): up to 8 regions, two positioning modes, manual translations or explicitly enabled local models; no OCR or cloud transport. Suite 17.3.0 has 28 tools / 23 standalone tool assets / 28 Release assets, preserving all original 27 tool bytes. Model capability and human language quality still require separate verification.
<!-- R177_MRFT_EXAMPLE_END -->
