# R19 R2 Native Acceptance Status — automated validation, not human usability

**Scope:** This Draft branch contains the exact 2026-11-06 R19 R2 standalone UI, builder/template, helper, original Node regressions and **unchanged original ten-scenario Chromium runner** from a SHA256-locked *public-only* archive. It does not contain private Project Brain, user documents, credentials, or older full archives.

- Base protected public main: `ce5e4692c8dcc7e548f7665bc99e6762d616febc` (Suite 17.3.2, 28 registered tools and 28 published assets).
- Original Task SHA256: `5ef57fa1522245de20a4e14dd2d6698a8c82af294ab1be13f8e8c8611ee9a18d` (not uploaded).
- Original R19 R2 HTML SHA256: `33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a`.
- Original runner SHA256: `f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8`.
- All seven frozen R17.2 / R16 / lexicon / showcase source Git blobs were re-compared byte-for-byte to this branch's protected main before integration.
- Original source hashes are checked on CI; no modified runner, local HTTP server, `setContent`, disabled browser policies or fake native proof.
- New R19-native CI job is **PR-only**, not a release publisher; Node Playwright 1.55.0 and matching Chromium are installed on the authorized GitHub Actions runner.
- **Human operation testing, first-user completion (E1/E2/E3/D7), naturalness and user adoption are deferred** at maintainer request. Automated synthetic Chromium evidence does not establish those.
- **NO_MERGE / NO_PROMOTION / NO_NEW_SUITE** until real native ten-scenario PASS and separately reviewed full-Suite versioning, immutable release-asset staging and post-publish verification. Full product release is *not* authorized by this PR.
- Independent intake safety guard remains in Draft PR #52; separate staged file-I/O research in Draft PR #50. Neither is silently merged into this candidate.
