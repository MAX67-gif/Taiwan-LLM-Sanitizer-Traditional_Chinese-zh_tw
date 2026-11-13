"""R193 positive and adversarial offline tests. No GitHub transport in tests."""
from __future__ import annotations
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import verify_release_snapshot_r193 as S


def sample():
    base = "https://github.com/" + S.REPOSITORY
    api = "https://api.github.com/repos/" + S.REPOSITORY
    release = {
        "id": S.EXPECTED_RELEASE_ID,
        "tag_name": S.EXPECTED_RELEASE_TAG,
        "target_commitish": S.EXPECTED_COMMIT,
        "published_at": S.EXPECTED_PUBLISHED_AT,
        "draft": False,
        "prerelease": False,
        "html_url": base + "/releases/tag/" + S.EXPECTED_RELEASE_TAG,
        "assets": [],
    }
    for index, (name, expected) in enumerate(sorted(S.EXPECTED_ASSETS.items())):
        id_ = 721000000 + index
        release["assets"].append({
            "id": id_, "name": name, "size": expected["bytes"],
            "digest": expected["sha256"], "state": "uploaded",
            "url": api + "/releases/assets/" + str(id_),
            "browser_download_url":
                base + "/releases/download/" + S.EXPECTED_RELEASE_TAG + "/" + name,
        })
    tag = {
        "ref": "refs/tags/" + S.EXPECTED_RELEASE_TAG,
        "url": api + "/git/refs/tags/" + S.EXPECTED_RELEASE_TAG,
        "object": {"sha": S.EXPECTED_COMMIT, "type": "commit"},
    }
    return release, tag


class R193ImmutableReleaseSnapshotTests(unittest.TestCase):
    def verify(self, edit_release=None, edit_tag=None):
        release, tag = sample()
        if edit_release:
            edit_release(release)
        if edit_tag:
            edit_tag(tag)
        return S.verify_snapshot(release, tag)

    def test_01_exact_synthetic_snapshot_passes_without_any_network_or_download(self):
        result = self.verify()
        self.assertEqual(result["state"], "PASS_METADATA_ONLY")
        self.assertEqual(result["asset_count"], 29)
        self.assertEqual(result["fresh_asset_byte_download_verification"],
                         "NOT_PERFORMED")
        self.assertFalse(result["new_release_created"])
        self.assertFalse(result["runtime_or_linguistic_quality_verified_here"])

    def test_02_bad_release_identity_and_wrong_draft_status_fail(self):
        for key, value in (
            ("id", 123), ("tag_name", "all-tools-suite-v99.0.0"),
            ("target_commitish", "0" * 40), ("published_at", None),
            ("draft", True), ("prerelease", True), ("html_url", "https://evil.test"),
        ):
            with self.subTest(key=key):
                with self.assertRaises(S.SnapshotRejected):
                    self.verify(lambda rel, k=key, v=value: rel.__setitem__(k, v))

    def test_03_tag_ref_independent_from_release_claim(self):
        modifications = (
            lambda ref: ref["object"].__setitem__("sha", "0" * 40),
            lambda ref: ref["object"].__setitem__("type", "tag"),
            lambda ref: ref.__setitem__("ref", "refs/tags/other"),
            lambda ref: ref.__setitem__("url", "https://evil.test/tag"),
            lambda ref: ref.__setitem__("object", None),
        )
        for i, modify in enumerate(modifications):
            with self.subTest(case=i), self.assertRaises(S.SnapshotRejected):
                self.verify(edit_tag=modify)

    def test_04_all_29_asset_hashes_and_byte_lengths_are_independently_pinned(self):
        for idx in range(29):
            with self.subTest(asset=idx, kind="digest"):
                with self.assertRaisesRegex(S.SnapshotRejected, "ASSET_DIGEST_CHANGED"):
                    self.verify(lambda r, i=idx: r["assets"][i].__setitem__(
                        "digest", "sha256:" + "0" * 64))
            with self.subTest(asset=idx, kind="size"):
                with self.assertRaisesRegex(S.SnapshotRejected, "ASSET_SIZE_CHANGED"):
                    self.verify(lambda r, i=idx: r["assets"][i].__setitem__(
                        "size", r["assets"][i]["size"] + 1))

    def test_05_missing_duplicate_extra_or_invalid_url_rejected(self):
        modifications = (
            lambda r: r["assets"].pop(),
            lambda r: r["assets"].append(copy.deepcopy(r["assets"][0])),
            lambda r: r["assets"][0].__setitem__("name", "fake_asset.txt"),
            lambda r: r["assets"][0].__setitem__("state", "deleted"),
            lambda r: r["assets"][0].__setitem__("id", -1),
            lambda r: r["assets"][0].__setitem__("url", "https://evil.test"),
            lambda r: r["assets"][0].__setitem__("browser_download_url", "https://evil.test"),
        )
        for i, modify in enumerate(modifications):
            with self.subTest(case=i), self.assertRaises(S.SnapshotRejected):
                self.verify(edit_release=modify)

    def test_06_json_parser_rejects_duplicate_keys_and_symlinks(self):
        with tempfile.TemporaryDirectory(prefix="tls-r193-") as folder:
            folder = Path(folder)
            path = folder / "release.json"
            path.write_text('{"tag_name":"a","tag_name":"b"}', "utf-8")
            with self.assertRaisesRegex(S.SnapshotRejected, "DUPLICATE_JSON_KEY"):
                S.strict_json(path)
            path.write_text("{}", "utf-8")
            self.assertEqual(S.strict_json(path), {})
            link = folder / "alias.json"
            link.symlink_to(path)
            with self.assertRaisesRegex(S.SnapshotRejected, "INPUT_NOT_REGULAR"):
                S.strict_json(link)

    def test_07_receipt_contains_metadata_only_and_never_claims_fresh_download(self):
        release, ref = sample()
        with tempfile.TemporaryDirectory(prefix="tls-r193-") as folder:
            folder = Path(folder)
            a, b, c = [folder / name for name in ("release.json", "ref.json", "receipt.json")]
            a.write_text(json.dumps(release), "utf-8")
            b.write_text(json.dumps(ref), "utf-8")
            self.assertEqual(S.main(["--release-json", str(a), "--tag-ref-json", str(b),
                                     "--receipt", str(c)]), 0)
            receipt = json.loads(c.read_text("utf-8"))
            self.assertEqual(receipt["state"], "PASS_METADATA_ONLY")
            self.assertIn("NOT_PERFORMED",
                          receipt["fresh_asset_byte_download_verification"])
            self.assertNotIn("original_text", json.dumps(receipt))


if __name__ == "__main__":
    unittest.main()
