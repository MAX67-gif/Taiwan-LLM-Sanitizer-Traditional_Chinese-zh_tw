"""Offline syntax and release-contract check for optional R7.2 PokéBonk demo."""
from pathlib import Path
import subprocess
import re

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW=ROOT/'.github/workflows/ci.yml'
JOB='  r72-pokebonk-demo-release:'
STEP='      - name: Publish optional immutable R7.2 display-only installers'
REQUIRED=(
 'r7-pokebonk-demo-0.1.2',
 'dist/pokebonk/r72/TLS_Pokebonk_TW_Demo_R7_2_Chrome_20261025.zip',
 'dist/pokebonk/r72/TLS_Pokebonk_TW_Demo_R7_2_Tampermonkey_20261025.user.js',
 'dist/pokebonk/r72/TLS_Pokebonk_TW_Demo_R7_2_SHA256SUMS_20261025.txt',
 'gh release create','--target "$GITHUB_SHA"',
)

def extract():
    source=WORKFLOW.read_text(encoding='utf-8')
    if source.count(JOB)!=1 or source.count(STEP)!=1:
        raise ValueError('R72_RELEASE_JOB_OR_STEP_MISSING_OR_DUPLICATE')
    block=re.split(r'(?m)^  [a-z0-9_-]+:\s*$',source.split(JOB,1)[1],maxsplit=1)[0]
    if not all(fragment in block for fragment in ('needs: [verify, browser-integration]',
             "github.ref == 'refs/heads/main'",'python tools/build_pokebonk_demo_r72.py')):
        raise ValueError('R72_RELEASE_GATES_MISSING')
    after=source.split(STEP,1)[1]
    if '        run: |\n' not in after:
        raise ValueError('R72_SHELL_BLOCK_MISSING')
    body=after.split('        run: |\n',1)[1]
    lines=[]
    for line in body.splitlines():
        if line and not line.startswith('          '):break
        lines.append(line[10:] if line.startswith('          ') else '')
    script='\n'.join(lines)+'\n'
    for part in REQUIRED:
        if part not in script:raise ValueError('R72_RELEASE_ASSET_OR_TAG_MISSING: '+part)
    return script

if __name__=='__main__':
    script=extract()
    run=subprocess.run(['bash','-n','-c',script],text=True,capture_output=True)
    if run.returncode:raise SystemExit('R72_RELEASE_BASH_INVALID '+run.stderr)
    print('R72_RELEASE_SCRIPT_AND_GATES_PASS')
