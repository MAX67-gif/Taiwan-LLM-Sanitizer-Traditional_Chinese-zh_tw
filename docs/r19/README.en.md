<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# R19 | Read the context, decide each Taiwanese wording choice

R19 is a standalone local engineering preview using the unchanged R17.2 wording engine. It improves occurrence-level context, file intake and difference review. It is not a new full-document translation model or an official new All-Tools Suite release.

[繁體中文](README.md) · [Testing and evidence limits](TESTING.md) · [Release gates](RELEASE_GATE.md)

## Start

Download `TW_First_Result_Studio_R19_20261101.html` and open it in a local browser. In the complete source package it is under `examples/`. A GitHub HTML source view does not run the application.

Choose the original demo or import an authorized UTF-8 `.md`, `.markdown` or `.txt` file. Importing first stages the file; select “使用這份檔案” to replace the text in the editor. Read each occurrence's nearby text, choose a replacement or explicitly keep the original, generate a preview, check the full document and download a new `.md`. The original disk file is not overwritten. Both demo buttons request confirmation when work is already present; cancellation preserves that work.

## Context and optional document preferences

A UI `menu` and a food `menu` in the same document can independently become 選單 and 菜單. The tool displays context to support your judgment; it does not infer which meaning is correct. It shows the logical line and Unicode character column, with up to 72 characters of context on either side of the match on the same line. Engine offsets remain UTF-16. Ellipses indicate omitted text, and source text is rendered as text rather than executable HTML.

After confirming an existing option, you can remember its wording for that document and named context. Other occurrences of the same original form receive a reference hint. UI and food preferences can coexist. A hint never selects or applies a replacement, changes an explicit keep decision, expands the frozen lexicon, or proves that the surrounding context matches. Every occurrence still requires a decision.

Preferences remain in this page's memory only. Editing, clearing, importing a new source or switching to the demo clears them. They can also be cleared explicitly. Adding or clearing preferences invalidates the previous preview and count summary without changing occurrence decisions. This is not an arbitrary glossary importer or a persistent cross-document dictionary.

## Coverage and differences

The engine lists at most 120 candidates per inspection. If it detects 130, the remaining 10 are reported as omitted and unreviewed even when all 120 visible choices have been handled. Preview notices and the JSON report remain `PARTIAL`; omitted and undecided occurrences remain unchanged. Review the remainder in smaller sections, then check the complete document.

Difference highlights show at most 12 changed lines, centered around each line's first actual difference. A change beyond column 300 remains visible. Other differences later on the same line can be omitted; the excerpts do not replace full-document review.

## Files and line endings

The limit is 65,536 bytes. Raw UTF-8 BOM bytes are rejected before decoding. Invalid UTF-8, NUL, blank files and inconsistent sizes are rejected too. Rejected or cancelled imports preserve the current source, choices and preview.

Imported CRLF, CR and LF line endings are retained in the downloaded output until the source editor is manually changed. Browser textareas normalize their value to LF; after a manual edit the interface states that output uses LF. The original disk file remains unchanged.

## Privacy and proof limits

Source, context, preferences and output remain in page memory. The tool has no automatic network transport, remote fonts, models, accounts or persistent storage. Manually following the feedback link opens GitHub, where submission is your choice.

The downloaded JSON contains counts and scope metadata, including detected, shown, omitted, accepted, kept and unresolved candidates and the preference count. It contains no source text, output text, preference wording, filename, path, source hash or account. It is not semantic-quality certification. `ALL_DETECTED_CANDIDATES_SHOWN` only means that this engine's detected candidates were all listed; it does not mean that each was decided or that the document has no other language problems.

The existing 67 entries and 9 overlay forms remain unchanged, and unreviewed aliases remain candidates. The frozen engine can reject fenced JSON and unclosed code blocks. R19 does not change those structure rules or provide PDF, OCR, a full AST, complete automatic translation, native-speaker certification, adoption evidence or privacy guarantees for other AI platforms.

Native-browser acceptance code is supplied, but a real execution receipt is required before claiming that gate passed. Consult the testing and release documents.
