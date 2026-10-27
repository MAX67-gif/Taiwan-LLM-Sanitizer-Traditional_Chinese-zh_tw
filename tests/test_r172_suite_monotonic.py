"""All R17.1 tool bytes and IDs are retained when adding R17.2."""
import hashlib,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import build_all_tools_release as B
class R172SafeAdditive(unittest.TestCase):
 def test_27_tools_exact_prior_prefix(self):
  r=json.loads(B.REGISTRY.read_text('utf8'))
  self.assertEqual(len(r['tools']),27)
  self.assertEqual([t['tool_id'] for t in r['tools'][:26]],r['monotonic_baseline_tool_ids'])
  self.assertEqual(hashlib.sha256('\n'.join(r['monotonic_baseline_tool_ids']).encode()).hexdigest(),B.BASELINE_IDS_SHA256)
  self.assertEqual([t['tool_id'] for t in r['tools'][26:]],[B.NEW_TOOL_ID])
 def test_existing_assets_immutable_and_new_sha(self):
  r=json.loads(B.REGISTRY.read_text('utf8'))
  B.validate_registry(r,True)
  x=r['tools'][-1];self.assertEqual(x['expected_sha256'],B.digest((ROOT/x['source_path']).read_bytes()))
  self.assertEqual(x['source_commit_mode'],'CURRENT_SOURCE_COMMIT')
 def test_new_bounded_preview_only(self):
  r=json.loads(B.REGISTRY.read_text('utf8'));self.assertEqual(r['tools'][-1]['status'],'PREVIEW')
  self.assertFalse('original_commit_sha' in r['tools'][-1])
  self.assertEqual(sum(t['standalone_required'] for t in r['tools']),21)
 def test_source_is_not_network_plugin(self):
  from build_start_here_r172 import verify
  names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
  self.assertGreaterEqual(verify((ROOT/'START_HERE.html').read_text(),names),3)
if __name__=='__main__':unittest.main()
