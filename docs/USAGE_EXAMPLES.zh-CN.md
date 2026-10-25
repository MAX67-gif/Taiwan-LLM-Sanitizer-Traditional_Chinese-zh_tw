<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_EXAMPLES_SHA256:4cd4e8b0b12baf475441a86805317e163cf5de76fb8eeccf5c65d7dd3d036392 -->

# 台湾繁体中文工具的九个使用示例（原创／概念示范）

**语言／Languages：** [繁體中文](USAGE_EXAMPLES.md) · [简体中文](USAGE_EXAMPLES.zh-CN.md) · [English](USAGE_EXAMPLES.en.md) · [日本語](USAGE_EXAMPLES.ja.md) · [한국어](USAGE_EXAMPLES.ko.md) · [Español](USAGE_EXAMPLES.es.md)

> 以下文字均为原创的虚构案例，不是第三方游戏、网站或模型的实际运行截图，也不代表其授权。译文是**人工示范**，不是 TLS 自动生成；目前各工具仍需要分别操作。

## EX01｜根据语境选择台湾习惯的用词

| 原创英文 | 场景 | 台湾繁体中文候选 |
| --- | --- | --- |
| Open the menu | 软件操作 | 開啟**選單** |
| Read the menu | 餐厅点餐 | 閱讀**菜單** |
| Click Save | UI 按钮 | **點選**「儲存」 |
| The camera clicked | 声音描述 | 相機發出**喀嚓聲** |

R11 支持用户选择词汇，但不会自动理解每个 `menu` 或 `click` 的语境。**状态：人工用词示范，非语义模型认证。**

## EX02｜R13：选择网页文字，只读双语对照

在自制测试网页中，用户主动选中 `Open settings to adjust the display.`，R13 显示原文；用户可手动输入示范译文 `開啟設定以調整顯示方式。`。只有在本机 Translator 真正可用时，才可能通过浏览器模型获得候选结果。

**状态：R13 支持选择与对照；不会自动替换整个网页，也不保证设备模型可用。**

## EX03｜R11：按网站管理个人术语

例如用户自行输入 `Settings → 設定`、`Open menu → 開啟選單`。仅对用户选择且条款允许的网站进行预览和明确确认；需要时可以停用并按保守条件恢复原显示。

**状态：逐站、人工授权，非全网自动汉化。**

## EX04｜R14：没有可用模型时不偷偷转发

假设设备 `en → zh-Hant` 返回 `unavailable`。R14 的离线能力声明示范应该报告不可用，而不是擅自调用云端服务；声明数据**不是**设备上的真实模型测试。

## EX05｜R15：Markdown 的代码和链接不可改动

原创句子：`Run the tool with` + `--help` + `See https://example.org/help.`。人工候选可以把普通说明部分写为「使用 `--help` 執行工具；請參閱 `https://example.org/help`。」；行内代码、参数与 URL 必须保持原样。

**状态：R15 支持保守的离线扫描和修改预览，不是完整 Markdown 解析器。R15.1 是否正式发布，请以 Release 页面为准。**

## EX06｜R15：JSON 只预览明确允许的文本值

```json
{"title":"Help center","url":"https://example.org/help","enabled":true}
```

用户可人工建议 `title` 值为 `說明中心`，但不能翻译 JSON 键名、URL 或布尔值。**预览不是覆盖原文件。**

## EX07｜R15：保留 Prompt 角色和变量

```text
system: Preserve placeholders exactly.
user: Explain the settings for {{ACCOUNT_ID}}.
```

`system:`、`user:`、`{{ACCOUNT_ID}}` 不应被误改；普通说明文字才可能进入人工预览。工具不认证 Prompt 在模型中的最终语义。

## EX08｜网页游戏或交互式网站：哪些情况可能有效？

以下是**虚构页面**，按钮文字 `Open settings`、`Start` 并非来自任何真实游戏。

| 页面构成 | TLS 目前可能做什么 | 做不到／禁止的事 |
| --- | --- | --- |
| 可选择的普通 HTML／DOM 文字 | R13 手动选择并对照；网站允许且用户明确授权时，R11 可使用个人词库 | 不保证所有网站兼容，也不保证译文质量 |
| Canvas／WebGL 画面中文字 | **目前不支持直接翻译** | 不反编译游戏，不 Hook 游戏引擎，不修改网络请求 |
| 玩家名称、聊天、密码和存档 | **不采集、不处理** | 不能把其他人的私密内容上传到翻译服务 |
| 具有第三方版权的游戏剧情和专用词库 | **不提供游戏专用下载** | 翻译与再分发可能需要相关权利人的许可 |

**状态：只是通用产品能力示例，未在任何特定游戏上进行端到端验证。**

## EX09｜不确定时应停止而不是绕过限制

图片或画布中文字无法选择、网站条款不允许界面修改、涉及他人私人聊天时，应保留原文，不制作游戏专用脚本，不收集或公开分享素材。

## 使用入口

[通用网页阅读说明](WEBSITE_LOCALIZATION_GUIDE.zh-CN.md) · [版权与隐私政策（繁体）](THIRD_PARTY_RIGHTS_POLICY.md) · [R15 技术限制](R15_STRUCTURED_INTEGRITY.md)。如需验证真正的使用效果，应先使用授权的原创测试文档，而不是公开的游戏素材。
