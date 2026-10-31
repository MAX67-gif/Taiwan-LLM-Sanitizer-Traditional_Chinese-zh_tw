"""R17.8 B0 exact historical-retirement and current-suite read-only release gate.

Only release *metadata*; no user text, no binary download, no mutation.
Never treats withdrawn v17.1/v17.2 combined packages as a failed current release.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

REPO = "MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"
CURRENT_TAG = "all-tools-suite-v17.3.0"
LATEST_SOURCE_SHA = "b5e1bf0ae7ad63c0e564815d7f0b921187889e2a"
RELEASES = (
    ("all-tools-suite-v17.1.0", "9dcea69bc6357a01e2eb2a60b9da6a9efade9539", 24),
    ("all-tools-suite-v17.2.0", "a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4", 25),
    (CURRENT_TAG, LATEST_SOURCE_SHA, 28),
)
WITHDRAWN = frozenset({
    "TLS_ALL_TOOLS_SUITE_17_1_0.zip",
    "TLS_DEVELOPER_CLI_SKILL_17_1_0.zip",
    "TLS_ALL_TOOLS_SUITE_17_2_0.zip",
    "TLS_DEVELOPER_CLI_SKILL_17_2_0.zip",
})
CURRENT_REQUIRED = frozenset({
    "TLS_ALL_TOOLS_SUITE_17_3_0.zip",
    "TLS_DEVELOPER_CLI_SKILL_17_3_0.zip",
    "TW_Wording_Assistant_R172_20261027.html",
    "TLS_Chrome_MV3_MRFT_R177_20261031.zip",
    "ALL_TOOLS_MANIFEST.json",
    "VALIDATION.json",
    "SHA256SUMS.txt",
})
STANDARD_REQUIRED = frozenset({"ALL_TOOLS_MANIFEST.json", "VALIDATION.json", "SHA256SUMS.txt"})
R172_REQUIRED = frozenset({"TW_Wording_Assistant_R172_20261027.html"})

def validate_release_metadata(obj, tag, sha, count):
    if not isinstance(obj, dict) or obj.get("tagName") != tag:
        raise ValueError("RELEASE_TAG_IDENTITY:" + tag)
    if obj.get("targetCommitish") != sha or obj.get("isDraft") is not False:
        raise ValueError("RELEASE_SOURCE_OR_DRAFT:" + tag)
    assets = obj.get("assets")
    if not isinstance(assets, list) or len(assets) != count:
        raise ValueError("RELEASE_ASSET_COUNT:" + tag)
    names = [a.get("name") if isinstance(a, dict) else None for a in assets]
    if any(not isinstance(n, str) or not n for n in names) or len(names) != len(set(names)):
        raise ValueError("RELEASE_ASSET_DUPLICATE_OR_EMPTY:" + tag)
    name_set = set(names)
    if name_set & WITHDRAWN:
        raise ValueError("WITHDRAWN_LEGACY_ASSET_REAPPEARED:" + tag)
    required = CURRENT_REQUIRED if tag == CURRENT_TAG else STANDARD_REQUIRED
    if tag == "all-tools-suite-v17.2.0":
        required = required | R172_REQUIRED
    if not required <= name_set:
        raise ValueError("RELEASE_ASSET_MISSING:" + tag)
    return {"tag": tag, "source_sha": sha, "assets_remaining": count, "withdrawn_packages_present": 0}

def validate_three(releases):
    if not isinstance(releases, (list, tuple)) or len(releases) != len(RELEASES):
        raise ValueError("RELEASE_INPUT_COUNT")
    return [validate_release_metadata(obj, *spec) for obj, spec in zip(releases, RELEASES)]

def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--r171-json", type=Path, required=True)
    parser.add_argument("--r172-json", type=Path, required=True)
    parser.add_argument("--r173-json", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    opts = parser.parse_args(argv)
    inputs = [json.loads(p.read_text(encoding="utf-8")) for p in
              (opts.r171_json, opts.r172_json, opts.r173_json)]
    rows = validate_three(inputs)
    receipt = {"schema": "tls.r178-b0.read-only-release-retirement.v1",
               "status": "PASS",
               "latest_verified_tag": CURRENT_TAG,
               "latest_product_source_sha": LATEST_SOURCE_SHA,
               "releases": rows,
               "new_release_created": False,
               "release_asset_modified": False,
               "verified_scope": "GitHub Release metadata (not a fresh binary download)",
               "git_ancestor_history_purged": False}
    opts.receipt.parent.mkdir(parents=True, exist_ok=True)
    opts.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("R178_B0_HISTORICAL_WITHDRAWAL_AND_LATEST_SUITE_METADATA_PASS")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print("R178_B0_READONLY_RELEASE_CHECK_FAILED:", str(exc))
        raise SystemExit(2)
