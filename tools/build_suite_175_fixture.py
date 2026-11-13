#!/usr/bin/env python3
"""Suite 17.5.0 *fixture-only* full 30-tool archive builder.

This builder accepts ONLY an already-validated 17.4.0 synthetic test fixture.
It explicitly cannot produce official shipping bytes, fetch Releases or publish.
The distinct 17.5.0 archive proves future 30-tool layout and missing-asset gates.
Do not use this as the production Suite 17.5.0 builder or release receipt.
"""
from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import build_all_tools_release as Legacy
import check_all_tools_release as OldCheck
import check_suite_175_promotion_plan as Plan
import render_suite_175_registry_preview as Preview

SUITE_FILENAME = "TLS_ALL_TOOLS_SUITE_17_5_0_FIXTURE_NOT_RELEASED.zip"
DEVELOPER_BUNDLE = "TLS_DEVELOPER_CLI_SKILL_17_5_0_FIXTURE_NOT_RELEASED.zip"
PACKAGE_FILES = ("ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json",
                 "VALIDATION.json", "SHA256SUMS.txt", SUITE_FILENAME)
EXCLUDED_OLD = set(Legacy.HEADER_FILES) | {
    "VALIDATION.json", "SHA256SUMS.txt", Legacy.SUITE_FILENAME,
    Legacy.DEVELOPER_BUNDLE,
}
NEW_NAME = "TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html"
FULL_SUITE_COUNT = 30
STANDALONE_COUNT = 25
GITHUB_ASSET_COUNT = 30


class FixtureRejected(ValueError):
    pass


