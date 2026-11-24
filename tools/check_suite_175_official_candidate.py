#!/usr/bin/env python3
"""R202 independent 17.5 official-source integration candidate validator.

No network, no publish, no source overwrite, no self-attested promotion.
Requires the original 29 official 17.4 Release bytes separately to verify
the new 30-asset candidate. Not a replacement for a production Publisher.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO

import build_all_tools_release as Old
import build_suite_175_official_candidate as Candidate
import check_suite_175_official_sources as Source
import check_suite_175_promotion_plan as Plan
import render_suite_175_registry_preview as Preview


class CandidateValidationBlocked(ValueError):
    pass


def need(ok, message):
    if not ok:
        raise CandidateValidationBlocked("R202_CHECK_" + message)


def checked_json(value, label):
    return Old.strict_json(value, label)


def checksums(raw: bytes):
    try:
        text = raw.decode("ascii")
    except UnicodeError as exc:
        raise CandidateValidationBlocked("R202_CHECK_CHECKSUM_NOT_ASCII") from exc
    result = {}
    for line in text.splitlines():
        need(line.count("  ") == 1, "CHECKSUM_FORMAT")
        hexdigest, name = line.split("  ", 1)
        need(Old.HEX64.fullmatch(hexdigest) is not None and
             Old.safe_archive_path(name) and name not in result,
             "CHECKSUM_UNSAFE_DUPLICATE")
        result[name] = hexdigest
    return result


def inspect(stage: Path, official: Path, release_json: Path, expected_sha: str):
    need(stage.is_dir() and not stage.is_symlink(), "CANDIDATE_STAGE_MISSING")
    pins = Source.pin_rows(Source.load_json(Source.PIN_FILE))
    Source.audit(Source.PIN_FILE, release_json, official)
    Plan.validate(Plan.safe_json(Plan.CONTRACT), sources=True)
    preview = Preview.render(Plan.safe_json(Plan.CONTRACT))
    need(Old.GIT_SHA.fullmatch(expected_sha) is not None,
         "INVALID_EXPECTED_SHA")
    required = (set(pins) - Candidate.OLD_METADATA -
                {Old.DEVELOPER_BUNDLE})
    required |= {Candidate.NEW_HTML, Candidate.DEV_NAME}
    required |= Candidate.METADATA_NAMES
    files = list(stage.iterdir())
    need(len(files) == 30 and {p.name for p in files} == required,
         "MISSING_OR_EXTRA_STAGE_ASSETS")
    for path in files:
        need(path.is_file() and not path.is_symlink() and
             path.stat().st_size <= Old.MAX_ASSET_BYTES,
             "UNSAFE_STAGE_FILE")
    stage_bytes = {p.name: Old.safe_file(p, stage) for p in files}
    outer_hashes = checksums(stage_bytes["SHA256SUMS.txt"])
    need(set(outer_hashes) == set(stage_bytes) - {"SHA256SUMS.txt"},
         "STAGE_CHECKSUM_INVENTORY")
    for name, hexdigest in outer_hashes.items():
        need(Candidate.digest(stage_bytes[name]) == hexdigest,
             "STAGE_SHA256_MISMATCH")
    for name in set(pins) - Candidate.OLD_METADATA - {Old.DEVELOPER_BUNDLE}:
        old_file = Old.safe_file(official / name, official)
        need(stage_bytes[name] == old_file and
             Candidate.digest(stage_bytes[name]) == pins[name][1],
             "CHANGED_PRIOR_OFFICIAL_BYTES:" + name)
    need(stage_bytes[Candidate.NEW_HTML] == Plan.R3_SOURCE.read_bytes() and
         Candidate.digest(stage_bytes[Candidate.NEW_HTML]) == Plan.R3_SHA256,
         "NEW_HTML_SOURCE_MISMATCH")
    dev = stage_bytes[Candidate.DEV_NAME]
    Old.validate_zip_bytes(dev, Candidate.DEV_NAME)
    need(Candidate.digest(dev) != pins[Old.DEVELOPER_BUNDLE][1],
         "OLD_DEVELOPER_ZIP_RELABELED")
    with ZipFile(BytesIO(dev), "r") as dev_zip:
        index = set(dev_zip.namelist())
        need("TLS_17_5_SOURCE_CANDIDATE_NOTICE.txt" in index and
             "release/ALL_TOOLS_REGISTRY_17_5_CANDIDATE_NOT_PRODUCTION.json"
             in index, "NEW_DEVELOPER_PROVENANCE_MISSING")
        sub = checked_json(
            dev_zip.read("release/ALL_TOOLS_REGISTRY_17_5_CANDIDATE_NOT_PRODUCTION.json"),
            "R202_DEVELOPER_CANDIDATE_REGISTRY")
        need(sub == preview and
             b"Not a published version" in
             dev_zip.read("TLS_17_5_SOURCE_CANDIDATE_NOTICE.txt"),
             "DEVELOPER_REGISTRY_OR_NOTICE_TAMPERED")
    man = checked_json(stage_bytes["ALL_TOOLS_MANIFEST.json"],
                       "R202_MANIFEST")
    val = checked_json(stage_bytes["VALIDATION.json"], "R202_VALIDATION")
    prov = checked_json(stage_bytes["BUILD_PROVENANCE.json"], "R202_PROVENANCE")
    need(man.get("schema") == "tls.suite-175-official-source-candidate-manifest.v1"
         and man.get("status") == Candidate.CANDIDATE_STATUS
         and man.get("suite_version") == "17.5.0"
         and man.get("source_git_sha") == expected_sha
         and man.get("previous_suite_sha256") == Source.SUITE_SHA
         and man.get("is_fixture") is False
         and man.get("publication_permission") == "NONE"
         and man.get("tool_count") == 30 and
         man.get("previous_tools_preserved") == 29
         and man.get("standalone_asset_count") == 25 and
         man.get("human_quality_verified") is False
         and man.get("os_native_file_chooser_cancel_verified") is False,
         "MANIFEST_FALSE_PUBLICATION_CLAIM")
    rows = man.get("tools")
    need(isinstance(rows, list) and len(rows) == 30 and
         [r.get("tool_id") for r in rows] ==
         [r["tool_id"] for r in preview["tools"]],
         "TOOL_ID_OR_COUNT_MISMATCH")
    source_legacy = Plan.legacy_identity()["tools"]
    for i in range(29):
        immutable = ("tool_id", "artifact_filename", "expected_sha256",
                     "source_path", "source_kind", "family", "license_review")
        need(all(rows[i].get(k) == source_legacy[i].get(k) for k in immutable),
             "LEGACY_REGISTRY_ROW_TAMPERED")
        # The ONLY generated historical installer (MRFT R17.7) has a null
        # registry commit marker, which the official 17.4 builder resolves to
        # its immutable 17.4 publishing source SHA inside the release manifest.
        expected_origin = (Source.TARGET_SHA
            if source_legacy[i]["tool_id"] == Old.NEW_TOOL_ID
            else source_legacy[i].get("original_commit_sha"))
        need(rows[i].get("original_commit_sha") == expected_origin,
             "ORIGINAL_GENERATED_COMMIT_SOURCE_TAMPERED")
    need(rows[29].get("artifact_filename") == Candidate.NEW_HTML and
         rows[29].get("artifact_sha256") == Plan.R3_SHA256 and
         rows[29].get("location_in_suite") ==
         "TOOLS/html/" + Candidate.NEW_HTML, "R19_R3_REGISTRY_DRIFT")
    standalone = {a.get("name"): a for a in man.get("artifacts", [])}
    need(len(standalone) == 25 and
         set(standalone) == set(stage_bytes) - Candidate.METADATA_NAMES,
         "MANIFEST_STANDALONE_SET_MISMATCH")
    for name, meta in standalone.items():
        need(meta.get("bytes") == len(stage_bytes[name]) and
             meta.get("sha256") == Candidate.digest(stage_bytes[name]),
             "MANIFEST_ASSET_SIZE_OR_SHA_DRIFT")
    need(val.get("schema") ==
         "tls.suite-175-official-source-candidate-validation.v1" and
         val.get("status") == Candidate.CANDIDATE_STATUS and
         val.get("source_git_sha") == expected_sha and
         val.get("tool_count") == 30 and
         val.get("standalone_count") == 25 and
         val.get("asset_count") == 30 and
         val.get("is_fixture") is False and
         val.get("official_original_29_bytes_verified") is True and
         val.get("r5_r6_original_bytes_preserved") is True and
         val.get("publisher_permission") == "NONE" and
         val.get("draft_release_download_verified") is False and
         val.get("published_release_download_verified") is False and
         val.get("human_quality_verified") is False,
         "VALIDATION_PROMOTION_FORBIDDEN")
    need(prov.get("schema") ==
         "tls.suite-175-official-source-candidate-provenance.v1" and
         prov.get("official_prior_release_sha256") == Source.SUITE_SHA and
         prov.get("official_prior_asset_count") == 29 and
         prov.get("r5_r6_synthetic_fixtures_used") is False and
         prov.get("remote_publishing_used") is False and
         prov.get("new_release_created") is False,
         "PROVENANCE_GUARD")
    zbytes = stage_bytes[Candidate.SUITE_NAME]
    Old.validate_zip_bytes(zbytes, Candidate.SUITE_NAME)
    prior = Old.safe_file(official / Old.SUITE_FILENAME, official)
    old_entries = Candidate.raw_archive(prior, Old.SUITE_FILENAME)
    new_entries = Candidate.raw_archive(zbytes, Candidate.SUITE_NAME)
    excluded_old = {
        "TOOLS/developer/" + Old.DEVELOPER_BUNDLE,
        "ALL_TOOLS_MANIFEST.json", "BUILD_PROVENANCE.json", "VALIDATION.json",
        "ALL_TOOLS_REGISTRY.json", "README_6_LANGUAGES.txt",
        "BUNDLE_SHA256SUMS.txt", "SHA256SUMS.txt",
    }
    for name, original in old_entries.items():
        if name not in excluded_old:
            need(new_entries.get(name) == original,
                 "ORIGINAL_ARCHIVE_MEMBER_CHANGED:" + name)
    need(new_entries.get("TOOLS/developer/" + Candidate.DEV_NAME) == dev
         and new_entries.get("TOOLS/html/" + Candidate.NEW_HTML) ==
         stage_bytes[Candidate.NEW_HTML],
         "NEW_SUITE_STANDALONE_PARITY")
    need(new_entries.get("ALL_TOOLS_MANIFEST.json") ==
         stage_bytes["ALL_TOOLS_MANIFEST.json"] and
         new_entries.get("BUILD_PROVENANCE.json") ==
         stage_bytes["BUILD_PROVENANCE.json"] and
         new_entries.get("VALIDATION.json") ==
         stage_bytes["VALIDATION.json"] and
         checked_json(new_entries.get("ALL_TOOLS_REGISTRY.json", b"{}"),
                      "R202_CANDIDATE_REGISTRY") == preview,
         "SUITE_METADATA_PARITY")
    inner_hashes = checksums(new_entries.get("BUNDLE_SHA256SUMS.txt", b""))
    need(new_entries.get("BUNDLE_SHA256SUMS.txt") ==
         new_entries.get("SHA256SUMS.txt") and
         set(inner_hashes) ==
         set(new_entries) - {"BUNDLE_SHA256SUMS.txt", "SHA256SUMS.txt"},
         "INNER_CHECKSUM_INVENTORY")
    for name, hex_value in inner_hashes.items():
        need(Candidate.digest(new_entries[name]) == hex_value,
             "INNER_SHA256_CHANGED:" + name)
    need(new_entries.get("README_6_LANGUAGES.txt", b"").startswith(
         b"TLS 17.5.0 OFFICIAL-SOURCE ENGINEERING CANDIDATE"),
         "NO_CANDIDATE_README")
    need(not (set(new_entries) & {"TOOLS/developer/" + Old.DEVELOPER_BUNDLE}),
         "OLD_DEVELOPER_DUPLICATE")
    return {
        "schema": "tls.r202.official-source-candidate-independent-receipt.v1",
        "status": "OFFICIAL_29_SOURCE_BYTES_AND_30_CANDIDATE_ASSETS_VERIFIED",
        "old_official_release_bytes_verified": 29,
        "old_standalone_assets_preserved": 23,
        "new_r19_r3_bytes_verified": True,
        "new_developer_rebuilt": True,
        "tool_count": 30, "standalone_count": 25, "candidate_assets": 30,
        "source_git_sha": expected_sha,
        "suite_sha256": Candidate.digest(zbytes),
        "release_permission": "NONE", "released": False,
        "draft_download_verified": False, "published_download_verified": False,
        "human_quality_verified": False,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--stage", type=Path, required=True)
    ap.add_argument("--official-assets", type=Path, required=True)
    ap.add_argument("--release-json", type=Path, required=True)
    ap.add_argument("--expected-sha", required=True)
    args = ap.parse_args()
    result = inspect(args.stage, args.official_assets,
                     args.release_json, args.expected_sha)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (CandidateValidationBlocked, Candidate.CandidateRejected,
            Source.SourceRejected, Old.ReleaseBlock, Plan.NotPromotable,
            OSError, ValueError, KeyError, UnicodeError) as exc:
        print("R202_CANDIDATE_CHECK_BLOCKED",
              type(exc).__name__, str(exc)[:150], file=sys.stderr)
        raise SystemExit(2)
