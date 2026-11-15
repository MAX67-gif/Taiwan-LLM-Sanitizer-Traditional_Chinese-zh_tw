#!/usr/bin/env python3
"""R199 read-only official Suite 17.4.0 29-asset byte gate for Suite 17.5.
This module never creates, edits, uploads or publishes a release.
Only an independent, fresh full-asset download may pass its byte gate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIN_FILE = ROOT / "tools/contracts/suite_175_official_174_source_pins.json"
TAG = "all-tools-suite-v17.4.0"
TARGET_SHA = "92924ba947c1a5dd14ad79b8937f0f9aa9c23de0"
REPO = "MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"
SUITE_ZIP = "TLS_ALL_TOOLS_SUITE_17_4_0.zip"
SUITE_SHA = "421368ab718528bc23e79b49f158a332f86cd62c03031057c992f5f7bb4ebb75"
SOURCE_URL = "https://github.com/" + REPO + "/releases/download/" + TAG + "/"
HEX = re.compile(r"[0-9a-f]{64}\Z")
NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,159}\Z")
PIN_SCHEMA = "tls.suite-175.source-bytes-pin.v1"
RECEIPT_SCHEMA = "tls.suite-175.official-source-byte-audit.v1"


class SourceRejected(ValueError):
    pass


def require(ok: bool, code: str) -> None:
    if not ok:
        raise SourceRejected("R199_" + code)


def strict_object(pairs):
    obj = {}
    for key, value in pairs:
        require(key not in obj, "DUPLICATE_JSON_KEY")
        obj[key] = value
    return obj


def load_json(path: Path):
    require(path.is_file() and not path.is_symlink(), "INPUT_NOT_PLAIN_FILE")
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=strict_object)
    except (UnicodeError, ValueError) as exc:
        raise SourceRejected("R199_INVALID_JSON") from exc
    require(isinstance(data, dict), "EXPECTED_JSON_OBJECT")
    return data


def pin_rows(pin):
    require(isinstance(pin, dict) and pin.get("schema") == PIN_SCHEMA and
            pin.get("status") == "READ_ONLY_PRIOR_RELEASE_ASSET_PINS" and
            pin.get("release_tag") == TAG and
            pin.get("release_target_sha") == TARGET_SHA and
            pin.get("tool_count") == 29 and
            pin.get("asset_count") == 29 and
            pin.get("promotion_permission") == "NONE" and
            pin.get("human_quality_verified") is False, "PIN_CONTRACT_CHANGED")
    rows = pin.get("assets")
    require(isinstance(rows, list) and len(rows) == 29, "EXPECTED_29_ASSET_PINS")
    result = {}
    for row in rows:
        require(isinstance(row, dict) and set(row) == {"name", "size", "sha256"},
                "PIN_ROW_SHAPE")
        name, size, digest = row["name"], row["size"], row["sha256"]
        require(isinstance(name, str) and NAME.fullmatch(name) is not None and
                name not in result, "PIN_NAME_INVALID_OR_DUPLICATE")
        require(type(size) is int and 0 < size <= 16_000_000 and
                isinstance(digest, str) and HEX.fullmatch(digest) is not None,
                "PIN_SIZE_OR_SHA")
        result[name] = (size, digest)
    require(result.get(SUITE_ZIP, (None, None))[1] == SUITE_SHA,
            "OFFICIAL_SUITE_ZIP_PIN_CHANGED")
    require(result.get("TLS_Chrome_MV3_R5_20261024.zip", (None, None))[1] ==
            "0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5",
            "ORIGINAL_R5_PIN_CHANGED")
    require(result.get("TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip", (None, None))[1] ==
            "2d216971eb01b9f982fd7ccb38c0b2070cf1e3da44e4e4bdfcdbc55577b6f92b",
            "ORIGINAL_R6_PIN_CHANGED")
    require(result.get("TW_First_Result_Studio_R19_20261101.html", (None, None))[1] ==
            "33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a",
            "ORIGINAL_R19_PIN_CHANGED")
    return result


def verify_release_metadata(release, pinned):
    require(isinstance(release, dict) and release.get("tag_name") == TAG and
            release.get("target_commitish") == TARGET_SHA and
            release.get("draft") is False and release.get("prerelease") is False,
            "RELEASE_IDENTITY_MISMATCH")
    assets = release.get("assets")
    require(isinstance(assets, list) and len(assets) == len(pinned),
            "RELEASE_ASSET_COUNT")
    seen = set()
    for a in assets:
        require(isinstance(a, dict) and isinstance(a.get("name"), str),
                "RELEASE_ASSET_SHAPE")
        name = a["name"]
        require(name in pinned and name not in seen, "RELEASE_UNPINNED_OR_DUPLICATE")
        seen.add(name)
        require(a.get("size") == pinned[name][0] and
                a.get("digest") == "sha256:" + pinned[name][1], "RELEASE_PIN_DRIFT")
        require(a.get("browser_download_url") == SOURCE_URL + name,
                "RELEASE_UNTRUSTED_DOWNLOAD_URL")
    require(seen == set(pinned), "RELEASE_ASSET_SET_MISMATCH")


def verify_downloaded_bytes(folder: Path, pinned):
    require(folder.is_dir() and not folder.is_symlink(), "DOWNLOAD_DIR_INVALID")
    files = list(folder.iterdir())
    require(len(files) == len(pinned) and {p.name for p in files} == set(pinned),
            "FRESH_DOWNLOAD_INCOMPLETE_OR_EXTRA")
    bytes_verified = 0
    for path in files:
        require(path.is_file() and not path.is_symlink(), "UNSAFE_ASSET_PATH")
        expected_size, expected_sha = pinned[path.name]
        require(path.stat().st_size == expected_size, "DOWNLOADED_SIZE_MISMATCH")
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(262144), b""):
                bytes_verified += len(chunk)
                digest.update(chunk)
        require(digest.hexdigest() == expected_sha, "DOWNLOADED_SHA_MISMATCH")
    require(bytes_verified == sum(row[0] for row in pinned.values()),
            "DOWNLOAD_BYTE_TOTAL_CHANGED")
    return bytes_verified


def audit(pin_file: Path, release_file: Path, assets_dir: Path):
    pinned = pin_rows(load_json(pin_file))
    verify_release_metadata(load_json(release_file), pinned)
    total = verify_downloaded_bytes(assets_dir, pinned)
    return {"schema": RECEIPT_SCHEMA,
            "status": "OFFICIAL_17_4_29_ORIGINAL_RELEASE_BYTES_VERIFIED_READ_ONLY",
            "release_tag": TAG, "official_source_asset_count": 29,
            "verified_download_bytes": total, "source_reconstruction_possible": True,
            "new_suite_17_5_built": False, "publisher_executed": False,
            "fresh_17_5_release_downloads_verified": False,
            "r19_r3_integrated_into_production": False,
            "release_permission": "NONE", "human_quality_verified": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-json", type=Path, required=True)
    parser.add_argument("--assets-dir", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(audit(PIN_FILE, args.release_json, args.assets_dir),
                     sort_keys=True, ensure_ascii=False, indent=2))
