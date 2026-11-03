#!/usr/bin/env python3
"""Deterministic public-only artifact for R19 file-I/O subsystem EVALUATION.

Does not contain the original private R19 HTML, credentials, or user samples.
A PASS here cannot grant full R19 native acceptance or a product release.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import subprocess
import sys
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from test_r19_file_io_receipt import synthetic_good, verify

NAME = "TLS_R19_FileIO_Evaluation_R1_20261103.zip"
FILES = (
    "LICENSE",
    "src/r19/file_io_boundary_r19.js",
    "src/r19/README.md",
    "tests/test_r19_file_io_boundary.test.js",
    "tests/fixtures/r19_file_io_boundary.html",
    "tests/test_r19_file_io_boundary.browser.py",
    "tests/test_r19_file_io_receipt.py",
    "tools/package_r19_fileio_shadow.py",
)
REPORT_NAME = "EVIDENCE/R19_FILEIO_NATIVE_SYNTHETIC.json"
MANIFEST_NAME = "CHECKSUM_MANIFEST.json"
README_NAME = "00_READ_ME_FIRST.txt"
MAX_INPUT_BYTES = 512 * 1024


def fail(code: str):
    raise ValueError("EVAL_ARCHIVE_" + code)


def sha(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def normalized_json(obj) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, sort_keys=True,
                       separators=(",", ":")) + "\n").encode("utf-8")


def tracked_source():
    output = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True
    ).stdout
    return set(x.decode("utf-8") for x in output.split(b"\0") if x)


def zipinfo(path):
    info = ZipInfo(filename=path, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    info.create_system = 3
    return info


def build(report: dict) -> bytes:
    verify(report)   # exact keys, real file://, 43/43 bytes and NOT_RUN status
    tracked = tracked_source()
    payload = {}
    manifest_files = []
    for name in FILES:
        if name not in tracked or name.startswith("/") or ".." in Path(name).parts:
            fail("UNTRACKED_OR_UNSAFE_SOURCE")
        path = ROOT / name
        if path.is_symlink() or not path.is_file():
            fail("SYMLINK_OR_MISSING_SOURCE")
        raw = path.read_bytes()
        if not raw or len(raw) > MAX_INPUT_BYTES:
            fail("SOURCE_SIZE")
        payload[name] = raw
        manifest_files.append({"path": name, "bytes": len(raw), "sha256": sha(raw)})
    evidence = normalized_json(report)
    payload[REPORT_NAME] = evidence
    info = (
        "TLS R19 FILE I/O EVALUATION ONLY - NOT ORIGINAL R19 PRODUCT.\n"
        "Tested synthetic, no-egress import and CRLF file download boundary.\n"
        "Original R19 native ten-scenario acceptance: NOT_RUN (0/10).\n"
        "Current public Suite 17.3.2 and its 28 tools remain unchanged.\n"
        "This archive is NOT a release and does NOT contain original R19 HTML.\n"
        "The included LICENSE records the original MIT open-source terms.\n"
        "No user-supplied documents or personal paths were packaged.\n"
    ).encode("utf-8")
    payload[README_NAME] = info
    payload[MANIFEST_NAME] = normalized_json({
        "schema": "tls.r19.fileio.evaluation-archive.v1",
        "evaluation_only": True,
        "full_r19_native_acceptance": "NOT_RUN",
        "release_permission": "NONE",
        "suite_baseline": "17.3.2",
        "files": sorted(manifest_files, key=lambda x: x["path"]),
        "native_report_sha256": sha(evidence),
        "native_report_path": REPORT_NAME,
        "report_check_count": 12,
        "input_source_file_count": len(FILES),
    })
    bio = io.BytesIO()
    with ZipFile(bio, "w", compression=ZIP_DEFLATED, compresslevel=9) as target:
        for name in sorted(payload):
            target.writestr(zipinfo(name), payload[name])
    contents = bio.getvalue()
    with ZipFile(io.BytesIO(contents), "r") as check:
        if check.testzip() is not None:
            fail("CRC")
        if check.namelist() != sorted(payload):
            fail("ORDER_OR_ENTRIES")
        for name, data in payload.items():
            if check.read(name) != data:
                fail("BYTE_PARITY")
        obj = json.loads(check.read(MANIFEST_NAME))
        if len(obj.get("files", [])) != len(FILES):
            fail("MANIFEST_COUNT")
        for item in obj["files"]:
            raw = check.read(item["path"])
            if len(raw) != item["bytes"] or sha(raw) != item["sha256"]:
                fail("MANIFEST_SHA")
        if sha(check.read(REPORT_NAME)) != obj.get("native_report_sha256"):
            fail("REPORT_SHA")
    return contents


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--native-report", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        if args.self_test:
            a = build(synthetic_good())
            b = build(synthetic_good())
            if a != b:
                fail("NONDETERMINISTIC")
            print(json.dumps({"status": "PASS", "evaluation_only": True,
                              "deterministic_rebuild_equal": True,
                              "zip_sha256": sha(a), "native_full": "NOT_RUN"}))
            return
        if not args.native_report or not args.output:
            parser.error("Both --native-report and --output are required")
        report = json.loads(args.native_report.read_text("utf-8"))
        verify(report)
        if args.output.exists() or args.output.is_symlink():
            fail("REFUSE_OVERWRITE")
        if not args.output.parent.is_dir() or args.output.parent.is_symlink():
            fail("OUTPUT_PARENT")
        raw = build(report)
        args.output.write_bytes(raw)
        if sha(args.output.read_bytes()) != sha(raw):
            fail("WRITE_PARITY")
        print(json.dumps({"status": "PASS", "evaluation_only": True,
                          "zip": args.output.name, "bytes": len(raw),
                          "sha256": sha(raw), "full_r19_native": "NOT_RUN"}))
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        print("EVAL_ARCHIVE_FAILED_CLOSED", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
