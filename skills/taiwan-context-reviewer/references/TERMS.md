# Taiwan wording context rules — 2.0.0

These are limited, original candidate rules, not a certified dictionary. Each occurrence requires user review. Intentional regional wording may be kept.

| Term | Appropriate candidate | Negative or protected case |
|---|---|---|
| menu | 選單 in software UI; 菜單 in dining | `menu_id`, a URL or unknown context must not be guessed |
| click / 點擊 / 点击 | 點選 for an explicit UI action | 點擊率, 點擊聲 and click-through rate keep their measurement/sound meaning |
| 軟件 / 软件 | 軟體 | Code identifiers and branded names stay unchanged |
| 數據庫 / 数据库 | 資料庫 | Preserve database/API identifiers |
| 鼠標 / 鼠标 | 滑鼠 | Do not rewrite a protected identifier |
| 文件夾 / 文件夹 | 資料夾 | Do not rewrite filesystem paths |
| 服務器 / 服务器 | 伺服器 | Preserve hostnames, URLs and commands |
| 源代碼 / 源代码 | 原始碼 | Preserve the code itself |
| 數組 / 数组 | 陣列 | Do not rename a code variable |
| 默認 / 默认 | 預設 in settings context | 默認了這項安排 is acceptance, not a software setting; bare 默認 requires context |
| 設置 / 设置 | 設定 in explicit UI context | 設置一座帳棚 requires a different sense; preserve when uncertain |

## Context boundaries

Code, link destinations, HTML attributes and placeholders are masked before domain cues are examined. A cue in another sentence or semicolon-delimited clause is not borrowed. Chinese adjacent to English, such as 軟體menu, is handled without treating submenu or onClick as standalone terms.

A same-clause conflict may return NEEDS_CONTEXT. Distance heuristics are not a complete semantic model, and a plausible suggestion can still be wrong. Nothing in this table authorizes automatic source edits or prohibits the author's preferred regional form.
