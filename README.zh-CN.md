<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:4c857bf85b7de657d4a56908904c6977edd6352f3d4ea665c101577ca49601b9 -->

# Taiwan-LLM-Sanitizer｜更安全的台湾繁体中文本地化工具

**语言 / Languages：** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

> **产品定位：**提供面向台湾繁体中文（zh-TW）的用户自主选词、只读双语阅读和技术文档结构保护；不是文字审查工具，也不是任何第三方平台的官方产品。原创开源核心使用 [MIT 许可证](LICENSE)，Founder / Steward：CA L.。

## 现在可以使用的功能

| 版本 | 实际用途 | 重要限制 |
| --- | --- | --- |
| **R13 双语阅读 v0.6.0** | 用户主动选择网页上可见文字，对照原文与手动输入的译文；符合设备条件时可尝试 Chrome 本机 Translator | 不修改网页原文，不提供完整网页一键翻译，不保证模型可用 |
| **R11 个人术语 v0.5.0** | 针对自己选定的网站管理术语、预览与确认、必要时停用／恢复 | 必须由用户手动选择并确保符合网站条款 |
| **R14 离线能力检查** | 查看声明的模型语言组合、下载与同意状态 | 不等于真实设备上的模型验证，不调用远程服务 |
| **R15 结构保护 Shadow 0.1.0** | 扫描 Markdown／JSON／Prompt 的代码、链接、键名、角色等保护片段，预览人工修改 | 不自动翻译、自动改源文件或通过网络传输；不是完整 AST |
| **R12／R6 品质研究** | 100 个已公开固定样本的覆盖与结构检查 | 不是模型翻译准确率或自然度认证 |
| **R5／R8–R10 原型** | 早期术语与上下文辅助 | 视具体入口与版本区分功能 |

**安装和下载：** [正式 Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [R13 双语阅读](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 术语工具](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0)。Chrome 扩展需要先解压 ZIP 再使用 `chrome://extensions` 加载；Tampermonkey 可以导入 `.user.js`。项目**尚未通过 Chrome Web Store 上架认证**。

## 九个真实可理解的使用场景（全部为原创示例）

[阅读完整简体中文示例 EX01–EX09](docs/USAGE_EXAMPLES.zh-CN.md)：

- **软件术语：**软件操作中的 `menu` 在台湾用户界面常用「選單」，餐厅菜单更适合「菜單」。`click` 在鼠标操作可为「點選」，不能机械替换所有语境。
- **网页阅读：**用户选择 `Open settings` 后，R13 可显示原文／候选译文；本机模型是否可用须另行核对。
- **文档安全：**R15 允许用户在保留 `--help`、JSON 键名、URL 和 `{{ACCOUNT_ID}}` 的前提下人工预览说明文字的修改。
- **网页游戏式站点：**如果文字是普通 DOM 可选内容，可能适用通用选择式阅读或用户自建术语；如果文字由 Canvas/WebGL 绘制，现有工具**不能直接翻译**，也不读取聊天、存档、账号或玩家信息。

**以上不是第三方游戏兼容性验证，不提供特定游戏的脚本、字典或补丁。** 所有译文由作者编写用于说明，不能据此声称模型翻译品质。

## 通用网站阅读流程

[简体中文完整操作指南](docs/WEBSITE_LOCALIZATION_GUIDE.zh-CN.md) · [九个原创建议和失败案例](docs/USAGE_EXAMPLES.zh-CN.md)。使用前请先确认网站条款和版权，不要处理不属于自己的敏感内容。任何版权不明的游戏或其他第三方素材，均不加入公共发行。

## 我们的特点（不点名比较其他项目）

- **台湾语境可由用户决定：**不把同一个词强制翻成单一版本，允许保留原文和多种合理译法。
- **技术结构优先保护：**代码、URL、JSON Key、变量占位符与 AI Prompt 角色不能被当成普通说明文字修改。
- **本机优先与操作可追溯：**区分来源、能力声明、人工翻译建议、结构审查与真正的翻译品质验证。
- **版权、隐私与授权：**公开网络资源不代表有权翻译后再分发；仅对项目自己拥有授权的原创核心使用 MIT。

## 法律、隐私与开源参与

[第三方版权、商标和隐私规范（繁体）](docs/THIRD_PARTY_RIGHTS_POLICY.md) · [安全政策](SECURITY.md) · [隐私政策](PRIVACY.md) · [贡献指南](CONTRIBUTING.md) · [功能清单](docs/FEATURES.md) · [路线图](docs/ROADMAP.md)。反馈请使用自己拥有合法分享权的原创测试样本，不要上传他人的聊天、凭证、游戏素材或商业文件。

**翻译支持范围、第三方网站许可和法律责任取决于具体环境；此文不等于相关权利人的批准。**

## R16｜离线本地化安全工作台（独立 Shadow Preview）

[打开 R16 离线工具](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [功能与安全限制](docs/R16_LOCALIZATION_STUDIO.md) · [原创 Markdown 示例](examples/r16/sample_readme.md)。在本机检查 Markdown／JSON／Prompt 中受保护的代码、链接和变量，手动填写候选文字、查看差异后另存新文件。元数据报告不包含原文，但用户主动下载的预览文件会包含输入文本。**不自动翻译、不上传、不覆盖原文件**；不保证所有语法与翻译语义都正确。

## R17｜项目级文档完整性检查（离线、只读）

[打开 R17 离线 Markdown 链接检查工具](examples/TW_Document_Trust_Graph_R17_20261026.html) · [阅读简体中文使用与安全指南](docs/R17_DOCUMENT_TRUST_GRAPH.zh-CN.md)。用户明确勾选有权使用的文件，检查跨文件链接和标题锚点；报告不包含文档正文。外部链接与未知语法标记为 UNKNOWN，不会自动访问网络。此工具**不会翻译、修改文件或证明翻译正确**。

## R17.1｜每次 Release 都包含完整工具套装（All-Tools Full Suite）

请参阅 [完整工具下载与验证说明](docs/ALL_TOOLS_RELEASE.md)。新版正式 Release 必须保留所有仍受支持、具备合法分发权限的 Chrome 扩展、Tampermonkey 脚本、13 个离线 HTML 工作台、R6 质量研究包，以及带依赖项的 CLI/Skill 开发者包；未更新的工具仍保留原版本号与 SHA256。GitHub 必须先验证全部 Draft 附件后才能公开发布。因版权或安全问题下架的第三方专用内容不得恢复。请在正式 CI 成功后使用 [R17.1 工具套装页面](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0)。

<!-- ALL_TOOLS_CATALOG: suite=17.1.0; tools=26; standalone=21; tool_ids_sha256=75bb89093ed2868f36e0a327d9d0fccb1d1ce60c97c2fd572fb1a69055b82492 -->

发布完整性检查会直接核对原始工具的锁定 SHA256、实际下载内容与 Git 提交。草稿阶段和公开后分别下载一次；同一标签已发布时只验证相同内容，不覆盖。六种语言的说明仍等待人工审阅（HUMAN_TRANSLATION_REVIEW_PENDING）。
