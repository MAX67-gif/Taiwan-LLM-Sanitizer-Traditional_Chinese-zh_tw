"""Additive Suite17.3 contract; historical pins are independent of the live registry."""
from copy import deepcopy
import json, pathlib, sys, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
import check_all_tools_release as C
import publication_guard as P
OLD = [('tls.r5.chrome',
  '0.4.0',
  'TLS_Chrome_MV3_R5_20261024.zip',
  '0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5'),
 ('tls.r5.tampermonkey',
  '0.4.0',
  'TLS_Tampermonkey_R5_20261024.user.js',
  '70c3b575cd0bfc1b34e7f3c95f7b2ac66cfc6eef94531f79aa90d81b0dc425aa'),
 ('tls.r11.chrome',
  '0.5.0',
  'TLS_Chrome_MV3_R11_20261025.zip',
  '9ed34dda59e83af35c34f35b61373c7f4057d02cf094ccb50cc46a809733bec8'),
 ('tls.r11.tampermonkey',
  '0.5.0',
  'TLS_Tampermonkey_R11_20261025.user.js',
  '4b6e87414557c4309847414fff00c610e7b6fb46691d456e3ad22ad6bdb98aea'),
 ('tls.r13.chrome',
  '0.6.0',
  'TLS_Chrome_MV3_R13_20261025.zip',
  '9543af63e4d1cb0fd33f5f73be1c5a3b48dfc05c41f267c205470b763237439d'),
 ('tls.r13.tampermonkey',
  '0.6.0',
  'TLS_Tampermonkey_R13_20261025.user.js',
  '49aefa62d068a78e022bac4ac2216f918510523783351aa6fbd8fa8895bfaf58'),
 ('tls.r6.quality-kit',
  'R6 quality kit v1',
  'TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip',
  '2d216971eb01b9f982fd7ccb38c0b2070cf1e3da44e4e4bdfcdbc55577b6f92b'),
 ('tls.html.tw-context-governance-lab-r10-20261024',
  'v1',
  'TW_Context_Governance_Lab_R10_20261024.html',
  'baed42203991bd51f94300271964840ad5260a2264655a39888f1260ee4ec24e'),
 ('tls.html.tw-context-review-lab-r8-20261024',
  '0.1.0',
  'TW_Context_Review_Lab_R8_20261024.html',
  '96a437720b3c11fc694f37cf5f9650cbc72f3c27f7a0dd9d2794649648c1e999'),
 ('tls.html.tw-document-trust-graph-r17-20261026',
  '0.1.0',
  'TW_Document_Trust_Graph_R17_20261026.html',
  'b2a244ed73a3317e30b5c6419160257c0a592de1b2b1b80c1a55943b0dbadd76'),
 ('tls.html.tw-lexicon-explorer-r3-20261024',
  'R3 prototype',
  'TW_Lexicon_Explorer_R3_20261024.html',
  'ccd5b5a1ff9d2480525b3beab76429fa2b1c1844555d6e136f2d5f9769c5cef7'),
 ('tls.html.tw-localization-safety-studio-r16-20261026',
  '0.1.0',
  'TW_Localization_Safety_Studio_R16_20261026.html',
  'deaff10d036e628e30e5a2149747ef4e3f1d9a2b49eb98f828b8ccaebc50b47d'),
 ('tls.html.tw-provider-capability-lab-r14-20261025',
  '0.1.0',
  'TW_Provider_Capability_Lab_R14_20261025.html',
  '79061ecbc7a529936449b75433c4fc336099b4884eca88ab2b8f950070246a5e'),
 ('tls.html.tw-quality-audit-lab-r12-20261025',
  'v1',
  'TW_Quality_Audit_Lab_R12_20261025.html',
  'e3b1663a7ea9979f09cbf85cc2d1dc4bc6b2c71b25b6cca5eaea2cd52996b0e0'),
 ('tls.html.tw-r6-bilingual-quality-review-20261024',
  'R6 research',
  'TW_R6_Bilingual_Quality_Review_20261024.html',
  '953510e36720f6c0bc56268077a2ba5dbad1404b2e8f98e0d44b766c2533dbb3'),
 ('tls.html.tw-r6-local-chrome-model-run-20261024',
  'R6 research',
  'TW_R6_Local_Chrome_Model_Run_20261024.html',
  'c07f045c63e632add6d5d09954a832db13c3cc35325ff684c20707c8b00d6281'),
 ('tls.html.tw-structured-integrity-lab-r151-20261026',
  '0.1.1',
  'TW_Structured_Integrity_Lab_R151_20261026.html',
  'e71c12d2bdc5f645443b8532fede66b7496b9ee5165e16ca74ee796c28417743'),
 ('tls.html.tw-structured-integrity-lab-r15-20261025',
  '0.1.0',
  'TW_Structured_Integrity_Lab_R15_20261025.html',
  '214790a4a8b37c9026f65c05072e80d36d43c4110ac3743b399f6a57e6f9c0e2'),
 ('tls.html.tw-translation-style-lab-r3-20261024',
  'R3 prototype',
  'TW_Translation_Style_Lab_R3_20261024.html',
  'f893271798073d430e1811350a092e70e2dc1effe976a91dfb8a5df20f345236'),
 ('tls.html.tw-user-context-lab-r9-20261024',
  'v1',
  'TW_User_Context_Lab_R9_20261024.html',
  'fd4296de0bb231d96961ffbc00a087ded7fb3451ac3234cc11988539d1a6e138'),
 ('tls.cli.localize-cli',
  'source at R17 main',
  'localize_cli.js',
  '8fee9bcb59f2314112925352f55405611158feda3fed5b3e1c6cd98f316a4075'),
 ('tls.cli.r14-capability-cli',
  'source at R17 main',
  'r14_capability_cli.js',
  '9ccd4eb268011fbbaa870456add1ebcccd7c054d267679157b08a3220d918c6b'),
 ('tls.cli.r15-structured-localizer-cli',
  'source at R17 main',
  'r15_structured_localizer_cli.js',
  'f218313c768fcb2ed03bd5d270aca0b59672287a10126aaaf4354fb1d03c1f34'),
 ('tls.cli.r16-local-workbench-cli',
  'source at R17 main',
  'r16_local_workbench_cli.js',
  '6c95fbcabc7531bd65117e0ebb89cec0a7b056d0ed8ada4ffc1a4de663630b1d'),
 ('tls.cli.r17-document-trust-cli',
  'source at R17 main',
  'r17_document_trust_cli.js',
  '62f417af24455859d135fc532715a0d0a43431772a15d9f1544c2fa7eb6fd273'),
 ('tls.skill.taiwan-zh-tw-localization',
  'R17 version',
  'SKILL.md',
  '147482da836e36872e31cf9b64d6f2adea1c90408db0dceb59eac7b107a4d592'),
 ('tls.html.tw-wording-assistant-r172-20261027',
  '0.1.0-preview',
  'TW_Wording_Assistant_R172_20261027.html',
  '4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873')]
