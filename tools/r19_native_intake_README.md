# R19 R2 source intake — read-only validation, NOT native execution

This helper checks the exact archived R19 R2 Task, nested source, HTML and unchanged native runner identities before a cloud operator considers any execution. It never extracts files, executes the runner, uploads user documents, or grants release permission.

The original 10-scenario browser suite is separate. A green unit test for this helper must not be reported as a green R19 native test. Missing input is BLOCKED / INPUT_MISSING; wrong input is REJECTED; matching input is VERIFIED / IDENTITY_VERIFIED_NATIVE_NOT_RUN. Every output retains native_status=NOT_RUN and promotion=NONE.

This Draft is separate from the file-I/O subsystem PR. It does not change Suite 17.3.2, the 28 registered tools, frozen R17.2 files, or original R19 source. Do not upload cumulative archives or conversation records into the public repository.

Tests use newly created synthetic ZIPs with distinct test-only contracts. They do not validate the actual archived R19 Task unless its original bytes are supplied. Official CLI checks must use the hard-coded R2 contract, not a command-line replacement digest.

The deliberately failing RED checkpoint is preserved as an earlier commit. The current candidate implements a read-only validator; its newest CI results must be checked separately.

## Implemented intake and result contract

The verifier now checks the pinned Task SHA256 and size, safe ZIP paths,
member size/count bounds, CRCs, nested Source ZIP identity, original HTML
and unchanged native runner SHA. It does not extract or execute archive bytes.

An authorized cloud CI runner can use:

    python tools/r19_native_intake.py --task native-input/R19_R2_TASK.zip

Only the hard-coded OFFICIAL contract is accepted by this CLI. Synthetic
unit fixtures cannot override the official reference digest.

- Missing archive: BLOCKED / INPUT_MISSING (exit code 2).
- Invalid or altered archive: REJECTED with bounded reason (exit code 3).
- Exact archive identity: VERIFIED / IDENTITY_VERIFIED_NATIVE_NOT_RUN (exit code 0).

No result ever grants a native ten-scenario PASS, release permission, or
human translation-quality claim. No filename, raw text or private paths
are printed in the receipt. Keep official Playwright 1.55 acceptance separate.
