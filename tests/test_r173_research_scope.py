"""Research-only & exact R17.4 docs-only release scope; no broad bypass."""
import sys
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import check_r173_research_scope as C
import check_all_tools_release as F
from tests.test_r174_first_run_links import R174FirstUseTests  # CI runs these tests through its existing explicit unittest invocation

class ScopeTest(unittest.TestCase):
 def test_research_only_explicit_set(self):
  yes,why=C.classify([('A','research/comparison/r173/methodology.json'),('M','README.md'),('M','.github/workflows/ci.yml'),('M','tools/check_all_tools_release.py')]);self.assertTrue(yes)
  self.assertEqual(why,'R173_RESEARCH_ONLY')
 def test_complete_27_file_original_pr_change_list_is_research_only(self):
  changes=[('M',p) for p in ('.github/workflows/ci.yml', 'README.en.md','README.es.md',
    'README.ja.md','README.ko.md','README.md','README.zh-CN.md',
    'docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md','docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md',
    'tools/check_all_tools_release.py','tools/publication_guard.py')]
  changes += [('A',p) for p in (
    'docs/R173_COMPARISON_AND_ADOPTION.en.md','docs/R173_COMPARISON_AND_ADOPTION.md',
    'research/comparison/r173/consent_schema.json','research/comparison/r173/feedback_template.md',
    'research/comparison/r173/fixtures_first_task.md','research/comparison/r173/import_model_result.py',
    'research/comparison/r173/llm_prompt.txt','research/comparison/r173/methodology.json',
    'research/comparison/r173/naive_baseline.js','research/comparison/r173/opencc_adapter.py',
    'research/comparison/r173/prepare_spans.js','research/comparison/r173/score_and_audit.py',
    'tests/test_comparison_r173.js','tests/test_comparison_r173.py',
    'tests/test_r173_research_scope.py','tools/check_r173_research_scope.py')]
  self.assertEqual(len(changes),27)
  self.assertEqual(C.classify(changes),(True,'R173_RESEARCH_ONLY'))
 def test_research_router_hotfix_only_exact_pair(self):
  pair=[('M','tools/check_r173_research_scope.py'),('M','tests/test_r173_research_scope.py')]
  self.assertEqual(C.classify(pair),(True,'R173_SCOPE_HOTFIX_EXACT_PAIR_ONLY'))
  for changed in (pair[:1],pair+[('M','README.md')],[('M','README.md')],
                  [('M','tools/check_all_tools_release.py'),('M','tests/test_r173_research_scope.py')]):
   self.assertFalse(C.classify(changed)[0])
 def test_r174_full_13_file_gateway_delta_only(self):
  self.assertEqual(len(C.R174_FIRST_USE_EXACT),13)
  changed=[('M',p) if p.startswith('README') or p.startswith('tools/') or p=='tests/test_r173_research_scope.py' else ('A',p) for p in sorted(C.R174_FIRST_USE_EXACT)]
  self.assertEqual(C.classify(changed),(True,'R174_FIRST_RESULT_DOCS_ONLY'))
  for changed2 in (changed[:-1],changed+[('M','.github/workflows/ci.yml')],changed+[('M','src/core/engine.js')],changed+[('M','research/comparison/r173/methodology.json')]):
   self.assertFalse(C.classify(changed2)[0])
 def test_r174_no_empty_singlefile_or_deletion_override(self):
  for altered in ([('M','README.md')],[('A','docs/QUICK_START_R174.md')],
                  [('D','README.md')]+[('M',p) for p in C.R174_FIRST_USE_EXACT if p!='README.md'],
                  [('M',p) for p in C.R174_FIRST_USE_EXACT]*2):
   self.assertFalse(C.classify(altered)[0])
 def test_any_product_change_triggers_full_suite(self):
  for path in ('src/core/engine.js','release/all_tools_registry.json','examples/TW_Wording_Assistant_R172_20261027.html','dist/chrome/content.js','tools/build_all_tools_release.py','research/comparison/r174/future.py','notes_private/secret.md'):
   with self.subTest(path=path):
    self.assertFalse(C.classify([('A','research/comparison/r173/methodology.json'),('M',path)])[0])
 def test_research_unrecognized_file_also_blocked_by_publication_guard(self):
  sys.path.insert(0,str(ROOT/'tools'));import publication_guard as G
  self.assertFalse(G.allowed_path('research/comparison/r173/private_user_data.json'))
 def test_deletion_and_rename_fail_closed(self):
  for code in ('D','R100','C75'):
   self.assertFalse(C.classify([(code,'research/comparison/r173/methodology.json')])[0])
 def test_docs_only_no_research_change_is_not_whitelisted(self):
  self.assertFalse(C.classify([('M','README.md')])[0])
 def test_empty_change_no_auto_skip(self):
  self.assertFalse(C.classify([])[0])
 def test_existing_release_identity_and_full_27_assets(self):
  correct={'tagName':C.PINNED_SUITE_TAG,'targetCommitish':C.PINNED_PRODUCT_SHA,'isDraft':False,
    'assets':[{'name':x} for x in ['TLS_ALL_TOOLS_SUITE_17_2_0.zip','TW_Wording_Assistant_R172_20261027.html','VALIDATION.json']+[f'asset-{i}' for i in range(24)]]}
  self.assertTrue(C.validate_existing_release(correct))
  for mod in ({'tagName':'fake'},{'isDraft':True},{'targetCommitish':'f'*40},{'assets':[]}):
   with self.subTest(mod=mod):
    bad=dict(correct);bad.update(mod)
    with self.assertRaises(ValueError):C.validate_existing_release(bad)
 def test_central_publisher_guard_still_recognized(self):
  self.assertTrue(F.verify_workflow())

if __name__=='__main__':unittest.main()
