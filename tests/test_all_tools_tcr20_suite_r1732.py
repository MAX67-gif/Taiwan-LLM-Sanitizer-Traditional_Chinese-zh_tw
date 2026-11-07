"""Preserve the Suite 17.3.2 TCR 2.0 integration without semantic-quality claims."""
import hashlib, io, json, pathlib, subprocess, sys, unittest
from zipfile import ZipFile

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
SKILL='skills/taiwan-context-reviewer'
PINNED={
 SKILL+'/SKILL.md':'98684565112098022a8a7bd86bc86e8d55598a66',
 SKILL+'/scripts/audit_markdown.py':'f2e82f68fd715556f38b19d654abbc7c4d7c4265',
 SKILL+'/assets/ORIGINAL_CASES.json':'6fac313822bde067021cdc14693dc71a6f76a5ea'
}
class TCR20SuiteTests(unittest.TestCase):
 def test_original_pr41_git_blobs_are_unchanged(self):
  for name,expected in PINNED.items():
   with self.subTest(name=name):
    data=(ROOT/name).read_bytes()
    blob=b'blob '+str(len(data)).encode('ascii')+b'\0'+data
    self.assertEqual(hashlib.sha1(blob).hexdigest(),expected)
 def test_skill_is_bundled_and_28_registered_tools_are_unchanged(self):
  paths=B.tracked_files()
  raw=B.make_developer_bundle(paths)
  with ZipFile(io.BytesIO(raw)) as z:
   for name in PINNED:
    self.assertIn(name,z.namelist())
    self.assertEqual(z.read(name),(ROOT/name).read_bytes())
   self.assertIn(SKILL+'/README.zh-TW.md',z.namelist())
   self.assertIn(SKILL+'/assets/COMPARE_REVISED_OK.md',z.namelist())
  r=json.loads(B.REGISTRY.read_bytes())
  self.assertEqual((r['suite_version'],r['release_tag']),('17.4.0','all-tools-suite-v17.4.0'))
  self.assertEqual(len(B.validate_registry(r,False)),29)
  self.assertEqual(B.digest('\n'.join(t['tool_id'] for t in r['tools']).encode()),B.CURRENT_IDS_SHA256)
  self.assertEqual(B.digest(B.json_bytes(r['tools'][:28])),
   '340de86fdb49ca201aad6317c7769c6dfefde2d3ad997172cc2bbc97ca1bb5cb')
 def test_offline_original_sample_is_metadata_only(self):
  cmd=[sys.executable,str(ROOT/SKILL/'scripts/audit_markdown.py'),'--input',str(ROOT/SKILL/'assets/ORIGINAL_PRACTICE.md')]
  p=subprocess.run(cmd,capture_output=True,text=True,timeout=20)
  self.assertEqual(p.returncode,0,p.stderr)
  data=json.loads(p.stdout)
  self.assertFalse(data['source_modified'])
  self.assertEqual(data['network_access'],'NONE')
  self.assertEqual(data['human_translation_quality'],'NOT_MEASURED')
  self.assertEqual(data['privacy'],'NO_SOURCE_OR_PATH_IN_REPORT')
  for secret in ('資料庫', '今日午餐', 'example.org/docs/menu','ORIGINAL_PRACTICE.md'):
   self.assertNotIn(secret,p.stdout)
 def test_bad_rewrite_is_blocked_without_leaking_source(self):
  base=ROOT/SKILL/'assets'
  cmd=[sys.executable,str(ROOT/SKILL/'scripts/audit_markdown.py'),'--input',str(base/'COMPARE_ORIGINAL.md'),
   '--compare',str(base/'COMPARE_REVISED_BAD.md')]
  p=subprocess.run(cmd,capture_output=True,text=True,timeout=20)
  self.assertEqual(p.returncode,3,p.stderr)
  data=json.loads(p.stdout)
  self.assertIn(data['status'],('BLOCKED_INTEGRITY','REVIEW_REQUIRED','LIMITED'))
  self.assertFalse(data['checks']['protected_segments_unchanged'])
  self.assertFalse(data['checks']['numeric_tokens_unchanged'])
  self.assertNotIn('./guide_(tw)/選單.md',p.stdout)
if __name__=='__main__':
 unittest.main()
