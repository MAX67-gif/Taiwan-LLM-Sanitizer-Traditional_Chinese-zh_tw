# R19 R2 native acceptance — recorded candidate evidence and release limits

**Recorded candidate result: `NATIVE_10_SCENARIOS_VERIFIED_WITH_SCOPE`.** The unchanged original runner passed all ten scenarios on 2026-11-07. This record identifies that execution; final Suite 17.4.0 PR CI, main CI, complete packaging and publication verification remain separate required gates. See the [Suite integration contract](SUITE_17_4_0_RELEASE.md) and [release gates](RELEASE_GATE.md).

## Exact public source and tested revision

| Item | Recorded value |
| --- | --- |
| PR | [#54](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/pull/54) |
| Source head | `439041ceaae40f8c985d4c5ba3b34c37dcb61302` |
| Base | `ce5e4692c8dcc7e548f7665bc99e6762d616febc` — Suite 17.3.2, 28 registered tools |
| Actual checkout tested by Actions | `7fd1e85411ab1de8e1beac4f73799485e7c59050` — the PR test merge of the source head into that base |
| Run | [42377187266](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266), attempt 1, `pull_request`, `success` |
| Job | [browser-integration / 128417544368](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266/job/128417544368), `success` |
| Node / Node Playwright | `v22.23.4` / `1.55.0` |
| Browser / runner OS | Headless Chromium `140.0.7339.16` / GitHub hosted Ubuntu 24.04.5 |

The [original R19 HTML](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/blob/439041ceaae40f8c985d4c5ba3b34c37dcb61302/examples/TW_First_Result_Studio_R19_20261101.html) is 136,680 bytes, SHA256 `33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a`.

The [unchanged original runner](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/blob/439041ceaae40f8c985d4c5ba3b34c37dcb61302/tests/browser_first_result_studio_r19.cjs) has SHA256 `f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8`. The job checked builder parity and both source hashes immediately before execution. Seven frozen core, lexicon and showcase dependencies also retain their source bytes from the base.

The runner uses `pathToFileURL`, navigates to that actual local file URL and asserts the resulting URL. It uses native Playwright download events and reads the downloaded files to compare bytes. It does not substitute HTTP, `setContent`, an iframe test page or a modified runner. The pending-preview scenario delays delivery of selected real browser digests; it does not replace the digest result or the preview engine.

## Original Actions artifact

[TLS_R19_R2_ORIGINAL_NATIVE_10_SCENARIOS / artifact 13576341402](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/actions/runs/42377187266/artifacts/13576341402) contains four files. The uploaded ZIP is 1,578,464 bytes with SHA256 `c4213e356fed348368fe1a1e2213aedf64a3c291f3cb07eec6ce7d21a7e78ac7`; this matches the job upload log, GitHub artifact digest and downloaded ZIP. It is an Actions artifact subject to retention, not a permanent Release asset.

| File | Bytes | SHA256 |
| --- | ---: | --- |
| `R19_NATIVE_BROWSER_REPORT.json` | 1,532 | `1529daf0d54497234c8e509d960955059a3905294f8b68251a8cfe9c0df316c8` |
| `R19_NATIVE_VALIDATION_RECEIPT.json` | 1,133 | `8338ef49bfa545fabb37f9b127bee0087a6d24b36c998e63b1a0b85d24fe5487` |
| `R19_DESKTOP_NATIVE.png` | 905,205 | `9744c5340a259f57f00eb187210582dd9b12906a952fe74bae6fd141bcbb9694` |
| `R19_MOBILE_NATIVE.png` | 716,479 | `ff65b73a3ffb659d394fc3c7fdff69966d5c5e25423c67b97860772ad329eca6` |

The full-page PNG dimensions are 1365×4751 and 390×6443; the corresponding viewports were 1365×945 and 390×844. Independent inspection of the downloaded originals checked ZIP CRCs, all PNG chunk CRCs and successful image decoding. Those additional checks are separate from the original validator's limited PNG header checks.

There is no standalone SHA manifest or individual downloaded Markdown/proof JSON in this original artifact. The validation receipt records source, report and screenshot digests. Actual-download conclusions rely on the unchanged runner's assertions and successful execution log; the individual downloaded bytes cannot be rechecked from these four files alone.

## What passed

The original report contains exactly these ten scenario identifiers, in order, each with `status=PASS`:

1. `guided_first_result_and_keyboard`
2. `menu_context_preferences_and_separate_manual_decisions`
3. `cancel_and_bad_bytes_preserve_the_existing_result`
4. `CRLF_file_import_and_exact_native_download_bytes`
5. `130_detected_120_shown_stays_partial_after_all_visible_decisions`
6. `late_long_line_difference_is_visible_and_Unicode_safe`
7. `context_markup_is_inert_and_protected_content_is_preserved`
8. `pending_preview_generation_blocks_stale_results_errors_and_unlocks`
9. `390px_native_layout_and_keyboard_focus`
10. `no_page_errors_or_external_requests`

`external_request_count=0`, `external_requests=[]` and `page_errors=[]` apply to the observed test context and operations. An attempted external request counts as failure even if the runner aborts it. The external GitHub feedback link was not clicked.

## Validator and scope limits

The [original validator](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/blob/439041ceaae40f8c985d4c5ba3b34c37dcb61302/tests/validate_r19_native_receipt_r2.py) checks frozen source hashes, the complete report schema, ordered PASS scenarios, version fields and screenshot headers/dimensions. It does **not** run Chromium, authenticate a report's origin, bind it to a GitHub run or commit, decode PNG image data, or independently read the native downloads. Its `real_download_checks=RUNNER_SCENARIOS_PASS` field is derived from the runner report. The receipt must therefore be read together with the actual CI execution and original artifact, rather than treated as standalone proof of execution. Validator self-tests cover schema rejection and explicitly report `full_native=NOT_RUN`.

- `native_os_file_chooser_verified=false`: `setInputFiles` and an in-page cancel action do not exercise the operating-system file chooser or its cancel flow.
- A 390px Chromium viewport and limited keyboard checks do not establish real-device, cross-browser or complete accessibility coverage.
- Human operation testing, first-user completion (E1/E2/E3/D7), native-speaker naturalness, semantic equivalence and user adoption remain deferred or unmeasured.
- All test text is project-owned synthetic material. Successful automated scenarios do not certify arbitrary documents or future interaction sequences.

## Required gate for the Suite 17.4.0 candidate

The recorded evaluation ran R19 steps inside the existing `browser-integration` job; there was no separate R19 job. At that revision the steps were limited to the named PR branch, so a push run with those steps skipped is not native evidence.

The Suite 17.4.0 release contract requires the same original runner and validator to execute in that existing job for the final PR and again for main, without a branch-only skip condition, ignored errors or a replacement command. The central publisher must continue to depend on both `verify` and `browser-integration`. Only the final source, all required CI, complete Draft downloads and fresh post-publication downloads can establish release success. This earlier ten-scenario PASS does not establish those later results.
