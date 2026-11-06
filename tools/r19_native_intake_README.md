# R19 R2 source intake — read-only validation, NOT native execution

This helper checks the exact archived R19 R2 Task, nested source, HTML and unchanged native runner identities before a cloud operator considers any execution. It never extracts files, executes the runner, uploads user documents, or grants release permission.

The original 10-scenario browser suite is separate. A green unit test for this helper must not be reported as a green R19 native test. Missing input is BLOCKED / INPUT_MISSING; wrong input is REJECTED; matching input is VERIFIED / IDENTITY_VERIFIED_NATIVE_NOT_RUN. Every output retains native_status=NOT_RUN and promotion=NONE.

This Draft is separate from the file-I/O subsystem PR. It does not change Suite 17.3.2, the 28 registered tools, frozen R17.2 files, or original R19 source. Do not upload cumulative archives or conversation records into the public repository.

Tests use newly created synthetic ZIPs with distinct test-only contracts. They do not validate the actual archived R19 Task unless its original bytes are supplied. Official CLI checks must use the hard-coded R2 contract, not a command-line replacement digest.

This commit is a deliberate test-first RED checkpoint. Implementation and genuine result receipts follow separately; no successful validation is claimed yet.
