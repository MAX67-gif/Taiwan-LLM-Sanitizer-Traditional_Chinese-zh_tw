"""Build the opt-in PokéBonk zh-TW demo for Chrome and Tampermonkey.

No game code or sprites embedded. Static profile only. Outputs are deterministic,
all remote update checks require explicit user navigation to a release page.
"""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib
import json
import shutil

ROOT=Path(__file__).resolve().parents[1]
DEMO=ROOT/"src/demos/pokebonk"
DEST=ROOT/"dist/pokebonk"
CHROME=DEST/"chrome"
VERSION="0.1.0"
STAMP=(2026,10,24,0,0,0)
FILENAME="TLS_Pokebonk_TW_Demo_R7_Chrome_20261024.zip"
TM_FILENAME="TLS_Pokebonk_TW_Demo_R7_Tampermonkey_20261024.user.js"
SHA_FILENAME="TLS_Pokebonk_TW_Demo_R7_SHA256SUMS_20261024.txt"
REPO="https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw"

HEADER="""// ==UserScript==
// @name         Taiwan-LLM-Sanitizer · PokéBonk 臺灣繁中示範（顯示層）
// @namespace    https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// @version      0.1.0
// @description  僅改一般網頁文字；需手動啟用，不變更遊戲程式、戰鬥、帳號或網路
// @match        https://pokebonk.com/*
// @match        https://www.pokebonk.com/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// ==/UserScript==

"""

def read_utf8(p):
    return p.read_text(encoding="utf-8")

def inputs():
    data=json.loads(read_utf8(DEMO/"profile.json"))
    if data.get("version")!=VERSION:
        raise ValueError("MISMATCHED_PROFILE_VERSION")
    if data.get("required_user_action")!="explicit_opt_in_button_every_session":
        raise ValueError("AUTOMATIC_OPT_IN_NOT_ALLOWED")
    if data.get("source_host")!="pokebonk.com":
        raise ValueError("HOST_NOT_APPROVED")
    entries=data["entries"]
    if not (80<=len(entries)<=300):
        raise ValueError("PROFILE_MUST_REMAIN_BOUNDED")
    mapping={}
    for x in entries:
        if not x.get("from") or not x.get("to"):
            raise ValueError("BAD_ENTRY")
        if x["from"] in mapping:
            raise ValueError("DUPLICATE_ENTRY")
        if len(x["from"])>100 or len(x["to"])>100:
            raise ValueError("OVERSIZE_ENTRY")
        mapping[x["from"]]=x["to"]
    e=read_utf8(DEMO/"engine.js")
    r=read_utf8(DEMO/"runtime.js")
    for bad in ("fetch(", "XMLHttpRequest(", "new WebSocket(", "GM_xmlhttpRequest(", "document.cookie", "localStorage.", "sessionStorage."):
        if bad in e or bad in r:
            raise ValueError("DISALLOWED_REMOTE_OR_LOCAL_GAME_DATA_API: "+bad)
    code="globalThis.__TLS_POKEBONK_PROFILE="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n"+e+"\n"+r+"\n"
    return code

def write(p,data):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(data,encoding="utf-8",newline="\n")

def archive(paths,out):
    with ZipFile(out,"w",compression=ZIP_DEFLATED,compresslevel=9) as z:
        for name,src in sorted(paths):
            item=ZipInfo(name,STAMP)
            item.compress_type=ZIP_DEFLATED
            item.external_attr=0o100644<<16
            z.writestr(item,src.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
    with ZipFile(out) as z:
        if z.testzip() or set(z.namelist())!={name for name,_ in paths}:
            raise ValueError("ZIP_INTEGRITY_FAILURE")

def build():
    code=inputs()
    manifest={
      "manifest_version":3,
      "name":"TLS PokéBonk 臺灣繁中試玩版（非官方）",
      "version":VERSION,
      "description":"Opt-in, display-only Taiwanese terminology demo. No game/state/network changes.",
      "permissions":[],
      "content_scripts":[{"matches":["https://pokebonk.com/*","https://www.pokebonk.com/*"],
        "js":["content.js"],"run_at":"document_idle","all_frames":False}]
    }
    write(CHROME/"manifest.json",json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
    write(CHROME/"content.js",code)
    write(DEST/TM_FILENAME,HEADER+code)
    archive([("manifest.json",CHROME/"manifest.json"),("content.js",CHROME/"content.js")],DEST/FILENAME)
    digests=[]
    for name in (FILENAME,TM_FILENAME):
        blob=(DEST/name).read_bytes()
        digests.append(hashlib.sha256(blob).hexdigest()+"  "+name)
    write(DEST/SHA_FILENAME,"\n".join(digests)+"\n")
    print("R7 DEMO BUILD PASS",len(json.loads(read_utf8(DEMO/"profile.json"))["entries"]),"entries")
    for line in digests:print(line)
    return digests

if __name__=="__main__":
    build()
