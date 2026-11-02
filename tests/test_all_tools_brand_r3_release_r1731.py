"""Brand R3 Suite 17.3.1 non-publishing release contract."""
import hashlib, json, pathlib, sys, unittest, io
from zipfile import ZipFile
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
import publish_all_tools_release as P
BANNER='assets/branding/TLS_Premium_Banner_R3_2800x960.png'
SHA='4949e243b525e5a82af7fb53d254495b34ef15617233bc1b42db2bc1f2d7a1bb'
class BrandR3ReleaseVersion(unittest.TestCase):
 def test_versioned_release_does_not_reuse_published_tag(self):
  r=json.loads(B.REGISTRY.read_bytes())
  self.assertEqual((r['suite_version'],r['release_tag']),('17.3.1','all-tools-suite-v17.3.1'))
  self.assertEqual(P.RELEASE_TAG,r['release_tag'])
  self.assertEqual(P.SUITE_VERSION,r['suite_version'])
  self.assertEqual(B.SUITE_FILENAME,'TLS_ALL_TOOLS_SUITE_17_3_1.zip')
  self.assertEqual(B.DEVELOPER_BUNDLE,'TLS_DEVELOPER_CLI_SKILL_17_3_1.zip')
 def test_original_brand_image_digest(self):
  self.assertEqual(hashlib.sha256((ROOT/BANNER).read_bytes()).hexdigest(),SHA)
 def test_developer_bundle_has_image_at_documented_path(self):
  raw=B.make_developer_bundle(B.tracked_files())
  with ZipFile(io.BytesIO(raw)) as z:
   self.assertIn(BANNER,z.namelist())
   self.assertEqual(hashlib.sha256(z.read(BANNER)).hexdigest(),SHA)
 def test_all_28_registry_tools_unchanged(self):
  r=json.loads(B.REGISTRY.read_bytes())
  self.assertEqual(len(r['tools']),28)
  self.assertEqual(len(B.validate_registry(r,False)),28)
  self.assertEqual(B.digest('\n'.join(x['tool_id'] for x in r['tools']).encode()),B.CURRENT_IDS_SHA256)
 def test_publisher_does_not_retarget_v1730(self):
  s=(ROOT/'tools/publish_all_tools_release.py').read_text('utf-8')
  self.assertNotIn("RELEASE_TAG = 'all-tools-suite-v17.3.0'",s)
 def test_banner_and_catalog_outside_frozen_showcase(self):
  for name in ('README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','README.zh-CN.md'):
   txt=(ROOT/name).read_text('utf-8')
   self.assertEqual(txt.count('<!-- TLS_BRANDING_R3_BEGIN -->'),1)
   self.assertEqual(txt.count('<!-- ALL_TOOLS_CATALOG: suite=17.3.1;'),1)
   self.assertLess(txt.index('<!-- TLS_BRANDING_R3_END -->'),txt.index('<!-- R176_SHOWCASE_BEGIN -->'))
if __name__=='__main__':unittest.main()
