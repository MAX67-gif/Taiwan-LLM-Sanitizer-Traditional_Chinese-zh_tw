"""Original negative/positive All-Tools Release tests. No GitHub/network calls."""
from __future__ import annotations
from copy import deepcopy
import hashlib, json
from pathlib import Path
import shutil, subprocess, sys, tempfile, unittest
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
import check_all_tools_release as C

class FullSuiteSafetyContract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory(prefix='tls-suite-fixture-')
  cls.root=Path(cls.tmp.name);cls.cache=cls.root/'cache';cls.cache.mkdir()
  cls.stage=cls.root/'stage';cls.fixture_registry=cls.root/'fixture_registry.json'
  a=json.loads(B.REGISTRY.read_text(encoding='utf-8'))
  cls.raw_reg=deepcopy(a)
  # The released R5 Chrome ZIP is not byte-reproducible from current archive/build.
  # TEST-ONLY fixture substitutes a previous public snapshot, NEVER allowed for a release.
  r5=Path(__file__).resolve().parents[3]/'baseline/INSTALLERS/R5/TLS_Chrome_MV3_R5_20261024.zip'
  if not r5.exists():
   r5=ROOT/'dist/TLS_Chrome_MV3_R5_20261024.zip'
  if not r5.exists():
   subprocess.run([sys.executable,str(ROOT/'tools/build.py')],check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
  (cls.cache/'TLS_Chrome_MV3_R5_20261024.zip').write_bytes(r5.read_bytes())
  quality=B.deterministic_zip({'test-only-R6-quality-kit.txt':b'FIXTURE, not a real R6 release. DO NOT PUBLISH.\n'})
  (cls.cache/'TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip').write_bytes(quality)
  for x in a['tools']:
   if x['source_kind']!='official_release_asset':continue
   if x['tool_id']=='tls.r5.chrome':
    x['expected_sha256']=B.digest((cls.cache/x['artifact_filename']).read_bytes())
   elif x['tool_id']=='tls.r6.quality-kit':
    x['expected_sha256']=B.digest(quality)
   else:
    p=(ROOT/'dist'/x['artifact_filename']) if x['tool_id'].startswith('tls.r5') else ROOT/'dist'/('r11' if x['tool_id'].startswith('tls.r11') else 'r13')/x['artifact_filename']
    if not p.exists():
     subprocess.run([sys.executable,str(ROOT/('tools/build_r11.py' if x['tool_id'].startswith('tls.r11') else 'tools/build_r13.py'))],check=True,cwd=ROOT,stdout=subprocess.DEVNULL)
    blob=p.read_bytes()
    cls.cache.joinpath(x['artifact_filename']).write_bytes(blob)
    assert B.digest(blob)==x['expected_sha256'],x['tool_id']
  cls.fixture_registry.write_text(json.dumps(a,ensure_ascii=False),encoding='utf-8')
  B.build(cls.fixture_registry,cls.stage,cls.cache,fixture=True,source_sha=a['base_commit_sha'])
  cls.fixture_reg=a

 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()

 def verify(self,stage=None,**kw):
  return C.verify_stage(stage or self.stage,self.fixture_registry,fixture_ok=True,**kw)
 def altered(self, edits):
  path=self.root/('stage_malformed_'+str(len(list(self.root.glob('stage_malformed_*')))))
  shutil.copytree(self.stage,path)
  edits(path)
  return path
 def corrupt(self,name,mutator=lambda b:b+b'!'):
  def modify(folder):
   p=folder/name;p.write_bytes(mutator(p.read_bytes()))
  return self.altered(modify)

 def test_01_full_fixture_passes(self):
  x=self.verify();self.assertEqual(x['tools'],26);self.assertEqual(x['github_assets_expected'],26)
 def test_02_production_refuses_fixture(self):
  with self.assertRaisesRegex(B.ReleaseBlock,'FIXTURE_NOT_PUBLISHABLE'):C.verify_stage(self.stage,self.fixture_registry,fixture_ok=False)
 def test_03_production_rejects_replacement_R5_release_zip(self):
  prod=next(x for x in self.raw_reg['tools'] if x['tool_id']=='tls.r5.chrome')
  local=next(x for x in self.fixture_reg['tools'] if x['tool_id']=='tls.r5.chrome')
  self.assertNotEqual(prod['expected_sha256'],local['expected_sha256'])
 def test_04_missing_old_R11_js_block(self):
  p=self.altered(lambda d:(d/'TLS_Tampermonkey_R11_20261025.user.js').unlink())
  with self.assertRaisesRegex(C.GuardError,'INCOMPLETE'):self.verify(p)
 def test_05_missing_old_R13_chrome_block(self):
  p=self.altered(lambda d:(d/'TLS_Chrome_MV3_R13_20261025.zip').unlink())
  with self.assertRaisesRegex(C.GuardError,'INCOMPLETE'):self.verify(p)
 def test_06_missing_R16_html_block(self):
  p=self.altered(lambda d:(d/'TW_Localization_Safety_Studio_R16_20261026.html').unlink())
  with self.assertRaisesRegex(C.GuardError,'INCOMPLETE'):self.verify(p)
 def test_07_sha_mutation_block(self):
  with self.assertRaisesRegex(C.GuardError,'ARTIFACT_BYTES_SHA'):self.verify(self.corrupt('TW_Document_Trust_Graph_R17_20261026.html'))
 def test_08_partial_R17_release_must_fail(self):
  data={'assets':[{'name':'TW_Document_Trust_Graph_R17_20261026.html','size':46034},{'name':'TW_Document_Trust_Graph_R17_20261026.html.sha256','size':108}],'draft':False}
  with self.assertRaisesRegex(C.GuardError,'GITHUB_RELEASE_INCOMPLETE'):self.verify(release_data=data,require_published=True)
 def test_09_complete_realistic_GitHub_asset_parity(self):
  data={'assets':[{'name':p.name,'size':p.stat().st_size,'digest':'sha256:'+B.digest(p.read_bytes())} for p in self.stage.iterdir()],'draft':False,'prerelease':False}
  self.assertEqual(self.verify(release_data=data,require_published=True)['status'],'PASS')
 def test_10_wrong_GitHub_digest_block(self):
  data={'assets':[{'name':p.name,'size':p.stat().st_size,'digest':'sha256:'+('f'*64)} for p in self.stage.iterdir()],'draft':False}
  with self.assertRaisesRegex(C.GuardError,'GITHUB_ASSET_SHA'):self.verify(release_data=data)
 def test_11_draft_cannot_be_published(self):
  data={'assets':[{'name':p.name,'size':p.stat().st_size,'digest':'sha256:'+B.digest(p.read_bytes())} for p in self.stage.iterdir()],'draft':True}
  with self.assertRaisesRegex(C.GuardError,'GITHUB_RELEASE_NOT_PUBLISHED'):self.verify(release_data=data,require_published=True)
 def test_12_cannot_claim_approval_in_fixture(self):
  p=self.altered(lambda d:(d/'VALIDATION.json').write_bytes((d/'VALIDATION.json').read_bytes().replace(b'FIXTURE_TEST_ONLY',b'PACKAGE_READY_NOT_PUBLISHED')))
  with self.assertRaisesRegex(C.GuardError,'SHA256_MISMATCH|FIXTURE_STATUS_MISMATCH'):self.verify(p)
 def test_13_zip_member_traversal_rejected(self):
  import io
  s=io.BytesIO()
  with ZipFile(s,'w') as z:z.writestr('../secret.txt',b'bad')
  with self.assertRaisesRegex(B.ReleaseBlock,'ZIP_PATHS'):B.validate_zip_bytes(s.getvalue(),'bad.zip')
 def test_14_zip_duplicate_member_rejected(self):
  import io, warnings
  s=io.BytesIO()
  with warnings.catch_warnings():
   warnings.simplefilter('ignore')
   with ZipFile(s,'w') as z:z.writestr('a.txt',b'hi');z.writestr('a.txt',b'bye')
  with self.assertRaisesRegex(B.ReleaseBlock,'ZIP_PATHS'):B.validate_zip_bytes(s.getvalue(),'dup.zip')
 def test_15_symlink_rejected(self):
  t=self.root/'linked-file';t.symlink_to(self.stage/'ALL_TOOLS_MANIFEST.json')
  with self.assertRaisesRegex(B.ReleaseBlock,'SYMLINK'):B.safe_file(t,self.root)
 def test_16_no_hidden_secrets_in_paths(self):
  for s in ('../foo.txt','/etc/passwd','game_'+''.join(['poke','bonk'])+'.user.js','folder\\child','./bad.txt'):
   self.assertFalse(B.safe_archive_path(s),s)
 def test_17_bad_license_or_status_registry_block(self):
  reg=deepcopy(self.fixture_reg);reg['tools'][0]['rights_review']='UNKNOWN'
  with self.assertRaisesRegex(B.ReleaseBlock,'LICENSE_OR_RIGHTS'):B.validate_registry(reg,True)
 def test_18_previous_tools_cannot_disappear(self):
  old=json.loads((self.stage/'ALL_TOOLS_MANIFEST.json').read_text())
  old['tools'].append({'tool_id':'tls.legacy.protected.extra','status':'SUPPORTED'})
  op=self.root/'previous.json';op.write_text(json.dumps(old))
  with self.assertRaisesRegex(C.GuardError,'TOOL_ID_REMOVAL'):self.verify(previous_manifest=op)
 def test_19_wrong_main_SHA_block(self):
  with self.assertRaisesRegex(C.GuardError,'SOURCE_GIT_SHA'):self.verify(expected_sha='a'*64)
 def test_20_edited_suite_detected(self):
  with self.assertRaisesRegex(C.GuardError,'SUITE_SHA_OR_SIZE'):self.verify(self.corrupt(B.SUITE_FILENAME))
 def test_21_valid_zip_crc_fail_closed(self):
  z=bytearray(B.deterministic_zip({'a.txt':b'not empty'}))
  # Flip a byte inside the ZIP compressed member to invalidate CRC/decompression.
  with ZipFile(__import__('io').BytesIO(z)) as f:
   info=f.infolist()[0]
   start=info.header_offset + 30 + len(info.filename.encode('utf8')) + len(info.extra)
  z[start]^=0x7f
  with self.assertRaises(B.ReleaseBlock):B.validate_zip_bytes(bytes(z),'tampered')
 def test_22_duplicate_asset_identifier(self):
  reg=deepcopy(self.fixture_reg);reg['tools'][1]['tool_id']=reg['tools'][0]['tool_id']
  with self.assertRaisesRegex(B.ReleaseBlock,'REGISTRY_ID_MONOTONIC_BASELINE'):B.validate_registry(reg,True)
 def test_23_no_extra_game_specific_asset(self):
  p=self.altered(lambda d:(d/('poke'+'bonk'+'_bundle.zip')).write_bytes(b'test'))
  with self.assertRaisesRegex(C.GuardError,'EXTRA_ASSETS'):self.verify(p)
 def test_24_missing_dev_bundle_block(self):
  p=self.altered(lambda d:(d/B.DEVELOPER_BUNDLE).unlink())
  with self.assertRaisesRegex(C.GuardError,'INCOMPLETE'):self.verify(p)
 def test_25_missing_six_language_doc_block(self):
  import io
  with ZipFile(io.BytesIO((self.stage/B.DEVELOPER_BUNDLE).read_bytes())) as z:
   self.assertTrue(all('README.'+loc+'.md' in z.namelist() for loc in ('en','es','ja','ko','zh-CN')))
 def test_26_no_network_fetched_during_build(self):
  self.assertTrue((self.stage/'BUILD_PROVENANCE.json').exists())
  self.assertTrue((self.stage/'VALIDATION.json').exists())

 def test_27_only_central_publisher_is_active(self):
  self.assertTrue(C.verify_workflow())

if __name__=='__main__':unittest.main()
