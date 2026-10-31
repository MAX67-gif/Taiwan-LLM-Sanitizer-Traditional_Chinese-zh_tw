"""R17.6 documentation and immutable-product boundary; not human language QA."""
from pathlib import Path
import hashlib
import json
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import publication_guard as G
import check_readme_i18n as I

TAG_URL = 'https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.2.0'
SHOWCASE_FILES = {
    'docs/showcase/source.md', 'docs/showcase/preview.md',
    'docs/showcase/decisions.json', 'docs/showcase/verification.json',
    'docs/showcase/README.md', 'docs/showcase/README.en.md',
    'docs/showcase/trial_observation.md',
}


class ShowcaseContractTests(unittest.TestCase):
    def test_six_language_hero_has_one_real_release_primary_action(self):
        for name in I.FILES:
            with self.subTest(name=name):
                text = (ROOT / name).read_text(encoding='utf-8')
                matches = re.findall(r'<!-- R176_SHOWCASE_BEGIN -->(.*?)<!-- R176_SHOWCASE_END -->', text, re.S)
                self.assertEqual(len(matches), 1)
                hero = matches[0]
                self.assertEqual(hero.count(TAG_URL), 1)
                self.assertIn('docs/showcase/README', hero)
                self.assertIn('docs/showcase/preview.md', hero)
                self.assertIn('TW_Wording_Assistant_R172_20261027.html', hero)
                self.assertNotIn('/blob/', hero)
                self.assertNotIn('![' , hero)  # no remote tracking image
                self.assertNotIn('<script', hero.lower())
                self.assertNotIn('javascript:', hero.lower())

    def test_six_language_source_sync_and_existing_rights_checks(self):
        self.assertEqual(I.run(), [])

    def test_only_exact_original_showcase_files_are_publishable(self):
        for name in SHOWCASE_FILES:
            self.assertTrue((ROOT / name).is_file(), name)
            self.assertTrue(G.allowed_path(name), name)
        for name in ('docs/showcase/private_feedback.md', 'docs/showcase/customer_original.md',
                     'docs/showcase/other.json', 'docs/showcase/../source.md',
                     'docs/showcase/hidden_tracking.html'):
            self.assertFalse(G.allowed_path(name), name)

    def test_guides_reference_real_artifacts_and_limited_proof(self):
        for name in ('README.md', 'README.en.md'):
            text = (ROOT / 'docs/showcase' / name).read_text(encoding='utf-8')
            for target in ('source.md', 'preview.md', 'decisions.json', 'verification.json', 'trial_observation.md'):
                self.assertIn('(' + target + ')', text)
            self.assertIn(TAG_URL, text)
            self.assertIn('NOT_COLLECTED', text)
            self.assertIn('HUMAN_REVIEW_PENDING', text)
            self.assertIn('DESIGN_ONLY', text)
            self.assertIn('node tools/check_showcase_r176.js --check', text)
            for href in re.findall(r'\]\(([^)\s]+)', text):
                if href.startswith(('https://', 'http://', '#')):
                    continue
                target = (ROOT / 'docs/showcase' / href.split('#', 1)[0]).resolve()
                self.assertTrue(target.is_relative_to(ROOT) and target.is_file(), href)

    def test_feedback_template_has_no_prefilled_success_or_identity_fields(self):
        text = (ROOT / 'docs/showcase/trial_observation.md').read_text(encoding='utf-8')
        for marker in ('consent_to_local_record: UNSET', 'consent_to_publish_summary: UNSET',
                       'task_result: NOT_COLLECTED', 'elapsed_seconds: NOT_COLLECTED',
                       'd7_return: NOT_COLLECTED'):
            self.assertIn(marker, text)
        field_names = set(re.findall(r'^([a-z_]+):', text, re.M))
        self.assertTrue(field_names.isdisjoint({'email', 'account_name', 'source_text', 'document_content'}))
        for forbidden in ('<form', '<script', '!['):
            self.assertNotIn(forbidden, text)
        self.assertIn('E1/E2', text)
        self.assertIn('E3', text)
        self.assertIn('D7', text)

    def test_published_r172_html_matches_frozen_official_asset(self):
        data = (ROOT / 'examples/TW_Wording_Assistant_R172_20261027.html').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), '4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873')
        registry = json.loads((ROOT / 'release/all_tools_registry.json').read_text(encoding='utf-8'))
        self.assertEqual(registry['suite_version'], '17.2.0')
        self.assertEqual(len(registry['tools']), 27)


if __name__ == '__main__':
    unittest.main()
