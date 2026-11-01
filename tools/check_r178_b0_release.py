"""R17.8 B0 release-preservation gate: no remote mutation and no user content."""
from __future__ import annotations
import argparse,json
from pathlib import Path

REPO = 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
RELEASES = (
  ('all-tools-suite-v17.1.0', '9dcea69bc6357a01e2eb2a60b9da6a9efade9539', 24),
  ('all-tools-suite-v17.2.0', 'a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4', 25),
  ('all-tools-suite-v17.3.0', 'b5e1bf0ae7ad63c0e564815d7f0b921187889e2a', 28),
)
WITHDRAWN = frozenset({
 'TLS_ALL_TOOLS_SUITE_17_1_0.zip','TLS_DEVELOPER_CLI_SKILL_17_1_0.zip',
 'TLS_ALL_TOOLS_SUITE_17_2_0.zip','TLS_DEVELOPER_CLI_SKILL_17_2_0.zip',
})
CHECKSUM_NAMES = frozenset({'ALL_TOOLS_MANIFEST.json','SHA256SUMS.txt','VALIDATION.json'})
LATEST_NAMES = CHECKSUM_NAMES | frozenset({
 'TLS_ALL_TOOLS_SUITE_17_3_0.zip','TLS_DEVELOPER_CLI_SKILL_17_3_0.zip',
 'TW_Wording_Assistant_R172_20261027.html','TLS_Chrome_MV3_MRFT_R177_20261031.zip',
})

def validate_release(obj, tag, sha, count):
 if not isinstance(obj,dict) or obj.get('tagName') != tag or obj.get('isDraft') is not False or obj.get('targetCommitish') != sha:
  raise ValueError('RELEASE_IDENTITY_MISMATCH:'+tag)
 assets=obj.get('assets')
 if not isinstance(assets,list) or len(assets) != count:
  raise ValueError('RELEASE_ASSET_COUNT_MISMATCH:'+tag)
 names=[a.get('name') if isinstance(a,dict) else None for a in assets]
 if any(not isinstance(n,str) or not n for n in names) or len(names) != len(set(names)):
  raise ValueError('RELEASE_ASSET_NAMES_UNSAFE:'+tag)
 got=set(names)
 if got.intersection(WITHDRAWN):raise ValueError('WITHDRAWN_BUNDLE_REAPPEARED:'+tag)
 required=LATEST_NAMES if tag.endswith('17.3.0') else CHECKSUM_NAMES
 if tag.endswith('17.2.0'):required=required|frozenset({'TW_Wording_Assistant_R172_20261027.html'})
 if not required.issubset(got):raise ValueError('REQUIRED_RELEASE_ASSET_MISSING:'+tag)
 return {'tag':tag,'source_sha':sha,'assets_remaining':count,'retired_bundle_ids_present':0}

def validate_three(items):
 if not isinstance(items,(tuple,list)) or len(items)!=3:raise ValueError('THREE_RELEASES_REQUIRED')
 return [validate_release(obj,*expected) for obj,expected in zip(items,RELEASES)]

def main(args=None):
 p=argparse.ArgumentParser()
 for key in ('r171','r172','r173'):p.add_argument('--'+key+'-json',required=True,type=Path)
 p.add_argument('--receipt',required=True,type=Path)
 a=p.parse_args(args)
 rows=validate_three([json.loads(getattr(a,k+'_json').read_text('utf-8')) for k in ('r171','r172','r173')])
 receipt={'schema':'tls.r178-b0.release-metadata.v1','status':'PASS','latest_complete_suite':'all-tools-suite-v17.3.0',
          'new_release_created':False,'binary_assets_fresh_downloaded_this_run':False,
          'historical_git_refs_purged':False,'releases':rows}
 a.receipt.parent.mkdir(parents=True,exist_ok=True)
 a.receipt.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('R178_B0_LEGACY_WITHDRAWAL_AND_CURRENT_SUITE_METADATA_PASS')
 return 0
if __name__=='__main__':
 try:raise SystemExit(main())
 except (OSError,ValueError,json.JSONDecodeError) as e:
  print('R178_B0_DOCS_GATE_FAILED_CLOSED',str(e)[:200]);raise SystemExit(2)
