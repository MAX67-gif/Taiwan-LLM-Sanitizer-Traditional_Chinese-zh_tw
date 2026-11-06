"""Synthetic contract tests for source intake; NOT original R19 native tests."""
from __future__ import annotations
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import tempfile
import unittest
import warnings
from dataclasses import replace
from zipfile import ZipFile, ZipInfo, ZIP_STORED, ZIP_BZIP2

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import r19_native_intake as I

HTML = b'<!doctype html><h1>ORIGINAL_SYNTHETIC_DOCUMENT_ONLY</h1>'
RUNNER = b'// original synthetic runner; never executed\n'
HTML_NAME = 'SOURCE/' + I.HTML_SUFFIX
RUNNER_NAME = 'SOURCE/tests/browser_first_result_studio_r19.cjs'

def digest(blob):
    return hashlib.sha256(blob).hexdigest()

def archive(entries, compression=ZIP_STORED):
    stream = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with ZipFile(stream, 'w', compression=compression) as z:
            for name, value in entries:
                z.writestr(name, value)
    return stream.getvalue()

def fixture(source_entries=None, outer_extra=(), duplicate_source=False, compression=ZIP_STORED):
    if source_entries is None:
        source_entries = [(HTML_NAME, HTML), (RUNNER_NAME, RUNNER)]
    source = archive(source_entries)
    entries = [('SOURCE_R2.zip', source), ('README.md', b'SYNTHETIC TEST ONLY')]
    if duplicate_source:
        entries.append(('SECOND_SOURCE.zip', source))
    entries.extend(outer_extra)
    task = archive(entries, compression)
    return task, I.Contract(digest(task), len(task), digest(source), len(source),
                            digest(HTML), len(HTML), digest(RUNNER))

