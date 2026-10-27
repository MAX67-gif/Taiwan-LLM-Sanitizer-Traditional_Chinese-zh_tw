# Codex / Claude / Grok + Taiwan-LLM-Sanitizer: a practical AI-to-local-review workflow

**Draft with the AI you choose; verify wording and protected technical syntax locally with TLS.** This project is not an AI chat model, is not affiliated with AI providers, and does not silently send your text to them. Using an online AI service can still send content to that service under its own terms.

1. Ask ChatGPT/Codex, Claude or Grok to draft **text you have the right to process**. Ask it to preserve Markdown, code blocks, URLs, CLI flags, API names, JSON keys, `${variables}`, `{{variables}}` and proprietary names. Ask for Taiwanese Traditional Chinese and explicit context ambiguity.
2. Download the official [latest full suite](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest), extract it, and open `START_HERE.html` or the standalone R17.2 wording assistant HTML. If R17.2 has not yet been released, use the current R16 manual safety studio; do not mistake the GitHub source `blob` view for a deployed web app.
3. Paste Chinese/Markdown into R17.2, inspect each candidate, manually choose a contextual replacement or KEEP, generate a SHA-checked safe preview, then copy or download the new `.md` file. Unknown candidates stay unchanged. **This is not full translation, general JSON editing, or human-certified language quality.**
4. For developer projects: Codex can read `.agents/skills/taiwan-zh-tw-localization/SKILL.md` and `AGENTS.md`; Claude Code can read `.claude/skills/taiwan-zh-tw-localization/SKILL.md` and `CLAUDE.md`; Grok Build users can **explicitly instruct** the tool to read `skills/taiwan-zh-tw-localization/SKILL.md`. Grok support is a manual-document path, not a claimed compatible packaged plugin. Do not assume a web-based AI chat reads local project files.
5. Review the AI draft yourself. `node tools/translation_qa.js --source original.txt --translated result.txt` can check selected technical names and structures on files you created locally; a clean automated result does not establish semantic correctness.

**Provider-neutral sample prompt**

```text
Help adapt my authorized technical prose into natural Taiwanese Traditional Chinese while preserving meaning, code, Markdown structure, URL destinations, JSON keys, placeholders, flags, and product names. For mouse/UI actions, prefer 點選 over 點擊; do not rewrite click-through rates or clicking sounds. Distinguish UI menu (選單) from a food menu (菜單). If context is uncertain, flag it instead of guessing. Return a candidate draft and a human-review checklist. Do not claim to have run TLS. I will verify the draft in TLS locally.
```

**Privacy:** TLS local HTML makes no provider/API requests. If you paste text into an online AI, that interaction is outside TLS's local privacy boundary. Read service policies; do not submit credentials, private conversations, third-party copyrighted corpora, or customer data without authorization.

**Official references:** [OpenAI Codex](https://developers.openai.com/learn/codex), [Claude Code](https://code.claude.com/docs/en/overview), [Grok Build](https://docs.x.ai/build/overview). See the [complete Traditional Chinese guide](AI_WORKFLOWS_CODEX_CLAUDE_GROK.md) for per-provider step-by-step prompts, limitations and examples.

## R17.3: Verify AI output fairly, without inventing a leaderboard

See the [fair-comparison and voluntary-adoption research guide](R173_COMPARISON_AND_ADOPTION.en.md). Give every textual competitor the same editable prose spans. An absent real OpenCC `s2twp` installation or an unexecuted Codex/Claude/Grok task means `NOT_RUN` or `BASELINE_NOT_AVAILABLE`, not a win for TLS. This tool never calls cloud models or uploads private input to public reports.
