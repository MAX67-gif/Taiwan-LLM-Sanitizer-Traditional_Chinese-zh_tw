"""R206 new Suite tag collision preflight: honest read-only synthetic tests."""
from __future__ import annotations
from pathlib import Path
from unittest import mock
import json, subprocess, sys, tempfile, unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import check_suite_175_release_preflight_r206 as R
import publish_all_tools_release as Old

GOOD={
 'status':'OFFICIAL_29_SOURCE_BYTES_AND_30_CANDIDATE_ASSETS_VERIFIED',
 'old_official_release_bytes_verified':29,
 'candidate_assets':30,'tool_count':30,
 'release_permission':'NONE','released':False,
 'suite_sha256':'4'*64
}
HEAD='b'*40

class Client:
 def __init__(self,returns=None):
  self.calls=[];self.returns=returns or {}
 def api(self,endpoint,*,method='GET',allow_not_found=False):
  self.calls.append((endpoint,method,allow_not_found))
  return self.returns.get(endpoint)

class TagCollisionSafety(unittest.TestCase):
 def test_01_two_distinct_gets_are_required_before_reporting_unused(self):
  cli=Client()
  self.assertEqual(R.github_unused(cli),(
      'releases/tags/all-tools-suite-v17.5.0',
      'git/ref/tags/all-tools-suite-v17.5.0'))
  self.assertEqual([p for p,m,_ in cli.calls],list(R.FUTURE_PATHS))
  self.assertTrue(all(m=='GET' and nf for _,m,nf in cli.calls))

 def test_02_existing_release_or_gitreftag_always_blocks(self):
  for k in R.FUTURE_PATHS:
   with self.subTest(existing=k),self.assertRaisesRegex(R.NotReady,'ALREADY_EXISTS'):
    R.github_unused(Client({k:{"tag_name":R.NEW_TAG}}))

 def test_03_corrupt_notfound_response_and_transport_errors_never_become_absence(self):
  def fake(status,body,rc):
   return lambda args,**kw:subprocess.CompletedProcess(
       args,rc,'HTTP/2 '+str(status)+'\r\ncontent-type: application/json\r\n\r\n'
       +json.dumps(body), 'synthetic transport error')
  for status,body,rc in [
   (403,{"message":"Forbidden"},1),
   (404,{"message":"Access denied"},1),
   (429,{"message":"rate limit"},1),
   (500,{"message":"gateway"},1),
   (200,{"tag_name":"new"},0),
  ]:
   with self.subTest(status=status),self.assertRaises(
       (Old.PublisherBlocked,R.NotReady)):
    R.github_unused(Old.GitHubCLI(runner=fake(status,body,rc)))
  ok=Old.GitHubCLI(runner=fake(404,{"message":"Not Found"},1))
  self.assertEqual(len(R.github_unused(ok)),2)

 def test_04_preflight_requires_original_29_real_byte_candidate_and_no_release_permission(self):
  with tempfile.TemporaryDirectory(prefix='tls-r206-') as directory:
   stage=Path(directory)/'stage';stage.mkdir()
   for i in range(27):(stage/('f'+str(i))).write_bytes(b'x')
   for name in ('TLS_ALL_TOOLS_SUITE_17_5_0_OFFICIAL_SOURCE_CANDIDATE_NOT_RELEASED.zip',
                'TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html',
                'TLS_DEVELOPER_CLI_SKILL_17_5_0_OFFICIAL_SOURCE_CANDIDATE_NOT_RELEASED.zip'):
    (stage/name).write_bytes(b'x')
   with mock.patch.object(R.subprocess,'check_output',return_value=HEAD+'\n'):
    with mock.patch.object(R.CandidateCheck,'inspect',return_value=dict(GOOD)):
     report=R.validate(stage,Path(directory),Path(directory)/'old.json',HEAD,Client())
     self.assertEqual(report['status'],'SOURCE_VERIFIED_TAG_UNUSED_BUT_RELEASE_NOT_READY')
     self.assertEqual(report['github_write_calls'],0)
     self.assertFalse(report['tag_absence_atomic_reservation'])
     self.assertEqual(report['publication_permission'],'NONE')
     self.assertFalse(report['draft_fresh_downloads_verified'])
     self.assertFalse(report['published_fresh_downloads_verified'])
     self.assertFalse(report['full_production_175_builder_verified'])
     for change in [
      {'release_permission':'FULL'},
      {'candidate_assets':29},
      {'old_official_release_bytes_verified':28},
      {'released':True},
      {'status':'FIXTURE_TEST_ONLY'},
     ]:
      bad={**GOOD,**change}
      with mock.patch.object(R.CandidateCheck,'inspect',return_value=bad):
       with self.assertRaisesRegex(R.NotReady,'CANDIDATE_NOT_INDEPENDENTLY_VERIFIED'):
        R.validate(stage,Path(directory),Path(directory)/'old.json',HEAD,Client())

 def test_05_new_tag_is_not_an_existing_previous_version(self):
  self.assertEqual(R.NEW_TAG,'all-tools-suite-v17.5.0')
  self.assertEqual(len(R.FUTURE_PATHS),2)
  self.assertTrue(all(s.startswith('repos/'+Old.REPOSITORY+'/') for s in R.FUTURE_PATHS))
  self.assertNotIn('all-tools-suite-v17.4.0',R.FUTURE_PATHS)

 def test_06_no_mutating_release_methods_and_no_expected_fake_success(self):
  source=(ROOT/'tools/check_suite_175_release_preflight_r206.py').read_text('utf-8')
  for s in ("gh release create","gh release upload","gh release delete",
            "method='POST'","method='PATCH'","method='PUT'",
            "publish_release(","upload_release_asset("):
   self.assertNotIn(s,source)
  self.assertIn("allow_not_found=True",source)
  self.assertIn("OldPublisher.GitHubCLI()",source)
  self.assertIn("'publication_permission':'NONE'",source)

if __name__=='__main__':unittest.main()
