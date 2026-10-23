"""R5 user-facing install docs, source versions, and no unsafe naming mismatch."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def read(p):return (ROOT/p).read_text(encoding="utf-8")
manifest=json.loads(read("src/chrome/manifest.json"))
assert manifest["version"]=="0.4.0"
assert manifest["manifest_version"]==3
assert manifest["permissions"]==["activeTab","scripting","storage"]
header=read("tools/build.py")
assert 'VERSION="0.4.0"' in header
assert "TLS_Chrome_MV3_R5_20261024.zip" in header
assert "TLS_Tampermonkey_R5_20261024.user.js" in header
for p in ("README.md","docs/INSTALL_CHROME.md","docs/INSTALL_TAMPERMONKEY.md"):
    s=read(p)
    assert "https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases" in s,p
    assert ("dist/chrome" in s or "TLS_Chrome_MV3_R5_20261024.zip" in s) if p!="docs/INSTALL_TAMPERMONKEY.md" else (".user.js" in s),p
assert "chrome://extensions" in read("docs/INSTALL_CHROME.md")
assert "Tampermonkey" in read("docs/INSTALL_TAMPERMONKEY.md")
assert "Codex for Open Source" in read("docs/AI_INTEGRATION.md")
assert "開源法典" in read("docs/NAME_PROTECTION.md")
for f in ("src/chrome/popup.html","src/userscript/adapter.js"):
    assert "R5" in read(f),f
for f in ("src/core/engine.js","src/core/provider.js","src/core/progress_ui.js"):
    assert "0.4.0" in read(f),f
print("R5 VERSIONS + USER INSTALLATION DOCUMENT CONTRACT PASS")
