<!-- R17_SOURCE_DOC_SHA256:db0ce437003f701d5c891454a32f0fecf5ea1dcc8de66805ef7ba1b38f59bd83 -->

# R17 — Offline Document Trust Graph

> R17-P0 v0.1.0 · SHADOW / OFFLINE / NO SOURCE WRITE · HUMAN_TRANSLATION_REVIEW=PENDING

How to use: open the standalone HTML locally, select a folder, explicitly check the Markdown files you authorize, and run the audit. Unchecked files are not read.

PASS checks conservative local links/anchors; WARN indicates potential case mismatch; BLOCK indicates confirmed missing or unsafe paths; UNKNOWN means unchecked external links, unselected targets, or unsupported syntax. UNKNOWN is not success.

Use the optional Node CLI for real-path and symlink checks. Browser file selection is not an OS-level symlink security boundary. The exported report excludes source prose, but file hashes can still be guessable.

This is not translation, semantic review, license verification, a digital signature, or an editor. No network requests and no source-file writes. Only explicitly selected Markdown files are supported.

Human native-speaker review: NOT VERIFIED.

[Offline HTML](../examples/TW_Document_Trust_Graph_R17_20261026.html) · [CLI/Schema (zh-TW)](R17_DOCUMENT_TRUST_GRAPH.md) · [Third-party rights policy](THIRD_PARTY_RIGHTS_POLICY.md)