class NativeIntakeTests(unittest.TestCase):
    def inspect(self, blob, contract):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'user-location-must-not-appear.zip'
            p.write_bytes(blob)
            before = p.read_bytes()
            result = I.inspect_task(p, contract)
            self.assertEqual(p.read_bytes(), before)
            self.assertNotIn(str(p), json.dumps(result))
            self.assertNotIn('ORIGINAL_SYNTHETIC_DOCUMENT_ONLY', json.dumps(result))
            self.assertEqual(result['native_status'], 'NOT_RUN')
            self.assertEqual(result['promotion'], 'NONE')
            return result

    def rejected(self, blob, c, code):
        r = self.inspect(blob, c)
        self.assertEqual(r['intake_state'], 'REJECTED')
        self.assertEqual(r['reason_code'], code)
        self.assertIs(r['source_identity_verified'], False)

    def test_official_contract_stays_pinned(self):
        self.assertEqual(I.OFFICIAL.task_sha256, '5ef57fa1522245de20a4e14dd2d6698a8c82af294ab1be13f8e8c8611ee9a18d')
        self.assertEqual(I.OFFICIAL.runner_sha256, 'f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8')
        self.assertEqual(I.OFFICIAL.kind, 'PINNED_R19_R2')

    def test_missing_input_is_blocked_not_native_pass(self):
        r = I.inspect_task(None)
        self.assertEqual(r['intake_state'], 'BLOCKED')
        self.assertEqual(r['reason_code'], 'INPUT_MISSING')
        self.assertEqual(r['native_status'], 'NOT_RUN')
        self.assertEqual(r['promotion'], 'NONE')

    def test_missing_path_reports_blocked_and_preserves_native_not_run(self):
        with tempfile.TemporaryDirectory() as d:
            missing = Path(d) / 'not-present.zip'
            report = I.inspect_task(missing)
        self.assertEqual(report['intake_state'], 'BLOCKED')
        self.assertEqual(report['reason_code'], 'INPUT_MISSING')
        self.assertIs(report['source_identity_verified'], False)
        self.assertEqual(report['native_status'], 'NOT_RUN')

    def test_directory_not_a_regular_task(self):
        with tempfile.TemporaryDirectory() as d:
            r = I.inspect_task(Path(d))
        self.assertEqual(r['reason_code'], 'INPUT_NOT_REGULAR')

    def test_input_symlink_refused(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'actual'; p.write_bytes(b'test')
            link = Path(d) / 'alias'; link.symlink_to(p)
            r = I.inspect_task(link)
        self.assertEqual(r['reason_code'], 'INPUT_SYMLINK')

    def test_oversize_input_is_rejected_before_parsing(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'large.zip'
            with p.open('wb') as f:
                f.truncate(I.MAX_TASK_BYTES + 1)
            r = I.inspect_task(p)
        self.assertEqual(r['reason_code'], 'INPUT_LIMIT')

    def test_task_declared_length_is_strict(self):
        blob, c = fixture()
        self.rejected(blob, replace(c, task_bytes=c.task_bytes + 1), 'TASK_SIZE_MISMATCH')

    def test_task_digest_is_strict(self):
        blob, c = fixture()
        self.rejected(blob, replace(c, task_sha256='0' * 64), 'TASK_SHA_MISMATCH')

    def test_matching_synthetic_contract_does_not_grant_native_pass(self):
        blob, c = fixture()
        r = self.inspect(blob, c)
        self.assertEqual(r['intake_state'], 'VERIFIED')
        self.assertEqual(r['reason_code'], 'IDENTITY_VERIFIED_NATIVE_NOT_RUN')
        self.assertIs(r['source_identity_verified'], True)
        self.assertEqual(r['contract_kind'], 'SYNTHETIC_TEST')

    def test_old_or_other_archive_cannot_match_official_contract(self):
        blob, _ = fixture()
        self.rejected(blob, I.OFFICIAL, 'TASK_SIZE_MISMATCH')

    def test_missing_exact_source_archive(self):
        blob, c = fixture()
        self.rejected(blob, replace(c, source_sha256='0' * 64), 'SOURCE_NOT_FOUND')

    def test_duplicate_source_archive_refused(self):
        blob, c = fixture(duplicate_source=True)
        self.rejected(blob, c, 'SOURCE_AMBIGUOUS')

    def test_source_size_is_checked(self):
        blob, c = fixture()
        self.rejected(blob, replace(c, source_bytes=c.source_bytes + 1), 'SOURCE_SIZE_MISMATCH')

    def test_html_absent(self):
        blob, c = fixture([(RUNNER_NAME, RUNNER)])
        self.rejected(blob, c, 'HTML_NOT_FOUND')

    def test_html_wrong_digest(self):
        blob, c = fixture([(HTML_NAME, b'X' * len(HTML)), (RUNNER_NAME, RUNNER)])
        self.rejected(blob, c, 'HTML_SHA_MISMATCH')

    def test_html_wrong_length(self):
        blob, c = fixture([(HTML_NAME, HTML + b' '), (RUNNER_NAME, RUNNER)])
        self.rejected(blob, c, 'HTML_SIZE_MISMATCH')

    def test_duplicate_html_locations(self):
        blob, c = fixture([(HTML_NAME, HTML), ('OTHER/' + I.HTML_SUFFIX, HTML), (RUNNER_NAME, RUNNER)])
        self.rejected(blob, c, 'HTML_AMBIGUOUS')

    def test_original_runner_is_required(self):
        blob, c = fixture([(HTML_NAME, HTML), (RUNNER_NAME, b'changed runner')])
        self.rejected(blob, c, 'RUNNER_NOT_FOUND')

    def test_paths_reject_traversal_and_windows_aliases(self):
        for name in ('../x', '/x', 'a/../x', 'a\\x', 'C:/x', 'a//x', 'a/./x', 'a./x', 'NUL.txt', 'a/CON', 'x:stream', 'x '):
            with self.subTest(case=name):
                blob, c = fixture(outer_extra=[(name, b'x')])
                self.rejected(blob, c, 'ZIP_UNSAFE_NAME')

    def test_casefold_and_duplicate_entries_rejected(self):
        for entries in ([('a', b'1'), ('a', b'2')], [('A.txt', b'1'), ('a.txt', b'2')]):
            with self.subTest(case=len(entries)):
                blob, c = fixture(outer_extra=entries)
                self.rejected(blob, c, 'ZIP_DUPLICATE_NAME')

    def test_archive_symlink_refused(self):
        info = ZipInfo('link'); info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        blob, c = fixture(outer_extra=[(info, b'target')])
        self.rejected(blob, c, 'ZIP_LINK_OR_SPECIAL')

    def test_unsupported_compression_refused(self):
        blob, c = fixture(compression=ZIP_BZIP2)
        self.rejected(blob, c, 'ZIP_UNSUPPORTED_COMPRESSION')

    def test_malformed_archive_refused(self):
        blob, c = fixture()
        bad = b'not a zip'
        self.rejected(bad, replace(c, task_sha256=digest(bad), task_bytes=len(bad)), 'ZIP_INVALID')

    def test_crc_corruption_refused(self):
        blob, c = fixture(outer_extra=[('padding', b'CRC_PAYLOAD')])
        damaged = bytearray(blob)
        idx = damaged.index(b'CRC_PAYLOAD'); damaged[idx] ^= 1
        data = bytes(damaged)
        self.rejected(data, replace(c, task_sha256=digest(data)), 'ZIP_INVALID')

    def test_file_directory_prefix_collision_refused(self):
        blob, c = fixture(outer_extra=[('same', b'x'), ('same/child', b'y')])
        self.rejected(blob, c, 'ZIP_PATH_COLLISION')

    def test_member_count_is_bounded(self):
        entries = [('item%04d' % i, b'x') for i in range(I.MAX_MEMBERS)]
        blob, c = fixture(outer_extra=entries)
        self.rejected(blob, c, 'ZIP_MEMBER_COUNT')


def tearDownModule():
    # This is a real source-presence observation in the CI checkout, not a
    # synthetic native run. Missing archived bytes MUST remain BLOCKED.
    r = I.inspect_task(ROOT / 'native-input' / 'R19_R2_TASK.zip')
    print('R19_CI_INTAKE_OBSERVATION=' + json.dumps(r, sort_keys=True))

if __name__ == '__main__':
    unittest.main()
