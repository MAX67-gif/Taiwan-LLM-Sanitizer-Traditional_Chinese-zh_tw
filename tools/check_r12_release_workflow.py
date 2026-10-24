"""Fail-closed syntax check for R12's exact GitHub Actions Bash release step."""
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
STEP='      - name: Publish immutable R12 evaluation-only HTML and SHA256'
RELEASE='r12-quality-evidence-preview-v1'
ARTIFACT='examples/TW_Quality_Audit_Lab_R12_20261025.html'

def extract(raw: str) -> str:
    if raw.count(STEP)!=1:
        raise ValueError('R12_RELEASE_STEP_NOT_UNIQUE')
    tail=raw.split(STEP,1)[1].splitlines()
    idx=next((i for i,line in enumerate(tail) if line=='        run: |'),None)
    if idx is None:raise ValueError('R12_RELEASE_SHELL_MISSING')
    lines=[]
    for line in tail[idx+1:]:
        if line.strip() and not line.startswith('          '):break
        if line.startswith('          '):lines.append(line[10:])
        else:lines.append('')
    s='\n'.join(lines)+'\n'
    for token in (RELEASE,'gh release create',ARTIFACT,'--target "$GITHUB_SHA"','sha256'):
        if token not in s:raise ValueError('R12_RELEASE_SCRIPT_MISSING_'+token)
    return s

def main():
    raw=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
    start='  r12-quality-evidence-release:\n'
    if raw.count(start)!=1:raise ValueError('R12_RELEASE_JOB_NOT_UNIQUE')
    scoped=raw.split(start,1)[1].split('\n  ',1)[0]
    if '    needs: [verify, browser-integration]' not in raw.split(start,1)[1][:520]:
        raise ValueError('R12_RELEASE_MUST_REQUIRE_BOTH_GATES')
    result=subprocess.run(['bash','-n','-c',extract(raw)],capture_output=True,text=True,check=False)
    if result.returncode:raise ValueError('R12_BASH_SYNTAX_ERROR '+result.stderr.strip())
    print('R12_RELEASE_SCRIPT_BASH_N_PASS')

if __name__=='__main__':main()
