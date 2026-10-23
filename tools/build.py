"""R3 deterministic builder. Single shared engine, local-only MV3 and userscript."""
from pathlib import Path
from shutil import copyfile
import hashlib
import zipfile

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/"dist"
VERSION="0.3.0"
HOMEPAGE="https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"
HEADER=f"""// ==UserScript==
// @name         Taiwan-LLM-Sanitizer｜通用臺灣繁中化 R3
// @namespace    {HOMEPAGE}
// @version      {VERSION}
// @description  通用離線字詞校正及使用者可選 Chrome 本機 AI 翻譯；逐站啟用，不傳送頁面文字到雲端。
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
    chrome=DIST/"chrome"
    chrome.mkdir(parents=True,exist_ok=True)
    for name in ("manifest.json","popup.html","popup.js","content.js"):
        copyfile(ROOT/"src"/"chrome"/name,chrome/name)
    pieces={}
    for name in ("lexicon_pack.js","engine.js","provider.js","web_adapter.js"):
        pieces[name]=(ROOT/"src"/"core"/name).read_text(encoding="utf-8")
        (chrome/name).write_text(pieces[name],encoding="utf-8")
    output=DIST/"userscript"
    output.mkdir(parents=True,exist_ok=True)
    adapter=(ROOT/"src"/"userscript"/"adapter.js").read_text(encoding="utf-8")
    script=output/"TaiwanLLMSanitizer.user.js"
    script.write_text(HEADER+"\n".join([pieces["engine.js"],pieces["provider.js"],
                                           pieces["web_adapter.js"],adapter]),encoding="utf-8")
    archive=DIST/"TLS_Chrome_MV3_R3_20261024.zip"
    with zipfile.ZipFile(archive,"w",compression=zipfile.ZIP_DEFLATED) as z:
        for file in sorted(chrome.iterdir()):
            if file.is_file():
                z.write(file,file.name)
    files=list(sorted(chrome.iterdir()))+[script,archive]
    hashes=[]
    for item in files:
        if item.is_file():
            hashes.append(hashlib.sha256(item.read_bytes()).hexdigest()+"  "+item.relative_to(DIST).as_posix())
    (DIST/"SHA256SUMS_R3_20261024.txt").write_text("\n".join(hashes)+"\n",encoding="utf-8")
    print("BUILT",archive)
    print("BUILT",script)
    print("CHECKSUMS",len(hashes))

if __name__=="__main__":
    build()
