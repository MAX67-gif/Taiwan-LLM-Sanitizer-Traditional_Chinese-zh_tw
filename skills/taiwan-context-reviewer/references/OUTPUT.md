# Conservative review output contract

For each proposed edit, return a stable, human-readable record:

| Field | Required | Meaning |
| --- | --- | --- |
| position | When known | Line or other nonsecret reference; not needed for public aggregate report |
| original | Only in the authorized private review | Source phrase being considered |
| proposed | For `SUGGEST` | Taiwan wording candidate, **never automatically applied** |
| domain | Yes | UI, food, software, technical document, general prose, unknown |
| state | Yes | `SUGGEST`, `KEEP_ORIGINAL`, `NEEDS_CONTEXT`, `BLOCKED_TECH`, `LIMITED`, `UNSUPPORTED_FORMAT` |
| reason | Yes | Why this sense matches or why editing was withheld |
| confirmed | Yes | Always `false` until the human explicitly approves a specific suggestion |

### Final action route

`INPUT_AUTHORIZED` → `STRUCTURE_CHECKED` → (`SUGGEST` / `KEEP_ORIGINAL` / `NEEDS_CONTEXT` / `BLOCKED_TECH` / `LIMITED`) → `HUMAN_CONFIRM` → `VERIFIED_PREVIEW` → `SEPARATE_EXPORT`.

No candidate changes the source. If a user wants only review, stop before export. If an agent cannot run a reliable structure check, label it **unverified** rather than silently assuming success.

### Metadata-only offline report

`scripts/audit_markdown.py` outputs `schema=tls.portable-context-audit.v1`, the number of protected spans, total safe candidate mentions, proposal/ambiguous/keep totals, and aggregate rule counts. It contains **no source strings or file paths** by default. `--local-detail` includes line and column references (still no raw text), intended only for the user's private use. These counts are **engineering diagnostics**, not verified translation accuracy or evidence of actual users.


## R2 translation comparison

`--compare` checks two authorized local Markdown/TXT files without rewriting either. Its separate `tls.portable-translation-compare.v1` schema returns boolean checks, warning codes and segment counts only. It never returns source or translation excerpts, paths or hashes. `CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED` is not a judgment of translation quality. Unsupported formats, unclosed structures, changed negation counts and differing protected values must not be silently accepted.

Exit codes: 0 — listed checks passed; 2 — invalid/access-refused input; 3 — integrity blocked, LIMITED or human review required. Audit-only mode retains the original R1 count keys and appends `engine_version`; `--local-detail` stays private.
