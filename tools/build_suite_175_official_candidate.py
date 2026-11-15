#!/usr/bin/env python3
"""R202 official-source Suite 17.5 integration candidate builder, never a publisher.

Only reuses *fresh downloaded and byte-pinned* official Suite 17.4.0 assets.
R198 synthetic R5/R6 fixtures are explicitly invalid. The candidate cannot
be published by the old 17.4 pipeline or used as a product Release.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from copy import deepcopy
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import build_all_tools_release as Old
import check_suite_175_official_sources as Source
import check_suite_175_promotion_plan as Plan
import render_suite_175_registry_preview as Preview

ROOT = Path(__file__).resolve().parents[1]
SUITE_NAME = "TLS_ALL_TOOLS_SUITE_17_5_0_OFFICIAL_SOURCE_CANDIDATE_NOT_RELEASED.zip"
DEV_NAME = "TLS_DEVELOPER_CLI_SKILL_17_5_0_OFFICIAL_SOURCE_CANDIDATE_NOT_RELEASED.zip"
NEW_HTML = "TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html"
CANDIDATE_STATUS = "SOURCE_REAL_30_TOOL_CANDIDATE_NOT_PUBLISHABLE"
METADATA_NAMES = frozenset(("ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json",
                            "VALIDATION.json", "SHA256SUMS.txt", SUITE_NAME))
OLD_METADATA = frozenset(("ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json",
                          "VALIDATION.json", "SHA256SUMS.txt",
                          Old.SUITE_FILENAME))
EXPECTED_TOOL_COUNT = 30
EXPECTED_ASSET_COUNT = 30
EXPECTED_STANDALONE = 25


class CandidateRejected(RuntimeError):
    pass


def need(ok, code):
    if not ok:
        raise CandidateRejected("R202_" + code)


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def inputs_guard(assets: Path, out: Path, expected_sha: str):
    need(isinstance(expected_sha, str) and Old.GIT_SHA.fullmatch(expected_sha)
         is not None, "COMMIT_SHA_REQUIRED")
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"],
                                     cwd=ROOT, text=True).strip()
    need(actual == expected_sha, "CHECKOUT_COMMIT_MISMATCH")
    clean = subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], cwd=ROOT)
    need(clean.returncode == 0, "DIRTY_CHECKOUT")
    need(assets.is_dir() and not assets.is_symlink(), "OFFICIAL_INPUT_INVALID")
    need(not out.exists() and not out.is_symlink(), "OUTPUT_ALREADY_EXISTS")
    need(not out.resolve().is_relative_to(ROOT.resolve()),
         "OUTPUT_MUST_BE_OUTSIDE_REPO")
    need(not out.resolve().is_relative_to(assets.resolve()) and
         not assets.resolve().is_relative_to(out.resolve()), "INPUT_OUTPUT_OVERLAP")


def raw_archive(data: bytes, label: str):
    Old.validate_zip_bytes(data, label)
    with ZipFile(BytesIO(data), "r") as z:
        names = z.namelist()
        need(len(names) == len(set(names)), "ARCHIVE_DUPLICATE_ENTRY")
        return {n: z.read(n) for n in names}


def validated_previous_manifest(raw: bytes, plan: dict, pins: dict):
    meta = Old.strict_json(raw, "original-17.4-release-manifest")
    ids = [row["tool_id"] for row in plan["tools"][:29]]
    need(meta.get("schema") == "tls.all-tools-release-manifest.v1" and
         meta.get("suite_version") == "17.4.0" and
         meta.get("release_tag") == Source.TAG and
         meta.get("is_fixture") is False and
         meta.get("tool_count") == 29 and
         [x.get("tool_id") for x in meta.get("tools", [])] == ids,
         "OFFICIAL_OLD_MANIFEST_IDENTITY")
    old_meta = meta["tools"]
    for i, row in enumerate(old_meta):
        ref = plan["tools"][i]
        need(all(row.get(field) == ref.get(field)
                 for field in ("tool_id", "source_kind", "source_path",
                               "artifact_filename", "package_subdir",
                               "expected_sha256", "family", "rights_review",
                               "license_review", "tool_version")),
             "OLD_REGISTERED_TOOL_DRIFT")
    old_asset_names = {a.get("name") for a in meta.get("artifacts", [])}
    expected = set(pins) - OLD_METADATA
    need(len(old_asset_names) == 24 and old_asset_names == expected,
         "ORIGINAL_STANDALONE_INVENTORY")
    for a in meta["artifacts"]:
        name = a["name"]
        need(a.get("size") == pins[name][0] and
             a.get("sha256") == pins[name][1],
             "ORIGINAL_MANIFEST_ASSET_DIGEST")
    return meta


def create_new_developer_bundle(registry_preview: dict):
    # Rebuild from this exact public checkout, never relabel the old developer ZIP.
    tracked = Old.tracked_files()
    members = Old.developer_contents(tracked)
    members["TLS_17_5_SOURCE_CANDIDATE_NOTICE.txt"] = (
        "R202 / Suite 17.5.0 official-source engineering candidate only.\n"
        "Not a published version, not a 17.5 production registry, not approved for upload.\n"
        "The canonical release/all_tools_registry.json inside remains historical 17.4.0.\n"
        "See the additive reviewed 30-item candidate registry below; do not install two\n"
        "conflicting browser versions on the same website. No human language QA claimed.\n"
    ).encode("utf-8")
    members["release/ALL_TOOLS_REGISTRY_17_5_CANDIDATE_NOT_PRODUCTION.json"] = (
        Old.json_bytes(registry_preview))
    raw = Old.deterministic_zip(members)
    Old.validate_zip_bytes(raw, DEV_NAME)
    return raw


def build(source_json: Path, official: Path, out: Path, expected_sha: str):
    inputs_guard(official, out, expected_sha)
    pinned = Source.pin_rows(Source.load_json(Source.PIN_FILE))
    evidence = Source.audit(Source.PIN_FILE, source_json, official)
    need(evidence["official_source_asset_count"] == 29 and
         evidence["verified_download_bytes"] == sum(n for n, _ in pinned.values()),
         "OFFICIAL_FRESH_SOURCE_EVIDENCE")
    proposal = Plan.safe_json(Plan.CONTRACT)
    Plan.validate(proposal, sources=True)
    preview = Preview.render(proposal)
    need(preview["total_proposed_tools"] == EXPECTED_TOOL_COUNT and
         preview["publication_permission"] == "NONE", "PREVIEW_AUTHORITY_CHANGED")
    original = {name: Old.safe_file(official / name, official) for name in pinned}
    old_manifest = validated_previous_manifest(
        original["ALL_TOOLS_MANIFEST.json"], preview, pinned)
    old_zip = original[Old.SUITE_FILENAME]
    need(digest(old_zip) == Source.SUITE_SHA, "ORIGINAL_SUITE_ZIP_MISMATCH")
    entries = raw_archive(old_zip, Old.SUITE_FILENAME)
    need(entries.get("ALL_TOOLS_MANIFEST.json") ==
         original["ALL_TOOLS_MANIFEST.json"], "OFFICIAL_OUTER_INNER_MANIFEST")
    old_dev = original[Old.DEVELOPER_BUNDLE]
    need(entries.get("TOOLS/developer/" + Old.DEVELOPER_BUNDLE) == old_dev,
         "OFFICIAL_DEVELOPER_ARCHIVE_MISMATCH")
    # Every old 17.4 standalone tool is retained byte-for-byte inside the new ZIP.
    old_standalones = set(pinned) - OLD_METADATA
    for row in preview["tools"][:29]:
        if row["source_kind"] == "developer_bundle":
            continue
        name = row["artifact_filename"]
        location = "TOOLS/" + row["package_subdir"] + "/" + name
        need(name in old_standalones and entries.get(location) == original[name],
             "OLD_TOOL_ARCHIVE_BYTES_CHANGED:" + name)
    rebuilt_dev = create_new_developer_bundle(preview)
    need(digest(rebuilt_dev) != digest(old_dev), "OLD_DEVELOPER_RENAME_FORBIDDEN")
    r3 = Old.safe_file(Plan.R3_SOURCE, ROOT)
    need(digest(r3) == Plan.R3_SHA256, "NEW_R19_R3_SOURCE_DRIFT")
    # 23 unchanged old standalone assets + 1 truly rebuilt Developer + 1 R19 R3.
    standalone = {name: original[name] for name in old_standalones
                  if name != Old.DEVELOPER_BUNDLE}
    need(len(standalone) == 23, "OLD_STANDALONE_COUNT")
    standalone[DEV_NAME] = rebuilt_dev
    standalone[NEW_HTML] = r3
    need(len(standalone) == EXPECTED_STANDALONE, "NEW_STANDALONE_COUNT")
    entries.pop("TOOLS/developer/" + Old.DEVELOPER_BUNDLE)
    for name in ("ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json",
                 "VALIDATION.json", "ALL_TOOLS_REGISTRY.json",
                 "BUNDLE_SHA256SUMS.txt", "SHA256SUMS.txt",
                 "README_6_LANGUAGES.txt"):
        need(name in entries, "OLD_SUITE_METADATA_MISSING:" + name)
        entries.pop(name)
    entries["TOOLS/developer/" + DEV_NAME] = rebuilt_dev
    entries["TOOLS/html/" + NEW_HTML] = r3
    tools = []
    for original_tool in old_manifest["tools"]:
        row = deepcopy(original_tool)
        row["suite_version"] = "17.5.0"
        row["unchanged_from_last_suite"] = True
        if row["source_kind"] == "developer_bundle":
            row["location_in_suite"] = ("TOOLS/developer/" + DEV_NAME +
                                         "!/" + row["source_path"])
        tools.append(row)
    future_tool = deepcopy(preview["tools"][-1])
    future_tool.update({
        "source_sha256": digest(r3),
        "location_in_suite": "TOOLS/html/" + NEW_HTML,
        "artifact_bytes": len(r3), "artifact_sha256": digest(r3),
        "suite_version": "17.5.0",
        "unchanged_from_last_suite": False,
        "unchanged_from_original_source": True,
        "verification_status": "NEW_PINNED_SOURCE_SHA_PASS",
    })
    tools.append(future_tool)
    need([x["tool_id"] for x in tools] ==
         [x["tool_id"] for x in preview["tools"]], "ADDITIVE_TOOL_ID_DRIFT")
    manifest = {
        "schema": "tls.suite-175-official-source-candidate-manifest.v1",
        "status": CANDIDATE_STATUS,
        "source_git_sha": expected_sha,
        "previous_release_tag": Source.TAG,
        "previous_suite_sha256": Source.SUITE_SHA,
        "proposed_release_tag": "all-tools-suite-v17.5.0",
        "suite_version": "17.5.0", "is_fixture": False,
        "publication_permission": "NONE",
        "tool_count": 30, "previous_tools_preserved": 29,
        "standalone_asset_count": 25,
        "new_tool_id": Plan.EXPECTED_NEW_TOOL_ID,
        "tools": tools,
        "artifacts": [{"name": name, "bytes": len(data), "sha256": digest(data)}
                      for name, data in sorted(standalone.items())],
        "official_prior_release_fresh_bytes_verified": 29,
        "excluded_rights_withdrawn": proposal["proposed"]["excluded_rights_withdrawn"],
        "locales": proposal["proposed"]["locales"],
        "human_quality_verified": False,
        "os_native_file_chooser_cancel_verified": False,
    }
    provenance = {
        "schema": "tls.suite-175-official-source-candidate-provenance.v1",
        "status": CANDIDATE_STATUS,
        "origin": "OFFICIAL_SUITE_17_4_0_29_FRESH_BYTES_PLUS_PUBLIC_R19_R3",
        "official_prior_release_sha256": Source.SUITE_SHA,
        "official_prior_asset_count": 29,
        "official_prior_asset_bytes": evidence["verified_download_bytes"],
        "r5_r6_synthetic_fixtures_used": False,
        "new_developer_bundle_built_from_current_tracked_source": True,
        "source_git_sha": expected_sha,
        "current_checkout_dirty": False,
        "remote_publishing_used": False, "new_release_created": False,
    }
    validation = {
        "schema": "tls.suite-175-official-source-candidate-validation.v1",
        "status": CANDIDATE_STATUS,
        "is_fixture": False,
        "source_git_sha": expected_sha,
        "tool_count": 30, "standalone_count": 25, "asset_count": 30,
        "official_original_29_bytes_verified": True,
        "r5_r6_original_bytes_preserved": True,
        "publisher_permission": "NONE",
        "draft_release_download_verified": False,
        "published_release_download_verified": False,
        "human_quality_verified": False,
    }
    entries["ALL_TOOLS_MANIFEST.json"] = Old.json_bytes(manifest)
    entries["BUILD_PROVENANCE.json"] = Old.json_bytes(provenance)
    entries["VALIDATION.json"] = Old.json_bytes(validation)
    entries["ALL_TOOLS_REGISTRY.json"] = Old.json_bytes(preview)
    entries["README_6_LANGUAGES.txt"] = (
        "TLS 17.5.0 OFFICIAL-SOURCE ENGINEERING CANDIDATE - NOT PUBLISHED.\n"
        "30 tools, 25 standalone assets, new R19 R3 source pinned.\n"
        "Open TOOLS/html/TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html\n"
        "after extracting. Legacy R19 R2 and all 29 original tools remain.\n"
        "The 17.5 registry is only a REVIEW PREVIEW, not production authority.\n"
        "Original rights restrictions and no-human-translation-QA limit apply.\n"
    ).encode("utf-8")
    bundle_hashes = "".join(
        digest(data) + "  " + name + "\n"
        for name, data in sorted(entries.items())).encode("ascii")
    entries["BUNDLE_SHA256SUMS.txt"] = bundle_hashes
    entries["SHA256SUMS.txt"] = bundle_hashes
    suite = Old.deterministic_zip(entries)
    Old.validate_zip_bytes(suite, SUITE_NAME)
    output = dict(standalone)
    output.update({
        "ALL_TOOLS_MANIFEST.json": entries["ALL_TOOLS_MANIFEST.json"],
        "BUILD_PROVENANCE.json": entries["BUILD_PROVENANCE.json"],
        "VALIDATION.json": entries["VALIDATION.json"],
        SUITE_NAME: suite,
    })
    output["SHA256SUMS.txt"] = "".join(
        digest(data) + "  " + name + "\n"
        for name, data in sorted(output.items())).encode("ascii")
    need(len(output) == EXPECTED_ASSET_COUNT and
         len({x for x in output}) == EXPECTED_ASSET_COUNT,
         "FINAL_30_ASSET_COUNT")
    # Calculate every byte before creating the destination. Never reuse a stage.
    out.mkdir(parents=True, exist_ok=False)
    for name, raw in sorted(output.items()):
        need(Old.safe_filename(name), "UNSAFE_OUTPUT_FILENAME")
        (out / name).write_bytes(raw)
    return {
        "schema": "tls.r202.official-source-integration-build.v1",
        "status": CANDIDATE_STATUS,
        "tool_count": 30, "standalone_count": 25, "asset_count": 30,
        "official_original_asset_count": 29,
        "new_source_sha256": digest(r3),
        "candidate_suite_sha256": digest(suite),
        "candidate_developer_sha256": digest(rebuilt_dev),
        "r5_r6_synthetic_fixtures_used": False,
        "source_commit": expected_sha, "published": False,
        "publication_permission": "NONE",
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--release-json", type=Path, required=True)
    ap.add_argument("--official-assets", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--expected-sha", required=True)
    args = ap.parse_args()
    report = build(args.release_json, args.official_assets,
                   args.out, args.expected_sha)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (CandidateRejected, Old.ReleaseBlock, Source.SourceRejected,
            Plan.NotPromotable, subprocess.CalledProcessError, OSError,
            ValueError, KeyError, UnicodeError) as exc:
        print("R202_CANDIDATE_BUILD_BLOCKED", type(exc).__name__, str(exc)[:150],
              file=sys.stderr)
        raise SystemExit(2)
