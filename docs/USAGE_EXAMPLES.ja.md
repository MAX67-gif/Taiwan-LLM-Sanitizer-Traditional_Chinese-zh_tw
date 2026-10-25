<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_EXAMPLES_SHA256:4cd4e8b0b12baf475441a86805317e163cf5de76fb8eeccf5c65d7dd3d036392 -->

# 台湾繁体字中国語ローカライズ：9 つのオリジナル利用例

**言語:** [繁體中文](USAGE_EXAMPLES.md) · [简体中文](USAGE_EXAMPLES.zh-CN.md) · [English](USAGE_EXAMPLES.en.md) · [日本語](USAGE_EXAMPLES.ja.md) · [한국어](USAGE_EXAMPLES.ko.md) · [Español](USAGE_EXAMPLES.es.md)

> すべて独自に作成した架空の文章です。実際のゲームから抽出した UI、スクリーンショット、公式の許諾や動作検証ではありません。翻訳は人手で考えた**例示**であり、自動翻訳の結果ではありません。各ツールはまだ独立しています。

## EX01｜文脈ごとの用語選択

ソフトウェアの `menu` は台湾向け UI では「選單」、飲食店の `menu` は「菜單」が候補です。画面操作の `click` は「點選」、カメラのシャッター音にはその訳は適しません。R11 は手動選択を支援し、すべてを自動判定しません。

## EX02｜R13：選択した本文の読み取り専用対訳

架空の HTML 画面にある `Open settings to adjust the display.` を選択すると、R13 は原文と手入力訳文 `開啟設定以調整顯示方式。` を対比できます。ブラウザ内モデルは実際に利用可能な場合に限られます。元の Web ページは書き換えません。

## EX03｜R11：サイトごとの手動用語集

利用者が `Settings → 設定`、`Open menu → 開啟選單` を自作して確認し、利用規約に適合する選択サイトで明示的に有効化します。復元は条件付きであり、汎用の意味判定機能ではありません。

## EX04｜R14：モデルが利用できないとき

仮の `en → zh-Hant` が `unavailable` なら、その状態を表示します。無許可でクラウドへ本文を送ってはいけません。R14 の宣言デモは実機モデルの検証ではありません。

## EX05｜R15：Markdown の構造保護

独自例 `Run the tool with` + `--help` + `See https://example.org/help.` の説明文を人が検討しても、コード、フラグ、URL は変更しません。R15 は完全な Markdown AST ではありません。R15.1 が公開されたかは正式 Release を確認してください。

## EX06｜R15：JSON の値だけをプレビュー

```json
{"title":"Help center","url":"https://example.org/help","enabled":true}
```

`title` の文字列値に `說明中心` を提案しても、キー、URL、真偽値は変更しません。原本ファイルは上書きしません。

## EX07｜R15：Prompt のロールと変数

```text
system: Preserve placeholders exactly.
user: Explain the settings for {{ACCOUNT_ID}}.
```

`system:`、`user:` と `{{ACCOUNT_ID}}` は保護対象です。説明文のプレビューはプロンプトの意味の正しさを保証しません。

## EX08｜架空の Web ゲーム風サイト

HTML／DOM の通常テキスト `Open settings` や `Start` は、規約に適合する場合に限り R13 の手動選択、R11 の利用者自身の用語集で補助できる可能性があります。Canvas／WebGL 内の文字、プレイヤー名、チャット、認証情報、セーブデータは対象外です。特定ゲーム向けスクリプトや辞書を配布せず、実ゲームの動作確認も主張しません。

## EX09｜不明・不許可なら停止する

画像内文字、利用規約で禁止された変更、第三者の私的な発言は保護し、抽出や再配布をしません。合法的に作成したオフライン教材を使ってください。

## ガイド

[一般サイト向け説明](WEBSITE_LOCALIZATION_GUIDE.md) · [権利とプライバシー](THIRD_PARTY_RIGHTS_POLICY.md) · [R15 の限界](R15_STRUCTURED_INTEGRITY.md)。利用者による実証がない改善率や認証成績は示しません。
