"""R193: read-only, exact published Suite 17.4.0 GitHub metadata + tag guard.

This is NOT a fresh byte download, a new Release, or linguistic-quality proof.
The caller acquires only the public GitHub release and git-ref JSON with GH CLI.
A misdirected tag, missing asset, changed digest or nonpublished state fails closed.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPOSITORY = "MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"
EXPECTED_RELEASE_TAG = "all-tools-suite-v17.4.0"
EXPECTED_RELEASE_ID = 437658284
EXPECTED_COMMIT = "92924ba947c1a5dd14ad79b8937f0f9aa9c23de0"
EXPECTED_PUBLISHED_AT = "2026-11-07T15:25:58Z"
EXPECTED_ASSETS = {
  "ALL_TOOLS_MANIFEST.json": {
    "bytes": 47149,
    "sha256": "sha256:5a71ef81880cf75012f7d27584ebd1c91032f46df40d59e5498d420f84235797"
  },
  "BUILD_PROVENANCE.json": {
    "bytes": 729,
    "sha256": "sha256:47c2aa32a8d6a595464c8be51d16032023fb1e8871cb8d5c99d51b7919211d42"
  },
  "SHA256SUMS.txt": {
    "bytes": 2899,
    "sha256": "sha256:92fa39df641690814a394a36e09010e38fd96ed8a9419ed676dd62a87bf5c59e"
  },
  "TLS_ALL_TOOLS_SUITE_17_4_0.zip": {
    "bytes": 3469158,
    "sha256": "sha256:421368ab718528bc23e79b49f158a332f86cd62c03031057c992f5f7bb4ebb75"
  },
  "TLS_Chrome_MV3_MRFT_R177_20261031.zip": {
    "bytes": 25728,
    "sha256": "sha256:5cf0023f26a990bc0c8d0eef499f9bad843d4257e76a1615a033a7bacab973c7"
  },
  "TLS_Chrome_MV3_R11_20261025.zip": {
    "bytes": 34141,
    "sha256": "sha256:9ed34dda59e83af35c34f35b61373c7f4057d02cf094ccb50cc46a809733bec8"
  },
  "TLS_Chrome_MV3_R13_20261025.zip": {
    "bytes": 8820,
    "sha256": "sha256:9543af63e4d1cb0fd33f5f73be1c5a3b48dfc05c41f267c205470b763237439d"
  },
  "TLS_Chrome_MV3_R5_20261024.zip": {
    "bytes": 25930,
    "sha256": "sha256:0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5"
  },
  "TLS_DEVELOPER_CLI_SKILL_17_4_0.zip": {
    "bytes": 3043737,
    "sha256": "sha256:0c271e62db5c4c9da3bf6e1570268a6ba14ab0132c5d1323cd85fb54068dacb3"
  },
  "TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip": {
    "bytes": 50142,
    "sha256": "sha256:2d216971eb01b9f982fd7ccb38c0b2070cf1e3da44e4e4bdfcdbc55577b6f92b"
  },
  "TLS_Tampermonkey_R11_20261025.user.js": {
    "bytes": 75566,
    "sha256": "sha256:4b6e87414557c4309847414fff00c610e7b6fb46691d456e3ad22ad6bdb98aea"
  },
  "TLS_Tampermonkey_R13_20261025.user.js": {
    "bytes": 12879,
    "sha256": "sha256:49aefa62d068a78e022bac4ac2216f918510523783351aa6fbd8fa8895bfaf58"
  },
  "TLS_Tampermonkey_R5_20261024.user.js": {
    "bytes": 57728,
    "sha256": "sha256:70c3b575cd0bfc1b34e7f3c95f7b2ac66cfc6eef94531f79aa90d81b0dc425aa"
  },
  "TW_Context_Governance_Lab_R10_20261024.html": {
    "bytes": 43484,
    "sha256": "sha256:baed42203991bd51f94300271964840ad5260a2264655a39888f1260ee4ec24e"
  },
  "TW_Context_Review_Lab_R8_20261024.html": {
    "bytes": 125820,
    "sha256": "sha256:96a437720b3c11fc694f37cf5f9650cbc72f3c27f7a0dd9d2794649648c1e999"
  },
  "TW_Document_Trust_Graph_R17_20261026.html": {
    "bytes": 46034,
    "sha256": "sha256:b2a244ed73a3317e30b5c6419160257c0a592de1b2b1b80c1a55943b0dbadd76"
  },
  "TW_First_Result_Studio_R19_20261101.html": {
    "bytes": 136680,
    "sha256": "sha256:33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a"
  },
  "TW_Lexicon_Explorer_R3_20261024.html": {
    "bytes": 114824,
    "sha256": "sha256:ccd5b5a1ff9d2480525b3beab76429fa2b1c1844555d6e136f2d5f9769c5cef7"
  },
  "TW_Localization_Safety_Studio_R16_20261026.html": {
    "bytes": 45334,
    "sha256": "sha256:deaff10d036e628e30e5a2149747ef4e3f1d9a2b49eb98f828b8ccaebc50b47d"
  },
  "TW_Provider_Capability_Lab_R14_20261025.html": {
    "bytes": 14780,
    "sha256": "sha256:79061ecbc7a529936449b75433c4fc336099b4884eca88ab2b8f950070246a5e"
  },
  "TW_Quality_Audit_Lab_R12_20261025.html": {
    "bytes": 35850,
    "sha256": "sha256:e3b1663a7ea9979f09cbf85cc2d1dc4bc6b2c71b25b6cca5eaea2cd52996b0e0"
  },
  "TW_R6_Bilingual_Quality_Review_20261024.html": {
    "bytes": 22252,
    "sha256": "sha256:953510e36720f6c0bc56268077a2ba5dbad1404b2e8f98e0d44b766c2533dbb3"
  },
  "TW_R6_Local_Chrome_Model_Run_20261024.html": {
    "bytes": 13134,
    "sha256": "sha256:c07f045c63e632add6d5d09954a832db13c3cc35325ff684c20707c8b00d6281"
  },
  "TW_Structured_Integrity_Lab_R15_20261025.html": {
    "bytes": 33275,
    "sha256": "sha256:214790a4a8b37c9026f65c05072e80d36d43c4110ac3743b399f6a57e6f9c0e2"
  },
  "TW_Structured_Integrity_Lab_R151_20261026.html": {
    "bytes": 37627,
    "sha256": "sha256:e71c12d2bdc5f645443b8532fede66b7496b9ee5165e16ca74ee796c28417743"
  },
  "TW_Translation_Style_Lab_R3_20261024.html": {
    "bytes": 8983,
    "sha256": "sha256:f893271798073d430e1811350a092e70e2dc1effe976a91dfb8a5df20f345236"
  },
  "TW_User_Context_Lab_R9_20261024.html": {
    "bytes": 151902,
    "sha256": "sha256:fd4296de0bb231d96961ffbc00a087ded7fb3451ac3234cc11988539d1a6e138"
  },
  "TW_Wording_Assistant_R172_20261027.html": {
    "bytes": 86863,
    "sha256": "sha256:4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873"
  },
  "VALIDATION.json": {
    "bytes": 1077,
    "sha256": "sha256:3a37684deaac04c01f7ed5c6ef2d725929a2b80d9afe41c0dc1589d5e01704b6"
  }
}

class SnapshotRejected(ValueError):
    """Only public identity/metadata mismatch details are reported."""


def require(condition, reason):
    if not condition:
        raise SnapshotRejected(reason)


def strict_json(path: Path):
    require(path.is_file() and not path.is_symlink(), "INPUT_NOT_REGULAR")
    require(path.stat().st_size <= 800_000, "INPUT_TOO_LARGE")
    def reject_duplicates(pairs):
        out = {}
        for key, value in pairs:
            require(key not in out, "DUPLICATE_JSON_KEY")
            out[key] = value
        return out
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicates)


def verify_snapshot(release, tag_ref):
    require(isinstance(release, dict), "RELEASE_RESPONSE_BAD_TYPE")
    require(isinstance(tag_ref, dict), "TAG_REF_RESPONSE_BAD_TYPE")
    root = "https://github.com/" + REPOSITORY
    api = "https://api.github.com/repos/" + REPOSITORY
    require(release.get("id") == EXPECTED_RELEASE_ID and type(release.get("id")) is int,
            "RELEASE_ID_MISMATCH")
    require(release.get("tag_name") == EXPECTED_RELEASE_TAG, "RELEASE_TAG_MISMATCH")
    require(release.get("target_commitish") == EXPECTED_COMMIT, "RELEASE_TARGET_CHANGED")
    require(release.get("published_at") == EXPECTED_PUBLISHED_AT,
            "RELEASE_PUBLICATION_IDENTITY_CHANGED")
    require(release.get("draft") is False and release.get("prerelease") is False,
            "RELEASE_NOT_PUBLISHED_STABLE")
    require(release.get("html_url") == root + "/releases/tag/" + EXPECTED_RELEASE_TAG,
            "RELEASE_URL_MISMATCH")
    require(tag_ref.get("ref") == "refs/tags/" + EXPECTED_RELEASE_TAG,
            "TAG_REF_NAME_MISMATCH")
    ref_obj = tag_ref.get("object")
    require(isinstance(ref_obj, dict) and ref_obj.get("type") == "commit"
            and ref_obj.get("sha") == EXPECTED_COMMIT,
            "GIT_TAG_MOVED_OR_UNEXPECTED_TYPE")
    require(tag_ref.get("url") == api + "/git/refs/tags/" + EXPECTED_RELEASE_TAG,
            "TAG_REF_URL_MISMATCH")
    assets = release.get("assets")
    require(isinstance(assets, list) and len(assets) == 29, "ASSET_COUNT_MISMATCH")
    got = {}
    seen_ids = set()
    for item in assets:
        require(isinstance(item, dict), "ASSET_ROW_INVALID")
        name = item.get("name")
        require(isinstance(name, str) and name in EXPECTED_ASSETS and name not in got,
                "ASSET_NAME_MISSING_DUPLICATE_OR_EXTRA")
        require(item.get("state") == "uploaded", "ASSET_NOT_UPLOADED:" + name)
        asset_id = item.get("id")
        require(type(asset_id) is int and asset_id > 0 and asset_id not in seen_ids,
                "ASSET_ID_REUSED_OR_INVALID")
        seen_ids.add(asset_id)
        require(item.get("url") == api + "/releases/assets/" + str(asset_id),
                "ASSET_API_URL_UNBOUND:" + name)
        require(item.get("browser_download_url") ==
                root + "/releases/download/" + EXPECTED_RELEASE_TAG + "/" + name,
                "ASSET_DOWNLOAD_URL_CHANGED:" + name)
        expected = EXPECTED_ASSETS[name]
        require(type(item.get("size")) is int and item["size"] == expected["bytes"],
                "ASSET_SIZE_CHANGED:" + name)
        require(item.get("digest") == expected["sha256"],
                "ASSET_DIGEST_CHANGED:" + name)
        got[name] = True
    require(set(got) == set(EXPECTED_ASSETS), "ASSET_INVENTORY_MISMATCH")
    require(EXPECTED_ASSETS["TW_First_Result_Studio_R19_20261101.html"]["sha256"] ==
            "sha256:33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a",
            "R19_FROZEN_HTML_PIN_MISMATCH")
    return {
        "schema": "tls.r193.published-release-snapshot.v1",
        "state": "PASS_METADATA_ONLY",
        "release_tag": EXPECTED_RELEASE_TAG,
        "release_id": EXPECTED_RELEASE_ID,
        "release_target_git_sha": EXPECTED_COMMIT,
        "tag_ref_sha": ref_obj["sha"],
        "asset_count": 29,
        "asset_names_sizes_digests": "ALL_29_EXACT_PINS_PASS",
        "original_r19_html_sha256": EXPECTED_ASSETS["TW_First_Result_Studio_R19_20261101.html"]["sha256"],
        "fresh_asset_byte_download_verification": "NOT_PERFORMED",
        "runtime_or_linguistic_quality_verified_here": False,
        "new_release_created": False,
        "release_modified": False,
    }


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--release-json", type=Path, required=True)
    ap.add_argument("--tag-ref-json", type=Path, required=True)
    ap.add_argument("--receipt", type=Path, required=True)
    args = ap.parse_args(argv)
    receipt = verify_snapshot(strict_json(args.release_json),
                              strict_json(args.tag_ref_json))
    require(not args.receipt.is_symlink(), "RECEIPT_SYMLINK_REJECTED")
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
    print("R193_CURRENT_SUITE_1740_METADATA_AND_TAG_EXACT_PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print("R193_SNAPSHOT_REJECTED", type(exc).__name__, str(exc)[:130], file=sys.stderr)
        raise SystemExit(2)
