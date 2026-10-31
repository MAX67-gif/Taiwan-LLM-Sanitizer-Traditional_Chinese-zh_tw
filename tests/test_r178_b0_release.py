"""R17.8 B0 fail-closed release retirement, onboarding and archive regressions."""
from __future__ import annotations
import copy
import re
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import check_r178_b0_release as C
import build_all_tools_release as B
import publication_guard as P

LATEST = "https://github.com/" + C.REPO + "/releases/tag/" + C.CURRENT_TAG
READMES = ("README.md", "README.zh-CN.md", "README.en.md",
           "README.ja.md", "README.ko.md", "README.es.md")
GUIDES = ("docs/QUICK_START_R174.md", "docs/QUICK_START_R174.en.md",
          "docs/showcase/README.md", "docs/showcase/README.en.md",
          "docs/R173_COMPARISON_AND_ADOPTION.md",
          "docs/R173_COMPARISON_AND_ADOPTION.en.md")
NO_LEGACY_ZIPS = ("TLS_ALL_TOOLS_SUITE_17_1_0.zip", "TLS_ALL_TOOLS_SUITE_17_2_0.zip",
                  "TLS_DEVELOPER_CLI_SKILL_17_1_0.zip",
                  "TLS_DEVELOPER_CLI_SKILL_17_2_0.zip")

def fixture(tag, sha, count):
    req = C.CURRENT_REQUIRED if tag == C.CURRENT_TAG else C.STANDARD_REQUIRED
    if tag.endswith("17.2.0"):
        req = req | C.R172_REQUIRED
    assets = [{"name": n} for n in sorted(req)]
    assets += [{"name": "historical-asset-%03d.txt" % i}
               for i in range(count - len(assets))]
    return {"tagName": tag, "targetCommitish": sha, "isDraft": False, "assets": assets}

class R178B0Tests(unittest.TestCase):
    def test_01_metadata_accepts_only_current_and_correct_retired_legacy(self):
        originals = [fixture(*spec) for spec in C.RELEASES]
        self.assertEqual([r["assets_remaining"] for r in C.validate_three(originals)], [24, 25, 28])
        for i, spec in enumerate(C.RELEASES):
            tag, sha, count = spec
            for key, value in (("tagName", "wrong"), ("targetCommitish", "f"*40),
                               ("isDraft", True), ("assets", [])):
                altered = copy.deepcopy(originals)
                altered[i][key] = value
                with self.subTest(i=i, key=key), self.assertRaises(ValueError):
                    C.validate_three(altered)
            for filename in C.WITHDRAWN:
                altered = copy.deepcopy(originals)
                altered[i]["assets"][0]["name"] = filename
                with self.subTest(i=i, withdrawn=filename), self.assertRaisesRegex(ValueError, "WITHDRAWN"):
                    C.validate_three(altered)
            altered = copy.deepcopy(originals)
            altered[i]["assets"][0]["name"] = "missing-key-file.txt"
            with self.subTest(i=i, missing=True), self.assertRaises(ValueError):
                C.validate_three(altered)

    def test_02_six_readme_hero_points_to_current_suite_not_withdrawn(self):
        for file in READMES:
            raw = (ROOT / file).read_text(encoding="utf-8")
            m = re.search(r"<!-- R176_SHOWCASE_BEGIN -->(.*?)<!-- R176_SHOWCASE_END -->", raw, re.S)
            with self.subTest(file=file):
                self.assertIsNotNone(m)
                hero = m.group(1)
                self.assertEqual(hero.count(LATEST), 1)
                self.assertNotIn("releases/tag/all-tools-suite-v17.2.0", hero)
                self.assertIn("TW_Wording_Assistant_R172_20261027.html", hero)
                self.assertIn("docs/showcase/preview.md", hero)
                self.assertIn("suite=17.3.0; tools=28; standalone=23", raw)
                self.assertFalse(any(name in raw for name in NO_LEGACY_ZIPS))

    def test_03_current_download_path_in_beginner_and_showcase_docs(self):
        for name in GUIDES:
            txt = (ROOT / name).read_text(encoding="utf-8")
            with self.subTest(doc=name):
                self.assertIn(LATEST, txt)
                self.assertNotIn("releases/tag/all-tools-suite-v17.2.0", txt)
                for filename in NO_LEGACY_ZIPS:
                    self.assertNotIn(filename, txt)
                self.assertIn("TW_Wording_Assistant_R172_20261027.html", txt) if "R173_COMPARISON" not in name else None

    def test_04_new_release_zip_archive_paths_block_old_strategy_leaks(self):
        banned = ("docs/PRODUCT_POSITIONING_R8.md", "docs/R9_PRODUCT_STRATEGY.md",
                  "x/Taiwan-LLM-Sanitizer-Project-Brain/notes.md")
        for path in banned:
            with self.subTest(path=path):
                self.assertFalse(B.safe_archive_path(path))
                with self.assertRaises(B.ReleaseBlock):
                    B.deterministic_zip({path: b"private fixture"})
        import io
        from zipfile import ZipFile
        child = io.BytesIO()
        with ZipFile(child, "w") as z:
            z.writestr("docs/R9_PRODUCT_STRATEGY.md", b"fake example")
        parent = io.BytesIO()
        with ZipFile(parent, "w") as z:
            z.writestr("bundle-inner.zip", child.getvalue())
        with self.assertRaisesRegex(B.ReleaseBlock, "ZIP_PATHS_OR_DUPLICATES"):
            B.validate_zip_bytes(parent.getvalue(), "fixture.zip")
        self.assertTrue(B.safe_archive_path("docs/R173_COMPARISON_AND_ADOPTION.md"))
        self.assertTrue(P.allowed_path("docs/R173_COMPARISON_AND_ADOPTION.md"))

    def test_05_no_b0_fresh_release_or_false_quality_claim(self):
        for f in ("docs/QUICK_START_R174.md", "docs/QUICK_START_R174.en.md"):
            t = (ROOT / f).read_text("utf-8")
            self.assertTrue("R17.2" in t)  # historical tool identifier, not current Suite tag
            self.assertTrue("17.3" in t)
            self.assertFalse("100% accurate" in t.lower())
        self.assertEqual(len(C.CURRENT_REQUIRED), 7)

if __name__ == "__main__":
    unittest.main()
