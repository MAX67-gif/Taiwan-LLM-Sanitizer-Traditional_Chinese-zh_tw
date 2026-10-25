<!-- SOURCE_README_SHA256:b6e6bbd92d0e4678dea92d845dff58c18013802a07aa19ec8437de0b03925008 -->
<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# Taiwan-LLM-Sanitizer｜台湾の繁体字中国語向け、安全なローカライズ支援

**言語 / Languages：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

**オープンソース・ローカル優先・ユーザー主導**の台湾繁体字中国語ローカライズツールです。新しい大規模言語モデルではなく、語彙の選択、原文の保持、変更内容の確認、技術的な構造の保護を目的とします。独自のコアは MIT ライセンス、Founder / Steward：**CA L.**

## 注目：PokéBonk 台湾繁体字の表示デモ（R7.2 / v0.1.2）

**[PokéBonk 専用 README・導入方法・制限](examples/pokebonk-demo/README.md)** · [別配布のデモをダウンロード](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)

この**非公式**の Chrome／単体 Tampermonkey デモは、ユーザーが手動で有効化した場合に限り、画面上の DOM テキストの一部を台湾向け表現に置き換えます。オリジナルの例示用語は **171 件**。新しい **35 件は未検証の協力プレイ／UI 用候補**です。プレイヤー名、チャット、入力欄は対象外。慎重な復元をサポートします。**ゲームの動作・セーブデータ・通信は変更せず、最新の実ゲーム画面での完全な動作確認も未実施です。** 公式版や完全日本語／中国語化パッチではありません。

## 現在使えるもの

| 機能 | 現状 | 目的・制限 |
| --- | --- | --- |
| **PokéBonk デモ** | **R7.2 v0.1.2 Preview** | 手動で有効化する表示層限定の非公式デモ。[専用 README](examples/pokebonk-demo/README.md) |
| **Chrome／Tampermonkey 二言語リーダー** | **R13 v0.6.0 Preview** | 選択した原文と訳文を並べて確認。Chrome のオンデバイス Translator API は対応環境のみ。ページ原文を改変しません |
| **サイト別用語集** | **R11 v0.5.0 Preview** | R9 用語集をサイト別に読み込み、個別候補を承認して適用・復元 |
| 旧版のブラウザー支援 | R5 v0.4.0 Preview | 保守的なローカル用語修正／実験的なローカル翻訳。旧版として保存 |
| **品質確認** | **R12 独立研究用 HTML** | R6 の固定 100 件で回答率・構造の警告を比較。翻訳品質の認証ではありません |
| 文脈・用語の検討 | R8 / R9 / R10 HTML | 文脈別の候補・ユーザー選択・根拠確認。未検証候補は自動適用されません |
| Provider 能力・同意チェック | **R14 Offline Shadow Preview** | 宣言された言語ペア・モデル状態・ダウンロード・同意を表示。**外部送信しません** |
| CLI／AI Skill | Prototype | Markdown、TXT、一部 JSON／JSONL と Codex／Claude の補助機能 |

[R14 のオフライン試用ページ](examples/TW_Provider_Capability_Lab_R14_20261025.html)は実機モデルの測定結果を表しません。R13 の選択翻訳も、対応した Chrome のローカル翻訳機能または手動入力によるもので、未対応時に勝手にクラウドへ切り替わりません。

**ダウンロード：** [PokéBonk R7.2](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) · [R13](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [全リリース](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Chrome 版は ZIP を展開し、`chrome://extensions` の開発者モードで `manifest.json` のあるフォルダーを読み込みます。**Chrome ウェブストア版ではありません。** Tampermonkey は単一の `.user.js` ファイル。R5 と R11 を同じサイトで同時に動作させないでください。[Chrome 導入](docs/INSTALL_CHROME.md) · [Tampermonkey 導入](docs/INSTALL_TAMPERMONKEY.md) · [R13 仕様](docs/R13_BILINGUAL_READER.md)

## 本プロジェクトの特徴

- **モデルに依存しない管理層：**用語、アクセス許可、構造の検証、変更前プレビューを扱います。独自の生成モデルを訓練しているとは主張しません。
- **変更より保護を優先：**コード、固有名詞、JSON キー、URL、変数を守り、文脈が曖昧な場合は原文を保持します。
- **台湾向け表現は文脈で判断：**ソフトウェアの `menu` は「選單」、飲食店の `menu` は「菜單」。UI 操作の `click` は「點選」を優先しますが、一律に強制置換しません。
- **結果と限界を明示：**R6 の 100 件は公開済みの回帰テストであり、独立した人間の審査による自然さの認証ではありません。

他プロジェクトの優劣をランキングしたり、模倣・公式提携を示唆したりするものではありません。

## プライバシー、権利、制限

原則としてローカル処理です。ページ原文を集める自前のサーバーや裏でのテレメトリーはありません。Chrome の言語モデルダウンロードと閲覧中のサイト通信は別の境界です。公開用語集には審査前の候補 **883 件**と編集済みシード **67 件**が含まれ、R10 の **40 件**も独立審査済みではありません。これらは自動適用できる認証済み用語ではありません。[プライバシー](PRIVACY.md) · [セキュリティ](SECURITY.md) · [機能と制限](docs/FEATURES.md)

Canvas／WebGL、OCR、すべての PDF、モバイル拡張機能や実際の翻訳自然度について完全対応・検証済みとは主張しません。独立したコミュニティープロジェクトであり、第三者による承認を意味しません。将来の商用拡張で既存 MIT コアの権利を取り消しません。

## 開発・貢献

個人情報や権利制限のない再現例を [Issues](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues) にお寄せください。[コントリビューション](CONTRIBUTING.md) · [ロードマップ](docs/ROADMAP.md) · [開発者向け](docs/DEVELOPER_GUIDE.md) · [AI 連携](docs/AI_INTEGRATION.md) · [更新概要](CHANGELOG.md)。公開の履歴は簡潔に保ち、以前の Git 履歴とリリースを残します。
