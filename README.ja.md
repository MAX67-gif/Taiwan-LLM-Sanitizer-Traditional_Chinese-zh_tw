<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:3ea808d1341e8e8372736f081bb9c7b4fed794620805158582ffb9ddc1c29249 -->

# Taiwan-LLM-Sanitizer — 安全性を重視した台湾繁体字中国語ローカライズ

**Languages:** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

ユーザー自身が選べる台湾の用語、原文と訳文の対照表示、技術文書の構造保護を目的とするオープンソースツールです。第三者の公式製品ではありません。 **MIT** · Founder / Steward: CA L.

## 利用できる機能

| Release | Scope | Status |
| --- | --- | --- |
| **R13** | Local selection-based bilingual reading, no page-text rewrite | v0.6.0 Preview |
| **R11** | Explicit per-site personal glossary and conservative rollback | v0.5.0 Preview |
| **R14** | Offline provider capability / consent declarations; no remote transport | Research preview |
| **R15** | Markdown／JSON／Prompt の保護領域と SHA256 によるローカル差分確認 | 独立プレビュー |
| **R12 / R6** | Frozen 100-case coverage and structural audit; not model correctness | Evaluation only |
| **R5, R8–R10** | Earlier lexical, human-choice and offline research tools | Preview / prototype |

[Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [R13 bilingual reader](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 glossary](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0).

## R15 — Local structure-preview toolkit

R15 の[オフライン構造保護ツール](examples/TW_Structured_Integrity_Lab_R15_20261025.html)は、コード、JSON キー、URL、ロールと変数を保護し、手動で選んだ変更のみプレビューします。自動翻訳や元ファイルの書き換えは行いません。

## 一般のウェブサイトでの使い方

共通の利用ガイドで選択テキストの対訳、個人用語の設定、変更の取り消しを説明します。特定のゲーム専用スクリプト、辞書、修正パッチや第三者の資産は配布しません。サイトの利用規約と権利を確認してください。 **[Universal website localization guide](docs/WEBSITE_LOCALIZATION_GUIDE.md)**.

## 本プロジェクトの特徴

文脈別の台湾用語、コードや JSON キーの保護、明示的な承認と条件付き復元、ローカル優先、検証可能な説明を重視します。

## 著作権・商標・プライバシー

公開情報であっても、翻訳や再配布の許諾があるとは限りません。非営利、出典表示、非公式の注記だけでは許可になりません。 [Third-party rights policy](docs/THIRD_PARTY_RIGHTS_POLICY.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md).

各機能はプレビューです。翻訳の正確性、すべてのウェブサイトとの互換性、第三者の許諾は保証しません。

## 資料・参加

[Documentation](docs/FEATURES.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Major updates](CHANGELOG.md).

## 9 つのオリジナル利用例

[具体的な 9 つの例](docs/USAGE_EXAMPLES.ja.md)（EX01–EX09）：台湾の文脈に合わせた語彙、R13 の選択型対訳、R11 の手動用語集、R14 の能力表示、R15 の Markdown／JSON／Prompt 構造保護。

**架空のブラウザーゲーム風サイト**で `Open settings` が通常の選択可能な HTML 文字なら、サイト規約に適合するときに限り R13 または R11 による補助の可能性があります。Canvas／WebGL に描画された文字は対象外です。実ゲームで動作検証したという意味ではなく、特定ゲーム向けのファイルも配布しません。[一般利用ガイド](docs/WEBSITE_LOCALIZATION_GUIDE.md)。

## R16｜オフラインのローカライズ安全ワークベンチ（独立 Shadow Preview）

[R16 オフラインツール](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [利用方法・安全上の制限](docs/R16_LOCALIZATION_STUDIO.md) · [独自作成の Markdown 例](examples/r16/sample_readme.md)。Markdown／JSON／Prompt の保護領域を調べ、候補文を自分で入力して差分を確認し、新しいプレビューとして保存できます。メタデータ報告書には原文を含みませんが、ユーザーが明示的にダウンロードするプレビューには入力文が含まれます。**自動翻訳・クラウド送信・元ファイルの上書きは行いません**。すべての構文や翻訳品質を保証するものではありません。

## R17｜オフライン文書リンク整合性チェック（読み取り専用）

[R17 Markdown リンク検査を開く](examples/TW_Document_Trust_Graph_R17_20261026.html) · [利用方法と制限](docs/R17_DOCUMENT_TRUST_GRAPH.ja.md)。権限のある Markdown ファイルだけを明示的に選び、相対リンクと見出しアンカーを検査できます。結果は本文を含まないメタデータ形式です。外部・未対応リンクは UNKNOWN と表示し、自動的に通信しません。**翻訳やファイルの書換えは行いません**。

## R17.1｜毎回の Release に全対応ツールを収録

[全ツールの配布・検証ガイド](docs/ALL_TOOLS_RELEASE.md)を参照してください。新しい正式 Release には、合法的に配布可能でサポート中の Chrome 拡張、Tampermonkey スクリプト、13 個のオフライン HTML ツール、R6 品質研究キット、CLI／Skill 開発者パッケージが必要です。更新のないツールも元のバージョンと SHA256 を保持します。Draft の全添付ファイルを検証してから公開します。以前に権利上の問題で撤回した第三者専用パッケージは含みません。[R17.1 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0) は正式 CI と実際の添付ファイルが成功した場合に限り利用可能とします。

