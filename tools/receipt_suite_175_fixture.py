#!/usr/bin/env python3
"""CI-only R198 source-pinned 17.5 full 30-asset fixture receipt.

No official downloads, no fixture binaries in artifact, no release/tag write.
R5/R6 old binary bytes are synthetic substitutions and NEVER publication proof.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import build_suite_175_fixture as Fixture
import build_all_tools_release as Legacy


ROOT = Path(__file__).resolve().parents[1]


class ReceiptBlocked(ValueError):
    pass


def ensure(ok, reason):
    if not ok:
        raise ReceiptBlocked(reason)


def verify_and_write(path: Path, expected_sha: str):
    ensure(Legacy.GIT_SHA.fullmatch(expected_sha) is not None,
           "GIT_SHA_40_HEX_REQUIRED")
    actual = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    ensure(actual == expected_sha, "CI_SOURCE_SHA_MISMATCH")
    ensure(not path.is_symlink() and not path.exists(), "RECEIPT_OVERWRITE_FORBIDDEN")
    ensure(not path.resolve().is_relative_to(ROOT.resolve()),
           "RECEIPT_INSIDE_SOURCE_FORBIDDEN")
    from tests.test_all_tools_release import FullSuiteSafetyContract as Original
    Original.setUpClass()
    try:
        output = Original.root / "r198-stage"
        Fixture.prepare_fixture(Original.stage, output, Original.fixture_registry)
        receipt = Fixture.check_fixture(output)
        ensure(receipt["fixture_only"] is True and
               receipt["published_or_publishable"] is False,
               "FIXTURE_PERMISSION_BOUNDARY")
        stage_file_names = sorted(p.name for p in output.iterdir())
        ensure(len(stage_file_names) == 30, "FULL_30_ASSET_COUNT_CHANGED")
        final = {
            **receipt,
            "ci_source_git_sha": expected_sha,
            "stage_expected_names": stage_file_names,
            "real_release_assets_freshly_downloaded": 0,
            "real_release_publisher_invoked": False,
            "account_authorization_claim": "NONE",
            "test_fixture_binary_artifacts_shared": False,
            "receipt_scope": "STRUCTURAL_FIXTURE_ONLY",
        }
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(
            json.dumps(final,ensure_ascii=False,sort_keys=True,indent=2)+"\n",
            encoding="utf-8")
        ensure(path.is_file() and path.stat().st_size < 16_384,
               "RECEIPT_NOT_BOUNDED")
        print("R198_FULL_30_TOOL_FIXTURE_METADATA_RECEIPT_ONLY_PASS",
              receipt["tool_count"],receipt["stage_file_count"],expected_sha)
        return final
    finally:
        Original.tearDownClass()


def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument("--receipt",required=True,type=Path)
    parser.add_argument("--expected-sha",required=True)
    args=parser.parse_args(argv)
    verify_and_write(args.receipt,args.expected_sha)


if __name__=="__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, RuntimeError) as error:
        print("R198_FULL_FIXTURE_BLOCKED",type(error).__name__,str(error)[:140],
              file=sys.stderr)
        raise SystemExit(2)
