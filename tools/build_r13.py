"""Deterministic R13 opt-in read-only bilingual Chrome+Tampermonkey bundle."""
from __future__ import annotations
import hashlib
import io
import sys
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
VERSION='0.6.0'
CORE=ROOT/'src/core/bilingual_reader_r13.js'
UI=ROOT/'src/r13/reader_ui_r13.js'
C=ROOT/'src/r13/chrome'
U=ROOT/'src/r13/userscript/adapter.js'
D=ROOT/'dist/r13'
PUBLIC='https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
HEADER=f'''// ==UserScript==
// @name         Taiwan-LLM-Sanitizer R13｜安全雙語閱讀
// @namespace    {PUBLIC}
// @version      {VERSION}
// @description  逐站手動啟用，只讀取反白文字並比對譯文；不改寫網頁。
// @author       CA L. and contributors
// @match        http://*/*
// @match        https://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  {PUBLIC}
// ==/UserScript==

'''
def put(path:Path,body:bytes,check=False):
    if check:
        if not path.is_file() or path.read_bytes()!=body:raise RuntimeError('R13_PARITY_FAIL:'+str(path))
    else:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body)
def archive(files:dict[str,bytes]):
    out=io.BytesIO()
    with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
        for name,blob in sorted(files.items()):
            info=ZipInfo(name,(2026,10,25,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
            z.writestr(info,blob,compress_type=ZIP_DEFLATED,compresslevel=9)
    return out.getvalue()
def build(check=False):
    files={p.name:p.read_bytes() for p in (C/'manifest.json',C/'popup.html',C/'popup.js',C/'content.js')}
    files['bilingual_reader_r13.js']=CORE.read_bytes();files['reader_ui_r13.js']=UI.read_bytes()
    for name,data in files.items():put(D/'chrome'/name,data,check)
    userscript=HEADER.encode('utf-8')+b'\n'.join((CORE.read_bytes(),UI.read_bytes(),U.read_bytes()))
    put(D/'userscript/TaiwanLLMSanitizerR13.user.js',userscript,check)
    put(D/'TLS_Tampermonkey_R13_20261025.user.js',userscript,check)
    zip_bytes=archive(files)
    put(D/'TLS_Chrome_MV3_R13_20261025.zip',zip_bytes,check)
    paths=[*['chrome/'+name for name in sorted(files)],'userscript/TaiwanLLMSanitizerR13.user.js',
      'TLS_Tampermonkey_R13_20261025.user.js','TLS_Chrome_MV3_R13_20261025.zip']
    checks=''.join(hashlib.sha256((D/n).read_bytes()).hexdigest()+'  '+n+'\n' for n in paths)
    put(D/'SHA256SUMS_R13_20261025.txt',checks.encode('utf8'),check)
    with ZipFile(D/'TLS_Chrome_MV3_R13_20261025.zip') as z:
        assert z.testzip() is None
    print('R13 BUILD/PARITY PASS',len(files),'CHROME FILES')
if __name__=='__main__':build(check='--check' in sys.argv)
