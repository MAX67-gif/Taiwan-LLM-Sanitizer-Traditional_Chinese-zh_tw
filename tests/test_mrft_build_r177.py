"""R17.7 installer contract: deterministic bytes and exact public members."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from zipfile import ZipFile
ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'manifest.json', 'popup.html', 'popup.js', 'content.js', 'LICENSE', 'README_INSTALL.md', 'src/core/provider_capability_r14.js', 'src/core/mrft_regions_r177.js', 'src/core/mrft_local_provider_r177.js', 'src/r177/mrft_dom_r177.js', 'src/r177/fixture_r177.js', 'docs/mrft/MRFT_ORIGINAL_FIXTURE.html'}
class Build(unittest.TestCase):
    def test_installer_is_reproducible_and_minimally_permissioned(self):
        path = ROOT/'tools/build_mrft_r177.py'
        self.assertTrue(path.exists(), 'R17.7 builder must exist')
        spec = importlib.util.spec_from_file_location('r177build', path)
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        module.build(); before = module.OUTPUT.read_bytes(); module.build(); module.build(check=True)
        self.assertEqual(before, module.OUTPUT.read_bytes())
        with ZipFile(module.OUTPUT) as z:
            self.assertEqual(set(z.namelist()), EXPECTED)
            self.assertEqual(z.namelist(), sorted(EXPECTED))
            self.assertIsNone(z.testzip())
            manifest = json.loads(z.read('manifest.json'))
            self.assertEqual(manifest['version'], '0.1.0')
            self.assertEqual(manifest['permissions'], ['activeTab', 'scripting'])
            for key in ('background','host_permissions','content_scripts','optional_host_permissions'): self.assertNotIn(key, manifest)
            for name in EXPECTED:
                self.assertEqual(z.read(name), (ROOT/module.MEMBERS[name]).read_bytes())
            for item in z.infolist():
                self.assertEqual(item.date_time, (2026,10,31,0,0,0))
                self.assertEqual(item.external_attr >> 16, 0o100644)
        print('R177 installer SHA256', hashlib.sha256(before).hexdigest())
if __name__ == '__main__': unittest.main()
