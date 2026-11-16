#!/usr/bin/env python3
"""Build one safe, offline-only R19 R3 GitHub Actions candidate artifact.

NOT a Suite Release publisher. Only synthetic CI evidence from the native R3
runner is accepted. Produces no release, network request, app runtime change,
or user-source collection. All output must live outside the git checkout.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
import validate_r19_r3_candidate_receipt as Native

R2_HTML = "examples/TW_First_Result_Studio_R19_20261101.html"
R2_SHA = "33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a"
R3_HTML = "examples/" + Native.EXPECTED_HTML
ARTIFACT_FILES = (
    "R19_R3_CANDIDATE_NATIVE_REPORT.json",
    "R19_R3_CANDIDATE_VALIDATION_RECEIPT.json",
    "R19_R3_DESKTOP_SYNTHETIC.png",
    "R19_R3_MOBILE_SYNTHETIC.png",
)
EXPECTED_REPORT_KEYS = frozenset({
    "schema", "status", "html_file", "source_kind", "native_os_file_chooser_verified",
    "human_quality_verified", "network_requested", "page_errors", "scenarios",
    "html_sha256", "browser_version", "scenario_count", "passed",
})
README = """# TLS R19 R3｜離線 HTML 工程候選（非正式 Release）

這是 GitHub Actions 經驗證的 **獨立工程候選**，不是目前正式 Suite 17.4.0。
開啟 TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html，
可在支援的桌面瀏覽器以 file:// 離線使用原創示例。
不需要 API Key；不連接雲端模型；不替使用者自動批准用詞。
請自行確認有權處理的文字，保護下載的私人新稿。

檔名顯示已於候選版移除部分不可見方向控制字元，且保留副檔名提示。
這不表示能識別所有 Unicode 同形異字，也不是 OS 原生選檔取消測試。
本封包只含原創合成測試資料、9 情境 Chromium 測試報告及截圖；
不含真實使用者文本、真人品質審查、翻譯正確率或採用率證據。

本包 SHA256SUMS.txt 核對的是檔案位元組，不代表語意或權利認證。
正式產品仍請由 GitHub Releases 最新頁取得，勿把本包稱作正式版。
"""


class Blocked(ValueError):
    pass


def ensure(condition: bool, code: str) -> None:
    if not condition:
        raise Blocked(code)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_bytes(path: Path, limit: int = 5_000_000) -> bytes:
    ensure(path.is_file() and not path.is_symlink(), "INPUT_MISSING_OR_SYMLINK")
    ensure(0 < path.stat().st_size <= limit, "INPUT_SIZE")
    return path.read_bytes()


def checked_destination(root: Path, stage: Path) -> Path:
    ensure(not stage.is_symlink(), "STAGE_SYMLINK")
    original = stage.resolve()
    ensure(not original.is_relative_to(root.resolve()), "STAGE_INSIDE_SOURCE")
    ensure(not stage.exists() or (stage.is_dir() and not any(stage.iterdir())),
           "STAGE_MUST_BE_EMPTY")
    return stage


def build(root: Path, evidence: Path, stage: Path, expected_git_sha: str) -> dict:
    ensure(len(expected_git_sha) == 40 and all(c in "0123456789abcdef" for c in expected_git_sha),
           "GIT_SHA_INVALID")
    checked_destination(root, stage)
    actual_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    ensure(actual_sha == expected_git_sha, "GIT_CHECKOUT_MISMATCH")
    ensure(sha(safe_bytes(root / R2_HTML)) == R2_SHA, "FROZEN_R19_R2_CHANGED")
    r3bytes = safe_bytes(root / R3_HTML)
    ensure(sha(r3bytes) == Native.EXPECTED_HTML_SHA, "CANDIDATE_HTML_DRIFT")
    Native.validate(root, evidence)
    report = json.loads(safe_bytes(evidence / ARTIFACT_FILES[0], 65_536).decode("utf-8"))
    ensure(set(report) == EXPECTED_REPORT_KEYS, "UNEXPECTED_REPORT_FIELD_OR_SOURCE_LEAK")
    receipt = json.loads(safe_bytes(evidence / ARTIFACT_FILES[1], 65_536).decode("utf-8"))
    ensure(receipt.get("status") == "PASS_CANDIDATE_ONLY"
           and receipt.get("candidate_sha256") == Native.EXPECTED_HTML_SHA
           and receipt.get("release_permission") == "NONE", "UNVERIFIED_RECEIPT")
    files = {
        Native.EXPECTED_HTML: r3bytes,
        "README_NOT_RELEASED.md": README.encode("utf-8"),
    }
    for name in ARTIFACT_FILES:
        files[name] = safe_bytes(evidence / name)
    metadata = {
        "schema": "tls.r19-r3.candidate-artifact.v1",
        "status": "CANDIDATE_ONLY_NOT_RELEASED",
        "ci_checkout_sha": expected_git_sha,
        "candidate_html": Native.EXPECTED_HTML,
        "candidate_html_sha256": Native.EXPECTED_HTML_SHA,
        "previous_release": "all-tools-suite-v17.4.0",
        "previous_r19_r2_sha256": R2_SHA,
        "native_file_url_scenarios_passed": 9,
        "receipt_status": "PASS_CANDIDATE_ONLY",
        "permission_to_publish_or_merge": "NONE",
        "native_os_chooser_cancel_verified": False,
        "human_quality_verified": False,
        "adoption_measured": False,
        "user_data_included": False,
        "assets": [
            {"name": name, "bytes": len(data), "sha256": sha(data)}
            for name, data in sorted(files.items())
        ],
    }
    files["CANDIDATE_MANIFEST.json"] = (
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    checksums = "".join(f"{sha(data)}  {name}\n" for name, data in sorted(files.items()))
    files["SHA256SUMS.txt"] = checksums.encode("ascii")
    stage.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        ensure(Path(name).name == name, "UNSAFE_OUTPUT_NAME")
        (stage / name).write_bytes(data)
    for item in stage.iterdir():
        ensure(item.is_file() and not item.is_symlink(), "STAGE_FILE_INVALID")
        ensure(item.read_bytes() == files[item.name], "STAGE_BYTE_MISMATCH")
    return metadata


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, type=Path)
    ap.add_argument("--evidence", required=True, type=Path)
    ap.add_argument("--stage", required=True, type=Path)
    ap.add_argument("--expected-sha", required=True)
    args = ap.parse_args(argv)
    result = build(args.root.resolve(), args.evidence.resolve(),
                   args.stage, args.expected_sha)
    print("R19_R3_OFFLINE_CANDIDATE_ARTIFACT_PASS",
          len(result["assets"]), "files, html", result["candidate_html_sha256"])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError, UnicodeError,
            json.JSONDecodeError) as exc:
        print("R19_R3_OFFLINE_CANDIDATE_BLOCKED", type(exc).__name__, str(exc)[:160],
              file=sys.stderr)
        raise SystemExit(2)
