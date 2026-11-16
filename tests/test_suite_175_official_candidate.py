"""R202 30-asset source-real candidate guards and negative-control tests.

Tests are synthetic unless explicitly run in CI with 29 newly downloaded
official Release assets. Do not report these unit tests as an official Release.
"""
import copy
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "tools"))
import build_all_tools_release as Legacy
import build_suite_175_official_candidate as B
import check_suite_175_official_candidate as V
import check_suite_175_official_sources as Source
import check_suite_175_promotion_plan as Plan
import render_suite_175_registry_preview as Preview


class R202RealSourceCandidateSafety(unittest.TestCase):
    def plan_and_pins(self):
        proposal = Plan.safe_json(Plan.CONTRACT)
        return Preview.render(proposal), Source.pin_rows(
            Source.load_json(Source.PIN_FILE))

    def synthetic_original_manifest(self):
        preview, pins = self.plan_and_pins()
        return {
            "schema": "tls.all-tools-release-manifest.v1",
            "suite_version": "17.4.0",
            "release_tag": Source.TAG,
            "is_fixture": False,
            "tool_count": 29,
            "tools": copy.deepcopy(preview["tools"][:29]),
            "artifacts": [
                {"name": n, "size": size, "sha256": digest}
                for n, (size, digest) in pins.items()
                if n not in B.OLD_METADATA
            ],
        }

    def test_01_29_official_pins_to_30_candidate_without_publisher(self):
        proposal, pins = self.plan_and_pins()
        self.assertEqual(len(pins), 29)
        self.assertEqual(proposal["total_proposed_tools"], 30)
        self.assertEqual(proposal["standalone_assets_planned"], 25)
        self.assertEqual(proposal["github_release_assets_planned"], 30)
        self.assertEqual(proposal["publication_permission"], "NONE")
        self.assertEqual(B.EXPECTED_ASSET_COUNT, 30)
        self.assertNotIn("FIXTURE", B.CANDIDATE_STATUS)
        self.assertTrue(B.SUITE_NAME.endswith("NOT_RELEASED.zip"))
        self.assertNotEqual(B.DEV_NAME, Legacy.DEVELOPER_BUNDLE)

    def test_02_official_original_registry_and_29_manifest_acceptance(self):
        preview, pins = self.plan_and_pins()
        old = self.synthetic_original_manifest()
        accepted = B.validated_previous_manifest(Legacy.json_bytes(old), preview, pins)
        self.assertEqual(len(accepted["artifacts"]), 24)
        self.assertEqual(accepted["tool_count"], 29)

    def test_03_old_tool_id_drift_or_mutated_origin_is_rejected(self):
        preview, pins = self.plan_and_pins()
        for mutate in (
            lambda d: d.update(is_fixture=True),
            lambda d: d.update(tool_count=30),
            lambda d: d.update(release_tag="all-tools-suite-v17.5.0"),
            lambda d: d["tools"].pop(),
            lambda d: d["tools"][0].update(expected_sha256="0" * 64),
            lambda d: d["tools"][0].update(family="DELETED"),
            lambda d: d["artifacts"][0].update(sha256="1" * 64),
            lambda d: d["artifacts"].pop(),
        ):
            value = copy.deepcopy(self.synthetic_original_manifest())
            mutate(value)
            with self.assertRaises(B.CandidateRejected):
                B.validated_previous_manifest(Legacy.json_bytes(value),
                                               preview, pins)

    def test_04_official_old_standalone_asset_ids_are_exact_and_no_fixtures(self):
        _, pins = self.plan_and_pins()
        sources = set(pins) - B.OLD_METADATA
        self.assertEqual(len(sources), 24)
        self.assertIn("TLS_Chrome_MV3_R5_20261024.zip", sources)
        self.assertIn("TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip", sources)
        self.assertEqual(
            pins["TLS_Chrome_MV3_R5_20261024.zip"][1],
            "0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5")
        self.assertEqual(
            pins["TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip"][1],
            "2d216971eb01b9f982fd7ccb38c0b2070cf1e3da44e4e4bdfcdbc55577b6f92b")

    def test_05_output_guard_refuses_existing_path_and_inside_repository(self):
        with tempfile.TemporaryDirectory() as d:
            temp = pathlib.Path(d)
            assets = temp / "official"
            assets.mkdir()
            current_sha = "a" * 40
            with mock.patch.object(B.subprocess, "check_output",
                                   return_value=current_sha), \
                 mock.patch.object(B.subprocess, "run",
                                   return_value=mock.Mock(returncode=0)):
                B.inputs_guard(assets, temp / "new-stage", current_sha)
                with self.assertRaisesRegex(B.CandidateRejected,
                                            "OUTPUT_ALREADY_EXISTS"):
                    B.inputs_guard(assets, temp, current_sha)
                with self.assertRaisesRegex(B.CandidateRejected,
                                            "COMMIT_SHA_REQUIRED"):
                    B.inputs_guard(assets, temp / "new-stage", "BAD")
                with self.assertRaisesRegex(B.CandidateRejected,
                                            "CHECKOUT_COMMIT_MISMATCH"):
                    B.inputs_guard(assets, temp / "new-stage", "b" * 40)
                with self.assertRaisesRegex(B.CandidateRejected,
                                            "OUTPUT_MUST_BE_OUTSIDE_REPO"):
                    B.inputs_guard(assets,
                                   B.ROOT / "r202-do-not-create", current_sha)

    def test_06_duplicate_inner_checksum_and_invalid_paths_are_rejected(self):
        digest = hashlib.sha256(b"source").hexdigest()
        self.assertEqual(V.checksums((digest + "  file.txt\n").encode("ascii")),
                         {"file.txt": digest})
        cases = [
            digest + "  ../unsafe\n",
            digest + "  file.txt\n" + digest + "  file.txt\n",
            "0" * 63 + "  x.txt\n",
            digest + "  x.txt  y.txt\n",
            digest + "  C:\\bad\n",
        ]
        for text in cases:
            with self.subTest(value=text):
                with self.assertRaises(V.CandidateValidationBlocked):
                    V.checksums(text.encode("ascii"))

    def test_07_missing_or_misnamed_new_stage_fails_immediately(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(V.CandidateValidationBlocked,
                                        "CANDIDATE_STAGE_MISSING"):
                V.inspect(pathlib.Path(folder)/"does_not_exist",
                          pathlib.Path(folder), pathlib.Path(folder)/"metadata",
                          "a" * 40)

    def test_08_both_modules_have_no_publication_or_transport_authority(self):
        root = pathlib.Path(__file__).resolve().parents[1]
        for name in ("tools/build_suite_175_official_candidate.py",
                     "tools/check_suite_175_official_candidate.py"):
            text = (root / name).read_text("utf-8")
            for forbidden in (
                "gh release create", "gh release upload", "gh release delete",
                "requests.get(", "urllib.request.urlopen(",
                "api.github.com", "new_release_created\": True",
            ):
                self.assertNotIn(forbidden, text, name + " " + forbidden)

    def test_09_old_research_draft_and_full_release_must_remain_separate(self):
        self.assertNotEqual(B.SUITE_NAME, Legacy.SUITE_FILENAME)
        self.assertNotEqual(B.DEV_NAME, Legacy.DEVELOPER_BUNDLE)
        self.assertEqual(Source.TAG, "all-tools-suite-v17.4.0")
        self.assertEqual(Plan.EXPECTED_NEW_TOOL_ID,
                         "tls.html.tw-first-result-studio-r19-r3-20261113")
        self.assertIn("CANDIDATE_NOT_RELEASED", B.SUITE_NAME)


if __name__ == "__main__":
    unittest.main()
