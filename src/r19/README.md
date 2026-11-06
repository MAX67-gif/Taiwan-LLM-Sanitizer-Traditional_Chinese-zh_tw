# R19 file I/O boundary — research status updated 2026-11-06

**Status: EVALUATION ONLY / NOT RELEASED.** This directory contains an independent file-I/O and staged-import subsystem. It does **not** contain or substitute for the complete R19 R2 First-Result Studio.

## Current source-sync status

| Workstream | Verified scope and limitation |
| --- | --- |
| Published baseline | Suite 17.3.2 and its 28 registered tools are not changed by this update. |
| This PR's subsystem | File import, CRLF preservation and staged acceptance; the historical tested head is `1a44af5603a506d25f24285ac0e23a4a368b6245`. Its [CI run 41627718513](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/41627718513) is separate from original Studio acceptance. |
| Complete Studio R2 | The [R2 source report](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues/51#issuecomment-6676238890) records 557 passing Node tests and clean replay. These are historical sandbox results, not rerun or uploaded as Studio source by this documentation change. |
| Original Studio native gate | **0/10 NOT_RUN**; a passing subsystem fixture or schema-valid report cannot satisfy it. |
| Release permission | **NONE**. Keep this candidate Draft; do not overwrite historical tools, tags or assets. |

The machine-readable index is [r2_source_sync.json](r2_source_sync.json). It records source identities, historical evidence scope and outstanding gates. It is not an executable source bundle or a native acceptance receipt.

The R2 Studio candidate HTML is `examples/TW_First_Result_Studio_R19_20261101.html`, reported at 136,680 bytes with SHA256 `33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a`. The unchanged original native runner is `tests/browser_first_result_studio_r19.cjs`, SHA256 `f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8`. The sandbox commit `825e4e1848affdcdba44553fb78dc45a867cdffc` is **not a GitHub commit**.

Historical original R19 HTML SHA256: `cbfd7581cb0e39c4f35ed52ec0fb0c257230d2cb24637dc244dab5401e55ba5a`. Do not confuse the original, R2 candidate and this subsystem fixture.

## Purpose

Reusable, offline-only, deterministic browser/Node file I/O protection for the four issues independently observed on frozen R17.2 ([issue #49](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues/49)):

1. Reject invalid UTF-8, UTF-8 BOM, NUL, unsupported extensions and oversized raw bytes before mutating existing work.
2. Keep previous source/session/choices on a rejected file; the caller's `commit` callback is the only source-mutation point.
3. Use a monotonic `invalidate()` token on Clear, Demo, source edits and other session changes; a stale asynchronous file read cannot resurrect old work or report a late error.
4. Preserve the exact input bytes for a no-edit download, even if a textarea normalized CRLF; with a permitted wording edit, preserve the input's individual line-terminator sequence. Refuse changed line counts.

## Files and provenance

- `src/r19/file_io_boundary_r19.js`: standalone zero-dependency UMD module. No network, cloud model or user-data storage.
- `tests/test_r19_file_io_boundary.test.js`: Node regression and safety test matrix.
- `tests/fixtures/r19_file_io_boundary.html`: **evaluation harness only**, not a published customer-facing editor. Loads the new module from a relative `file://` path.
- `tests/test_r19_file_io_boundary.browser.py`: real native Chromium file upload/download, rejection state and stale read tests. It must navigate directly to the fixture's `file://` URL; no `setContent`, HTTP local server or policy bypass.

The GitHub Actions artifacts contain only synthetic counts/boolean evidence. The browser fixture uses `set_input_files`, which **is not a native OS file chooser cancellation test**. The new boundary module is not wired to frozen R17.2 or the archived original R19 HTML.

## Integration contract for the original Studio candidate

- Read and validate the original R2 public-source archive bytes before staging code. Do not reconstruct the Studio from a summary or overwrite current main with an older archive tree.
- Keep the original R19 files and all previous passing tests intact until separately verified. Prefer adapting its existing guard rather than replacing it wholesale.
- Atomic UI commit must use the boundary's `open(file)` result only after success; `reject(code)` must not revoke or clear a previously active editing session.
- Invoke `invalidate()` on any clear/restart/source edit or new file selection; protect stale **success, failure and finally** paths.
- Capture the exact original `Uint8Array` on import, and pass it together with the original text and reviewed text to `encodeReview` for download.
- No-edit output must be identical to input, byte for byte. With edits, the original newline-token count must be maintained. Report `LINE_ENDING_SHAPE_CHANGED` rather than guessing if structural edits alter line boundaries.
- R19's candidate grouping, 120-display/130-found partial coverage, per-occurrence decisions, source protection and genuine SubtleCrypto remain separate mandatory gates.

## Security and release limits

No new suite version, no tool registry change, no historic asset modification and no R19 product promotion are authorized by this PR. Suite 17.3.2 and all 28 registered tools remain unchanged. Integrating the complete Studio requires a separate public-only source candidate, the **unchanged native ten-scenario runner** in an authorized environment, and a properly versioned full-Suite release gate.

The independent R19 acceptance standard is tracked at [issue #47](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues/47). Human linguistic quality and user adoption are **NOT_MEASURED / NOT_COLLECTED**.

## Receipt checks are not execution provenance

The subsystem report checker is standard-library-only:

`python tests/test_r19_file_io_receipt.py --self-test`

`python tests/test_r19_file_io_receipt.py --report <synthetic-native-json>`

The current checker validates the fixture SHA256, expected metadata and result flags, byte/CR counts, version-string shape and `r19_full_studio_native_acceptance=NOT_RUN`. Its self-test exercises one synthetic positive case and 22 specific negative mutations. **Accepting a JSON document does not independently prove that Chromium ran.** In particular, `synthetic_good()` intentionally constructs an acceptable test document.

A real acceptance claim must additionally be traced to the exact source commit, runner and HTML digests, a specific CI run/attempt, actual browser output and download/screenshot artifact digests. A version string and declared zero errors or zero requests are not sufficient by themselves. The checker is a consistency guard, not a cryptographic attestation or a general forgery detector. This update clarifies the evidence boundary without changing the historical test code or its results.

## Portable GitHub Actions evaluation ZIP

After the synthetic Chromium check, CI creates a deterministic, CRC-checked source ZIP with an explicit LICENSE, exact per-file SHA256 manifest and the metadata-only browser receipt. This is an Actions artifact, not a GitHub Release or a complete R19 Studio package. The original R19 native ten-scenario gate remains NOT_RUN.

The subsystem archive name is `TLS_R19_FileIO_AB_Stage_Evaluation_R2_20261103.zip`; it is distinct from the 2026-11-06 complete Studio R2 archive. The source-sync JSON is a repository status index, not an additional product or a substitute for either archive.

## Pre-copy byte-length hardening and metadata parity (2026-11-03)

The research guard validates a buffer's `byteLength` **before cloning it**, avoiding an additional large allocation when a synthetic/file-like reader lies about size. It also checks that `file.size` equals the actual valid decoded byte length before invoking the only atomic UI `commit` callback. Oversized inputs retain `INPUT_LIMIT` priority; a smaller, inconsistent payload returns `FILE_SIZE_MISMATCH`. These are standalone subsystem controls, **not** a claim that the original R19 full UI is updated or natively accepted.

## Real-browser metadata-mismatch coverage

The synthetic `file://` Chromium suite intentionally instruments `File.arrayBuffer()` to return a payload one byte larger than `File.size`. It must receive `FILE_SIZE_MISMATCH` without destroying previously selected review decisions. This is an adversarial file-reader test, **not** a claim that native browser File objects ordinarily misreport sizes. Its success is required by the subsystem receipt checker. The complete original Studio still requires its own native acceptance.

## A/B staged import choice — evaluation only (2026-11-03)

The existing one-step `createImportGate.open(file)` remains unchanged. The optional `createStagedImportGate` supports a two-phase flow when unsaved work is present: `stage(file)` validates data without calling the editor's commit callback, then `accept(ticket)` applies only the current staged choice once. `cancel()` and `invalidate()` discard pending work while preserving previous source text and selections.

The synthetic HTML fixture offers Prepare, Accept and Cancel alongside its unchanged direct-import control. Its Chromium tests cover staged preservation, cancellation, explicit confirmation, stale choices and late file reads after Clear.

This does not replace the original R19 Studio, certify human first-use completion, test the operating system's native file chooser, or authorize full Suite publication. Real users' E1/E2/E3/D7 observations are not collected. All wording remains human-controlled.
