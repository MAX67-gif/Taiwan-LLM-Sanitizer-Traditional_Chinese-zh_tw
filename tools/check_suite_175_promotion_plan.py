#!/usr/bin/env python3
"""R195 read-only next-Suite promotion preflight; NEVER publishes or merges.

The existing 17.4.0 builder/validator/publisher are immutable in this PR.
This tool verifies a proposed *additive* 30th tool against independent frozen
17.4.0 pins, but does NOT build/validate/publish a real 17.5.0 full Suite.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import build_all_tools_release as B
import verify_release_snapshot_r193 as R193

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "release/candidates/suite_175_r19_r3_proposal.json"
LEGACY_REGISTRY = ROOT / "release/all_tools_registry.json"
R2_SOURCE = ROOT / "examples/TW_First_Result_Studio_R19_20261101.html"
R3_SOURCE = ROOT / "examples/TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html"
R2_SHA256 = "33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a"
R3_SHA256 = "e0e9f895d01e75cac43a3bcd1a8312b2a5b39f74eb92b366508e98c92a40fed1"
R3_ORIGINAL_COMMIT = "840b53bbb0d42920fb51aa545c3ad4506043821f"
EXPECTED_NEW_TOOL_ID = "tls.html.tw-first-result-studio-r19-r3-20261113"
EXPECTED_NEW_FILE = R3_SOURCE.name

class NotPromotable(ValueError):
    """Never treat a proposal as production evidence."""


def require(ok: bool, reason: str):
    if not ok:
        raise NotPromotable(reason)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def exact_keys(obj, keys, code):
    require(type(obj) is dict and set(obj) == set(keys), code)


def safe_json(path: Path):
    require(path.is_file() and not path.is_symlink() and path.stat().st_size < 100_000,
            "PROPOSAL_MISSING_OR_TOO_LARGE")
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "DUPLICATE_JSON_KEY")
            result[key] = value
        return result
    return json.loads(path.read_text("utf-8"), object_pairs_hook=pairs)


def legacy_identity():
    # Independent builder pins each historical tool and six-language catalog;
    # a deleted/retagged/rehashed old tool is not quietly reinterpreted as new.
    reg = B.strict_json(LEGACY_REGISTRY.read_bytes(), "legacy_registry")
    B.validate_registry(reg, False)
    require(reg["release_tag"] == R193.EXPECTED_RELEASE_TAG,
            "OLD_RELEASE_RETAGGED")
    require(len(reg["tools"]) == 29 and len(R193.EXPECTED_ASSETS) == 29,
            "OLD_ASSET_OR_TOOL_COUNT_DRIFT")
    require(R193.EXPECTED_ASSETS["TLS_ALL_TOOLS_SUITE_17_4_0.zip"]["sha256"] ==
            "sha256:421368ab718528bc23e79b49f158a332f86cd62c03031057c992f5f7bb4ebb75",
            "OLD_SUITE_SHA_DRIFT")
    require(R2_SOURCE.is_file() and not R2_SOURCE.is_symlink()
            and sha(R2_SOURCE.read_bytes()) == R2_SHA256,
            "OLD_R19_R2_SOURCE_DRIFT")
    return reg


def validate(proposal: dict, *, sources: bool = True):
    old = legacy_identity()
    exact_keys(proposal, (
        "schema", "research_status", "publication_permission", "merge_permission",
        "baseline", "proposed", "evidence_boundary"), "CONTRACT_KEYS")
    for field, value in (
        ("schema", "tls.suite-next-engineering-contract.v1"),
        ("research_status", "SCHEMA_PROPOSAL_ONLY_NOT_A_RELEASE"),
        ("publication_permission", "NONE"), ("merge_permission", "NONE")):
        require(proposal.get(field) == value, "PREMATURE_PROMOTION_" + field.upper())
    baseline = proposal["baseline"]
    exact_keys(baseline, (
        "release_tag", "suite_version", "main_release_source_sha",
        "published_zip_sha256", "existing_tool_count", "standalone_count",
        "release_asset_count", "registry_source", "existing_tool_ids"),
        "BASELINE_KEYS")
    expected_base = {
        "release_tag": R193.EXPECTED_RELEASE_TAG,
        "suite_version": "17.4.0",
        "main_release_source_sha": R193.EXPECTED_COMMIT,
        "published_zip_sha256": "421368ab718528bc23e79b49f158a332f86cd62c03031057c992f5f7bb4ebb75",
        "existing_tool_count": 29, "standalone_count": 24, "release_asset_count": 29,
        "registry_source": "release/all_tools_registry.json",
        "existing_tool_ids": [t["tool_id"] for t in old["tools"]],
    }
    require(baseline == expected_base, "BASELINE_RELEASE_OR_MONOTONIC_TOOL_IDS_CHANGED")
    proposed = proposal["proposed"]
    exact_keys(proposed, (
        "suite_version", "release_tag", "expected_tool_count",
        "expected_standalone_count", "expected_release_asset_count", "locales",
        "excluded_rights_withdrawn", "new_tool"), "PROPOSED_FIELDS")
    require(proposed["suite_version"] == "17.5.0"
            and proposed["release_tag"] == "all-tools-suite-v17.5.0"
            and proposed["release_tag"] not in (old["release_tag"], "all-tools-suite-v17.3.0"),
            "NEW_TAG_MUST_BE_UNIQUE")
    require(type(proposed["expected_tool_count"]) is int and
            proposed["expected_tool_count"] == 30 and
            type(proposed["expected_standalone_count"]) is int and
            proposed["expected_standalone_count"] == 25 and
            type(proposed["expected_release_asset_count"]) is int and
            proposed["expected_release_asset_count"] == 30,
            "NEXT_COUNTS_NOT_ADDITIVE")
    require(proposed["locales"] == old["locales"] and
            proposed["excluded_rights_withdrawn"] == old["excluded_rights_withdrawn"],
            "LOCALES_OR_RIGHTS_EXCLUSIONS_CHANGED")
    row = proposed["new_tool"]
    exact_keys(row, (
        "tool_id", "family", "status", "tool_version", "artifact_filename",
        "source_kind", "source_path", "package_subdir", "rights_review",
        "license_review", "last_verified_at_utc", "standalone_required",
        "original_tag", "original_commit_sha", "expected_sha256",
        "build_command_or_reuse_reason", "changelog_ref"), "NEW_TOOL_FIELDS")
    pinned = {
        "tool_id": EXPECTED_NEW_TOOL_ID,
        "family": "offline_html", "status": "PREVIEW",
        "tool_version": "R19 R3 engineering candidate, no human quality verification",
        "artifact_filename": EXPECTED_NEW_FILE,
        "source_kind": "git_source",
        "source_path": "examples/" + EXPECTED_NEW_FILE,
        "package_subdir": "html",
        "rights_review": "PUBLIC_ORIGINAL_CHECKED_NO_GAME_SPECIFIC",
        "license_review": "MIT_ORIGINAL_PUBLIC",
        "last_verified_at_utc": "2026-11-13T07:36:26Z",
        "standalone_required": True,
        "original_tag": None, "original_commit_sha": R3_ORIGINAL_COMMIT,
        "expected_sha256": R3_SHA256,
        "build_command_or_reuse_reason":
            "R19 R3 independent file:// candidate + native 9/9 PASS and receipt, not authorized for release",
        "changelog_ref": "src/r19/R3_CANDIDATE_README.md",
    }
    require(row == pinned, "NEW_CANDIDATE_SOURCE_RIGHTS_OR_HASH_DRIFT")
    old_ids = set(baseline["existing_tool_ids"])
    require(len(old_ids) == 29 and row["tool_id"] not in old_ids,
            "NEW_TOOL_COLLISION_OR_OLD_ID_DUPLICATE")
    require(row["artifact_filename"] not in
            {item["artifact_filename"] for item in old["tools"]},
            "OLD_ARTIFACT_OVERWRITE")
    proof = proposal["evidence_boundary"]
    exact_keys(proof, (
        "human_translation_quality", "adoption", "os_native_file_chooser_cancel",
        "node_regression", "original_r19_r2_native", "r19_r3_native",
        "prior_release_assets", "future_fresh_asset_downloads", "future_new_release"),
        "EVIDENCE_BOUNDARY_FIELDS")
    require(proof == {
        "human_translation_quality": "NOT_MEASURED",
        "adoption": "NOT_MEASURED",
        "os_native_file_chooser_cancel": "NOT_TESTED",
        "node_regression": "CI_OWNED",
        "original_r19_r2_native": "CI_OWNED_10_SCENARIOS",
        "r19_r3_native": "CI_OWNED_9_SCENARIOS",
        "prior_release_assets": "EXTERNAL_17_4_PINNED_METADATA_ONLY",
        "future_fresh_asset_downloads": "NOT_RUN",
        "future_new_release": "NOT_CREATED",
    }, "UNSUPPORTED_EVIDENCE_OR_RELEASE_CLAIM")
    if sources:
        require(R3_SOURCE.is_file() and not R3_SOURCE.is_symlink()
                and sha(R3_SOURCE.read_bytes()) == R3_SHA256,
                "NEW_CANDIDATE_HTML_DRIFT")
        html = R3_SOURCE.read_text("utf-8")
        require("<title>Taiwan Localization Studio R19 R3" in html and
                "connect-src 'none'" in html and "default-src 'none'" in html and
                "R19 R3" in html, "NEW_HTML_NOT_OFFLINE_CANDIDATE")
    return {
        "schema": "tls.suite-next-preflight-receipt.v1",
        "status": "CONTRACT_ONLY_STRUCTURAL_PASS_NO_RELEASE",
        "baseline_release": "all-tools-suite-v17.4.0",
        "future_tag_proposed": "all-tools-suite-v17.5.0",
        "baseline_tools_retained": 29, "future_tools_planned": 30,
        "future_standalone_assets_planned": 25,
        "future_release_assets_planned": 30,
        "r19_r2_sha256": R2_SHA256, "r19_r3_sha256": R3_SHA256,
        "old_registry_independently_pinned": True,
        "old_17_4_asset_metadata_count": 29,
        "released_new_binary_files": 0,
        "publisher_invoked": False,
        "future_full_suite_built": False,
        "future_draft_re_downloaded": False,
        "future_public_re_downloaded": False,
        "human_quality_measured": False, "os_chooser_cancel_measured": False,
        "publication_permission": "NONE", "merge_permission": "NONE",
    }


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args(argv)
    require(args.check, "CHECK_ONLY_NO_PUBLISH")
    plan = safe_json(CONTRACT)
    result = validate(plan, sources=True)
    # Byte parity is separately checked for every PR/CI from the real builder.
    # This read-only preflight never invokes any release/network command.
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("TLS_R195_SUITE_NEXT_29_PLUS_1_CONTRACT_PASS_NO_RELEASE")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print("TLS_R195_SUITE_NEXT_BLOCKED", type(exc).__name__, str(exc)[:160],
              file=sys.stderr)
        raise SystemExit(2)
