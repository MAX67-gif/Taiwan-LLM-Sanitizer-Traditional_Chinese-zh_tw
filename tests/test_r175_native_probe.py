"""R17.5 test-first security rules; fake CLI only inside explicit DEV_ONLY tests."""
from __future__ import annotations
from io import BytesIO
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile,ZipInfo

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'research'/'comparison'/'r175'))
sys.path.insert(0,str(ROOT/'research'/'comparison'/'r173'))
import native_probe as P
from opencc_adapter import convert_editable

class FakeNative:
    def convert(self,x):return x.replace('數據庫','資料庫').replace('数据库','資料庫')


class NativeEvidenceGuards(unittest.TestCase):
    def make_zip(self,path,names):
        with ZipFile(path,'w') as z:
            for name,data in names:
                z.writestr(name,data)
        return P.digest(path.read_bytes())

    def test_pinned_official_tag_and_sha(self):
        self.assertEqual(P.TAG,'ver.1.4.2')
        self.assertEqual(P.CONFIG_NAME,'s2twp.json')
        self.assertEqual(P.OFFICIAL_RELEASE_ASSET_SHA256,'5ec8bc9cd4aed58586af969a66e623b6fe22c24ac66af46aa6c81e8b75fea9e1')
        self.assertEqual(P.VERSION,'1.4.2')

    def test_missing_archive_blocks(self):
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(P.EvidenceBlocked,'MISSING'):
                P.validate_package(Path(td)/'missing.zip')

    def test_wrong_sha_is_never_extracted(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip';self.make_zip(p,[('test.deb',b'fake')])
            with self.assertRaisesRegex(P.EvidenceBlocked,'SHA256_MISMATCH'):P.validate_package(p)

    def test_explicit_test_sha_allows_safe_deb_extraction_listing_only(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            sig=hashlib.sha256(b'original-test').hexdigest().encode('ascii')+b'  valid.deb\n'
            h=self.make_zip(p,[('valid.deb',b'original-test'),('SHA256SUMS',sig)])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                self.assertEqual(P.validate_package(p),[('valid.deb',b'original-test')])

    def test_official_dot_slash_sha256sum_paths_are_strictly_verified(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            checksum=hashlib.sha256(b'original-test').hexdigest()
            manifest=f'{checksum}  ./valid.deb\n'.encode('ascii')
            h=self.make_zip(p,[('valid.deb',b'original-test'),('SHA256SUMS',manifest)])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                self.assertEqual(P.validate_package(p),[('valid.deb',b'original-test')])

    def test_nested_checksum_refuses_unexpected_paths(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            checksum=hashlib.sha256(b'original-test').hexdigest()
            for path in ('../valid.deb','./../valid.deb','./subdir/valid.deb','other/valid.deb'):
                manifest=f'{checksum}  {path}\n'.encode('ascii')
                h=self.make_zip(p,[('valid.deb',b'original-test'),('SHA256SUMS',manifest)])
                with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                    with self.subTest(path=path),self.assertRaisesRegex(P.EvidenceBlocked,'SHA256SUMS_FORMAT'):
                        P.validate_package(p)

    def test_pinned_marisa_source_and_sha(self):
        self.assertEqual(P.MARISA_SHA256,'befd1c30ac2163bb15ea83f26f92dbf4de39a00dcb0eaad133ee2c73306b268b')
        self.assertEqual(P.MARISA_VERSION,'0.3.1+git20250817-1build1')
        self.assertIn('archive.ubuntu.com',P.MARISA_URL)

    def test_unpinned_marisa_dependency_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'marisa.deb';p.write_bytes(b'unverified')
            with self.assertRaisesRegex(P.EvidenceBlocked,'MARISA_DEPENDENCY_SHA256_MISMATCH'):
                P.validate_marisa(p)
            with self.assertRaisesRegex(P.EvidenceBlocked,'MARISA_PINNED_DEPENDENCY_MISSING'):
                P.validate_marisa(None)

    def test_pinned_marisa_with_wrong_metadata_is_rejected(self):
        from subprocess import CompletedProcess
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'marisa.deb';p.write_bytes(b'test-package')
            h=P.hash_file(p)
            with patch.object(P,'MARISA_SHA256',h):
                with patch.object(P.subprocess,'run',return_value=CompletedProcess([],0,b'Package: libmarisa1\nVersion: 0.2.6\nArchitecture: amd64\n',b'')):
                    with self.assertRaisesRegex(P.EvidenceBlocked,'MARISA_METADATA_MISMATCH'):
                        P.validate_marisa(p)

    def test_pinned_marisa_metadata_has_no_runtime_credentials(self):
        from subprocess import CompletedProcess
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'marisa.deb';p.write_bytes(b'test-package')
            h=P.hash_file(p)
            meta=f'Package: libmarisa1\nVersion: {P.MARISA_VERSION}\nArchitecture: amd64\n'.encode('utf-8')
            with patch.object(P,'MARISA_SHA256',h),patch.object(P.subprocess,'run',return_value=CompletedProcess([],0,meta,b'')):
                result=P.validate_marisa(p)
                self.assertFalse(result['redistributed_in_TLS'])
                self.assertNotIn('token',json.dumps(result).lower())

    def test_no_unapproved_payload_in_verified_archive(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip';h=self.make_zip(p,[('script.sh',b'evil')])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                with self.assertRaisesRegex(P.EvidenceBlocked,'UNEXPECTED_PAYLOAD'):P.validate_package(p)

    def test_verified_package_but_wrong_nested_manifest_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            sig=("f"*64+"  valid.deb\n").encode('ascii')
            h=self.make_zip(p,[('valid.deb',b'original-test'),('SHA256SUMS',sig)])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                with self.assertRaisesRegex(P.EvidenceBlocked,'DEB_SHA256_MISMATCH'):
                    P.validate_package(p)

    def test_verified_package_missing_nested_manifest_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip';h=self.make_zip(p,[('valid.deb',b'original-test')])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                with self.assertRaisesRegex(P.EvidenceBlocked,'SHA256SUMS_MISSING'):
                    P.validate_package(p)

    def test_traversal_archive_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip';h=self.make_zip(p,[('../bad.deb',b'fake')])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',h):
                with self.assertRaisesRegex(P.EvidenceBlocked,'UNSAFE_PATH'):P.validate_package(p)

    def test_duplicate_archive_names_blocked(self):
        from warnings import catch_warnings,simplefilter
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            with catch_warnings():
                simplefilter('ignore')
                self.make_zip(p,[('same.deb',b'1'),('same.deb',b'2')])
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',P.hash_file(p)):
                with self.assertRaisesRegex(P.EvidenceBlocked,'UNSAFE_PATH'):P.validate_package(p)

    def test_symlink_archive_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip'
            with ZipFile(p,'w') as z:
                info=ZipInfo('bad.deb');info.create_system=3;info.external_attr=(0o120777 << 16)
                z.writestr(info,'target')
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',P.hash_file(p)):
                with self.assertRaisesRegex(P.EvidenceBlocked,'UNSAFE_PATH'):P.validate_package(p)

    def test_unreadable_nonzip(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'z.zip';p.write_bytes(b'fake')
            with patch.object(P,'OFFICIAL_RELEASE_ASSET_SHA256',P.hash_file(p)):
                with self.assertRaisesRegex(P.EvidenceBlocked,'UNREADABLE'):P.validate_package(p)

    def test_native_version_requires_exact_version_not_text_guess(self):
        n={'binary':Path('/no/such/native'),'working_dir':Path('/tmp'),'env':{}}
        with self.assertRaisesRegex(P.EvidenceBlocked,'EXECUTION_FAILED'):P.safe_version(n)

    def test_native_version_rejects_wrong_version_even_when_exit_zero(self):
        n={'binary':Path('/none'),'working_dir':Path('/tmp'),'env':{}}
        from subprocess import CompletedProcess
        with patch.object(P.subprocess,'run',return_value=CompletedProcess([],0,b'OpenCC Version 1.4.1',b'')):
            with self.assertRaisesRegex(P.EvidenceBlocked,'VERSION_MISMATCH'):P.safe_version(n)

    def test_native_version_requires_success_exit(self):
        from subprocess import CompletedProcess
        n={'binary':Path('/none'),'working_dir':Path('/tmp'),'env':{}}
        with patch.object(P.subprocess,'run',return_value=CompletedProcess([],1,b'OpenCC Version 1.4.2',b'')):
            with self.assertRaisesRegex(P.EvidenceBlocked,'VERSION_MISMATCH'):P.safe_version(n)

    def test_native_version_accepts_actual_version_text(self):
        from subprocess import CompletedProcess
        n={'binary':Path('/none'),'working_dir':Path('/tmp'),'env':{}}
        with patch.object(P.subprocess,'run',return_value=CompletedProcess([],0,b'OpenCC Version 1.4.2',b'')):
            self.assertEqual(P.safe_version(n),'1.4.2')

    def test_equal_editable_preserves_protected_code_and_comments(self):
        src='A 數據庫 `數據庫`\n<!-- 數據庫 -->\nB 數據庫'
        spans=[(2,5),(34,37)]
        # Use positions derived from actual source to avoid assuming UTF16 == bytes.
        a=src.index('數據庫');b=src.rindex('數據庫')
        m={'schema':'tls.r173.editable-spans.v1','format':'markdown','status':'READY',
           'offset_unit':'utf16','source_sha256':P.digest(src.encode()),
           'source_length_utf16':len(src),'spans':[{'id':'s0001','start':a,'end':a+3},{'id':'s0002','start':b,'end':b+3}]}
        out,n=convert_editable(src,m,FakeNative());self.assertEqual(n,2)
        self.assertIn('`數據庫`',out);self.assertIn('<!-- 數據庫 -->',out)
        self.assertEqual(out.count('資料庫'),2)

    def test_span_hash_binding_no_forgery(self):
        src='數據庫';m={'schema':'tls.r173.editable-spans.v1','format':'markdown','status':'READY',
            'offset_unit':'utf16','source_sha256':'x'*64,'source_length_utf16':3,
            'spans':[{'id':'s0001','start':0,'end':3}]}
        with self.assertRaisesRegex(ValueError,'SOURCE_HASH_MISMATCH'):convert_editable(src,m,FakeNative())

    def test_span_unsupported_mode_is_rejected(self):
        m={'schema':'tls.r173.editable-spans.v1','format':'json','status':'READY','offset_unit':'utf16','source_sha256':'x', 'source_length_utf16':1,'spans':[]}
        with self.assertRaisesRegex(ValueError,'UNTRUSTED_EDITABLE_MANIFEST'):convert_editable('x',m,FakeNative())

    def test_span_utf16_surrogate_half_rejected(self):
        src='😀數據庫';m={'schema':'tls.r173.editable-spans.v1','format':'markdown','status':'READY',
            'offset_unit':'utf16','source_sha256':P.digest(src.encode()),'source_length_utf16':5,
            'spans':[{'id':'s0001','start':1,'end':4}]}
        with self.assertRaisesRegex(ValueError,'INVALID_EDITABLE_SPANS'):convert_editable(src,m,FakeNative())

    def test_untrusted_private_fixture_outside_repo_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'in.txt';p.write_text('數據庫')
            with self.assertRaisesRegex(P.EvidenceBlocked,'ONLY_ORIGINAL_REPO_FIXTURE_ALLOWED'):
                P.run_verified(Path(td)/'archive.zip',p,Path(td)/'spans.json',Path(td)/'out')

    def test_existing_output_blocked_without_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);inp=ROOT/'research'/'comparison'/'r175'/'fixture_native_original.md'
            with self.assertRaisesRegex(P.EvidenceBlocked,'NO_OVERWRITE_OUTPUT_DIRECTORY'):
                P.run_verified(p/'archive.zip',inp,p/'spans.json',p)

    def test_absent_asset_returns_code_three_and_no_fake_receipt(self):
        with tempfile.TemporaryDirectory() as td:
            import contextlib,io
            err=io.StringIO();p=Path(td)
            with contextlib.redirect_stderr(err):
                rc=P.main(['--archive',str(p/'missing.zip'),'--fixture',str(ROOT/'research/comparison/r175/fixture_native_original.md'),
                           '--spans',str(p/'no_spans.json'),'--output',str(p/'out')])
            self.assertEqual(rc,3);self.assertIn('B_BLOCKED_NATIVE_EVIDENCE',err.getvalue());self.assertFalse((p/'out').exists())

    def test_binary_digest_is_sha256_not_git_blob_sha(self):
        self.assertEqual(P.digest(b'abc'),hashlib.sha256(b'abc').hexdigest())

    def test_contract_never_contains_provider_credentials(self):
        script=(ROOT/'research/comparison/r175/native_probe.py').read_text('utf-8')
        self.assertNotIn('GITHUB_TOKEN',script);self.assertNotIn('GH_TOKEN',script)

if __name__=='__main__':unittest.main()
