"""Fail-closed R16 CI/release contract and source provenance guard."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
W=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
KEY='  r16-studio-release:\n'
assert W.count(KEY)==1,'R16_RELEASE_MISSING_OR_DUPLICATED'
assert "if: github.event_name == 'push' && github.ref == 'refs/heads/main'" in W.split(KEY,1)[1].split('\n  r15-structured-release:',1)[0]
assert 'needs: [verify, browser-integration]' in W.split(KEY,1)[1].split('\n  r15-structured-release:',1)[0]
assert 'node tools/build_local_workbench_r16.js --check' in W
assert 'node tools/build_structured_integrity_r151.js --check' in W
assert 'python tests/test_local_workbench_browser_r16.py' in W
assert 'python tools/check_examples_i18n.py' in W
assert 'python tools/check_readme_i18n.py' in W
block=W.split(KEY,1)[1].split('\n  r15-structured-release:',1)[0]
marker='      - name: Publish immutable R16 local Studio Preview'
assert block.count(marker)==1
script=block.split(marker,1)[1].split('        run: |',1)[1]
lines=[]
for line in script.splitlines()[1:]:
    if line.strip() and not line.startswith('          '):break
    lines.append(line[10:] if line.startswith('          ') else '')
cmd='\n'.join(lines)+'\n'
for atom in ('r16-localization-safety-studio-preview-0.1.0','gh release create','gh release view',
             'TW_Localization_Safety_Studio_R16_20261026.html','--target "$GITHUB_SHA"'):
    assert atom in cmd,'R16_RELEASE_ITEM_MISSING_'+atom
r=subprocess.run(['bash','-n','-c',cmd],capture_output=True,text=True,check=False)
assert r.returncode==0,'R16_BASH_SYNTAX_'+r.stderr
assert (ROOT/'examples/TW_Localization_Safety_Studio_R16_20261026.html').is_file()
assert (ROOT/'examples/TW_Structured_Integrity_Lab_R15_20261025.html').is_file()
assert (ROOT/'examples/TW_Structured_Integrity_Lab_R151_20261026.html').is_file()
print('R16_RELEASE_CONTRACT_PASS: main-only, verify+browser gates, old R15.0/R15.1 preserved')
