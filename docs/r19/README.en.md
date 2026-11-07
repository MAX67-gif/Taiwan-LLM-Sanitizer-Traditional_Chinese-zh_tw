<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# R19 | Read the context, decide each Taiwanese wording choice

R19 is a standalone local engineering preview using the unchanged R17.2 wording engine. It improves occurrence-level context, file intake and difference review. The Suite 17.4.0 integration candidate adds it to the complete tool suite while R19 retains its `PREVIEW` status. Final suite CI, Draft asset downloads and post-publication download verification must all finish before the release can be recorded as successful.

[繁體中文](README.md) · [Testing and evidence limits](TESTING.md) · [Release gates](RELEASE_GATE.md) · [Suite 17.4.0 integration contract](SUITE_17_4_0_RELEASE.md)

## Start

Download `TW_First_Result_Studio_R19_20261101.html` and open it in a local browser. When using a complete suite that includes R19, extract the archive first, then use `START_HERE.html` to open `TOOLS/html/TW_First_Result_Studio_R19_20261101.html`. In the complete source package it is under `examples/TW_First_Result_Studio_R19_20261101.html`. A GitHub HTML source view does not run the application.

Choose the original demo or import an authorized UTF-8 `.md`, `.markdown` or `.txt` file. Importing first stages the file; select “使用這份檔案” to replace the text in the editor. Read each occurrence's nearby text, choose a replacement or explicitly keep the original, generate a preview, check the full document and download a new `.md`. The original disk file is not overwritten. Both demo buttons request confirmation when work is already present; cancellation preserves that work.

## Context and optional document preferences

A UI menu and a food menu in the same document can independently become 選單 and 菜單. The tool displays context to support your judgment; it does not infer which meaning is correct. It shows the 1-based logical line and Unicode character column, with up to 72 characters of context on either side of the match on the same line. Engine offsets remain UTF-16. Ellipses indicate omitted text, and source text is rendered as text rather than executable HTML.

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

## Recorded native evidence and remaining work

On 2026-11-07, [GitHub Actions run 42377187266](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266) executed the original candidate with the unchanged runner in headless Chromium using an actual local file URL. All ten scenarios passed, establishing `NATIVE_10_SCENARIOS_VERIFIED_WITH_SCOPE` for that run. The exact source, tested merge commit, browser version and original artifacts are listed in the [native acceptance record](NATIVE_ACCEPTANCE_R2.md).

The runner performed actual downloads and compared the output bytes, but the Actions artifact did not retain the individual downloaded files. The operating-system file chooser and its cancellation flow were not tested. Human operation testing, naturalness, completion rates and adoption remain deferred. The final Suite 17.4.0 candidate must separately pass final PR, main and complete publication verification; this earlier candidate result does not establish that publication succeeded.
