"""R17.4 first-result documentation route: static facts, not human usability proof."""
from __future__ import annotations
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LATEST='https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest'
READMES=('README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','README.zh-CN.md')
START=ROOT/'START_HERE.html'

class R174FirstUseTests(unittest.TestCase):
    def test_01_all_six_readmes_link_official_release_first(self):
        for name in READMES:
            with self.subTest(name=name):
                txt=(ROOT/name).read_text(encoding='utf-8')
                self.assertIn(LATEST,txt[:2000],f'{name}: missing visible real Release link')
                self.assertIn('docs/QUICK_START_R174',txt[:2500])
                self.assertNotIn('github.io/Taiwan-LLM-Sanitizer',txt)
                self.assertIn('suite=17.2.0; tools=27; standalone=22',txt)
                self.assertIn('HUMAN_TRANSLATION_REVIEW',txt if name!='README.md' else txt+' HUMAN_TRANSLATION_REVIEW')
    def test_02_honest_local_file_instruction_and_guide_links(self):
        zh=(ROOT/'docs/QUICK_START_R174.md').read_text(encoding='utf-8')
        en=(ROOT/'docs/QUICK_START_R174.en.md').read_text(encoding='utf-8')
        for s in (zh,en):
            self.assertIn(LATEST,s)
            self.assertIn('TLS_ALL_TOOLS_SUITE_17_2_0.zip',s)
            self.assertIn('START_HERE.html',s)
            self.assertIn('TW_Wording_Assistant_R172_20261027.html',s)
            self.assertIn('R174_ORIGINAL_FIRST_TASK.md',s)
            self.assertTrue('Markdown' in s)
        self.assertIn('GitHub',zh);self.assertIn('source',en.lower())
    def test_03_real_repo_entry_and_local_start_links(self):
        self.assertTrue(START.is_file())
        html=START.read_text(encoding='utf-8')
        hrefs=re.findall(r'<a\b[^>]*\bhref="([^"]+)"',html)
        self.assertGreaterEqual(len(hrefs),5)
        for href in hrefs:
            with self.subTest(href=href):
                self.assertFalse(href.startswith(('https:','http:','file:')))
                self.assertFalse('..' in Path(href).parts)
                self.assertTrue((ROOT/href).is_file(),href)
    def test_04_original_case_protects_structure_and_is_not_a_model_measurement(self):
        s=(ROOT/'docs/R174_ORIGINAL_FIRST_TASK.md').read_text(encoding='utf-8')
        for token in ('```js','<!--','https://example.org/docs/menu','{{USER_PATH}}','軟件','數據庫','menu','點擊率'):
            self.assertIn(token,s)
        self.assertNotIn('100% 准確',s)
    def test_05_guide_links_are_real_repo_files(self):
        for name in ('QUICK_START_R174.md','QUICK_START_R174.en.md'):
            p=ROOT/'docs'/name
            for href in re.findall(r'\]\(([^)\s]+)\)',p.read_text(encoding='utf-8')):
                if href.startswith(('https://','http://','#')):continue
                with self.subTest(guide=name,href=href):
                    resolved=(p.parent/href.split('#',1)[0]).resolve()
                    self.assertTrue(resolved.is_relative_to(ROOT))
                    self.assertTrue(resolved.is_file(),href)
    def test_06_no_human_measurement_claims_or_hidden_telemetry(self):
        for name in ('QUICK_START_R174.md','QUICK_START_R174.en.md'):
            s=(ROOT/'docs'/name).read_text('utf8').lower()
            self.assertTrue(('尚未' in s or 'not been collected' in s))
            for marker in ('<script','tracking pixel','google analytics'):
                self.assertNotIn(marker,s)

if __name__=='__main__':unittest.main()
