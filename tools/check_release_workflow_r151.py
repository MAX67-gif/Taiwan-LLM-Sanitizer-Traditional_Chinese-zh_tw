"""Check isolated R15.1 release script, version parity, and classic R15 retention."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
w=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
key='  r151-structured-release:\n'
assert w.count(key)==1, 'R151_RELEASE_JOB_MISSING_OR_DUPLICATE'
block=w.split(key,1)[1].split('\n  r15-structured-release:',1)[0]
assert "if: github.event_name == 'push' && github.ref == 'refs/heads/main'" in block
assert 'needs: [verify, browser-integration]' in block
assert 'node tools/build_structured_integrity_r151.js --check' in block
assert 'node tools/build_structured_integrity_r15.js --check' in block
step='      - name: Publish new immutable R15.1 offline safety preview'
assert block.count(step)==1
script=block.split(step,1)[1].split('        run: |',1)[1]
lines=[]
for line in script.splitlines()[1:]:
 if line.strip() and not line.startswith('          '):break
 lines.append(line[10:] if line.startswith('          ') else '')
script='\n'.join(lines)+'\n'
for part in ('gh release create "r151-structured-integrity-safety-preview-0.1.1"',
             'r151-structured-integrity-safety-preview-0.1.1',
             'TW_Structured_Integrity_Lab_R151_20261026.html',
             'TW_Structured_Integrity_Lab_R151_20261026.html.sha256',
             '--target "$GITHUB_SHA"', 'gh release view'):
 assert part in script, 'R151_MISSING_RELEASE_ITEM_'+part
r=subprocess.run(['bash','-n','-c',script],capture_output=True,text=True,check=False)
assert r.returncode==0, 'R151_RELEASE_SCRIPT_SYNTAX_FAIL_'+r.stderr
assert 'python tests/test_structured_integrity_browser_r151.py' in w
assert 'node --test tests/*.js' in w
assert (ROOT/'examples/TW_Structured_Integrity_Lab_R15_20261025.html').is_file()
print('R15.1 RELEASE/CI MAIN-ONLY GATE AND IMMUTABLE R15 PARITY PASS')
