"""R19's additive Suite 17.4.0 release boundary, including native CI bypasses."""
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
sys.path.insert(0, str(ROOT / 'tests'))
import build_all_tools_release as B
import check_all_tools_release as C
import publish_all_tools_release as P
import test_all_tools_release as F

R19_ID = 'tls.html.tw-first-result-studio-r19-20261101'
R19_FILE = 'TW_First_Result_Studio_R19_20261101.html'
R19_SOURCE = 'examples/' + R19_FILE
R19_ORIGIN = '439041ceaae40f8c985d4c5ba3b34c37dcb61302'
R19_SHA = '33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a'
OLD_ROWS_SHA = '340de86fdb49ca201aad6317c7769c6dfefde2d3ad997172cc2bbc97ca1bb5cb'
IDS_SHA = 'cf54846ecef37ae118b8bba1325f5214e8db00c9f4c404093eef69e664820404'
NATIVE_STEP = 'Execute unchanged original R19 10 native file URL scenarios'
SOURCE_STEP = 'Verify original R19 HTML and runner bytes immediately before native test'
RECEIPT_STEP = 'Validate R19 original native result and saved screenshot/download evidence'
DRIVER_STEP = 'Prepare pinned Node Playwright 1.55 for R19 original synthetic native gate'
VERIFY_STEP = 'Verify exact R19 R2 public source and complete Node regression (automated, no human tests)'


def registry():
    return json.loads(B.REGISTRY.read_bytes())


class R19RegistryContract(unittest.TestCase):
    def test_new_inventory_uses_a_new_complete_release_identity(self):
        reg = registry()
        self.assertEqual((reg['suite_version'], reg['release_tag']),
                         ('17.4.0', 'all-tools-suite-v17.4.0'))
        self.assertEqual(len(B.validate_registry(reg, False)), 29)
        self.assertEqual((P.SUITE_VERSION, P.RELEASE_TAG),
                         ('17.4.0', 'all-tools-suite-v17.4.0'))
        self.assertEqual(B.SUITE_FILENAME, 'TLS_ALL_TOOLS_SUITE_17_4_0.zip')
        self.assertEqual(B.DEVELOPER_BUNDLE, 'TLS_DEVELOPER_CLI_SKILL_17_4_0.zip')
        self.assertEqual(sum(row['standalone_required'] for row in reg['tools']) + 1, 24)

    def test_all_previous_28_rows_keep_the_audited_metadata(self):
        reg = registry()
        previous = (json.dumps(reg['tools'][:28], sort_keys=True, ensure_ascii=False,
                               indent=2) + '\n').encode('utf-8')
        self.assertEqual(hashlib.sha256(previous).hexdigest(), OLD_ROWS_SHA)
        ids = '\n'.join(row['tool_id'] for row in reg['tools']).encode('utf-8')
        self.assertEqual(hashlib.sha256(ids).hexdigest(), IDS_SHA)

    def test_r19_has_fixed_original_source_and_no_generated_installer_authority(self):
        rows = {row['tool_id']: row for row in registry()['tools']}
        self.assertIn(R19_ID, rows)
        row = rows[R19_ID]
        for key, value in {
            'tool_version': 'R19 R2 engineering preview',
            'source_kind': 'git_source', 'source_path': R19_SOURCE,
            'original_commit_sha': R19_ORIGIN, 'original_tag': None,
            'artifact_filename': R19_FILE, 'expected_sha256': R19_SHA,
            'family': 'offline_html', 'status': 'PREVIEW',
            'package_subdir': 'html', 'standalone_required': True,
        }.items():
            with self.subTest(key=key):
                self.assertEqual(row.get(key), value)
        self.assertNotIn('source_commit_mode', row)
        self.assertEqual(hashlib.sha256((ROOT / R19_SOURCE).read_bytes()).hexdigest(), R19_SHA)
        self.assertEqual(B.NEW_TOOL_ID, 'tls.r177.chrome.mrft')

    def test_previous_metadata_cannot_be_changed_with_the_new_registry(self):
        reg = registry()
        self.assertEqual(len(B.validate_registry(reg, False)), 29)
        for index in range(28):
            changed = deepcopy(reg)
            changed['tools'][index]['build_command_or_reuse_reason'] = 'unreviewed replacement'
            with self.subTest(tool=index), self.assertRaisesRegex(B.ReleaseBlock, 'PREVIOUS_TOOL_METADATA_CHANGED'):
                B.validate_registry(changed, False)

    def test_r19_contract_cannot_self_authorize_a_different_source(self):
        reg = registry()
        self.assertEqual(len(B.validate_registry(reg, False)), 29)
        bad_fields = {
            'original_commit_sha': 'a' * 40,
            'expected_sha256': 'b' * 64,
            'source_path': 'examples/unreviewed.html',
            'artifact_filename': 'unreviewed.html',
            'source_kind': 'generated_local_artifact',
            'source_commit_mode': 'CURRENT_SOURCE_COMMIT',
            'tool_version': '99.0.0', 'status': 'SUPPORTED',
            'standalone_required': False, 'package_subdir': 'browser',
        }
        for field, value in bad_fields.items():
            changed = deepcopy(reg)
            changed['tools'][28][field] = value
            with self.subTest(field=field), self.assertRaises(B.ReleaseBlock):
                B.validate_registry(changed, False)


