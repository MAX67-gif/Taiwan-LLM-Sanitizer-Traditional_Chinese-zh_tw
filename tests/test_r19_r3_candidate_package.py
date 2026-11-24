"""R19 R3 artifact safety tests. All positive fixture evidence is synthetic."""
from __future__ import annotations

import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import package_r19_r3_candidate as P


def fixture_report():
    return {
        "schema": "tls.r19-r3.native-preview.v1",
        "status": "PASS",
        "html_file": P.Native.EXPECTED_HTML,
        "source_kind": "CANDIDATE_NOT_RELEASED",
        "native_os_file_chooser_verified": False,
        "human_quality_verified": False,
        "network_requested": False,
        "page_errors": 0,
        "scenarios": [
            {"id": ident, "status": "PASS"}
            for ident in P.Native.SCENARIOS
        ],
        "html_sha256": P.Native.EXPECTED_HTML_SHA,
        "browser_version": "140.0.7339.16",
        "scenario_count": 9,
        "passed": 9,
    }


class CandidatePackageSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()

    def prepare_evidence(self, directory, report=None, receipt=None):
        directory.mkdir(exist_ok=True)
        data = fixture_report() if report is None else report
        (directory / P.ARTIFACT_FILES[0]).write_text(json.dumps(data), "utf-8")
        if receipt is None:
            receipt = {
                "status": "PASS_CANDIDATE_ONLY",
                "candidate_sha256": P.Native.EXPECTED_HTML_SHA,
                "release_permission": "NONE",
            }
        (directory / P.ARTIFACT_FILES[1]).write_text(json.dumps(receipt), "utf-8")
        for name in P.ARTIFACT_FILES[2:]:
            (directory / name).write_bytes(b"SYNTHETIC_PNG_TEST_PLACEHOLDER")

    def synthetic_build(self, directory, report=None, receipt=None):
        evidence, stage = directory / "evidence", directory / "stage"
        self.prepare_evidence(evidence, report=report, receipt=receipt)
        # No browser result is spoofed: this patches ONLY package assembly
        # for test of checksum and source-boundary enforcement.
        with mock.patch.object(P.Native, "validate", return_value={"status": "SYNTHETIC_ONLY"}):
            out = P.build(ROOT, evidence, stage, self.head)
        return out, stage

    def test_01_frozen_r2_and_new_r3_sha_are_pinned_independently(self):
        self.assertEqual(
            hashlib.sha256((ROOT / P.R2_HTML).read_bytes()).hexdigest(), P.R2_SHA
        )
        self.assertEqual(
            hashlib.sha256((ROOT / P.R3_HTML).read_bytes()).hexdigest(),
            P.Native.EXPECTED_HTML_SHA,
        )
        self.assertNotEqual(P.R2_SHA, P.Native.EXPECTED_HTML_SHA)
        self.assertIn("非正式", P.README)
        self.assertIn("NOT RELEASED".lower(), P.README.lower().replace("非正式", "not released"))

    def test_02_synthetic_package_manifest_checksum_and_no_promotion(self):
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-fixture-") as folder:
            metadata, stage = self.synthetic_build(Path(folder))
            names = {p.name for p in stage.iterdir()}
            self.assertEqual(len(names), 8)
            self.assertEqual(len(metadata["assets"]), 6)
            self.assertEqual(metadata["permission_to_publish_or_merge"], "NONE")
            self.assertFalse(metadata["native_os_chooser_cancel_verified"])
            self.assertFalse(metadata["human_quality_verified"])
            self.assertFalse(metadata["adoption_measured"])
            self.assertEqual(metadata["previous_release"], "all-tools-suite-v17.4.0")
            manifest = json.loads((stage / "CANDIDATE_MANIFEST.json").read_text("utf-8"))
            self.assertEqual(manifest["status"], "CANDIDATE_ONLY_NOT_RELEASED")
            for line in (stage / "SHA256SUMS.txt").read_text("ascii").splitlines():
                digest, filename = line.split("  ", 1)
                self.assertEqual(hashlib.sha256((stage / filename).read_bytes()).hexdigest(),
                                 digest)
            self.assertNotIn("USER_PRIVATE_TEXT", json.dumps(manifest))

    def test_03_rejects_misleading_or_leaky_synthetic_receipts(self):
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-fixture-") as folder:
            folder = Path(folder)
            evidence = folder / "evidence"
            report = fixture_report()
            report["user_source"] = "USER_PRIVATE_TEXT"
            self.prepare_evidence(evidence, report=report)
            with mock.patch.object(P.Native, "validate", return_value={}):
                with self.assertRaisesRegex(P.Blocked, "UNEXPECTED_REPORT_FIELD"):
                    P.build(ROOT, evidence, folder / "out", self.head)
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-fixture-") as folder:
            evidence, stage = Path(folder) / "evidence", Path(folder) / "out"
            receipt = {
                "status": "PASS_CANDIDATE_ONLY",
                "candidate_sha256": "0" * 64,
                "release_permission": "NONE",
            }
            self.prepare_evidence(evidence, receipt=receipt)
            with mock.patch.object(P.Native, "validate", return_value={}):
                with self.assertRaisesRegex(P.Blocked, "UNVERIFIED_RECEIPT"):
                    P.build(ROOT, evidence, stage, self.head)

    def test_04_rejects_bad_git_head_or_inside_checkout_output(self):
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-fixture-") as folder:
            directory = Path(folder)
            evidence = directory / "evidence"
            self.prepare_evidence(evidence)
            with mock.patch.object(P.Native, "validate", return_value={}):
                with self.assertRaisesRegex(P.Blocked, "GIT_CHECKOUT_MISMATCH"):
                    P.build(ROOT, evidence, directory / "stage", "0" * 40)
            with self.assertRaisesRegex(P.Blocked, "STAGE_INSIDE_SOURCE"):
                P.checked_destination(ROOT, ROOT / "tests" / "not-real-output")
            not_empty = directory / "nonempty"
            not_empty.mkdir()
            (not_empty / "sentinel").write_text("no-overwrite", "utf-8")
            with self.assertRaisesRegex(P.Blocked, "STAGE_MUST_BE_EMPTY"):
                P.checked_destination(ROOT, not_empty)

    def test_05_must_check_native_receipt_before_any_archive_write(self):
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-fixture-") as folder:
            directory = Path(folder)
            evidence, stage = directory / "evidence", directory / "stage"
            self.prepare_evidence(evidence)
            with mock.patch.object(P.Native, "validate", side_effect=P.Native.Rejected("NOT_NATIVE")):
                with self.assertRaisesRegex(P.Native.Rejected, "NOT_NATIVE"):
                    P.build(ROOT, evidence, stage, self.head)
            self.assertFalse(stage.exists(), "no partially staged HTML on native failure")

    def test_06_ci_candidate_upload_requires_native_receipt_and_never_publishes(self):
        workflow = (ROOT / ".github/workflows/ci.yml").read_text("utf-8")
        evidence = "Independently validate R19 R3 candidate native report and screenshot widths"
        stage = "Build SHA-locked R19 R3 candidate artifact after native receipt"
        upload = "Upload R19 R3 offline HTML engineering candidate (NOT RELEASED)"
        self.assertEqual(workflow.count(evidence), 1)
        self.assertEqual(workflow.count(stage), 1)
        self.assertEqual(workflow.count(upload), 1)
        self.assertLess(workflow.index(evidence), workflow.index(stage))
        self.assertLess(workflow.index(stage), workflow.index(upload))
        excerpt = workflow[workflow.index("      - name: " + upload):]
        excerpt = excerpt.split("\n      - ", 1)[0]
        self.assertIn("if-no-files-found: error", excerpt)
        self.assertIn("TLS_R19_R3_OFFLINE_HTML_CANDIDATE_NOT_RELEASED", excerpt)
        self.assertIn("tools/package_r19_r3_candidate.py", workflow)
        self.assertNotIn("gh release create", excerpt.split("      - name:", 1)[0])


    def test_07_png_receipt_rejects_fake_header_crc_zlib_filters_and_trailing(self):
        import zlib

        def chunk(kind, payload):
            return (len(payload).to_bytes(4, "big") + kind + payload
                    + (zlib.crc32(kind + payload) & 0xffffffff).to_bytes(4, "big"))

        width, height = 350, 400
        rgb = b"".join(
            b"\x00" + bytes(((j * 13 + i * 17) & 255 for j in range(width * 3)))
            for i in range(height)
        )
        ihdr = (width.to_bytes(4, "big") + height.to_bytes(4, "big")
                + bytes([8, 2, 0, 0, 0]))
        prefix = b"\x89PNG\r\n\x1a\n"
        png = prefix + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(rgb)) + chunk(b"IEND", b"")
        self.assertGreater(len(png), 1024)
        with tempfile.TemporaryDirectory(prefix="tls-r19-r3-png-") as folder:
            path = Path(folder) / "synthetic.png"
            path.write_bytes(png)
            self.assertEqual(P.Native.png(path, width=350)["height"], height)
            with self.assertRaisesRegex(P.Native.Rejected, "PNG_WRONG_VIEWPORT_WIDTH"):
                P.Native.png(path, width=390)
            bad_crc = bytearray(png)
            bad_crc[29] ^= 1
            mutations = [
                bytes(bad_crc),
                prefix + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"\x00")) + chunk(b"IEND", b""),
                prefix + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"\x05" + rgb[1:])) + chunk(b"IEND", b""),
                png[:-12],
                png + b"extra",
                prefix + b"\x00" * 1500,
            ]
            for idx, altered in enumerate(mutations):
                with self.subTest(mutation=idx), self.assertRaises(P.Native.Rejected):
                    path.write_bytes(altered)
                    P.Native.png(path)


if __name__ == "__main__":
    unittest.main()
