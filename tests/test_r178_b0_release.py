"""R17.8 B0: withdrawn release assets, onboarding, archived-source boundaries."""
from pathlib import Path
import copy,re,io,sys,unittest
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
import check_r178_b0_release as C
import publication_guard as G

URL='https://github.com/'+C.REPO+'/releases/tag/all-tools-suite-v17.3.0'
README_FILES=('README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','README.zh-CN.md')
GUIDES=('docs/QUICK_START_R174.md','docs/QUICK_START_R174.en.md',
        'docs/showcase/README.md','docs/showcase/README.en.md',
        'docs/R173_COMPARISON_AND_ADOPTION.md','docs/R173_COMPARISON_AND_ADOPTION.en.md')

def synthetic_release(tag,sha,count):
 required=C.LATEST_NAMES if tag.endswith('17.3.0') else C.CHECKSUM_NAMES
 if tag.endswith('17.2.0'):required=required|frozenset({'TW_Wording_Assistant_R172_20261027.html'})
 names=list(sorted(required))+['fixture_%02d.txt'%i for i in range(count-len(required))]
 return dict(tagName=tag,targetCommitish=sha,isDraft=False,assets=[{'name':n} for n in names])

class B0Tests(unittest.TestCase):
 def test_three_releases_metadata_positive_and_fail_closed(self):
  xs=[synthetic_release(*t) for t in C.RELEASES]
  self.assertEqual([r['assets_remaining'] for r in C.validate_three(xs)],[24,25,28])
  for i,t in enumerate(C.RELEASES):
   for attr,val in (('tagName','wrong'),('isDraft',True),('targetCommitish','f'*40),('assets',[])):
    with self.subTest(i=i,attr=attr),self.assertRaises(ValueError):
     q=copy.deepcopy(xs);q[i][attr]=val;C.validate_three(q)
   for name in C.WITHDRAWN:
    with self.subTest(i=i,name=name),self.assertRaisesRegex(ValueError,'WITHDRAWN_BUNDLE'):
     q=copy.deepcopy(xs);q[i]['assets'][0]['name']=name;C.validate_three(q)
 def test_six_language_first_edit_preserves_1730_and_tracks_1731(self):
  for name in README_FILES:
   text=(ROOT/name).read_text('utf-8')
   with self.subTest(name=name):
    block=re.search('<!-- R176_SHOWCASE_BEGIN -->(.*?)<!-- R176_SHOWCASE_END -->',text,re.S)
    self.assertIsNotNone(block)
    self.assertEqual(block.group(1).count(URL),1)
    self.assertNotIn('all-tools-suite-v17.2.0',block.group(1))
    self.assertIn('TW_Wording_Assistant_R172_20261027.html',block.group(1))
    self.assertIn('suite=17.3.1; tools=28; standalone=23',text)
    self.assertEqual(B.strict_json(B.REGISTRY.read_bytes(), 'registry')['suite_version'],'17.3.1')
    for bad in C.WITHDRAWN:self.assertNotIn(bad,text)
 def test_guides_no_withdrawn_primary_download(self):
  for name in GUIDES:
   text=(ROOT/name).read_text('utf-8')
   with self.subTest(name=name):
    self.assertIn(URL,text)
    self.assertNotIn('all-tools-suite-v17.2.0',text)
    for bad in C.WITHDRAWN:self.assertNotIn(bad,text)
 def test_archive_nested_private_path_rejected(self):
  for banned in ('docs/PRODUCT_POSITIONING_R8.md','docs/R9_PRODUCT_STRATEGY.md',
                 'foo/Taiwan-LLM-Sanitizer-Project-Brain/x.md'):
   with self.subTest(name=banned):
    self.assertFalse(B.safe_archive_path(banned))
    with self.assertRaises(B.ReleaseBlock):B.deterministic_zip({banned:b'dummy'})
    self.assertFalse(G.allowed_path('src/'+banned))
  child=io.BytesIO()
  with ZipFile(child,'w') as z:z.writestr('docs/R9_PRODUCT_STRATEGY.md',b'fictional nonprivate sample')
  parent=io.BytesIO()
  with ZipFile(parent,'w') as z:z.writestr('inner.zip',child.getvalue())
  with self.assertRaisesRegex(B.ReleaseBlock,'ZIP_PATHS_OR_DUPLICATES'):
   B.validate_zip_bytes(parent.getvalue(),'parent.zip')
  self.assertTrue(B.safe_archive_path('docs/R173_COMPARISON_AND_ADOPTION.md'))
 def test_b0_does_not_claim_unmeasured_human_results(self):
  for name in ('docs/QUICK_START_R174.md','docs/QUICK_START_R174.en.md'):
   text=(ROOT/name).read_text('utf-8')
   self.assertIn('R17.2',text)
   self.assertIn('17.3',text)
  self.assertTrue(C.RELEASES[2][2]==28)

if __name__=='__main__':unittest.main()
