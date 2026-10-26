"""R17 standalone release and CI controls (no overclaims or third-party assets)."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1]
workflow=(root/'.github/workflows/ci.yml').read_text(encoding='utf-8')
key='  r17-trust-graph-release:\n'
assert workflow.count(key)==1,'R17_RELEASE_JOB_MISSING'
block=workflow.split(key,1)[1]
for fragment in ("if: github.event_name == 'push' && github.ref == 'refs/heads/main'",'needs: [verify, browser-integration]','permissions:','contents: write','gh release create "r17-document-trust-graph-preview-0.1.0"','--target "$GITHUB_SHA"','TW_Document_Trust_Graph_R17_20261026.html.sha256'):
 assert fragment in block,'R17_RELEASE_INCOMPLETE_'+fragment
for fragment in ('node --test tests/test_document_trust_graph_r17.js','python tests/test_document_trust_browser_r17.py','node tools/build_document_trust_r17.js --check','python tools/check_r17_docs_i18n.py'):
 assert fragment in workflow,'R17_VERIFY_MISSING_'+fragment
script=block.split('      - name: Publish immutable R17 independent preview',1)[1].split('        run: |\n',1)[1]
lines=[]
for line in script.splitlines():
 if line.strip() and not line.startswith('          '):break
 lines.append(line[10:] if line.startswith('          ') else '')
result=subprocess.run(['bash','-n','-c','\n'.join(lines)+'\n'],capture_output=True,text=True,check=False)
assert result.returncode==0,result.stderr
assert (root/'examples/TW_Document_Trust_Graph_R17_20261026.html').is_file()
print('R17_RELEASE_CONTRACT_PASS: main-only + verify/browser + independent immutable HTML')
