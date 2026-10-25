"""Fail fast on R14 release Bash and required PR/main CI gates."""
from __future__ import annotations
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
workflow=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
job='  r14-capability-release:\n'
assert workflow.count(job)==1, 'R14_RELEASE_JOB_MISSING_OR_DUPLICATED'
block=workflow.split(job,1)[1]
assert "needs: [verify, browser-integration]" in block, 'R14_RELEASE_NOT_GATED'
assert "if: github.event_name == 'push' && github.ref == 'refs/heads/main'" in block, 'R14_RELEASE_NOT_MAIN_ONLY'
step='      - name: Publish immutable R14 offline capability preview'
assert block.count(step)==1, 'R14_PUBLISH_STEP_INVALID'
lines=block.split(step,1)[1].splitlines()
start=next((i for i,line in enumerate(lines) if line=='        run: |'),None)
assert start is not None, 'R14_RUN_SCRIPT_MISSING'
parts=[]
for line in lines[start+1:]:
    if line.strip() and not line.startswith('          '):break
    parts.append(line[10:] if line.startswith('          ') else '')
script='\n'.join(parts)+'\n'
for piece in ('r14-provider-capability-preview-0.1.0', 'gh release create',
              'TW_Provider_Capability_Lab_R14_20261025.html',
              'TW_Provider_Capability_Lab_R14_20261025.html.sha256','--target "$GITHUB_SHA"'):
    assert piece in script, 'R14_MISSING_RELEASE_FRAGMENT:'+piece
check=subprocess.run(['bash','-n','-c',script],capture_output=True,text=True,check=False)
assert check.returncode==0, 'R14_RELEASE_BASH_SYNTAX_FAIL:'+check.stderr
assert 'node tools/build_provider_capability_r14.js --check' in workflow, 'R14_DETERMINISTIC_BUILD_GATE_MISSING'
assert 'python tests/test_provider_capability_browser_r14.py' in workflow, 'R14_BROWSER_GATE_MISSING'
print('R14 RELEASE JOB / MAIN-ONLY GATE / BASH PARSE PASS')
