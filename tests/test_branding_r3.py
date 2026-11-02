"""TLS R3: public branding guard, six README sync and exact artifact integrity.
Self-contained; no Pillow or other third-party dependency.
Install into `tests/test_branding_r3.py` and add to CI test invocation.
"""
import hashlib
import re
import struct
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import publication_guard as G

BANNER='assets/branding/TLS_Premium_Banner_R3_2800x960.png'
BANNER_SHA='4949e243b525e5a82af7fb53d254495b34ef15617233bc1b42db2bc1f2d7a1bb'
FILES=['README.md','README.en.md','README.zh-CN.md','README.ja.md','README.ko.md','README.es.md']
MARK=re.compile(r'<!-- SOURCE_README_SHA256:([0-9a-f]{64}) -->')
R3_START='<!-- TLS_BRANDING_R3_BEGIN -->'
R3_END='<!-- TLS_BRANDING_R3_END -->'

class BrandingR3Tests(unittest.TestCase):
    def test_exact_branding_image_is_whitelisted_but_not_a_wildcard(self):
        self.assertTrue(G.allowed_path(BANNER))
        for other in ['assets/branding/secret.txt','assets/branding/private.png',
                      'assets/branding/../private.txt','assets/branding/TLS_Old_Unreviewed.png']:
            with self.subTest(other=other):self.assertFalse(G.allowed_path(other))

    def test_image_integrity_and_dimensions(self):
        p=ROOT/BANNER
        b=p.read_bytes()
        self.assertEqual(hashlib.sha256(b).hexdigest(),BANNER_SHA)
        self.assertEqual(b[:8],b'\x89PNG\r\n\x1a\n')
        self.assertEqual(b[12:16],b'IHDR')
        self.assertEqual(struct.unpack('>II',b[16:24]),(2800,960))

    def test_brand_block_is_outside_frozen_r176_and_synchronized(self):
        master=(ROOT/'README.md').read_text('utf-8')
        self.assertEqual(master.count(R3_START),1)
        self.assertEqual(master.count(R3_END),1)
        self.assertIn(f']({BANNER})',master)
        self.assertLess(master.index(R3_END),master.index('<!-- R176_SHOWCASE_BEGIN -->'))
        master_sha=hashlib.sha256((ROOT/'README.md').read_bytes()).hexdigest()
        for file in FILES:
            with self.subTest(file=file):
                txt=(ROOT/file).read_text('utf-8')
                self.assertEqual(txt.count(R3_START),1)
                self.assertEqual(txt.count(R3_END),1)
                self.assertIn(f']({BANNER})',txt)
                self.assertLess(txt.index(R3_END),txt.index('<!-- R176_SHOWCASE_BEGIN -->'))
                self.assertNotIn('<script',txt[txt.index(R3_START):txt.index(R3_END)].lower())
                if file!='README.md':
                    self.assertEqual(MARK.findall(txt),[master_sha])

    def test_exact_ci_hook_exists(self):
        ci=(ROOT/'.github/workflows/ci.yml').read_text('utf-8')
        self.assertEqual(ci.count('python -m unittest tests/test_branding_r3.py -v'),1)

if __name__=='__main__':unittest.main()
