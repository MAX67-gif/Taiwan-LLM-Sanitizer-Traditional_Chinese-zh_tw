"""R198 17.5 synthetic full-suite fixture acceptance (NO product/release approval)."""
from __future__ import annotations
import hashlib, json, shutil, sys, tempfile, unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from tests import test_all_tools_release as LegacyTestModule
import build_suite_175_fixture as New
import check_suite_175_promotion_plan as Plan
import check_all_tools_release as OldValidator


class Suite175FullFixtureEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        LegacyTestModule.FullSuiteSafetyContract.setUpClass()
        cls.old = LegacyTestModule.FullSuiteSafetyContract
        cls.stage = cls.old.root / "stage175"
        cls.manifest = New.prepare_fixture(
            cls.old.stage, cls.stage, cls.old.fixture_registry)

    @classmethod
    def tearDownClass(cls):
        LegacyTestModule.FullSuiteSafetyContract.tearDownClass()

    def mut_stage(self, change):
        stage = self.old.root / ("tampered175_" +
              str(len(list(self.old.root.glob("tampered175_*")))))
        shutil.copytree(self.stage,stage)
        change(stage)
        return stage

    def test_01_real_fixture_builds_30_full_stage_artifacts_and_suite_zip(self):
        receipt = New.check_fixture(self.stage)
        self.assertEqual(receipt["status"],
                         "FIXTURE_30_TOOLS_30_ASSETS_STRUCTURAL_PASS")
        self.assertTrue(receipt["fixture_only"])
        self.assertFalse(receipt["published_or_publishable"])
        self.assertEqual(receipt["tool_count"], 30)
        self.assertEqual(receipt["standalone_assets"], 25)
        self.assertEqual(receipt["stage_file_count"], 30)
        self.assertEqual(len(list(self.stage.iterdir())),30)
        self.assertEqual(len(self.manifest["tools"]),30)
        self.assertEqual(self.manifest["fixture_substitution_tool_ids"],
                         ["tls.r5.chrome","tls.r6.quality-kit"])
        self.assertFalse(receipt["human_quality_verified"])

    def test_02_no_old_tool_removed_or_rehashed_without_declared_fixture(self):
        old_ids=[x["tool_id"] for x in Plan.legacy_identity()["tools"]]
        self.assertEqual([x["tool_id"] for x in self.manifest["tools"]][:29],old_ids)
        new=self.manifest["tools"][29]
        self.assertEqual(new["tool_id"],Plan.EXPECTED_NEW_TOOL_ID)
        self.assertEqual(new["actual_fixture_sha256"],Plan.R3_SHA256)
        for x in self.manifest["tools"][:29]:
            if not x["fixture_substitution"]:
                self.assertEqual(x["actual_fixture_sha256"],
                                 x["expected_official_source_sha256"],
                                 x["tool_id"])

    def test_03_previous_release_remains_frozen_and_not_replaced(self):
        self.assertTrue((self.old.stage / "TLS_ALL_TOOLS_SUITE_17_4_0.zip").is_file())
        self.assertTrue((self.stage / New.SUITE_FILENAME).is_file())
        self.assertFalse((self.stage / "TLS_ALL_TOOLS_SUITE_17_4_0.zip").exists())
        with self.assertRaises(OldValidator.GuardError):
            OldValidator.verify_stage(self.stage,self.old.fixture_registry,fixture_ok=True)

    def test_04_missing_old_installer_r19_r3_or_developer_bundle_blocks(self):
        for filename in ("TLS_Chrome_MV3_R13_20261025.zip",
                         "TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html",
                         New.DEVELOPER_BUNDLE, "BUILD_PROVENANCE.json"):
            with self.subTest(filename=filename):
                stage=self.mut_stage(lambda d,n=filename: (d/n).unlink())
                with self.assertRaisesRegex(New.FixtureRejected,
                                            "MISSING_OR_EXTRA_30_ASSETS"):
                    New.check_fixture(stage)

    def test_05_any_modified_or_replaced_asset_is_detected(self):
        names=("TLS_Tampermonkey_R11_20261025.user.js",
               "TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html",
               New.SUITE_FILENAME,New.DEVELOPER_BUNDLE)
        for name in names:
            with self.subTest(name=name):
                stage=self.mut_stage(lambda d,n=name:
                    (d/n).write_bytes((d/n).read_bytes()+b'!'))
                with self.assertRaisesRegex(New.FixtureRejected,
                                            "ASSET_HASH_CHANGED"):
                    New.check_fixture(stage)

    def test_06_overclaim_fixture_as_publishable_is_rejected(self):
        stage=self.mut_stage(lambda d: None)
        v=stage/"VALIDATION.json"
        data=json.loads(v.read_text("utf-8"))
        data["status"]="PACKAGE_READY_NOT_PUBLISHED"
        v.write_text(json.dumps(data,ensure_ascii=False),"utf-8")
        # Retally the external checksum, so the failure must be the actual
        # publication boundary, not just a stale sha from a tampered manifest.
        checksum=stage/"SHA256SUMS.txt"
        previous={}
        for line in checksum.read_text("ascii").splitlines():
            h,name=line.split("  ",1);previous[name]=h
        previous["VALIDATION.json"]=hashlib.sha256(v.read_bytes()).hexdigest()
        checksum.write_text("".join(f"{h}  {n}\n" for n,h in sorted(previous.items())),
                            "ascii")
        with self.assertRaisesRegex(New.FixtureRejected,
                                    "FIXTURE_PROMOTION_FORBIDDEN"):
            New.check_fixture(stage)

    def test_07_refuses_stage_reuse_missing_old_base_and_output_inside_repo(self):
        with self.assertRaisesRegex(New.FixtureRejected,"NEW_STAGE_NOT_EMPTY"):
            New.stage_guard(self.old.stage,self.stage)
        with self.assertRaisesRegex(New.FixtureRejected,"OUTPUT_INSIDE_SOURCE"):
            New.stage_guard(self.old.stage,ROOT/"unlikely175fixture")
        with tempfile.TemporaryDirectory(prefix="tls-r198-missing-") as d:
            with self.assertRaisesRegex(New.FixtureRejected,"OLD_STAGE_INVALID"):
                New.stage_guard(Path(d)/"not-existing",Path(d)/"candidate")
        with mock.patch.object(OldValidator,"verify_stage",
                               side_effect=OldValidator.GuardError("OLD_NOT_FULL")):
            with tempfile.TemporaryDirectory(prefix="tls-r198-reject-") as d:
                with self.assertRaises(OldValidator.GuardError):
                    New.prepare_fixture(self.old.stage,Path(d)/"candidate",
                                        self.old.fixture_registry)
                self.assertFalse((Path(d)/"candidate").exists())

    def test_08_fixture_does_not_access_network_or_publish_release(self):
        source=(ROOT/"tools/build_suite_175_fixture.py").read_text("utf-8")
        for banned in ("gh release create","gh release upload","gh release delete",
                       "requests.get(","urllib.request.urlopen(","http.client.",
                       "os.system(","subprocess.run(","api.github.com", "fetch_official_assets("):
            self.assertNotIn(banned,source)
        self.assertEqual(self.manifest["fresh_download_verification"],"NOT_RUN")
        self.assertEqual(self.manifest["release_permission"],"NONE")
        self.assertEqual(self.manifest["source_git_sha"],"SYNTHETIC_TEST_NO_RELEASE")


if __name__=="__main__":
    unittest.main()
