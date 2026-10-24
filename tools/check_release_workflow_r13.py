"""Validate new R13 Release job's exact bash and required guards before merging."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
workflow=(ROOT/'.github/workflows/ci.yml').read_text('utf8')
job='  r13-bilingual-release:\n'
assert workflow.count(job)==1,'R13_JOB_MISSING_OR_DUPLICATED'
block=workflow.split(job,1)[1]
assert "needs: [verify, browser-integration]" in block,'R13_RELEASE_NOT_GATED'
assert "if: github.event_name == 'push' && github.ref == 'refs/heads/main'" in block,'R13_RELEASE_NOT_MAIN_ONLY'
step='      - name: Publish optional immutable R13 read-only installers'
assert block.count(step)==1
lines=block.split(step,1)[1].splitlines()
start=next((i for i,l in enumerate(lines) if l=='        run: |'),None)
assert start is not None
script=[]
for line in lines[start+1:]:
    if line.strip() and not line.startswith('          '):break
    script.append(line[10:] if line.startswith('          ') else '')
cmd='\n'.join(script)+'\n'
for p in ('r13-bilingual-reader-preview-0.6.0','gh release create','TLS_Chrome_MV3_R13_20261025.zip','TLS_Tampermonkey_R13_20261025.user.js','SHA256SUMS_R13_20261025.txt'):
    assert p in cmd,p
check=subprocess.run(['bash','-n','-c',cmd],capture_output=True,text=True,check=False)
assert check.returncode==0,check.stderr
print('R13 RELEASE MAIN-ONLY GATE AND BASH SYNTAX PASS')