NEW_ID='tls.r177.chrome.mrft'
NEW_ZIP='TLS_Chrome_MV3_MRFT_R177_20261031.zip'
EXPECTED_MRFT_SHA='5cf0023f26a990bc0c8d0eef499f9bad843d4257e76a1615a033a7bacab973c7'
class MRFTAdditiveContract(unittest.TestCase):
 def registry(self):return json.loads(B.REGISTRY.read_bytes())
 def test_exact_current_inventory(self):
  r=self.registry()
  self.assertEqual(r['suite_version'],'17.3.0')
  self.assertEqual(r['release_tag'],'all-tools-suite-v17.3.0')
  self.assertEqual(len(r['tools']),28)
  self.assertEqual([(x['tool_id'],x['tool_version'],x['artifact_filename'],x['expected_sha256']) for x in r['tools'][:27]],OLD)
  self.assertEqual(r['tools'][27]['tool_id'],NEW_ID)
  self.assertEqual(r['tools'][27]['expected_sha256'],EXPECTED_MRFT_SHA)
  self.assertEqual(B.MRFT_SHA256,EXPECTED_MRFT_SHA)
  self.assertEqual(sum(x['standalone_required'] for x in r['tools'])+1,23)
 def test_r172_keeps_original_source_authority(self):
  x=self.registry()['tools'][26]
  self.assertEqual(x.get('original_commit_sha'),'a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4')
  self.assertEqual(x.get('original_tag'),'all-tools-suite-v17.2.0')
  self.assertNotIn('source_commit_mode',x)
 def test_prior_version_or_hash_cannot_change(self):
  for key,value in [('tool_version','changed'),('expected_sha256','f'*64)]:
   for i in range(27):
    with self.subTest(key=key,i=i):
     r=self.registry();r['tools'][i][key]=value
     with self.assertRaises(B.ReleaseBlock):B.validate_registry(r,False)
 def test_old_and_new_omission_block(self):
  for i in (0,26,27):
   r=self.registry();r['tools'].pop(i if i<len(r['tools']) else -1)
   with self.assertRaises(B.ReleaseBlock):B.validate_registry(r,True)
 def test_only_reviewed_generated_artifact_allowed(self):
  r=self.registry();self.assertEqual(len(r['tools']),28)
  self.assertEqual(r['tools'][-1]['source_kind'],'generated_local_artifact')
  for key,value in [('source_path','dist/arbitrary.zip'),('artifact_filename','arbitrary.zip'),('expected_sha256','f'*64),('source_kind','official_release_asset'),('tool_version','99')]:
   with self.subTest(key=key):
    bad=deepcopy(r);bad['tools'][-1][key]=value
    with self.assertRaises(B.ReleaseBlock):B.validate_registry(bad,True)
 def test_generated_manifest_excess_permissions_fail_even_after_resealing(self):
  from unittest.mock import patch
  import build_mrft_r177 as M
  files=M.files()
  manifest=json.loads(files['manifest.json']);manifest['permissions'].append('tabs')
  files['manifest.json']=B.json_bytes(manifest)
  blob=B.deterministic_zip(files)
  row={'tool_id':NEW_ID,'source_path':'dist/'+NEW_ZIP}
  with patch.object(B,'MRFT_SHA256',B.digest(blob)), patch.object(M,'archive_bytes',return_value=blob):
   with self.assertRaisesRegex(B.ReleaseBlock,'MRFT_MANIFEST'):B.validate_generated_installer(blob,row)
 def test_extension_ci_runs_headful_real_user_activation(self):
  w=(ROOT/'.github/workflows/ci.yml').read_text()
  command='xvfb-run -a python tests/mrft_extension_r177.browser.py'
  self.assertIn('run: '+command,w)
  self.assertIn('sudo apt-get install --yes --no-install-recommends xvfb xauth xdotool',w)
  with self.assertRaises(C.GuardError):C.verify_workflow(w.replace(command,'python tests/mrft_extension_r177.browser.py'))
 def test_mrft_production_runtime_is_scanned(self):
  for p in ('src/r177/mrft_dom_r177.js','src/r177/chrome/popup.js','dist/r177/chrome/content.js'):
   self.assertTrue(P.scan_runtime(p,"fetch('https://example.com')"),p)
 def test_new_gate_job_cannot_be_skipped_or_soft_failed(self):
  w=(ROOT/'.github/workflows/ci.yml').read_text()
  for job in ('verify','browser-integration'):
   for modifier in ('if: false','continue-on-error: true'):
    with self.subTest(job=job,modifier=modifier):
     bad=w.replace('  '+job+':\n','  '+job+':\n    '+modifier+'\n',1)
     with self.assertRaises(C.GuardError):C.verify_workflow(bad)
 def test_publisher_job_cannot_soft_fail(self):
  w=(ROOT/'.github/workflows/ci.yml').read_text()
  bad=w.replace('  all-tools-full-suite-release:\n','  all-tools-full-suite-release:\n    continue-on-error: true\n',1)
  with self.assertRaises(C.GuardError):C.verify_workflow(bad)
 def test_required_ci_gates_are_real_and_unconditional(self):
  w=(ROOT/'.github/workflows/ci.yml').read_text()
  for command in ('python tools/build_mrft_r177.py','python tools/build_mrft_r177.py --check','python tests/test_mrft_build_r177.py','python tests/mrft_r177.browser.py','xvfb-run -a python tests/mrft_extension_r177.browser.py'):
   self.assertIn('run: '+command,w)
   mutated=w.replace('run: '+command,'if: false\n        run: '+command,1)
   with self.assertRaises(C.GuardError):C.verify_workflow(mutated)
  self.assertTrue(C.verify_workflow(w))
if __name__=='__main__':unittest.main()
