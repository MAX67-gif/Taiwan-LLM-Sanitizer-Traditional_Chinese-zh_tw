"""R199 original Release byte verifier: all tests are offline synthetic negative controls."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import check_suite_175_official_sources as R199


class OfficialPriorByteGate(unittest.TestCase):
    def test_01_pinned_official_29_contract_and_security_edges(self):
        pinned = R199.pin_rows(R199.load_json(R199.PIN_FILE))
        self.assertEqual(len(pinned), 29)
        self.assertEqual(pinned[R199.SUITE_ZIP][1], R199.SUITE_SHA)
        self.assertEqual(pinned["TLS_Chrome_MV3_R5_20261024.zip"][1],
                         "0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5")

    def test_02_pins_cannot_claim_publish_or_change_baseline(self):
        src = R199.load_json(R199.PIN_FILE)
        for change in (
            lambda x: x.update(promotion_permission="PUBLISH"),
            lambda x: x.update(release_target_sha="1" * 40),
            lambda x: x.update(human_quality_verified=True),
            lambda x: x["assets"].pop(),
            lambda x: x["assets"].append(x["assets"][0].copy()),
            lambda x: x["assets"][0].update(sha256="0" * 64),
            lambda x: x["assets"][0].update(size=-1),
            lambda x: x["assets"][0].update(name="../../bad"),
        ):
            copy = json.loads(json.dumps(src))
            change(copy)
            with self.assertRaises(R199.SourceRejected):
                R199.pin_rows(copy)

    def synthetic(self):
        blobs = {"test-a.txt": b"original-A", "test-b.zip": b"original-B"}
        pinned = {n: (len(b), hashlib.sha256(b).hexdigest()) for n, b in blobs.items()}
        release = {"tag_name": R199.TAG, "target_commitish": R199.TARGET_SHA,
                   "draft": False, "prerelease": False,
                   "assets": [{"name": n, "size": len(b),
                               "digest": "sha256:" + pinned[n][1],
                               "browser_download_url": R199.SOURCE_URL + n}
                              for n, b in blobs.items()]}
        return blobs, pinned, release

    def test_03_synthetic_original_bytes_can_pass_local_negative_control(self):
        blobs, pinned, release = self.synthetic()
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for n, b in blobs.items():
                (root / n).write_bytes(b)
            R199.verify_release_metadata(release, pinned)
            self.assertEqual(R199.verify_downloaded_bytes(root, pinned),
                             sum(len(b) for b in blobs.values()))

    def test_04_missing_extra_or_modified_byte_fails_closed(self):
        blobs, pinned, _ = self.synthetic()
        for change in ("missing", "extra", "modified", "same-size"):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                for n, b in blobs.items():
                    (root / n).write_bytes(b)
                if change == "missing":
                    (root / "test-a.txt").unlink()
                elif change == "extra":
                    (root / "extra").write_bytes(b"x")
                elif change == "modified":
                    (root / "test-b.zip").write_bytes(b"replacement")
                else:
                    (root / "test-a.txt").write_bytes(b"ORIGINAL-A")
                with self.assertRaises(R199.SourceRejected):
                    R199.verify_downloaded_bytes(root, pinned)

    def test_05_symlink_to_outside_never_accepted(self):
        blobs, pinned, _ = self.synthetic()
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            external = root / "outside"
            external.mkdir()
            (external / "original").write_bytes(blobs["test-a.txt"])
            (root / "test-a.txt").symlink_to(external / "original")
            (root / "test-b.zip").write_bytes(blobs["test-b.zip"])
            with self.assertRaisesRegex(R199.SourceRejected, "UNSAFE_ASSET_PATH"):
                R199.verify_downloaded_bytes(root, pinned)

    def test_06_release_metadata_cannot_substitute_api_digest_for_file_bytes(self):
        blobs, pinned, release = self.synthetic()
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for n, b in blobs.items():
                (root / n).write_bytes(b)
            (root / "test-b.zip").write_bytes(b"not-" + blobs["test-b.zip"])
            R199.verify_release_metadata(release, pinned)
            with self.assertRaises(R199.SourceRejected):
                R199.verify_downloaded_bytes(root, pinned)

    def test_07_release_identity_url_extra_name_or_digest_changes_fail(self):
        _, pinned, release = self.synthetic()
        for change in (
            lambda x: x.update(tag_name="all-tools-suite-v17.5.0"),
            lambda x: x.update(draft=True),
            lambda x: x.update(target_commitish="a" * 40),
            lambda x: x["assets"][0].update(digest="sha256:" + "f" * 64),
            lambda x: x["assets"][0].update(browser_download_url="https://evil.invalid/x"),
            lambda x: x["assets"][0].update(name="../unsafe"),
            lambda x: x["assets"].append(x["assets"][0].copy()),
        ):
            copy = json.loads(json.dumps(release))
            change(copy)
            with self.assertRaises(R199.SourceRejected):
                R199.verify_release_metadata(copy, pinned)

    def test_08_json_duplicate_keys_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "dup.json"
            p.write_text('{"hello":1,"hello":2}', encoding="utf-8")
            with self.assertRaises(R199.SourceRejected):
                R199.load_json(p)


if __name__ == "__main__":
    unittest.main()
