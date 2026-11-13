"""Fail-closed tests for R195 additive next-Suite *proposal*, not a publisher."""
from __future__ import annotations
from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import check_suite_175_promotion_plan as Next

class SuiteNextPromotionContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proposal = Next.safe_json(Next.CONTRACT)

    def check(self, change=None):
        data = deepcopy(self.proposal)
        if change:
            change(data)
        return Next.validate(data, sources=True)

    def test_01_proposed_17_5_is_additive_only_and_never_a_release(self):
        record = self.check()
        self.assertEqual(record["baseline_tools_retained"], 29)
        self.assertEqual(record["future_tools_planned"], 30)
        self.assertEqual(record["future_standalone_assets_planned"], 25)
        self.assertEqual(record["future_release_assets_planned"], 30)
        self.assertEqual(record["old_17_4_asset_metadata_count"], 29)
        self.assertEqual(record["future_tag_proposed"], "all-tools-suite-v17.5.0")
        self.assertEqual(record["publication_permission"], "NONE")
        self.assertEqual(record["released_new_binary_files"], 0)
        self.assertFalse(record["future_full_suite_built"])
        self.assertFalse(record["future_draft_re_downloaded"])
        self.assertFalse(record["future_public_re_downloaded"])

    def test_02_old_29_tools_are_not_just_names_and_old_release_byte_pins_stay(self):
        legacy = Next.legacy_identity()
        self.assertEqual(len(legacy["tools"]), 29)
        self.assertEqual(len({x["tool_id"] for x in legacy["tools"]}), 29)
        self.assertEqual(legacy["tools"][-1]["tool_id"],
                         "tls.html.tw-first-result-studio-r19-20261101")
        self.assertEqual(legacy["tools"][-1]["expected_sha256"], Next.R2_SHA256)
        self.assertNotEqual(Next.R2_SHA256, Next.R3_SHA256)

    def test_03_version_tag_and_counts_cannot_be_overwritten_or_overclaimed(self):
        changes = [
            lambda x: x["proposed"].__setitem__("release_tag", "all-tools-suite-v17.4.0"),
            lambda x: x["proposed"].__setitem__("suite_version", "17.4.0"),
            lambda x: x["proposed"].__setitem__("expected_tool_count", 29),
            lambda x: x["proposed"].__setitem__("expected_standalone_count", 24),
            lambda x: x["proposed"].__setitem__("expected_release_asset_count", 29),
            lambda x: x["proposed"].__setitem__("expected_release_asset_count", 31),
            lambda x: x["proposed"].__setitem__("locales", ["zh-TW"]),
            lambda x: x["proposed"].__setitem__("excluded_rights_withdrawn", []),
            lambda x: x.__setitem__("publication_permission", "ALLOWED"),
            lambda x: x.__setitem__("merge_permission", "APPROVED"),
            lambda x: x.__setitem__("research_status", "PUBLISHED"),
        ]
        for idx, change in enumerate(changes):
            with self.subTest(idx=idx), self.assertRaises(Next.NotPromotable):
                self.check(change)

    def test_04_all_historical_ids_must_be_retained_in_original_order(self):
        variants = [
            lambda x: x["baseline"]["existing_tool_ids"].pop(0),
            lambda x: x["baseline"]["existing_tool_ids"].reverse(),
            lambda x: x["baseline"]["existing_tool_ids"].__setitem__(0, "tls.r5.other"),
            lambda x: x["baseline"].__setitem__("main_release_source_sha", "0"*40),
            lambda x: x["baseline"].__setitem__("published_zip_sha256", "0"*64),
            lambda x: x["baseline"].__setitem__("registry_source", "research/demo_registry.json"),
        ]
        for idx, mutation in enumerate(variants):
            with self.subTest(idx=idx), self.assertRaises(Next.NotPromotable):
                self.check(mutation)

    def test_05_new_tool_must_retain_source_identity_and_permissions(self):
        def change(key, val):
            return lambda x: x["proposed"]["new_tool"].__setitem__(key, val)
        versions = [
            ("tool_id", self.proposal["baseline"]["existing_tool_ids"][0]),
            ("status", "SUPPORTED"), ("source_kind", "official_release_asset"),
            ("source_path", "../unsafe.html"), ("expected_sha256", "0"*64),
            ("original_commit_sha", "0"*40), ("standalone_required", False),
            ("original_tag", "all-tools-suite-v17.4.0"), ("license_review", "UNKNOWN"),
            ("rights_review", "UNCHECKED"), ("artifact_filename",
                                        "TW_First_Result_Studio_R19_20261101.html"),
            ("build_command_or_reuse_reason", "auto-promote"),
        ]
        for key, value in versions:
            with self.subTest(key=key), self.assertRaises(Next.NotPromotable):
                self.check(change(key, value))

    def test_06_stale_quality_proofs_or_new_release_claims_rejected(self):
        errors = [
            ("human_translation_quality", "HUMAN_APPROVED"),
            ("adoption", "10k_REAL_USERS"),
            ("os_native_file_chooser_cancel", "PASS"),
            ("future_fresh_asset_downloads", "PASS"),
            ("future_new_release", "PUBLISHED"),
            ("original_r19_r2_native", "NOT_RUN"),
        ]
        for field, value in errors:
            with self.subTest(field=field), self.assertRaises(Next.NotPromotable):
                self.check(lambda x, key=field, v=value:
                           x["evidence_boundary"].__setitem__(key, v))

    def test_07_json_parser_rejects_duplicate_keys_and_unreviewed_extra_fields(self):
        with tempfile.TemporaryDirectory(prefix="tls-suite-next-") as folder:
            path = Path(folder) / "bad.json"
            path.write_text('{"suite_version":"17.4.0","suite_version":"17.5.0"}', "utf-8")
            with self.assertRaisesRegex(Next.NotPromotable, "DUPLICATE_JSON_KEY"):
                Next.safe_json(path)
            path.write_text("{}", "utf-8")
            self.assertEqual(Next.safe_json(path), {})
        with self.assertRaises(Next.NotPromotable):
            self.check(lambda x: x.__setitem__("optional_publisher", True))
        with self.assertRaises(Next.NotPromotable):
            self.check(lambda x: x["proposed"]["new_tool"].__setitem__("permission", "write"))

    def test_08_no_publisher_or_network_code_paths_in_read_only_checker(self):
        source = (ROOT / "tools/check_suite_175_promotion_plan.py").read_text("utf-8")
        for banned in ("gh release create", "gh release upload", "gh release delete",
                       "requests.get(", "urllib.request.urlopen(", "os.system(",
                       "subprocess.run(", "write_text(", "write_bytes("):
            self.assertNotIn(banned, source)
        self.assertEqual(self.check()["status"],
                         "CONTRACT_ONLY_STRUCTURAL_PASS_NO_RELEASE")


class SuiteNextPreviewRendererTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import render_suite_175_registry_preview as R
        cls.R = R
        cls.plan = Next.safe_json(Next.CONTRACT)

    def test_09_preview_copies_29_exact_rows_and_adds_one(self):
        import build_all_tools_release as B
        data = self.R.render(self.plan)
        old = B.strict_json(Next.LEGACY_REGISTRY.read_bytes(), "original")
        self.assertEqual(data["status"], "STRUCTURAL_PREVIEW_ONLY_NOT_PUBLISHABLE")
        self.assertEqual(data["tools"][:29], old["tools"])
        self.assertEqual(data["tools"][29], self.plan["proposed"]["new_tool"])
        self.assertEqual(data["total_proposed_tools"], 30)
        self.assertEqual(data["standalone_assets_planned"], 25)
        self.assertEqual(data["github_release_assets_planned"], 30)
        self.assertFalse(data["complete_future_suite_generated"])
        self.assertEqual(data["publication_permission"], "NONE")
        self.assertEqual(data["merge_permission"], "NONE")

    def test_10_preview_is_deterministic_and_never_writes_to_original_registry(self):
        import hashlib
        before = Next.LEGACY_REGISTRY.read_bytes()
        one = self.R.encoded(self.plan)
        two = self.R.encoded(deepcopy(self.plan))
        self.assertEqual(one, two)
        self.assertEqual(hashlib.sha256(one).hexdigest(), hashlib.sha256(two).hexdigest())
        self.assertEqual(Next.LEGACY_REGISTRY.read_bytes(), before)
        self.assertNotIn(b"USER_PRIVATE_TEXT", one)

    def test_11_renderer_refuses_unreviewed_output_and_bad_count(self):
        with tempfile.TemporaryDirectory(prefix="tls-r195-preview-") as folder:
            folder = Path(folder)
            out = folder / self.R.OUTPUT_FILE
            self.assertEqual(self.R.preview_output_path(out), out)
            out.write_text("keep existing", encoding="utf-8")
            with self.assertRaisesRegex(self.R.PreviewBlocked, "OUTPUT_ALREADY_EXISTS"):
                self.R.preview_output_path(out)
            with self.assertRaisesRegex(self.R.PreviewBlocked, "OUTPUT_FILENAME_NOT_CANONICAL"):
                self.R.preview_output_path(folder / "other.json")
            with self.assertRaisesRegex(self.R.PreviewBlocked, "OUTPUT_INSIDE_GIT_CHECKOUT"):
                self.R.preview_output_path(ROOT / self.R.OUTPUT_FILE)
        data=deepcopy(self.plan)
        data["proposed"]["new_tool"]["expected_sha256"]="0"*64
        with self.assertRaises(Next.NotPromotable):
            self.R.render(data)

    def test_12_ci_preview_is_only_a_normal_actions_artifact_not_release(self):
        text=(ROOT/".github/workflows/ci.yml").read_text("utf-8")
        self.assertEqual(text.count(
            "Upload additive Suite 17.5 thirty-tool registry REVIEW ONLY"), 1)
        self.assertEqual(text.count(
            "Render additive Suite 17.5 review-only 30-tool registry"), 1)
        self.assertIn("tools/render_suite_175_registry_preview.py --output",text)
        self.assertIn("TLS_SUITE_175_30_TOOL_REGISTRY_REVIEW_ONLY",text)
        self.assertIn("if-no-files-found: error",text)
        self.assertIn("tools/check_suite_175_promotion_plan.py --check",text)
        self.assertNotIn("gh release create all-tools-suite-v17.5.0",text)

if __name__ == "__main__":
    unittest.main()
