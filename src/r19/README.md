# R19 file I/O boundary — standalone research module (2026-11-03)

**Status: EVALUATION ONLY / NOT RELEASED.** This does **not** implement or substitute for the existing privately archived R19 First-Result Studio. The original R19 standalone HTML SHA256 remains \`cbfd7581cb0e39c4f35ed52ec0fb0c257230d2cb24637dc244dab5401e55ba5a\`. Its native ten-scenario test remains **NOT_RUN**.

## Purpose

Reusable, offline-only, deterministic browser/Node file I/O protection for the four issues independently observed on frozen R17.2 ([issue #49](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues/49)):

1. Reject invalid UTF-8, UTF-8 BOM, NUL, unsupported extensions and oversized raw bytes before mutating existing work.
2. Keep previous source/session/choices on a rejected file; the caller's \`commit\` callback is the only source-mutation point.
3. Use a monotonic \`invalidate()\` token on Clear, Demo, source edits and other session changes; a stale asynchronous file read cannot resurrect old work or report a late error.
4. Preserve the exact input bytes for a no-edit download, even if a textarea normalized CRLF; with a permitted wording edit, preserve the input's individual line-terminator sequence. Refuse changed line counts.

## Files and provenance

- \`src/r19/file_io_boundary_r19.js\`: standalone zero-dependency UMD module. No network, cloud model or user-data storage.
- \`tests/test_r19_file_io_boundary.test.js\`: Node regression and safety test matrix.
- \`tests/fixtures/r19_file_io_boundary.html\`: **evaluation harness only**, not a published customer-facing editor. Loads the new module from a relative \`file://\` path.
- \`tests/test_r19_file_io_boundary.browser.py\`: real native Chromium file upload/download, rejection state and stale read tests. It must navigate directly to the fixture's \`file://\` URL; no \`setContent\`, HTTP local server or policy bypass.

The GitHub Actions artifacts contain only synthetic counts/boolean evidence. The browser fixture uses \`set_input_files\`, which **is not a native OS file chooser cancellation test**. The new boundary module is not wired to frozen R17.2 or the private original R19 HTML.

## Integration contract for the *real* R19 candidate

- Keep the original R19's actual bytes and all previous passing tests intact until separately verified. Prefer adapting its existing guard rather than replacing it wholesale.
- Atomic UI commit must use the boundary's \`open(file)\` result only after success; \`reject(code)\` must not revoke or clear a previously active editing session.
- Invoke \`invalidate()\` on any clear/restart/source edit or new file selection; protect stale **success, failure and finally** paths.
- Capture the exact original \`Uint8Array\` on import, and pass it together with the original text and reviewed text to \`encodeReview\` for download.
- No-edit output must be identical to input, byte for byte. With edits, the original newline-token count must be maintained. Report \`LINE_ENDING_SHAPE_CHANGED\` rather than guessing if structural edits alter line boundaries.
- R19's candidate grouping, 120-display/130-found partial coverage, per-occurrence decisions, source protection and genuine SubtleCrypto remain separate mandatory gates.

## Security and release limits

No new suite version, no tool registry change, no historic asset modifications and no R19 product promotion are authorized by this PR. Current published Suite 17.3.2 and all 28 registered tools remain frozen. This module may be reused only after the original R19 files are available for integration and their **unchanged native ten-scenario runner** passes in an authorized browser environment.

The independent R19 acceptance standard is tracked at [issue #47](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues/47). Human linguistic quality and user adoption are **NOT_MEASURED**.
