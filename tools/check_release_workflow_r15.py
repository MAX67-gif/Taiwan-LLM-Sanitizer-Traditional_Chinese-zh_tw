"""Fail fast on R15 preview release Bash syntax and complete CI gating."""
from __future__ import annotations
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
w = (ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
job = '  r15-structured-release:\n'
assert w.count(job)==1, 'R15_RELEASE_JOB_MISSING_OR_DUPLICATE'
block=w.split(job,1)[1]
assert "if: github.event_name == 'push' && github.ref == 'refs/heads/main'" in block, 'R15_MUST_BE_MAIN_ONLY'
assert 'needs: [verify, browser-integration]' in block, 'R15_RELEASE_MISSING_GATES'
step='      - name: Publish immutable R15 offline safety preview'
assert block.count(step)==1, 'R15_RELEASE_STEP_MISSING'
lines=block.split(step,1)[1].splitlines()
start=next((i for i,x in enumerate(lines) if x=='        run: |'),None)
assert start is not None, 'R15_RELEASE_SHELL_MISSING'
script=[]
for line in lines[start+1:]:
    if line.strip() and not line.startswith('          '):
        break
    script.append(line[10:] if line.startswith('          ') else '')
script='\n'.join(script)+'\n'
for part in ('r15-structured-integrity-preview-0.1.0',
             'gh release create','TW_Structured_Integrity_Lab_R15_20261025.html',
             'TW_Structured_Integrity_Lab_R15_20261025.html.sha256', '--target "$GITHUB_SHA"'):
    assert part in script, 'R15_RELEASE_ASSET_OR_TAG_MISSING:'+part
r=subprocess.run(['bash','-n','-c',script],text=True,capture_output=True,check=False)
assert r.returncode==0,'R15_RELEASE_SCRIPT_SYNTAX_FAIL:'+r.stderr
assert 'node tools/build_structured_integrity_r15.js --check' in w
assert 'python tests/test_structured_integrity_browser_r15.py' in w
assert 'node --test tests/*.js' in w
print('R15 MAIN RELEASE/CI GATE/BASH SYNTAX PASS')