class R19PackagedContract(unittest.TestCase):
    setUpClass = classmethod(F.FullSuiteSafetyContract.setUpClass.__func__)
    tearDownClass = classmethod(F.FullSuiteSafetyContract.tearDownClass.__func__)
    verify = F.FullSuiteSafetyContract.verify
    altered = F.FullSuiteSafetyContract.altered
    corrupt = F.FullSuiteSafetyContract.corrupt

    def test_complete_stage_contains_the_exact_new_html_and_preserves_counts(self):
        outcome = self.verify()
        self.assertEqual((outcome['tools'], outcome['standalone_assets'],
                          outcome['github_assets_expected']), (29, 24, 29))
        raw = (self.stage / R19_FILE).read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), R19_SHA)
        with ZipFile(io.BytesIO((self.stage / B.SUITE_FILENAME).read_bytes())) as archive:
            self.assertEqual(archive.read('TOOLS/html/' + R19_FILE), raw)
        manifest = json.loads((self.stage / 'ALL_TOOLS_MANIFEST.json').read_bytes())
        row = next(item for item in manifest['tools'] if item['tool_id'] == R19_ID)
        self.assertEqual(row['original_commit_sha'], R19_ORIGIN)
        self.assertEqual(row['location_in_suite'], 'TOOLS/html/' + R19_FILE)
        validation = json.loads((self.stage / 'VALIDATION.json').read_bytes())
        self.assertEqual((validation['tool_count_added'], validation['tool_count_updated'],
                          validation['tool_count_unchanged_from_previous_suite']), (1, 0, 28))
        self.assertEqual(validation['manual_human_translation_review'], 'NOT_RUN')

    def test_missing_r19_standalone_blocks_the_complete_release(self):
        stage = self.altered(lambda folder: (folder / R19_FILE).unlink())
        with self.assertRaisesRegex(B.ReleaseBlock, 'INCOMPLETE'):
            self.verify(stage)

    def test_replaced_r19_bytes_cannot_pass_the_locked_registry(self):
        with self.assertRaisesRegex(B.ReleaseBlock, 'LOCKED_ARTIFACT_SHA'):
            self.verify(self.corrupt(R19_FILE))


class R19NativeWorkflowContract(unittest.TestCase):
    def workflow(self):
        return (ROOT / '.github/workflows/ci.yml').read_text('utf-8')

    def step(self, workflow, name):
        matches = list(re.finditer(r'^      - name: ' + re.escape(name) +
                                  r'\n.*?(?=^      - |^  [A-Za-z]|\Z)',
                                  workflow, flags=re.M | re.S))
        self.assertEqual(len(matches), 1, name)
        return matches[0]

    def replace_step(self, workflow, name, transform):
        match = self.step(workflow, name)
        changed = transform(match.group())
        self.assertNotEqual(changed, match.group())
        return workflow[:match.start()] + changed + workflow[match.end():]

    def test_native_runner_cannot_be_replaced_by_an_echo(self):
        workflow = self.workflow()
        self.assertTrue(C.verify_workflow(workflow))
        changed = self.replace_step(workflow, NATIVE_STEP, lambda step: step.replace(
            'run: node tests/browser_first_result_studio_r19.cjs --run',
            'run: echo R19_NATIVE_SKIPPED'))
        with self.assertRaises(B.ReleaseBlock):
            C.verify_workflow(changed)

    def test_native_steps_must_run_on_main_and_cannot_soft_fail(self):
        workflow = self.workflow()
        self.assertTrue(C.verify_workflow(workflow))
        for name in (DRIVER_STEP, SOURCE_STEP, NATIVE_STEP, RECEIPT_STEP, VERIFY_STEP):
            for modifier in ('if: false', "if: github.event_name == 'pull_request'",
                             'continue-on-error: true'):
                changed = self.replace_step(workflow, name, lambda step: step.replace(
                    '\n', '\n        ' + modifier + '\n', 1))
                with self.subTest(step=name, modifier=modifier), self.assertRaises(B.ReleaseBlock):
                    C.verify_workflow(changed)

    def test_receipt_validation_cannot_be_removed_or_silenced(self):
        workflow = self.workflow()
        self.assertTrue(C.verify_workflow(workflow))
        match = self.step(workflow, RECEIPT_STEP)
        for changed in (workflow[:match.start()] + workflow[match.end():],
                        self.replace_step(workflow, RECEIPT_STEP,
                                          lambda step: step.rstrip() + ' || true\n')):
            with self.assertRaises(B.ReleaseBlock):
                C.verify_workflow(changed)

    def test_native_source_pins_and_driver_cannot_be_replaced(self):
        workflow = self.workflow()
        self.assertTrue(C.verify_workflow(workflow))
        for name, old, new in (
            (SOURCE_STEP, R19_SHA, '0' * 64),
            (DRIVER_STEP, 'playwright@1.55.0', 'playwright@latest'),
            (VERIFY_STEP, 'python tests/validate_r19_native_receipt_r2.py --self-test',
             'echo self-test-skipped'),
            (NATIVE_STEP, 'NODE_PATH: ${{ runner.temp }}/tls-r19-node/node_modules',
             'NODE_PATH: /tmp/unreviewed-driver'),
        ):
            changed = self.replace_step(workflow, name, lambda step: step.replace(old, new))
            with self.subTest(step=name), self.assertRaises(B.ReleaseBlock):
                C.verify_workflow(changed)

    def test_source_gate_and_receipt_must_surround_the_native_run(self):
        workflow = self.workflow()
        self.assertTrue(C.verify_workflow(workflow))
        for first, second in ((SOURCE_STEP, NATIVE_STEP), (NATIVE_STEP, RECEIPT_STEP)):
            left, right = self.step(workflow, first), self.step(workflow, second)
            self.assertLess(left.start(), right.start())
            changed = (workflow[:left.start()] + right.group() +
                       workflow[left.end():right.start()] + left.group() +
                       workflow[right.end():])
            with self.subTest(first=first, second=second), self.assertRaises(B.ReleaseBlock):
                C.verify_workflow(changed)


if __name__ == '__main__':
    unittest.main()
