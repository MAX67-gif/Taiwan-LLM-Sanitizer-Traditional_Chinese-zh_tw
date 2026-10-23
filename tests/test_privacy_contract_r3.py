"""R3 privacy invariants. Static checks are not a replacement for full code audit."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sources=[
 ROOT/"src/core/engine.js",
 ROOT/"src/core/lexicon_pack.js",
 ROOT/"src/core/provider.js",
 ROOT/"src/core/web_adapter.js",
 ROOT/"src/chrome/content.js",
 ROOT/"src/chrome/popup.js",
 ROOT/"src/userscript/adapter.js",
 ROOT/"tools/localize_cli.js",
]
for file in sources:
    content=file.read_text(encoding="utf-8")
    for bad in ("XMLHttpRequest(", "navigator.sendBeacon(", "new WebSocket(", "GM_xmlhttpRequest(", "fetch("):
        assert bad not in content,(file,bad)
manifest=json.loads((ROOT/"src/chrome/manifest.json").read_text(encoding="utf-8"))
assert manifest["manifest_version"]==3
assert set(manifest["permissions"])=={"activeTab","scripting","storage"}
assert set(manifest["optional_host_permissions"])=={"http://*/*","https://*/*"}
assert "externally_connectable" not in manifest
adapter=(ROOT/"src/userscript/adapter.js").read_text(encoding="utf-8")
assert "GM_getValue(" in adapter and "GM_setValue(" in adapter
assert "document.cookie" not in adapter
for name in ("engine.js","web_adapter.js"):
    js=(ROOT/"src/core"/name).read_text(encoding="utf-8")
    assert "contenteditable" in js.lower()
    assert "textarea" in js.lower()
print("R3 LOCAL-ONLY/LEAST-PRIVILEGE STATIC PRIVACY CHECK PASS")
