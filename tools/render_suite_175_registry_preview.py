#!/usr/bin/env python3
"""Produce a REAL 30-row registry *preview*, not a publishable registry/release.

Read-only by default; optionally writes just one byte-deterministic JSON outside
the checkout for the CI candidate-review artifact. Never touches canonical
release/all_tools_registry.json, historical assets, or GitHub Release endpoints.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import check_suite_175_promotion_plan as P
import build_all_tools_release as B

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = "SUITE_175_THIRTY_TOOLS_REGISTRY_PREVIEW.json"


class PreviewBlocked(ValueError):
    pass


def expect(ok, reason):
    if not ok:
        raise PreviewBlocked(reason)


def render(plan):
    P.validate(plan, sources=True)
    original = P.legacy_identity()
    rows = deepcopy(original["tools"])
    newest = deepcopy(plan["proposed"]["new_tool"])
    expect(len(rows) == 29, "EXISTING_29_MISSING")
    expect(newest["tool_id"] not in {x["tool_id"] for x in rows}, "DUPLICATE_TOOL")
    rows.append(newest)
    expect(len(rows) == 30 and
           [x["tool_id"] for x in rows[:29]] == plan["baseline"]["existing_tool_ids"],
           "APPEND_ONLY_MISMATCH")
    expect(original["tools"] == rows[:29], "HISTORICAL_ROWS_CHANGED")
    expect(sum(x.get("standalone_required") is True for x in rows) == 25,
           "STANDALONE_COUNT")
    expect(len({x["artifact_filename"] for x in rows if x.get("standalone_required")}) == 25,
           "STANDALONE_FILENAME_COLLISION")
    return {
        "schema": "tls.suite-175-registry-preview.v1",
        "status": "STRUCTURAL_PREVIEW_ONLY_NOT_PUBLISHABLE",
        "release_tag_not_created": "all-tools-suite-v17.5.0",
        "previous_official_release": original["release_tag"],
        "original_29_rows_copied_byte_logically": True,
        "future_suite_version": "17.5.0",
        "total_proposed_tools": len(rows),
        "previous_tool_count": 29,
        "new_tool_count": 1,
        "standalone_assets_planned": 25,
        "github_release_assets_planned": 30,
        "human_translation_quality_verified": False,
        "os_file_chooser_cancel_verified": False,
        "complete_future_suite_generated": False,
        "prior_assets_fresh_downloaded_this_run": False,
        "future_draft_fresh_download_verified": False,
        "future_published_download_verified": False,
        "publication_permission": "NONE",
        "merge_permission": "NONE",
        "tools": rows,
    }


def encoded(plan):
    return (json.dumps(render(plan), ensure_ascii=False, sort_keys=True, indent=2)
            + "\n").encode("utf-8")


def preview_output_path(path):
    expect(not path.is_symlink(), "OUTPUT_IS_SYMLINK")
    parent = path.parent.resolve()
    expect(not parent.is_relative_to(ROOT.resolve()), "OUTPUT_INSIDE_GIT_CHECKOUT")
    expect(not path.exists(), "OUTPUT_ALREADY_EXISTS")
    expect(path.name == OUTPUT_FILE, "OUTPUT_FILENAME_NOT_CANONICAL")
    return path


def main(argv=None):
    argp = argparse.ArgumentParser()
    argp.add_argument("--check", action="store_true")
    argp.add_argument("--output", type=Path)
    argp.add_argument("--expected-sha")
    args = argp.parse_args(argv)
    expect(args.check ^ (args.output is not None), "CHOOSE_CHECK_OR_OUTPUT")
    plan = P.safe_json(P.CONTRACT)
    raw = encoded(plan)
    if args.check:
        print("SUITE_175_APPEND_ONLY_PREVIEW_30_ROWS_PASS_NO_RELEASE", hashlib.sha256(raw).hexdigest())
        return 0
    expect(args.expected_sha is not None and len(args.expected_sha) == 40 and
           all(c in "0123456789abcdef" for c in args.expected_sha), "EXPECTED_SHA_REQUIRED")
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    expect(head == args.expected_sha, "CHECKOUT_SHA_DOES_NOT_MATCH")
    destination = preview_output_path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    expect(destination.read_bytes() == raw, "OUTPUT_BYTE_MISMATCH")
    print("SUITE_175_REVIEW_REGISTRY_WRITTEN_NO_RELEASE", hashlib.sha256(raw).hexdigest(),
          "tools", 30)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError, UnicodeError,
            json.JSONDecodeError) as error:
        print("SUITE_175_PREVIEW_BLOCKED", type(error).__name__, str(error)[:150],
              file=sys.stderr)
        raise SystemExit(2)