def require(ok, reason):
    if not ok:
        raise FixtureRejected(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_file(p: Path, root: Path) -> bytes:
    require(p.is_file() and not p.is_symlink(), "FIXTURE_FILE_MISSING_OR_SYMLINK")
    return Legacy.safe_file(p, root)


def load_json(raw, name):
    return Legacy.strict_json(raw, name)


def stage_guard(old_stage: Path, out: Path):
    require(old_stage.is_dir() and not old_stage.is_symlink(), "OLD_STAGE_INVALID")
    require(not out.is_symlink() and
            (not out.exists() or (out.is_dir() and not any(out.iterdir()))),
            "NEW_STAGE_NOT_EMPTY")
    require(old_stage.resolve() != out.resolve() and
            not out.resolve().is_relative_to(Legacy.ROOT.resolve()),
            "OUTPUT_INSIDE_SOURCE_OR_OLD_STAGE")


def prepare_fixture(old_stage: Path, out: Path,
                    old_fixture_registry: Path) -> dict:
    """Verify old exact fixture first, and only then build an isolated new ZIP."""
    stage_guard(old_stage, out)
    # Existing 17.4 checker rejects partial old staged assets and non-test metadata.
    old_verified = OldCheck.verify_stage(
        old_stage, old_fixture_registry, fixture_ok=True)
    require(old_verified.get("tools") == 29 and
            old_verified.get("github_assets_expected") == 29,
            "OLD_17_4_FIXTURE_NOT_VERIFIED")
    plan = Plan.safe_json(Plan.CONTRACT)
    Plan.validate(plan, sources=True)
    preview = Preview.render(plan)
    new_rows = preview["tools"]
    require(len(new_rows) == FULL_SUITE_COUNT and
            new_rows[:29] == Plan.legacy_identity()["tools"],
            "HISTORICAL_29_ROWS_NOT_EXACT")
    require(new_rows[-1]["expected_sha256"] == Plan.R3_SHA256 and
            new_rows[-1]["artifact_filename"] == NEW_NAME,
            "NEW_R3_SOURCE_IDENTITY_CHANGED")
    old_names = {p.name for p in old_stage.iterdir()}
    old_assets = {p.name: safe_file(p, old_stage) for p in old_stage.iterdir()}
    require(set(EXCLUDED_OLD).issubset(old_names), "OLD_STAGE_REQUIRED_FILES_MISSING")
    assets = {name: contents for name, contents in old_assets.items()
              if name not in EXCLUDED_OLD}
    require(len(assets) == 23, "OLD_STANDALONE_INVENTORY_NOT_23")
    developer = old_assets[Legacy.DEVELOPER_BUNDLE]
    Legacy.validate_zip_bytes(developer, Legacy.DEVELOPER_BUNDLE)
    assets[DEVELOPER_BUNDLE] = developer
    r3 = safe_file(Plan.R3_SOURCE, Legacy.ROOT)
    require(sha(r3) == Plan.R3_SHA256, "NEW_R3_BYTE_DRIFT")
    assets[NEW_NAME] = r3
    require(len(assets) == STANDALONE_COUNT and
            len(set(assets)) == STANDALONE_COUNT,
            "NEW_25_STANDALONE_INVENTORY_INVALID")

    old_manifest = load_json(old_assets["ALL_TOOLS_MANIFEST.json"], "old_fixture_manifest")
    require(old_manifest.get("is_fixture") is True, "OLD_NONFIXTURE_SOURCE_BLOCKED")
    require(old_manifest.get("tool_count") == 29, "OLD_MANIFEST_COUNT")
    meta = []
    for entry in new_rows:
        item = deepcopy(entry)
        name = entry["artifact_filename"]
        if entry["source_kind"] == "developer_bundle":
            old_item = next(x for x in old_manifest["tools"]
                            if x["tool_id"] == entry["tool_id"])
            actual = old_item["artifact_sha256"]
            where = ("TOOLS/developer/" + DEVELOPER_BUNDLE + "!/"
                     + entry["source_path"])
        else:
            raw = assets[name]
            actual = sha(raw)
            where = "TOOLS/" + entry["package_subdir"] + "/" + name
            if entry["tool_id"] != "tls.r5.chrome" and entry["tool_id"] != "tls.r6.quality-kit":
                require(actual == entry["expected_sha256"],
                        "UNEXPECTED_OLD_SOURCE_SHA:" + entry["tool_id"])
        item.update(location_in_suite=where, actual_fixture_sha256=actual,
                    expected_official_source_sha256=entry["expected_sha256"],
                    source_verified_for_production=False,
                    fixture_substitution=actual != entry["expected_sha256"],
                    release_status="FIXTURE_TEST_ONLY")
        meta.append(item)
    substituted = [x["tool_id"] for x in meta if x["fixture_substitution"]]
    require(substituted == ["tls.r5.chrome", "tls.r6.quality-kit"],
            "FIXTURE_DIFFERENCE_UNEXPECTED")
    manifest = {
        "schema": "tls.suite-175-fixture-manifest.v1",
        "status": "SYNTHETIC_TEST_FIXTURE_NOT_PUBLISHABLE",
        "fixture": True, "is_fixture": True,
        "source_git_sha": "SYNTHETIC_TEST_NO_RELEASE",
        "release_tag_proposal_only": "all-tools-suite-v17.5.0",
        "tool_count": FULL_SUITE_COUNT,
        "previous_tools_preserved": 29,
        "new_tools": 1,
        "standalone_asset_count": STANDALONE_COUNT,
        "fixture_substitution_tool_ids": substituted,
        "release_permission": "NONE",
        "human_language_quality": "NOT_MEASURED",
        "fresh_download_verification": "NOT_RUN",
        "tools": meta,
        "artifacts": [{"name": k, "bytes": len(v), "sha256": sha(v)}
                      for k, v in sorted(assets.items())],
    }
    provenance = {
        "schema": "tls.suite-175-fixture-provenance.v1",
        "fixture": True,
        "source_kind": "VERIFIED_17_4_FIXTURE_PLUS_PINNED_R19_R3",
        "original_tool_count": 29,
        "source_public_only": True,
        "network_calls": 0,
        "publisher_executed": False,
        "new_tag_or_release_created": False,
        "old_17_4_assets_replaced": False,
    }
    validation = {
        "schema": "tls.suite-175-fixture-validation.v1",
        "status": "FIXTURE_TEST_ONLY",
        "tool_count_expected": 30,
        "tool_count_present": 30,
        "standalone_asset_count": 25,
        "release_asset_count": 30,
        "official_previous_release_fresh_download": "NOT_RUN",
        "official_new_release_fresh_download": "NOT_RUN",
        "human_quality_verification": "NOT_RUN",
        "publisher_permission": "NONE",
    }
    metabytes = {
        "ALL_TOOLS_MANIFEST.json": Legacy.json_bytes(manifest),
        "BUILD_PROVENANCE.json": Legacy.json_bytes(provenance),
    }
    old_bundle = old_assets[Legacy.SUITE_FILENAME]
    Legacy.validate_zip_bytes(old_bundle, Legacy.SUITE_FILENAME)
    with ZipFile(__import__("io").BytesIO(old_bundle)) as z:
        entries = {name: z.read(name) for name in z.namelist()}
    require(len(entries) == len(set(entries)), "DUPLICATE_OLD_MEMBER")
    entries.pop("TOOLS/developer/" + Legacy.DEVELOPER_BUNDLE, None)
    for name in ("ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json",
                 "VALIDATION.json", "ALL_TOOLS_REGISTRY.json",
                 "BUNDLE_SHA256SUMS.txt", "SHA256SUMS.txt",
                 "README_6_LANGUAGES.txt"):
        entries.pop(name, None)
    for name, data in assets.items():
        location = ("TOOLS/developer/" if name == DEVELOPER_BUNDLE
                    else "TOOLS/html/" if name == NEW_NAME else None)
        if location is None:
            continue
        entries[location + name] = data
    entries.update(metabytes)
    entries["VALIDATION.json"] = Legacy.json_bytes(validation)
    entries["ALL_TOOLS_REGISTRY.json"] = Legacy.json_bytes(preview)
    entries["README_6_LANGUAGES.txt"] = (
        "TLS Suite 17.5.0 synthetic offline fixture ONLY. NOT a Release.\n"
        "30 proposed tools, 25 standalone assets, 30 prospective release attachments.\n"
        "The 17.4.0 legacy R5/R6 binary originals were replaced by test-only fixtures.\n"
        "Human linguistic quality, OS file chooser cancellation and official downloads NOT MEASURED.\n"
    ).encode("utf-8")
    sums = "".join(sha(v) + "  " + name + "\n"
                   for name, v in sorted(entries.items())).encode("utf-8")
    entries["BUNDLE_SHA256SUMS.txt"] = sums
    entries["SHA256SUMS.txt"] = sums
    archive = Legacy.deterministic_zip(entries)
    Legacy.validate_zip_bytes(archive, SUITE_FILENAME)
    stage = {**assets, **metabytes, "VALIDATION.json": Legacy.json_bytes(validation),
             SUITE_FILENAME: archive}
    stage["SHA256SUMS.txt"] = ("".join(sha(v) + "  " + k + "\n"
                                      for k, v in sorted(stage.items()))).encode("ascii")
    require(len(stage) == GITHUB_ASSET_COUNT, "NOT_30_FIXTURE_RELEASE_LAYOUT")
    out.mkdir(parents=True, exist_ok=False)
    for name, data in stage.items():
        require(Legacy.safe_filename(name), "UNSAFE_OUTPUT_NAME")
        (out / name).write_bytes(data)
    return manifest


def check_fixture(stage: Path) -> dict:
    """Independent structural and byte evidence; explicitly cannot approve Release."""
    require(stage.is_dir() and not stage.is_symlink(), "NOT_A_STAGE")
    names = {p.name for p in stage.iterdir()}
    expected = (set(Plan.legacy_identity()["tools"][i]["artifact_filename"]
                    for i in range(29)
                    if Plan.legacy_identity()["tools"][i]["standalone_required"])
                - {Legacy.DEVELOPER_BUNDLE})
    expected |= {DEVELOPER_BUNDLE, NEW_NAME}
    expected |= set(PACKAGE_FILES)
    require(names == expected and len(names) == 30,
            "MISSING_OR_EXTRA_30_ASSETS")
    files = {n: safe_file(stage / n, stage) for n in names}
    checksums = {}
    for ln in files["SHA256SUMS.txt"].decode("ascii").splitlines():
        dig, name = ln.split("  ", 1)
        require(name not in checksums and Legacy.HEX64.fullmatch(dig),
                "BAD_CHECKSUM_LINE")
        checksums[name] = dig
    require(set(checksums) == names - {"SHA256SUMS.txt"}, "CHECKSUM_SET_CHANGED")
    for name, expected_sha in checksums.items():
        require(sha(files[name]) == expected_sha, "ASSET_HASH_CHANGED:" + name)
    m = load_json(files["ALL_TOOLS_MANIFEST.json"], "17_5_fixture_manifest")
    v = load_json(files["VALIDATION.json"], "17_5_fixture_validation")
    require(m.get("is_fixture") is True and m.get("release_permission") == "NONE"
            and v.get("status") == "FIXTURE_TEST_ONLY"
            and v.get("publisher_permission") == "NONE",
            "FIXTURE_PROMOTION_FORBIDDEN")
    require(m.get("tool_count") == 30 and
            len(m.get("tools", [])) == 30 and
            v.get("release_asset_count") == 30,
            "FIXTURE_COUNTS_CHANGED")
    require([x["tool_id"] for x in m["tools"]] ==
            [x["tool_id"] for x in Preview.render(Plan.safe_json(Plan.CONTRACT))["tools"]],
            "NOT_APPEND_ONLY_TOOL_IDS")
    require([x["tool_id"] for x in m["tools"] if x["fixture_substitution"]] ==
            ["tls.r5.chrome", "tls.r6.quality-kit"], "TEST_ORIGIN_NOT_DECLARED")
    Legacy.validate_zip_bytes(files[SUITE_FILENAME], SUITE_FILENAME)
    with ZipFile(__import__("io").BytesIO(files[SUITE_FILENAME])) as z:
        bundle = set(z.namelist())
        require("TOOLS/html/" + NEW_NAME in bundle, "R3_NOT_IN_SUITE")
        require("TOOLS/html/TW_First_Result_Studio_R19_20261101.html" in bundle,
                "R2_REMOVED_FROM_SUITE")
        require("TOOLS/developer/" + DEVELOPER_BUNDLE in bundle,
                "DEVELOPER_ZIP_MISSING")
        require(sha(z.read("TOOLS/html/" + NEW_NAME)) == Plan.R3_SHA256,
                "R3_SUITE_BYTE_MISMATCH")
        require(len(load_json(z.read("ALL_TOOLS_REGISTRY.json"), "registry")["tools"]) == 30,
                "INNER_REGISTRY_NOT_30")
        require(z.read("ALL_TOOLS_MANIFEST.json") == files["ALL_TOOLS_MANIFEST.json"],
                "INNER_MANIFEST_PARITY")
    return {
        "schema": "tls.suite-175-full-fixture-receipt.v1",
        "status": "FIXTURE_30_TOOLS_30_ASSETS_STRUCTURAL_PASS",
        "fixture_only": True, "published_or_publishable": False,
        "tool_count": 30, "standalone_assets": 25, "stage_file_count": 30,
        "legacy_r5_r6_original_release_bytes": "NOT_USED_FIXTURE_SUBSTITUTED",
        "new_r19_r3_html_sha256": Plan.R3_SHA256,
        "full_fixture_suite_sha256": sha(files[SUITE_FILENAME]),
        "publisher_executed": False, "human_quality_verified": False,
        "fresh_release_downloads_verified": False,
    }
