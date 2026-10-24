"""R11 deterministic optional runtime. Reuses frozen R5 shared source, without rewriting v0.4.0 dist."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import shutil
import sys

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'/'r11'
CORE=('lexicon_pack.js','preferences.js','entities.js','engine.js','provider.js',
      'web_adapter.js','progress_ui.js','user_terms_r9.js','site_glossary_r11.js')
BASE=ROOT/'src'/'core'
US=ROOT/'src'/'r11'/'userscript'/'adapter.js'
CHROME=ROOT/'src'/'r11'/'chrome'
HOMEPAGE='https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
HEADER=f'''// ==UserScript==
// @name         Taiwan-LLM-Sanitizer｜臺灣繁中化 R11 個人詞庫
// @namespace    {HOMEPAGE}
// @version      0.5.0
// @description  完整自含；明確啟用本站後，可匯入 R9 詞庫、預覽、勾選套用及還原。含 R5 原有本機模式。
// @author       CA L. and Taiwan-LLM-Sanitizer contributors
// @match        http://*/*
// @match        https://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  {HOMEPAGE}
// ==/UserScript==

'''

def write(path,data,check):
    if check:
        if not path.exists() or path.read_bytes()!=data:
            raise RuntimeError('R11_BUILD_PARITY_FAILED:'+str(path.relative_to(ROOT)))
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)

def deterministic_zip(items):
    import io
    out=io.BytesIO()
    with ZipFile(out,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(items.items()):
            info=ZipInfo(name,(2026,10,25,0,0,0))
            info.compress_type=ZIP_DEFLATED
            info.external_attr=0o644<<16
            z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
    return out.getvalue()

def build(check=False):
    components={name:(BASE/name).read_bytes() for name in CORE}
    chrome={name:(CHROME/name).read_bytes() for name in ('manifest.json','popup.html','popup.js','content.js')}
    chrome.update(components)
    scripts=HEADER.encode('utf8')+b'\n'.join([components[name] for name in CORE])+b'\n'+US.read_bytes()
    for name,content in chrome.items():write(DIST/'chrome'/name,content,check)
    write(DIST/'userscript'/'TaiwanLLMSanitizerR11.user.js',scripts,check)
    archive=deterministic_zip(chrome)
    write(DIST/'TLS_Chrome_MV3_R11_20261025.zip',archive,check)
    write(DIST/'TLS_Tampermonkey_R11_20261025.user.js',scripts,check)
    sha_paths=[*['chrome/'+name for name in sorted(chrome)],'userscript/TaiwanLLMSanitizerR11.user.js',
               'TLS_Chrome_MV3_R11_20261025.zip','TLS_Tampermonkey_R11_20261025.user.js']
    lines=[sha256((DIST/p).read_bytes()).hexdigest()+'  '+p for p in sha_paths]
    write(DIST/'SHA256SUMS_R11_20261025.txt', ('\n'.join(lines)+'\n').encode(),check)
    with ZipFile(DIST/'TLS_Chrome_MV3_R11_20261025.zip') as z:
        assert z.testzip() is None
    print('TLS R11 BUILD/PARITY PASS',len(chrome),'Chrome files')
if __name__=='__main__':build(check='--check' in sys.argv)
