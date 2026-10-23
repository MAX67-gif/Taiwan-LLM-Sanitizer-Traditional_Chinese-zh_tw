"""Build unpacked Chrome MV3 and a standalone Tampermonkey script from one source."""
from pathlib import Path
from shutil import copyfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
VERSION = "0.1.0"
HOMEPAGE = "https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"
HEADER = f"""// ==UserScript==
// @name         Taiwan-LLM-Sanitizer｜臺灣繁中在地化 R1
// @namespace    {HOMEPAGE}
// @version      {VERSION}
// @description  使用者逐站啟用的離線術語／介面詞彙在地化。非完整全文 AI 翻譯。
// @author       MAX67-gif contributors
// @match        http://*/*
// @match        https://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  {HOMEPAGE}
// ==/UserScript==

"""
def build():
    chrome = DIST / "chrome"
    chrome.mkdir(parents=True, exist_ok=True)
    for filename in ("manifest.json", "content.js", "popup.html", "popup.js"):
        copyfile(ROOT / "src" / "chrome" / filename, chrome / filename)
    engine = (ROOT / "src" / "core" / "engine.js").read_text(encoding="utf-8")
    (chrome / "engine.js").write_text(engine, encoding="utf-8")
    userscript = DIST / "userscript"
    userscript.mkdir(parents=True, exist_ok=True)
    adapter = (ROOT / "src" / "userscript" / "adapter.js").read_text(encoding="utf-8")
    (userscript / "TaiwanLLMSanitizer.user.js").write_text(
        HEADER + engine + "\n" + adapter, encoding="utf-8"
    )
    archive = DIST / "TLS_Chrome_MV3_R1_20261023.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for path in sorted(chrome.iterdir()):
            if path.is_file():
                output.write(path, path.name)
    print("BUILT", archive)
    print("BUILT", userscript / "TaiwanLLMSanitizer.user.js")

if __name__ == "__main__":
    build()
