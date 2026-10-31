"""The historical R17.2 addition remains intact in the additive R17.7 suite."""
import hashlib,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
class R172SafeAdditive(unittest.TestCase):
 def test_historical_27_tools_remain_exact_prior_prefix(self):
  r=json.loads(B.REGISTRY.read_text('utf8'))
  self.assertEqual(len(r['tools']),28)
  self.assertEqual([t['tool_id'] for t in r['tools'][:26]],r['monotonic_baseline_tool_ids'])
  self.assertEqual(hashlib.sha256('\n'.join(r['monotonic_baseline_tool_ids']).encode()).hexdigest(),B.BASELINE_IDS_SHA256)
  self.assertEqual([t['tool_id'] for t in r['tools'][26:]],['tls.html.tw-wording-assistant-r172-20261027','tls.r177.chrome.mrft'])
  self.assertEqual(hashlib.sha256('\n'.join(t['tool_id'] for t in r['tools'][:27]).encode()).hexdigest(),'f1c06a60d53960a91e68f3b6184e801bffc6c5442774097a1e167a38f97aa769')
 def test_existing_assets_immutable_and_new_sha(self):
  r=json.loads(B.REGISTRY.read_text('utf8'))
  B.validate_registry(r,True)
  x=r['tools'][26];self.assertEqual(x['expected_sha256'],B.digest((ROOT/x['source_path']).read_bytes()))
  self.assertEqual(x['expected_sha256'],'4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873')
  self.assertNotIn('source_commit_mode',x)
  self.assertEqual(x['original_commit_sha'],'a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4')
  self.assertEqual(x['original_tag'],'all-tools-suite-v17.2.0')
 def test_new_bounded_preview_only(self):
  r=json.loads(B.REGISTRY.read_text('utf8'));self.assertEqual(r['tools'][26]['status'],'PREVIEW')
  self.assertEqual(r['tools'][-1]['status'],'PREVIEW')
  self.assertFalse('original_commit_sha' in r['tools'][-1])
  self.assertEqual(sum(t['standalone_required'] for t in r['tools']),22)
 def test_source_is_not_network_plugin(self):
  from build_start_here_r172 import verify
  names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
  self.assertGreaterEqual(verify((ROOT/'START_HERE.html').read_text(),names),3)
if __name__=='__main__':unittest.main()
