# Taiwan Context Reviewer 2.0.0

A portable, human-controlled Taiwan Traditional Chinese review skill, with a dependency-free local Markdown audit and source/revision comparison. This is a source candidate, not a new official TLS Suite or a full translation model.

Copy the entire directory, not only SKILL.md. Ask an authorized file-capable agent to read SKILL.md; agent discovery and permission vary, and cloud agents may receive your document. No automatic installation or universal platform compatibility is claimed.

From this directory, use Python to run:

```text
python scripts/audit_markdown.py --input assets/ORIGINAL_PRACTICE.md
python scripts/audit_markdown.py --input assets/COMPARE_ORIGINAL.md --compare assets/COMPARE_REVISED_OK.md
python scripts/audit_markdown.py --input assets/COMPARE_ORIGINAL.md --compare assets/COMPARE_REVISED_BAD.md
python -m unittest discover -s tests -v
```

The deliberately bad original example must return BLOCKED_INTEGRITY and exit 3. Valid listed checks return CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED; human meaning and fluency review remain necessary.

Version 2 scopes context to unprotected local clauses, supports CJK/English adjacency, protects recognized nested destinations and multiline code, preserves protected line endings, and compares numeric tokens including signs, selected product names and basic Markdown structure. It does not automatically rewrite either input, call a model or send telemetry.

Inputs: explicitly named regular UTF-8 Markdown/TXT files, nonempty and at most 64 KiB. Invalid UTF-8, BOM/NUL, symlinks and existing output files are refused. Default reports have no source text, paths or document hashes. Keep optional local position detail private. MIT; retain LICENSE. Tests use original design-visible cases, not unseen human quality evidence.
