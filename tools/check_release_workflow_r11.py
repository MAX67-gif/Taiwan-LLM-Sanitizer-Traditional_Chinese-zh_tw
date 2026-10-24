"""Static, offline syntax verification of the R11 GitHub Actions release shell.

We intentionally avoid network access and GitHub credentials. GitHub's YAML
parser accepts incomplete bash here-docs/if-blocks, which can make a release
job fail *after* all functional tests have passed. Check it in verify first.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
STEP = "      - name: Publish immutable optional R11 v0.5.0 installers"

def release_script(source: str) -> str:
    if source.count(STEP) != 1:
        raise ValueError("R11_RELEASE_STEP_MISSING_OR_DUPLICATED")
    tail = source.split(STEP, 1)[1].splitlines()
    run_index = next((i for i, line in enumerate(tail)
                      if line == "        run: |"), None)
    if run_index is None:
        raise ValueError("R11_RELEASE_RUN_BLOCK_MISSING")
    result = []
    for line in tail[run_index + 1:]:
        if line.strip() and not line.startswith("          "):
            break
        if line.startswith("          "):
            result.append(line[10:])
        elif not line.strip():
            result.append("")
    script = "\n".join(result) + "\n"
    for fragment in ('r11-manual-site-glossary-0.5.0',
                     'gh release create', 'dist/r11/TLS_Chrome_MV3_R11_20261025.zip',
                     'dist/r11/TLS_Tampermonkey_R11_20261025.user.js',
                     'SHA256SUMS_R11_20261025.txt', '--target "$GITHUB_SHA"'):
        if fragment not in script:
            raise ValueError("RELEASE_SCRIPT_REQUIRED_FRAGMENT_MISSING: " + fragment)
    return script

def main() -> None:
    script = release_script(WORKFLOW.read_text(encoding="utf-8"))
    checked = subprocess.run(["bash", "-n", "-c", script],
                             text=True, capture_output=True, check=False)
    if checked.returncode:
        raise SystemExit("R11_RELEASE_BASH_SYNTAX_FAIL: " + checked.stderr.strip())
    print("R11_RELEASE_BASH_SYNTAX_PASS")

if __name__ == "__main__":
    main()
