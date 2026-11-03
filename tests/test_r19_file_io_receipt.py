"""Fail-closed verifier for *subsystem-only* R19 Chromium evidence.

This explicitly CANNOT validate the original R19 ten-scenario native report.
No user content is accepted or printed; only synthetic metadata.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "r19_file_io_boundary.html"
SCHEMA = "tls.r19.file-io-boundary.native-research.v1"
CHECK_BOOLEANS = (
    "original_valid_utf8_imported",
    "invalid_utf8_preserved_source_and_decision",
    "utf8_bom_preserved_source_and_decision",
    "nul_preserved_source_and_decision",
    "oversize_preserved_source_and_decision",
    "extension_preserved_source_and_decision",
    "metadata_mismatch_preserves_source_and_decision",
    "empty_file_change_preserves_work",
    "crlf_zero_edit_native_download_exact",
    "crlf_one_edit_native_download_exact",
    "stale_read_after_clear_did_not_resurrect",
    "stale_rejection_after_clear_ignored",
)
CHECK_INTEGERS = (
    "original_bytes",
    "download_bytes",
    "original_cr_count",
    "download_cr_count",
)
KEYS = frozenset((
    "schema", "status", "evaluation_only", "r19_full_studio_native_acceptance",
    "suite_baseline", "navigation", "fixture", "fixture_sha256",
    "browser_version", "check_results", "egress_request_count",
    "page_error_count", "os_file_chooser_tested", "human_translation_quality",
    "real_user_adoption", "no_source_text_or_filepath_in_report",
))


def require(ok: bool, code: str):
    if not ok:
        raise ValueError(code)


def expected_fixture_hash():
    return hashlib.sha256(FIXTURE.read_bytes()).hexdigest()


def verify(report):
    require(type(report) is dict and set(report) == KEYS, "REPORT_SHAPE")
    for key, expected in (
        ("schema", SCHEMA),
        ("status", "PASS"),
        ("evaluation_only", True),
        ("r19_full_studio_native_acceptance", "NOT_RUN"),
        ("suite_baseline", "17.3.2"),
        ("navigation", "ACTUAL_FILE_URL"),
        ("fixture", "SYNTHETIC_ONLY"),
        ("fixture_sha256", expected_fixture_hash()),
        ("os_file_chooser_tested", False),
        ("human_translation_quality", "NOT_MEASURED"),
        ("real_user_adoption", "NOT_MEASURED"),
        ("no_source_text_or_filepath_in_report", True),
    ):
        require(type(report.get(key)) is type(expected)
                and report.get(key) == expected, "IDENTITY_OR_SCOPE:" + key)
    require(isinstance(report["browser_version"], str)
            and re.fullmatch(r"\d+\.\d+\.\d+\.\d+", report["browser_version"]),
            "BROWSER_VERSION")
    for key in ("egress_request_count", "page_error_count"):
        require(type(report.get(key)) is int and report[key] == 0, "EGRESS_OR_ERROR:" + key)
    values = report.get("check_results")
    require(type(values) is dict
            and set(values) == set(CHECK_BOOLEANS) | set(CHECK_INTEGERS),
            "CHECK_RESULT_SHAPE")
    for key in CHECK_BOOLEANS:
        require(values.get(key) is True, "NATIVE_GUARD_FAILED:" + key)
    for key in CHECK_INTEGERS:
        require(type(values.get(key)) is int and values[key] >= 0,
                "BYTE_COUNT_INVALID:" + key)
    require(values["original_bytes"] == 43
            and values["download_bytes"] == values["original_bytes"],
            "BYTES_NOT_IDENTICAL")
    require(values["original_cr_count"] == 3
            and values["download_cr_count"] == values["original_cr_count"],
            "CRLF_NOT_PRESERVED")
    return {"scope": "SUBSYSTEM_ONLY", "result": "PASS",
            "r19_full_native_10_scenarios": "NOT_RUN"}


def synthetic_good():
    return {
        "schema": SCHEMA,
        "status": "PASS",
        "evaluation_only": True,
        "r19_full_studio_native_acceptance": "NOT_RUN",
        "suite_baseline": "17.3.2",
        "navigation": "ACTUAL_FILE_URL",
        "fixture": "SYNTHETIC_ONLY",
        "fixture_sha256": expected_fixture_hash(),
        "browser_version": "140.0.7339.16",
        "check_results": {**{key: True for key in CHECK_BOOLEANS},
                          "original_bytes": 43, "download_bytes": 43,
                          "original_cr_count": 3, "download_cr_count": 3},
        "egress_request_count": 0,
        "page_error_count": 0,
        "os_file_chooser_tested": False,
        "human_translation_quality": "NOT_MEASURED",
        "real_user_adoption": "NOT_MEASURED",
        "no_source_text_or_filepath_in_report": True,
    }


def self_test():
    baseline = synthetic_good()
    verify(baseline)
    bad_cases = []
    for key, value in (
        ("status", "FAILED"), ("evaluation_only", False),
        ("r19_full_studio_native_acceptance", "PASS"),
        ("navigation", "FAKE_DOCUMENT"), ("fixture_sha256", "0" * 64),
        ("os_file_chooser_tested", True),
        ("human_translation_quality", "MEASURED"),
        ("egress_request_count", 1), ("page_error_count", 1),
    ):
        altered = copy.deepcopy(baseline)
        altered[key] = value
        bad_cases.append(altered)
    for key, value in (
        ("crlf_zero_edit_native_download_exact", False),
        ("stale_read_after_clear_did_not_resurrect", False),
        ("empty_file_change_preserves_work", False),
        ("metadata_mismatch_preserves_source_and_decision", False),
        ("stale_rejection_after_clear_ignored", False),
        ("download_bytes", 42),
        ("download_cr_count", 0),
    ):
        altered = copy.deepcopy(baseline)
        altered["check_results"][key] = value
        bad_cases.append(altered)
    extra = copy.deepcopy(baseline)
    extra["raw_source"] = "NEVER_ALLOWED"
    bad_cases.append(extra)
    for sample in bad_cases:
        try:
            verify(sample)
        except ValueError:
            continue
        raise RuntimeError("FAKE_OR_INCOMPLETE_EVIDENCE_WAS_ACCEPTED")
    return {"positive": 1, "rejected_adversarial": len(bad_cases), "status": "PASS"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.self_test:
        print(json.dumps({"schema": "tls.r19.boundary-receipt-verifier.v1",
                          **self_test()}))
    elif args.report:
        try:
            result = verify(json.loads(args.report.read_text(encoding="utf-8")))
            print(json.dumps({"schema": "tls.r19.boundary-receipt-verifier.v1",
                              **result}))
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            print("R19_SUBSYSTEM_EVIDENCE_REJECTED")
            raise SystemExit(2)
    else:
        parser.error("Specify --self-test or --report")


if __name__ == "__main__":
    main()
