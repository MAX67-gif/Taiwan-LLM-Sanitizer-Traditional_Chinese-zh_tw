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
 def test_r175_native_contract_only_exact_10_file_transaction(self):
  self.assertEqual(len(C.R175_NATIVE_EXACT),10)
  changed=[('M',p) if p in {'.github/workflows/ci.yml','tests/test_r173_research_scope.py','tools/check_r173_research_scope.py','tools/publication_guard.py','tools/check_all_tools_release.py'} else ('A',p) for p in sorted(C.R175_NATIVE_EXACT)]
  self.assertEqual(C.classify(changed),(True,'R175_NATIVE_EVIDENCE_EXACT_ONLY'))
  for bad in (changed[:-1],changed+[('M','README.md')],changed+[('M','src/core/engine.js')], [('D','tools/publication_guard.py')]+changed[1:]):
   self.assertFalse(C.classify(bad)[0])
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

class R176ScopeTests(unittest.TestCase):
 def transaction(self):
  modified = {
   'README.md','README.en.md','README.zh-CN.md','README.ja.md','README.ko.md','README.es.md',
   'CHANGELOG.md','.github/workflows/ci.yml','tools/check_r173_research_scope.py',
   'tools/check_all_tools_release.py','tools/publication_guard.py','tests/test_r173_research_scope.py',
  }
  added = {
   'docs/showcase/source.md','docs/showcase/preview.md','docs/showcase/decisions.json',
   'docs/showcase/verification.json','docs/showcase/README.md','docs/showcase/README.en.md',
   'docs/showcase/trial_observation.md','tools/check_showcase_r176.js',
   'tests/test_showcase_r176.js','tests/test_showcase_browser_r176.py','tests/test_r176_showcase_contract.py',
  }
  return [('M',p) for p in sorted(modified)] + [('A',p) for p in sorted(added)]
 def test_r176_exact_23_path_transaction(self):
  changes=self.transaction();self.assertEqual(len(changes),23)
  self.assertEqual(C.classify(changes),(True,'R176_PROOF_FIRST_SHOWCASE_DOCS_ONLY'))
 def test_r176_each_missing_extra_or_retyped_path_fails_closed(self):
  changes=self.transaction()
  for i, (state,path) in enumerate(changes):
   with self.subTest(path=path):
    self.assertFalse(C.classify(changes[:i]+changes[i+1:])[0])
    for wrong in ('A' if state=='M' else 'M','D','R100','C100'):
     self.assertFalse(C.classify(changes[:i]+[(wrong,path)]+changes[i+1:])[0])
  for extra in ('src/core/wording_assistant_r172.js','release/all_tools_registry.json',
                'examples/TW_Wording_Assistant_R172_20261027.html','docs/showcase/extra.md',
                'research/comparison/r173/fixtures_first_task.md'):
   self.assertFalse(C.classify(changes+[('M',extra)])[0])
  self.assertFalse(C.classify(changes+[changes[0]])[0])
 def test_r176_unsafe_path_aliases_do_not_match(self):
  changes=self.transaction()
  for bad in ('docs/showcase/../source.md','docs//showcase/source.md',
              '/docs/showcase/source.md','docs\\showcase\\source.md','docs/showcase/Source.md'):
   altered=[(s,bad if p=='docs/showcase/source.md' else p) for s,p in changes]
   self.assertFalse(C.classify(altered)[0])
 def test_r176_required_ci_commands_are_executable_and_unconditional(self):
  text=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
  required=('node tools/check_showcase_r176.js --check',
            'python -m unittest tests/test_r176_showcase_contract.py -v',
            'python tests/test_showcase_browser_r176.py')
  self.assertTrue(F.verify_workflow(text))
  for command in required:
   needle='        run: '+command
   self.assertIn(needle,text)
   for replacement in ('        # run: '+command,
                       '        if: false\n'+needle,
                       '        continue-on-error: true\n'+needle,
                       needle+' || true',
                       '        run: echo '+command):
    with self.subTest(command=command,replacement=replacement):
     with self.assertRaises(F.GuardError):F.verify_workflow(text.replace(needle,replacement,1))


