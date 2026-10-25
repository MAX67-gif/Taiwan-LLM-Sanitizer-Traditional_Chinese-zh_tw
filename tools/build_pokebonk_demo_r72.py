"""R7.2 independent, reproducible, opt-in PokéBonk display-only demo.

R7 / R7.1 dist source and release assets remain byte-for-byte unchanged.
Game bundles, trademarks, sprites, accounts, source code and state are not included.
"""
from __future__ import annotations
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json
import hashlib
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/demos/pokebonk_r72'
DEST = ROOT / 'dist/pokebonk/r72'
VERSION = '0.1.2'
STAMP = (2026, 10, 25, 0, 0, 0)
FILES = (
    'TLS_Pokebonk_TW_Demo_R7_2_Chrome_20261025.zip',
    'TLS_Pokebonk_TW_Demo_R7_2_Tampermonkey_20261025.user.js',
)
SHA_NAME = 'TLS_Pokebonk_TW_Demo_R7_2_SHA256SUMS_20261025.txt'
HEADER = '''// ==UserScript==
// @name         Taiwan-LLM-Sanitizer · PokéBonk 臺灣繁中示範 R7.2（僅顯示層）
// @namespace    https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// @version      0.1.2
// @description  手動啟用，僅修改可辨識介面文字，不讀取遊戲狀態、帳號、聊天、存檔或網路
// @match        https://pokebonk.com/*
// @match        https://www.pokebonk.com/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// ==/UserScript==

'''

def read(path:Path)->str:
    return path.read_text(encoding='utf-8')

def source():
    pack=json.loads(read(SOURCE/'profile.json'))
    if (pack.get('version')!=VERSION or pack.get('schema')!='tls.site_profile.pokebonk.v2'
            or pack.get('source_host')!='pokebonk.com'
            or pack.get('required_user_action')!='explicit_opt_in_button_every_session'
            or pack.get('verified_current_game') is not False
            or pack.get('observed_dom_strings_verified') is not False):
        raise ValueError('R72_PROFILE_CONTRACT_MISMATCH')
    entries=pack.get('entries')
    if not isinstance(entries,list) or len(entries)<136 or len(entries)>230:
        raise ValueError('R72_PROFILE_SIZE_INVALID')
    encountered=set()
    for entry in entries:
        if (set(entry)!={'from','to','kind','confidence'} or
            entry['kind'] not in ('ui','pokemon','move') or
            entry['confidence']!='illustrative_unreviewed' or
            not isinstance(entry['from'],str) or not isinstance(entry['to'],str) or
            not entry['from'] or not entry['to'] or entry['from']==entry['to'] or
            len(entry['from'])>100 or len(entry['to'])>100 or entry['from'] in encountered):
            raise ValueError('R72_PROFILE_CONFLICT_OR_UNSAFE_ENTRY')
        encountered.add(entry['from'])
    engine=read(SOURCE/'engine.js');runtime=read(SOURCE/'runtime.js')
    for forbidden in ('fetch(', 'XMLHttpRequest(', 'GM_xmlhttpRequest(', 'new WebSocket(',
                      'localStorage.', 'sessionStorage.', 'document.cookie',
                      'CanvasRenderingContext2D.prototype', 'WebGLRenderingContext.prototype'):
        if forbidden in engine+runtime:
            raise ValueError('R72_DISALLOWED_API_'+forbidden)
    packed='globalThis.__TLS_POKEBONK_PROFILE='+json.dumps(pack,ensure_ascii=False,separators=(',',':'))+';\n'
    return pack,packed+engine+'\n'+runtime+'\n'

def put(path:Path,contents:str)->None:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(contents,encoding='utf-8',newline='\n')

def archive(path:Path, files:list[tuple[str,Path]])->None:
    with ZipFile(path,'w',compression=ZIP_DEFLATED,compresslevel=9) as out:
        for name,p in sorted(files):
            info=ZipInfo(name,STAMP);info.compress_type=ZIP_DEFLATED
            info.external_attr=(0o100644<<16)
            out.writestr(info,p.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
    with ZipFile(path) as z:
        if z.testzip() is not None or set(z.namelist())!={x[0] for x in files}:
            raise ValueError('R72_ARCHIVE_FAILED')

def build(check:bool=False)->None:
    pack,content=source()
    m={'manifest_version':3,'name':'TLS PokéBonk 臺灣繁中 R7.2（非官方）',
       'version':VERSION,'description':'Opt-in display-only Taiwan zh-TW term demo; no game code, account data, or network access.',
       'permissions':[], 'content_scripts':[{'matches':['https://pokebonk.com/*','https://www.pokebonk.com/*'],
                                              'js':['content.js'],'run_at':'document_idle','all_frames':False}]}
    artifacts={
        DEST/'chrome/manifest.json':json.dumps(m,ensure_ascii=False,indent=2)+'\n',
        DEST/'chrome/content.js':content,
        DEST/FILES[1]:HEADER+content,
    }
    if check:
        for path,expected in artifacts.items():
            if not path.exists() or read(path)!=expected:
                raise ValueError('R72_BUILD_OUT_OF_SYNC_'+str(path))
    else:
        for path,expected in artifacts.items():put(path,expected)
    zip_path=DEST/FILES[0]
    if not check:archive(zip_path,[('manifest.json',DEST/'chrome/manifest.json'),('content.js',DEST/'chrome/content.js')])
    if not zip_path.exists():
        raise ValueError('R72_ZIP_MISSING')
    with ZipFile(zip_path) as z:
        if z.testzip() or set(z.namelist())!={'manifest.json','content.js'} or any(z.read(n)!=artifacts[DEST/'chrome'/n].encode('utf-8') for n in ('manifest.json','content.js')):
            raise ValueError('R72_ZIP_PARITY_ERROR')
    sha=''.join(hashlib.sha256((DEST/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in FILES)
    if check:
        if not (DEST/SHA_NAME).exists() or read(DEST/SHA_NAME)!=sha:
            raise ValueError('R72_CHECKSUMS_DIFFER')
    else:put(DEST/SHA_NAME,sha)
    print(f'R72 BUILD PASS entries={len(pack["entries"])} check={check}')

if __name__=='__main__':
    build(check='--check' in sys.argv)
