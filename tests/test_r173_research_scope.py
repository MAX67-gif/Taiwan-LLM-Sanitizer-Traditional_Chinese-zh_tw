"""Research-only release suppression is only for a closed allowlist."""
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import check_r173_research_scope as C
import check_all_tools_release as F

class ScopeTest(unittest.TestCase):
 def test_research_only_explicit_set(self):
  yes,why=C.classify([('A','research/comparison/r173/methodology.json'),('M','README.md'),('M','.github/workflows/ci.yml'),('M','tools/check_all_tools_release.py')]);self.assertTrue(yes)
  self.assertEqual(why,'R173_RESEARCH_ONLY')
 def test_any_product_change_triggers_full_suite(self):
  for path in ('src/core/engine.js','release/all_tools_registry.json','examples/TW_Wording_Assistant_R172_20261027.html','dist/chrome/content.js','tools/build_all_tools_release.py', 'research/comparison/r174/future.py','notes_private/secret.md'):
   with self.subTest(path=path):
    self.assertFalse(C.classify([('A','research/comparison/r173/methodology.json'),('M',path)])[0])
 def test_research_unrecognized_file_also_blocked_by_publication_guard(self):
  sys.path.insert(0,str(ROOT/'tools'))
  import publication_guard as G
  self.assertFalse(G.allowed_path('research/comparison/r173/private_user_data.json'))
 def test_deletion_and_rename_fail_closed(self):
  for code in ('D','R100','C75'):
   self.assertFalse(C.classify([(code,'research/comparison/r173/methodology.json')])[0])
 def test_docs_only_no_research_change_is_not_whitelisted(self):
  self.assertFalse(C.classify([('M','README.md')])[0])
 def test_empty_change_no_auto_skip(self):self.assertFalse(C.classify([])[0])
 def test_existing_release_identity_and_full_27_assets(self):
  correct={'tagName':C.PINNED_SUITE_TAG,'targetCommitish':C.PINNED_PRODUCT_SHA,'isDraft':False,
    'assets':[{'name':x} for x in ['TLS_ALL_TOOLS_SUITE_17_2_0.zip','TW_Wording_Assistant_R172_20261027.html','VALIDATION.json']+[f'asset-{i}' for i in range(24)]]}
  self.assertTrue(C.validate_existing_release(correct))
  for mod in ({'tagName':'fake'},{'isDraft':True},{'targetCommitish':'f'*40},{'assets':[]}):
   with self.subTest(mod=mod):
    bad=dict(correct);bad.update(mod)
    with self.assertRaises(ValueError):C.validate_existing_release(bad)
 def test_central_publisher_guard_still_recognized(self):self.assertTrue(F.verify_workflow())

if __name__=='__main__':unittest.main()