class R177ProductScopeTests(unittest.TestCase):
 def test_complete_mrft_transaction_requires_full_product_release(self):
  # Reviewed54-path feature plus public-boundary correction; NOT a bypass allowlist.
  changes=[
   ('M', '.github/workflows/ci.yml'),
   ('M', '.gitignore'),
   ('M', 'CHANGELOG.md'),
   ('M', 'README.en.md'),
   ('M', 'README.es.md'),
   ('M', 'README.ja.md'),
   ('M', 'README.ko.md'),
   ('M', 'README.md'),
   ('M', 'README.zh-CN.md'),
   ('M', 'START_HERE.html'),
   ('M', 'docs/ALL_TOOLS_RELEASE.md'),
   ('D', 'docs/PRODUCT_POSITIONING_R8.md'),
   ('M', 'docs/R175_NATIVE_OPENCC_PROTOCOL.md'),
   ('D', 'docs/R9_PRODUCT_STRATEGY.md'),
   ('M', 'docs/USAGE_EXAMPLES.en.md'),
   ('M', 'docs/USAGE_EXAMPLES.es.md'),
   ('M', 'docs/USAGE_EXAMPLES.ja.md'),
   ('M', 'docs/USAGE_EXAMPLES.ko.md'),
   ('M', 'docs/USAGE_EXAMPLES.md'),
   ('M', 'docs/USAGE_EXAMPLES.zh-CN.md'),
   ('A', 'docs/mrft/MRFT_DOM_PREVIEW.md'),
   ('A', 'docs/mrft/MRFT_ORIGINAL_FIXTURE.html'),
   ('A', 'docs/mrft/session_metadata.schema.json'),
   ('M', 'release/all_tools_registry.json'),
   ('M', 'research/comparison/r173/methodology.json'),
   ('M', 'research/comparison/r175/PROTOCOL.md'),
   ('A', 'src/core/mrft_local_provider_r177.js'),
   ('A', 'src/core/mrft_regions_r177.js'),
   ('A', 'src/r177/chrome/README_INSTALL.md'),
   ('A', 'src/r177/chrome/content.js'),
   ('A', 'src/r177/chrome/manifest.json'),
   ('A', 'src/r177/chrome/popup.html'),
   ('A', 'src/r177/chrome/popup.js'),
   ('A', 'src/r177/fixture_r177.js'),
   ('A', 'src/r177/mrft_dom_r177.js'),
   ('A', 'tests/mrft_extension_r177.browser.py'),
   ('A', 'tests/mrft_provider_r177.test.js'),
   ('A', 'tests/mrft_r177.browser.py'),
   ('A', 'tests/mrft_r177.test.js'),
   ('A', 'tests/test_all_tools_mrft_r177.py'),
   ('M', 'tests/test_all_tools_publisher.py'),
   ('M', 'tests/test_all_tools_release.py'),
   ('M', 'tests/test_all_tools_release_recovery.py'),
   ('A', 'tests/test_mrft_build_r177.py'),
   ('M', 'tests/test_r172_suite_monotonic.py'),
   ('M', 'tests/test_r173_research_scope.py'),
   ('M', 'tests/test_r174_first_run_links.py'),
   ('M', 'tests/test_r176_showcase_contract.py'),
   ('M', 'tools/build_all_tools_release.py'),
   ('A', 'tools/build_mrft_r177.py'),
   ('M', 'tools/check_all_tools_release.py'),
   ('M', 'tools/publication_guard.py'),
   ('M', 'tools/publish_all_tools_release.py'),
   ('M', 'tools/templates/start_here_suite_r172.html'),
  ]
  self.assertEqual(len(changes),54)
  self.assertEqual(C.classify(changes),(False,'PRODUCT_OR_UNRECOGNIZED_CHANGE'))
 def test_each_mrft_runtime_or_installer_cannot_join_old_research_bypass(self):
  for path in ('src/core/mrft_regions_r177.js','src/core/mrft_local_provider_r177.js',
               'src/r177/mrft_dom_r177.js','src/r177/chrome/manifest.json',
               'tools/build_mrft_r177.py','release/all_tools_registry.json'):
   with self.subTest(path=path):
    changes=[('A','research/comparison/r173/methodology.json'),('A',path)]
    self.assertFalse(C.classify(changes)[0])
    self.assertFalse(C.classify(R176ScopeTests().transaction()+[('A',path)])[0])

if __name__=='__main__':unittest.main()
